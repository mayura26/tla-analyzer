import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.json')) {
      return NextResponse.json({ error: 'Only JSON files are allowed' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size too large. Maximum 10MB allowed' }, { status: 400 });
    }

    // Determine target directory based on filename
    const dataDir = path.join(process.cwd(), 'data');
    let targetPath: string;

    if (file.name === 'compare-data.json') {
      // Compare data file goes to data/
      targetPath = path.join(dataDir, file.name);
    } else if (file.name === 'notes.json') {
      // Notes file goes to data/
      targetPath = path.join(dataDir, file.name);
    } else {
      // Main data files go to data/
      targetPath = path.join(dataDir, file.name);
    }

    // Validate target path is within data directory
    if (!targetPath.startsWith(dataDir)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    // Read file content
    const fileContent = await file.text();

    // Validate JSON format
    try {
      const parsedJson = JSON.parse(fileContent);
      
      // Additional validation for notes.json
      if (file.name === 'notes.json') {
        if (!parsedJson.notes || typeof parsedJson.notes !== 'object') {
          return NextResponse.json({ 
            error: 'Invalid notes.json format. Expected structure: { notes: { [date]: { date, notes, lastModified } }, lastUpdated: string }' 
          }, { status: 400 });
        }
      }
    } catch {
      return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 });
    }

    // Write file to disk
    await fs.writeFile(targetPath, fileContent, 'utf-8');

    return NextResponse.json({ 
      success: true, 
      message: `File ${file.name} uploaded successfully`,
      path: targetPath 
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 