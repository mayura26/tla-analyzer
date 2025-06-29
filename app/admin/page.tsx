"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Upload, FileText, Database, Loader2, Trash2 } from "lucide-react";

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
  const [clearing, setClearing] = useState(false);
  const [clearStatus, setClearStatus] = useState<string>("");
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [uploadingAll, setUploadingAll] = useState(false);

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

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      const response = await fetch('/api/admin/download-all');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tla-analyzer-data-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        alert(`Download failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Download all error:', error);
      alert('Download failed: Network error');
    } finally {
      setDownloadingAll(false);
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

  const handleUploadAll = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAll(true);
    setUploadStatus("Uploading all files from ZIP...");

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/upload-all', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        const uploadedFiles = result.uploaded.join(', ');
        const failedCount = result.failed.length;
        const skippedCount = result.skipped.length;
        
        let statusMessage = `Successfully uploaded ${result.uploaded.length} file(s): ${uploadedFiles}`;
        
        if (failedCount > 0) {
          statusMessage += `\nFailed: ${failedCount} file(s)`;
        }
        if (skippedCount > 0) {
          statusMessage += `\nSkipped: ${skippedCount} file(s)`;
        }
        
        setUploadStatus(statusMessage);
        setTimeout(() => setUploadStatus(""), 8000);
        // Refresh file info after successful upload
        fetchFileInfo();
      } else {
        setUploadStatus(`Upload failed: ${result.error}`);
        setTimeout(() => setUploadStatus(""), 8000);
      }
    } catch (error) {
      console.error('Upload all error:', error);
      setUploadStatus("Upload failed: Network error");
      setTimeout(() => setUploadStatus(""), 5000);
    } finally {
      setUploadingAll(false);
    }
  };

  const handleClear = async (fileType: string) => {
    if (!confirm(`Are you sure you want to clear ${fileType === 'all' ? 'all data files' : `the ${fileType} file`}? This action cannot be undone, but a backup will be created.`)) {
      return;
    }

    setClearing(true);
    setClearStatus("Clearing files...");

    try {
      const response = await fetch(`/api/admin/clear?fileType=${fileType}`, {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        setClearStatus(`Successfully cleared ${result.clearedFiles.length} file(s): ${result.clearedFiles.join(', ')}`);
        setTimeout(() => setClearStatus(""), 5000);
        // Refresh file info after successful clear
        fetchFileInfo();
      } else {
        setClearStatus(`Clear failed: ${result.error}`);
        setTimeout(() => setClearStatus(""), 8000);
      }
    } catch (error) {
      console.error('Clear error:', error);
      setClearStatus("Clear failed: Network error");
      setTimeout(() => setClearStatus(""), 5000);
    } finally {
      setClearing(false);
    }
  };

  const dataFiles = files.filter(file => file.name !== 'notes.json');
  const noteFiles = files.filter(file => file.name === 'notes.json');
  const existingFiles = files.filter(file => file.exists);

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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            {/* Download All Button */}
            <div className="mb-4">
              <Button
                onClick={handleDownloadAll}
                disabled={downloadingAll || existingFiles.length === 0}
                className="w-full"
                size="lg"
              >
                {downloadingAll ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Downloading All Files...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    Download All Files ({existingFiles.length} available)
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Downloads all available files as a ZIP archive
              </p>
            </div>

            <Separator />

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
              {/* Upload All Button */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Upload All Files (ZIP Archive)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleUploadAll}
                    disabled={uploadingAll || uploading}
                    className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload a ZIP file containing all data files (all-days.json, compare-data.json, notes.json)
                </p>
              </div>

              <Separator />

              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload Main Data File (all-days.json)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleUpload(e, "all-days")}
                    disabled={uploading || uploadingAll}
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
                    disabled={uploading || uploadingAll}
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
                    disabled={uploading || uploadingAll}
                    className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Will be saved as: notes.json</p>
              </div>

              {uploadStatus && (
                <div className={`p-3 rounded-md text-sm ${
                  uploadStatus.includes('successful') || uploadStatus.includes('Successfully')
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {uploadStatus}
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Upload Guidelines:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>ZIP files can contain all data files at once</li>
                  <li>Individual JSON files are also accepted</li>
                  <li>Files will be automatically renamed to the correct filename</li>
                  <li>Files are validated for correct structure and format</li>
                  <li>Uploading will replace existing files (automatic backup created)</li>
                  <li>Maximum file size: 50MB for ZIP, 10MB for individual files</li>
                  <li>Notes file must follow the new single-file format with notes object and lastUpdated property</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clear Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Clear Data Files
            </CardTitle>
            <CardDescription>
              Clear data files from the server (backups are created automatically)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Clear Individual Files
                </h3>
                <div className="space-y-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleClear('all-days')}
                    disabled={clearing || !dataFiles.find(f => f.name === 'all-days.json')?.exists}
                    className="w-full justify-start"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear all-days.json
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleClear('compare-data')}
                    disabled={clearing || !dataFiles.find(f => f.name === 'compare-data.json')?.exists}
                    className="w-full justify-start"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear compare-data.json
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleClear('notes')}
                    disabled={clearing || !noteFiles.find(f => f.name === 'notes.json')?.exists}
                    className="w-full justify-start"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear notes.json
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Clear All Files
                </h3>
                <Button
                  variant="destructive"
                  onClick={() => handleClear('all')}
                  disabled={clearing}
                  className="w-full"
                >
                  {clearing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All Data Files
                    </>
                  )}
                </Button>
              </div>

              {clearStatus && (
                <div className={`p-3 rounded-md text-sm ${
                  clearStatus.includes('Successfully') 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {clearStatus}
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Clear Guidelines:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Files are permanently deleted from the server</li>
                  <li>Automatic backups are created before deletion</li>
                  <li>This action cannot be undone</li>
                  <li>Only existing files can be cleared</li>
                  <li>Backup files are saved with timestamp</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 