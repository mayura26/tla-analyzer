"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Upload, FileText, Database } from "lucide-react";

export default function AdminPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

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

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus("Uploading...");

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setUploadStatus("Upload successful!");
        setTimeout(() => setUploadStatus(""), 3000);
      } else {
        setUploadStatus("Upload failed");
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const dataFiles = [
    { name: "all-days.json", description: "Main trading data file", size: "811KB" },
    { name: "compare-data.json", description: "Comparison data file", size: "2B" },
  ];

  const noteFiles = [
    { name: "notes.json", description: "All trading notes in single file", size: "361B" },
  ];

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
                      <p className="text-sm text-muted-foreground">{file.description} ({file.size})</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file.name)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
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
                      <p className="text-sm text-muted-foreground">{file.description} ({file.size})</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file.name)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
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
                    onChange={handleUpload}
                    disabled={uploading}
                    className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload Compare Data File (compare-data.json)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload Notes File (notes.json)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
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
                  <li>File names should match existing files</li>
                  <li>Uploading will replace existing files</li>
                  <li>Make sure to backup current data before uploading</li>
                  <li>Notes file should contain all notes in the new single-file format</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 