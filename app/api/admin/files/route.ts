import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    
    // Define the files we want to check
    const filesToCheck = [
      { name: 'all-days.json', description: 'Main trading data file' },
      { name: 'compare-data.json', description: 'Comparison data file' },
      { name: 'notes.json', description: 'All trading notes in single file' }
    ];

    const fileInfo = [];

    for (const file of filesToCheck) {
      try {
        const filePath = path.join(dataDir, file.name);
        const stats = await fs.stat(filePath);
        
        // Convert bytes to human readable format
        const formatFileSize = (bytes: number): string => {
          if (bytes === 0) return '0B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
        };

        fileInfo.push({
          name: file.name,
          description: file.description,
          size: formatFileSize(stats.size),
          exists: true,
          lastModified: stats.mtime.toISOString()
        });
      } catch {
        // File doesn't exist
        fileInfo.push({
          name: file.name,
          description: file.description,
          size: '0B',
          exists: false,
          lastModified: null
        });
      }
    }

    return NextResponse.json({ files: fileInfo });
  } catch (error) {
    console.error('Error getting file info:', error);
    return NextResponse.json(
      { error: 'Failed to get file information' },
      { status: 500 }
    );
  }
} 