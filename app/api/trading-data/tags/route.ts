import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export interface TagDefinition {
  id: string;
  name: string;
  description?: string;
  color: string;
  image?: string; // Base64 encoded image data
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
  positiveCount?: number;
  negativeCount?: number;
}

interface TagDefinitionsFile {
  tags: TagDefinition[];
  lastUpdated: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const TAGS_FILE_PATH = path.join(DATA_DIR, 'tags-definitions.json');

// Ensure data directory exists
async function ensureDataDirectory() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Read tags definitions file
async function readTagsFile(): Promise<TagDefinitionsFile> {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(TAGS_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    // Return empty structure if file doesn't exist
    return {
      tags: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

// Write tags definitions file
async function writeTagsFile(data: TagDefinitionsFile): Promise<void> {
  await ensureDataDirectory();
  await fs.writeFile(TAGS_FILE_PATH, JSON.stringify(data, null, 2));
}

// Generate a URL-safe ID from tag name
function generateTagId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Generate a color for a new tag
function generateTagColor(): string {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#ec4899', // pink
    '#6b7280', // gray
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// GET /api/trading-data/tags - Get all tag definitions
export async function GET() {
  try {
    const tagsData = await readTagsFile();
    
    // Ensure all tags have the new count fields
    const updatedTags = tagsData.tags.map(tag => ({
      ...tag,
      positiveCount: tag.positiveCount ?? 0,
      negativeCount: tag.negativeCount ?? 0
    }));
    
    // Check if any tags are missing the new count fields and need recalculation
    const needsRecalculation = tagsData.tags.some(tag => 
      tag.positiveCount === undefined || tag.negativeCount === undefined
    );
    
    if (needsRecalculation) {
      console.log('Some tags are missing count fields, consider running recalculate endpoint');
    }
    
    return NextResponse.json(updatedTags);
  } catch (error) {
    console.error("Error in tags GET:", error);
    return NextResponse.json(
      { error: "Failed to load tag definitions" },
      { status: 500 }
    );
  }
}

// POST /api/trading-data/tags - Create or update a tag
export async function POST(request: Request) {
  try {
    const { id, name, description, color, image } = await request.json();
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    const tagsData = await readTagsFile();
    const tagName = name.trim();
    const tagId = id || generateTagId(tagName);
    
    // Check if tag with this ID or name already exists (for creation)
    const existingTagIndex = tagsData.tags.findIndex(tag => 
      tag.id === tagId || tag.name.toLowerCase() === tagName.toLowerCase()
    );
    
    if (existingTagIndex >= 0) {
      if (!id) {
        // Creating new tag, but one already exists
        return NextResponse.json(
          { error: 'A tag with this name already exists' },
          { status: 409 }
        );
      }
      // Updating existing tag
      tagsData.tags[existingTagIndex] = {
        ...tagsData.tags[existingTagIndex],
        name: tagName,
        description: description || tagsData.tags[existingTagIndex].description,
        color: color || tagsData.tags[existingTagIndex].color,
        image: image !== undefined ? image : tagsData.tags[existingTagIndex].image,
      };
    } else {
      // Creating new tag
      const newTag: TagDefinition = {
        id: tagId,
        name: tagName,
        description,
        color: color || generateTagColor(),
        image,
        createdAt: new Date().toISOString(),
        usageCount: 0,
        positiveCount: 0,
        negativeCount: 0
      };
      tagsData.tags.push(newTag);
    }
    
    tagsData.lastUpdated = new Date().toISOString();
    await writeTagsFile(tagsData);
    
    const updatedTag = tagsData.tags.find(tag => tag.id === tagId);
    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error("Error in tags POST:", error);
    return NextResponse.json(
      { error: "Failed to save tag definition" },
      { status: 500 }
    );
  }
}

// PUT /api/trading-data/tags - Update tag usage statistics
export async function PUT(request: Request) {
  try {
    const { tagIds, impact, action } = await request.json();
    
    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return NextResponse.json(
        { error: 'Tag IDs array is required' },
        { status: 400 }
      );
    }

    const tagsData = await readTagsFile();
    const now = new Date().toISOString();
    
    // Update usage statistics for the provided tag IDs
    tagIds.forEach((tagId: string) => {
      const tagIndex = tagsData.tags.findIndex(tag => tag.id === tagId);
      if (tagIndex >= 0) {
        if (action === 'decrement') {
          // Decrement counts
          tagsData.tags[tagIndex].usageCount = Math.max(0, (tagsData.tags[tagIndex].usageCount || 0) - 1);
          
          // Decrement positive/negative counts if impact is provided
          if (impact === 'positive') {
            tagsData.tags[tagIndex].positiveCount = Math.max(0, (tagsData.tags[tagIndex].positiveCount || 0) - 1);
          } else if (impact === 'negative') {
            tagsData.tags[tagIndex].negativeCount = Math.max(0, (tagsData.tags[tagIndex].negativeCount || 0) - 1);
          }
        } else {
          // Increment counts (default behavior)
          tagsData.tags[tagIndex].usageCount = (tagsData.tags[tagIndex].usageCount || 0) + 1;
          tagsData.tags[tagIndex].lastUsed = now;
          
          // Update positive/negative counts if impact is provided
          if (impact === 'positive') {
            tagsData.tags[tagIndex].positiveCount = (tagsData.tags[tagIndex].positiveCount || 0) + 1;
          } else if (impact === 'negative') {
            tagsData.tags[tagIndex].negativeCount = (tagsData.tags[tagIndex].negativeCount || 0) + 1;
          }
        }
      }
    });
    
    tagsData.lastUpdated = now;
    await writeTagsFile(tagsData);
    
    return NextResponse.json({ success: true, updatedTags: tagIds.length });
  } catch (error) {
    console.error("Error in tags PUT:", error);
    return NextResponse.json(
      { error: "Failed to update tag usage statistics" },
      { status: 500 }
    );
  }
}

// DELETE /api/trading-data/tags - Delete a tag
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('id');
    
    if (!tagId) {
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      );
    }

    const tagsData = await readTagsFile();
    const tagIndex = tagsData.tags.findIndex(tag => tag.id === tagId);
    
    if (tagIndex === -1) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }
    
    // TODO: Check if tag is in use before allowing deletion
    // For now, we'll allow deletion but should add usage checking later
    
    tagsData.tags.splice(tagIndex, 1);
    tagsData.lastUpdated = new Date().toISOString();
    await writeTagsFile(tagsData);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in tags DELETE:", error);
    return NextResponse.json(
      { error: "Failed to delete tag definition" },
      { status: 500 }
    );
  }
}
