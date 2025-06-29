import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';

// Define expected file names and their validation rules (same as upload route)
const EXPECTED_FILES = {
  'all-days.json': {
    description: 'Main trading dataset',
    validateContent: (parsedJson: any) => {
      if (!Array.isArray(parsedJson)) {
        return 'all-days.json must contain an array of trading data';
      }
      // Basic validation for trading data structure
      for (const item of parsedJson) {
        if (!item.date || !item.analysis) {
          return 'Each item in all-days.json must have date and analysis properties';
        }
      }
      return null;
    }
  },
  'compare-data.json': {
    description: 'Comparison dataset',
    validateContent: (parsedJson: any) => {
      if (!Array.isArray(parsedJson)) {
        return 'compare-data.json must contain an array of trading data';
      }
      // Basic validation for trading data structure
      for (const item of parsedJson) {
        if (!item.date || !item.analysis) {
          return 'Each item in compare-data.json must have date and analysis properties';
        }
      }
      return null;
    }
  },
  'notes.json': {
    description: 'Trading notes data',
    validateContent: (parsedJson: any) => {
      if (!parsedJson.notes || typeof parsedJson.notes !== 'object') {
        return 'notes.json must have a notes object property';
      }
      if (!parsedJson.lastUpdated || typeof parsedJson.lastUpdated !== 'string') {
        return 'notes.json must have a lastUpdated string property';
      }
      // Validate notes structure
      for (const [date, noteData] of Object.entries(parsedJson.notes)) {
        if (typeof noteData !== 'object' || noteData === null) {
          return `Invalid note structure for date ${date}. Expected: { date, notes, lastModified }`;
        }
        const note = noteData as { date?: string; notes?: string; lastModified?: string };
        if (!note.date || !note.notes || !note.lastModified) {
          return `Invalid note structure for date ${date}. Expected: { date, notes, lastModified }`;
        }
      }
      return null;
    }
  }
} as const;

// Helper function to create backup of existing file
async function createBackup(filePath: string): Promise<string | null> {
  try {
    const exists = await fs.access(filePath).then(() => true).catch(() => false);
    if (!exists) {
      return null; // No backup needed if file doesn't exist
    }

    const backupPath = `${filePath}.backup.${Date.now()}`;
    await fs.copyFile(filePath, backupPath);
    
    // Clean up old backups (keep only 5 most recent)
    await cleanupOldBackups(filePath);
    
    return backupPath;
  } catch (error) {
    console.error('Error creating backup:', error);
    return null;
  }
}

// Helper function to clean up old backup files
async function cleanupOldBackups(filePath: string): Promise<void> {
  try {
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath);
    const files = await fs.readdir(dir);
    
    // Find all backup files for this specific file
    const backupFiles = files
      .filter(file => file.startsWith(`${baseName}.backup.`))
      .map(file => ({
        name: file,
        path: path.join(dir, file),
        timestamp: parseInt(file.split('.').pop() || '0')
      }))
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp, newest first
    
    // Remove old backups, keeping only the 5 most recent
    const backupsToRemove = backupFiles.slice(5);
    for (const backup of backupsToRemove) {
      try {
        await fs.unlink(backup.path);
        console.log(`Removed old backup: ${backup.name}`);
      } catch (error) {
        console.error(`Error removing old backup ${backup.name}:`, error);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'Only ZIP files are allowed' }, { status: 400 });
    }

    // Validate file size (max 50MB for ZIP files)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size too large. Maximum 50MB allowed' }, { status: 400 });
    }

    // Read the ZIP file
    const arrayBuffer = await file.arrayBuffer();
    const zip = new JSZip();
    await zip.loadAsync(arrayBuffer);

    const dataDir = path.join(process.cwd(), 'data');
    const results = {
      uploaded: [] as string[],
      failed: [] as { filename: string; error: string }[],
      skipped: [] as string[]
    };

    // Process each file in the ZIP
    for (const [filename, zipEntry] of Object.entries(zip.files)) {
      // Skip directories and non-JSON files
      if (zipEntry.dir || !filename.endsWith('.json')) {
        continue;
      }

      // Only process expected files
      if (!Object.keys(EXPECTED_FILES).includes(filename)) {
        results.skipped.push(filename);
        continue;
      }

      try {
        // Read file content from ZIP
        const fileContent = await zipEntry.async('string');

        // Validate JSON format
        let parsedJson: any;
        try {
          parsedJson = JSON.parse(fileContent);
        } catch {
          results.failed.push({ filename, error: 'Invalid JSON format' });
          continue;
        }

        // Validate content structure based on file type
        const fileConfig = EXPECTED_FILES[filename as keyof typeof EXPECTED_FILES];
        const contentValidationError = fileConfig.validateContent(parsedJson);
        if (contentValidationError) {
          results.failed.push({ filename, error: contentValidationError });
          continue;
        }

        // Determine target path
        const targetPath = path.join(dataDir, filename);
        
        // Validate target path is within data directory
        if (!targetPath.startsWith(dataDir)) {
          results.failed.push({ filename, error: 'Invalid file path' });
          continue;
        }

        // Create backup of existing file
        const backupPath = await createBackup(targetPath);

        // Write file to disk
        await fs.writeFile(targetPath, fileContent, 'utf-8');
        
        results.uploaded.push(filename);
        console.log(`Uploaded file: ${filename}${backupPath ? ` (backup created: ${path.basename(backupPath)})` : ''}`);

      } catch (error) {
        console.error(`Error processing file ${filename}:`, error);
        results.failed.push({ filename, error: 'Internal processing error' });
      }
    }

    // If no files were uploaded, return error
    if (results.uploaded.length === 0) {
      return NextResponse.json({ 
        error: 'No valid files found in ZIP archive',
        details: results
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${results.uploaded.length} file(s)`,
      uploaded: results.uploaded,
      failed: results.failed,
      skipped: results.skipped,
      totalProcessed: results.uploaded.length + results.failed.length + results.skipped.length
    });

  } catch (error) {
    console.error('Upload all error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 