"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Upload, FileText, Database, Loader2 } from "lucide-react";

interface FileInfo {
  name: string;
  description: string;
  size: string;
  exists: boolean;
  lastModified: string | null;
}

export default function AdminPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchFileInfo();
  }, []);

  const fetchFileInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/files');
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files);
      } else {
        setError('Failed to load file information');
      }
    } catch (error) {
      console.error('Error fetching file info:', error);
      setError('Failed to load file information');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      const response = await fetch(`/api/admin/download?file=${filename}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed');
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus("Uploading...");

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', fileType);

    try {
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        const backupInfo = result.backupCreated ? ` (Backup created: ${result.backupPath})` : '';
        setUploadStatus(`Upload successful! File saved as ${result.savedAs}${backupInfo}`);
        setTimeout(() => setUploadStatus(""), 5000);
        // Refresh file info after successful upload
        fetchFileInfo();
      } else {
        setUploadStatus(`Upload failed: ${result.error}`);
        setTimeout(() => setUploadStatus(""), 8000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus("Upload failed: Network error");
      setTimeout(() => setUploadStatus(""), 5000);
    } finally {
      setUploading(false);
    }
  };

  const dataFiles = files.filter(file => file.name !== 'notes.json');
  const noteFiles = files.filter(file => file.name === 'notes.json');

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading file information...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchFileInfo} variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage raw data files for the TLA Analyzer
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Download Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Data Files
            </CardTitle>
            <CardDescription>
              Download raw data files from the server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Main Data Files
              </h3>
              <div className="space-y-2">
                {dataFiles.map((file) => (
                  <div key={file.name} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {file.description} ({file.size})
                        {file.lastModified && (
                          <span className="block text-xs">
                            Last modified: {new Date(file.lastModified).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file.name)}
                      disabled={!file.exists}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      {file.exists ? 'Download' : 'Not Found'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes Files
              </h3>
              <div className="space-y-2">
                {noteFiles.map((file) => (
                  <div key={file.name} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {file.description} ({file.size})
                        {file.lastModified && (
                          <span className="block text-xs">
                            Last modified: {new Date(file.lastModified).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file.name)}
                      disabled={!file.exists}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      {file.exists ? 'Download' : 'Not Found'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Data Files
            </CardTitle>
            <CardDescription>
              Upload new data files to replace existing ones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload Main Data File (all-days.json)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleUpload(e, "all-days")}
                    disabled={uploading}
                    className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Will be saved as: all-days.json</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload Compare Data File (compare-data.json)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleUpload(e, "compare-data")}
                    disabled={uploading}
                    className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Will be saved as: compare-data.json</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload Notes File (notes.json)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleUpload(e, "notes")}
                    disabled={uploading}
                    className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Will be saved as: notes.json</p>
              </div>

              {uploadStatus && (
                <div className={`p-3 rounded-md text-sm ${
                  uploadStatus.includes('successful') 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {uploadStatus}
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Upload Guidelines:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Only JSON files are accepted</li>
                  <li>Files will be automatically renamed to the correct filename</li>
                  <li>Files are validated for correct structure and format</li>
                  <li>Uploading will replace existing files (automatic backup created)</li>
                  <li>Maximum file size: 10MB</li>
                  <li>Notes file must follow the new single-file format with notes object and lastUpdated property</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 