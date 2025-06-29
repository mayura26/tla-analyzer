import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    
    // Define the files we want to include in the download
    const filesToInclude = [
      'all-days.json',
      'compare-data.json', 
      'notes.json'
    ];

    const zip = new JSZip();
    const existingFiles: string[] = [];
    const missingFiles: string[] = [];

    // Add each file to the zip if it exists
    for (const filename of filesToInclude) {
      const filePath = path.join(dataDir, filename);
      
      // Ensure the file path is within the data directory
      if (!filePath.startsWith(dataDir)) {
        missingFiles.push(filename);
        continue;
      }

      try {
        // Check if file exists
        await fs.access(filePath);
        
        // Read file content
        const fileContent = await fs.readFile(filePath, 'utf-8');
        
        // Add to zip
        zip.file(filename, fileContent);
        existingFiles.push(filename);
        
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          // File doesn't exist, skip it
          missingFiles.push(filename);
        } else {
          console.error(`Error reading file ${filename}:`, error);
          missingFiles.push(filename);
        }
      }
    }

    // If no files exist, return error
    if (existingFiles.length === 0) {
      return NextResponse.json({ 
        error: 'No data files found to download' 
      }, { status: 404 });
    }

    // Generate zip file
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const zipFilename = `tla-analyzer-data-${timestamp}.zip`;

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Download all error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 