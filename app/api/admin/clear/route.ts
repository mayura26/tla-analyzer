import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileType = searchParams.get('fileType'); // 'all', 'all-days', 'compare-data', 'notes'

    if (!fileType) {
      return NextResponse.json({ error: 'File type parameter is required' }, { status: 400 });
    }

    const dataDir = path.join(process.cwd(), 'data');
    
    // Define which files to clear based on fileType
    let filesToClear: string[] = [];
    
    switch (fileType) {
      case 'all':
        filesToClear = ['all-days.json', 'compare-data.json', 'replaced-compare-data.json', 'notes.json'];
        break;
      case 'all-days':
        filesToClear = ['all-days.json'];
        break;
      case 'compare-data':
        filesToClear = ['compare-data.json'];
        break;
      case 'replaced-compare-data':
        filesToClear = ['replaced-compare-data.json'];
        break;
      case 'notes':
        filesToClear = ['notes.json'];
        break;
      default:
        return NextResponse.json({ 
          error: 'Invalid file type. Expected: all, all-days, compare-data, replaced-compare-data, or notes' 
        }, { status: 400 });
    }

    const clearedFiles: string[] = [];
    const failedFiles: string[] = [];

    for (const filename of filesToClear) {
      const filePath = path.join(dataDir, filename);
      
      // Ensure the file path is within the data directory
      if (!filePath.startsWith(dataDir)) {
        failedFiles.push(filename);
        continue;
      }

      try {
        // Check if file exists before trying to delete
        await fs.access(filePath);
        
        // Create backup before deletion
        const backupPath = `${filePath}.backup.${Date.now()}`;
        await fs.copyFile(filePath, backupPath);
        
        // Delete the file
        await fs.unlink(filePath);
        clearedFiles.push(filename);
        
        console.log(`Cleared file: ${filename} (backup created: ${path.basename(backupPath)})`);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          // File doesn't exist, consider it "cleared"
          clearedFiles.push(filename);
        } else {
          console.error(`Error clearing file ${filename}:`, error);
          failedFiles.push(filename);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleared ${clearedFiles.length} file(s)`,
      clearedFiles,
      failedFiles,
      totalRequested: filesToClear.length
    });

  } catch (error) {
    console.error('Clear files error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 