import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export interface TagDefinition {
  id: string;
  name: string;
  description?: string;
  color: string;
  image?: string;
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

interface TagAssignment {
  tagId: string;
  impact: 'positive' | 'negative';
  assignedAt: string;
}

interface DailyLog {
  date: string;
  analysis: any;
  metadata?: {
    tagAssignments?: TagAssignment[];
  };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const TAGS_FILE_PATH = path.join(DATA_DIR, 'tags-definitions.json');
const COMPARE_DATA_PATH = path.join(DATA_DIR, 'compare-data.json');

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

// Read compare data file
async function readCompareData(): Promise<DailyLog[]> {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(COMPARE_DATA_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Write tags definitions file
async function writeTagsFile(data: TagDefinitionsFile): Promise<void> {
  await ensureDataDirectory();
  await fs.writeFile(TAGS_FILE_PATH, JSON.stringify(data, null, 2));
}

// POST /api/trading-data/tags/recalculate - Recalculate tag usage counts
export async function POST() {
  try {
    // Read current tag definitions
    const tagsData = await readTagsFile();
    
    // Read compare data to count actual tag usage
    const compareData = await readCompareData();
    
    // Initialize counters for each tag
    const tagCounts = new Map<string, { total: number; positive: number; negative: number; lastUsed: string | null }>();
    
    // Initialize all tags with zero counts
    tagsData.tags.forEach(tag => {
      tagCounts.set(tag.id, { total: 0, positive: 0, negative: 0, lastUsed: null });
    });
    
    // Count actual tag usage from compare data
    compareData.forEach(day => {
      if (day.metadata?.tagAssignments) {
        day.metadata.tagAssignments.forEach(assignment => {
          const counts = tagCounts.get(assignment.tagId);
          if (counts) {
            counts.total++;
            if (assignment.impact === 'positive') {
              counts.positive++;
            } else if (assignment.impact === 'negative') {
              counts.negative++;
            }
            
            // Track last used date
            if (!counts.lastUsed || assignment.assignedAt > counts.lastUsed) {
              counts.lastUsed = assignment.assignedAt;
            }
          }
        });
      }
    });
    
    // Update tag definitions with recalculated counts
    tagsData.tags.forEach(tag => {
      const counts = tagCounts.get(tag.id);
      if (counts) {
        tag.usageCount = counts.total;
        tag.positiveCount = counts.positive;
        tag.negativeCount = counts.negative;
        if (counts.lastUsed) {
          tag.lastUsed = counts.lastUsed;
        }
      }
    });
    
    tagsData.lastUpdated = new Date().toISOString();
    await writeTagsFile(tagsData);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Tag usage counts recalculated successfully',
      updatedTags: tagsData.tags.length,
      summary: Array.from(tagCounts.entries()).map(([tagId, counts]) => ({
        tagId,
        ...counts
      }))
    });
  } catch (error) {
    console.error("Error in tags recalculate:", error);
    return NextResponse.json(
      { error: "Failed to recalculate tag usage counts" },
      { status: 500 }
    );
  }
}
