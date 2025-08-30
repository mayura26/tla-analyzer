"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Upload, FileText, Database, Loader2, Trash2, History, Eye, BarChart3, ChevronDown, ChevronRight, Tag, DollarSign, TrendingUp, TrendingDown, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ReplacedCompareDialog } from "@/components/ReplacedCompareDialog";
import { TradeListEntry } from "@/lib/trading-log-parser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TagManager } from "@/components/TagManager";

interface FileInfo {
  name: string;
  description: string;
  size: string;
  exists: boolean;
  lastModified: string | null;
}

interface ReplacedCompareData {
  date: string;
  analysis: {
    headline: {
      totalPnl: number;
      totalTrades: number;
      wins: number;
      losses: number;
    };
    tradeList: TradeListEntry[];
  };
  metadata?: {
    replacedAt?: string;
    replacedReason?: string;
    originalDate?: string;
    addedAt?: string;
  };
}

interface CurrentCompareData {
  date: string;
  analysis: {
    headline: {
      totalPnl: number;
      totalTrades: number;
      wins: number;
      losses: number;
    };
    tradeList: TradeListEntry[];
  };
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
  const [replacedCompareData, setReplacedCompareData] = useState<ReplacedCompareData[]>([]);
  const [loadingReplacedData, setLoadingReplacedData] = useState(false);
  const [selectedReplacedData, setSelectedReplacedData] = useState<ReplacedCompareData | null>(null);
  const [isReplacedDialogOpen, setIsReplacedDialogOpen] = useState(false);
  const [currentCompareDataMap, setCurrentCompareDataMap] = useState<Map<string, CurrentCompareData>>(new Map());
  const [loadingCurrentDataMap, setLoadingCurrentDataMap] = useState<Set<string>>(new Set());
  
  // New state for data visualization dialog
  const [isDataVisualizationOpen, setIsDataVisualizationOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [fileData, setFileData] = useState<any>(null);
  const [loadingFileData, setLoadingFileData] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Collapse states for each section
  const [isDownloadCollapsed, setIsDownloadCollapsed] = useState(true);
  const [isUploadCollapsed, setIsUploadCollapsed] = useState(true);
  const [isClearCollapsed, setIsClearCollapsed] = useState(true); // Start collapsed for safety
  const [isReplacedCollapsed, setIsReplacedCollapsed] = useState(true); // Start collapsed
  const [isTagManagerCollapsed, setIsTagManagerCollapsed] = useState(true);

  useEffect(() => {
    fetchFileInfo();
    fetchReplacedCompareData();
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

  const fetchReplacedCompareData = async () => {
    try {
      setLoadingReplacedData(true);
      const response = await fetch('/api/trading-data/compare/replaced');
      if (response.ok) {
        const data = await response.json();
        setReplacedCompareData(data);
        // Fetch current comparison data for each replaced item
        fetchCurrentCompareDataForReplaced(data);
      } else {
        console.error('Failed to load replaced comparison data');
      }
    } catch (error) {
      console.error('Error fetching replaced comparison data:', error);
    } finally {
      setLoadingReplacedData(false);
    }
  };

  const fetchCurrentCompareDataForReplaced = async (replacedData: ReplacedCompareData[]) => {
    const newCurrentDataMap = new Map<string, CurrentCompareData>();
    const loadingSet = new Set<string>();

    for (const item of replacedData) {
      loadingSet.add(item.date);
      try {
        const response = await fetch(`/api/trading-data/compare/manage?date=${item.date}`);
        if (response.ok) {
          const currentData = await response.json();
          newCurrentDataMap.set(item.date, currentData);
        }
      } catch (error) {
        console.error(`Error fetching current comparison data for ${item.date}:`, error);
      } finally {
        loadingSet.delete(item.date);
      }
    }

    setCurrentCompareDataMap(newCurrentDataMap);
    setLoadingCurrentDataMap(loadingSet);
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

  const mainDataFiles = files.filter(file => ['all-days.json', 'compare-data.json', 'replaced-compare-data.json'].includes(file.name));
  const noteFiles = files.filter(file => file.name === 'notes.json');
  const configFiles = files.filter(file => ['tags-definitions.json', 'backtest-queue.json'].includes(file.name));
  const existingFiles = files.filter(file => file.exists);

  const handleReplacedDataClick = (item: ReplacedCompareData) => {
    setSelectedReplacedData(item);
    setIsReplacedDialogOpen(true);
  };

  const handleReplacedDataDelete = () => {
    // Refresh the replaced comparison data after deletion
    fetchReplacedCompareData();
  };

  const handleDeleteReplacedData = async (item: ReplacedCompareData, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent opening the dialog
    
    if (!confirm('Are you sure you want to delete this replaced comparison data? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/trading-data/compare/replaced', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: item.date
        }),
      });

      if (response.ok) {
        // Remove from local state immediately for better UX
        setReplacedCompareData(prev => prev.filter(data => 
          !(data.date === item.date && data.metadata?.replacedAt === item.metadata?.replacedAt)
        ));
        // Also remove from current data map
        setCurrentCompareDataMap(prev => {
          const newMap = new Map(prev);
          newMap.delete(item.date);
          return newMap;
        });
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete replaced comparison data");
      }
    } catch (error) {
      console.error('Error deleting replaced comparison data:', error);
      alert("Failed to delete replaced comparison data");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getPnlColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const fetchFileData = async (filename: string) => {
    if (!filename) return;
    
    setLoadingFileData(true);
    try {
      const response = await fetch(`/api/admin/download?file=${filename}`);
      if (response.ok) {
        const text = await response.text();
        try {
          const jsonData = JSON.parse(text);
          setFileData(jsonData);
        } catch {
          // If it's not JSON, show as text
          setFileData({ _rawText: text });
        }
      } else {
        setFileData({ _error: 'Failed to load file' });
      }
    } catch (error) {
      console.error('Error fetching file data:', error);
      setFileData({ _error: 'Network error loading file' });
    } finally {
      setLoadingFileData(false);
    }
  };

  const toggleNode = (path: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
  };

  const renderJsonNode = (data: any, path: string = "", level: number = 0) => {
    if (data === null) return <span className="text-gray-500">null</span>;
    if (data === undefined) return <span className="text-gray-500">undefined</span>;
    
    const isExpanded = expandedNodes.has(path);
    
    if (typeof data === 'object' && !Array.isArray(data)) {
      const keys = Object.keys(data);
      if (keys.length === 0) return <span className="text-gray-500">{"{}"}</span>;
      
      return (
        <div className="ml-4">
          <div 
            className="flex items-center cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
            onClick={() => toggleNode(path)}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 mr-1" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1" />
            )}
            <span className="text-blue-600 font-medium">{"{"}</span>
            <span className="text-gray-500 ml-1">({keys.length} keys)</span>
          </div>
          
          {isExpanded && (
            <div className="ml-4">
              {keys.map((key, index) => (
                <div key={key} className="py-1">
                  <span className="text-purple-600 font-medium">"{key}":</span>
                  {renderJsonNode(data[key], `${path}.${key}`, level + 1)}
                  {index < keys.length - 1 && <span className="text-gray-400">,</span>}
                </div>
              ))}
            </div>
          )}
          
          {isExpanded && <span className="text-blue-600 font-medium">{"}"}</span>}
        </div>
      );
    }
    
    if (Array.isArray(data)) {
      if (data.length === 0) return <span className="text-gray-500">{"[]"}</span>;
      
      return (
        <div className="ml-4">
          <div 
            className="flex items-center cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
            onClick={() => toggleNode(path)}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 mr-1" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1" />
            )}
            <span className="text-green-600 font-medium">[</span>
            <span className="text-gray-500 ml-1">({data.length} items)</span>
          </div>
          
          {isExpanded && (
            <div className="ml-4">
              {data.map((item, index) => (
                <div key={index} className="py-1">
                  {renderJsonNode(item, `${path}[${index}]`, level + 1)}
                  {index < data.length - 1 && <span className="text-gray-400">,</span>}
                </div>
              ))}
            </div>
          )}
          
          {isExpanded && <span className="text-green-600 font-medium">]</span>}
        </div>
      );
    }
    
    if (typeof data === 'string') {
      return <span className="text-green-600">"{data}"</span>;
    }
    
    if (typeof data === 'number') {
      const color = data >= 0 ? 'text-blue-600' : 'text-red-600';
      return <span className={color}>{data}</span>;
    }
    
    if (typeof data === 'boolean') {
      const color = data ? 'text-green-600' : 'text-red-600';
      return <span className={color}>{data.toString()}</span>;
    }
    
    return <span className="text-gray-500">{String(data)}</span>;
  };

  const openDataVisualization = () => {
    setIsDataVisualizationOpen(true);
    // Auto-select the first available file if none is selected
    if (!selectedFile && existingFiles.length > 0) {
      setSelectedFile(existingFiles[0].name);
      fetchFileData(existingFiles[0].name);
    }
  };

  const expandAllNodes = (data: any, path: string = "") => {
    const newExpanded = new Set<string>();
    
    const expandRecursive = (obj: any, currentPath: string) => {
      if (obj === null || obj === undefined) return;
      
      if (typeof obj === 'object' && !Array.isArray(obj)) {
        newExpanded.add(currentPath);
        Object.entries(obj).forEach(([key, value]) => {
          const fullPath = currentPath ? `${currentPath}.${key}` : key;
          expandRecursive(value, fullPath);
        });
      } else if (Array.isArray(obj)) {
        newExpanded.add(currentPath);
        if (obj.length > 0) {
          expandRecursive(obj[0], `${currentPath}[0]`);
        }
      }
    };
    
    expandRecursive(data, path);
    setExpandedNodes(newExpanded);
  };

  const collapseAllNodes = () => {
    setExpandedNodes(new Set());
  };

  const fetchTagDefinitions = async () => {
    try {
      setLoadingTags(true);
      const response = await fetch('/api/trading-data/tags');
      if (response.ok) {
        const tags = await response.json();
        setTagDefinitions(tags);
      } else {
        console.error('Failed to load tag definitions');
      }
    } catch (error) {
      console.error('Error loading tag definitions:', error);
    } finally {
      setLoadingTags(false);
    }
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
            <p className="text-muted-foreground">
              Manage raw data files for the TLA Analyzer
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsDownloadCollapsed(false);
                setIsUploadCollapsed(false);
                setIsClearCollapsed(false);
                setIsReplacedCollapsed(false);
                setIsTagManagerCollapsed(false);
              }}
              className="gap-2"
            >
              <ChevronDown className="h-4 w-4" />
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsDownloadCollapsed(true);
                setIsUploadCollapsed(true);
                setIsClearCollapsed(true);
                setIsReplacedCollapsed(true);
                setIsTagManagerCollapsed(true);
              }}
              className="gap-2"
            >
              <ChevronRight className="h-4 w-4" />
              Collapse All
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Download Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                <div>
                  <CardTitle>Download Data Files</CardTitle>
                  <CardDescription>
                    Download raw data files from the server
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDownloadCollapsed(!isDownloadCollapsed)}
                className="p-2"
              >
                {isDownloadCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {!isDownloadCollapsed && (
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

            {/* Data Visualization Button */}
            <div className="mb-4">
              <Button
                onClick={openDataVisualization}
                disabled={existingFiles.length === 0}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                View Data Structure
              </Button>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Explore and analyze raw data files
              </p>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Main Data Files
              </h3>
              <div className="space-y-2">
                {mainDataFiles.map((file) => (
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
                <Database className="h-4 w-4" />
                Configuration Files
              </h3>
              <div className="space-y-2">
                {configFiles.map((file) => (
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
          </CardContent>)}
        </Card>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                <div>
                  <CardTitle>Upload Data Files</CardTitle>
                  <CardDescription>
                    Upload new data files to replace existing ones
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsUploadCollapsed(!isUploadCollapsed)}
                className="p-2"
              >
                {isUploadCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {!isUploadCollapsed && (
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
                  Upload a ZIP file containing all data files (all-days.json, compare-data.json, replaced-compare-data.json, notes.json, tags-definitions.json, backtest-queue.json)
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
                  Upload Replaced Compare Data File (replaced-compare-data.json)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleUpload(e, "replaced-compare-data")}
                    disabled={uploading || uploadingAll}
                    className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Will be saved as: replaced-compare-data.json</p>
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

              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload Tag Definitions File (tags-definitions.json)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleUpload(e, "tags-definitions")}
                    disabled={uploading || uploadingAll}
                    className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Will be saved as: tags-definitions.json</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload Backtest Queue File (backtest-queue.json)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleUpload(e, "backtest-queue")}
                    disabled={uploading || uploadingAll}
                    className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Will be saved as: backtest-queue.json</p>
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
                  <li>Tag definitions file must contain tags array and lastUpdated property</li>
                  <li>Backtest queue file must contain items object and lastUpdated property</li>
                </ul>
              </div>
            </div>
          </CardContent>)}
        </Card>

        {/* Clear Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                <div>
                  <CardTitle>Clear Data Files</CardTitle>
                  <CardDescription>
                    Clear data files from the server (backups are created automatically)
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsClearCollapsed(!isClearCollapsed)}
                className="p-2"
              >
                {isClearCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {!isClearCollapsed && (
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
                    disabled={clearing || !mainDataFiles.find(f => f.name === 'all-days.json')?.exists}
                    className="w-full justify-start"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear all-days.json
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleClear('compare-data')}
                    disabled={clearing || !mainDataFiles.find(f => f.name === 'compare-data.json')?.exists}
                    className="w-full justify-start"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear compare-data.json
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleClear('replaced-compare-data')}
                    disabled={clearing || !mainDataFiles.find(f => f.name === 'replaced-compare-data.json')?.exists}
                    className="w-full justify-start"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear replaced-compare-data.json
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
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleClear('tags-definitions')}
                    disabled={clearing || !configFiles.find(f => f.name === 'tags-definitions.json')?.exists}
                    className="w-full justify-start"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear tags-definitions.json
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleClear('backtest-queue')}
                    disabled={clearing || !configFiles.find(f => f.name === 'backtest-queue.json')?.exists}
                    className="w-full justify-start"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear backtest-queue.json
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
          </CardContent>)}
        </Card>

        {/* Replaced Comparison Data Section */}
        <Card className="col-span-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                <div>
                  <CardTitle>Replaced Comparison Data</CardTitle>
                  <CardDescription>
                    View comparison data that was replaced due to significant differences
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReplacedCollapsed(!isReplacedCollapsed)}
                className="p-2"
              >
                {isReplacedCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {!isReplacedCollapsed && (
            <CardContent className="space-y-6">
            {loadingReplacedData ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading replaced comparison data...</span>
                </div>
              </div>
            ) : replacedCompareData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No replaced comparison data found</p>
                <p className="text-sm">Replaced comparisons will appear here when significant differences are detected</p>
              </div>
            ) : (
              <>
                {/* Summary Section */}
                <div className="bg-muted/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Summary Across All Replaced Items
                  </h3>
                  
                  {/* Calculate aggregated stats */}
                  {(() => {
                    const totalOldPnl = replacedCompareData.reduce((sum, item) => sum + item.analysis.headline.totalPnl, 0);
                    const totalNewPnl = Array.from(currentCompareDataMap.values()).reduce((sum, item) => sum + item.analysis.headline.totalPnl, 0);
                    const totalPnlDiff = totalNewPnl - totalOldPnl;
                    
                    const totalOldTrades = replacedCompareData.reduce((sum, item) => sum + item.analysis.headline.totalTrades, 0);
                    const totalNewTrades = Array.from(currentCompareDataMap.values()).reduce((sum, item) => sum + item.analysis.headline.totalTrades, 0);
                    const totalTradesDiff = totalNewTrades - totalOldTrades;
                    
                    const totalOldWins = replacedCompareData.reduce((sum, item) => sum + item.analysis.headline.wins, 0);
                    const totalNewWins = Array.from(currentCompareDataMap.values()).reduce((sum, item) => sum + item.analysis.headline.wins, 0);
                    const totalWinsDiff = totalNewWins - totalOldWins;
                    
                    const totalOldLosses = replacedCompareData.reduce((sum, item) => sum + item.analysis.headline.losses, 0);
                    const totalNewLosses = Array.from(currentCompareDataMap.values()).reduce((sum, item) => sum + item.analysis.headline.losses, 0);
                    const totalLossesDiff = totalNewLosses - totalOldLosses;
                    
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Total PnL Difference */}
                        <div className={`space-y-2 p-4 rounded-lg border ${getPnlColor(totalPnlDiff) === 'text-green-600' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium text-muted-foreground">Total PnL Change</span>
                            </div>
                            {totalPnlDiff !== 0 && (
                              <div className="flex items-center gap-1 text-xs font-medium">
                                {totalPnlDiff > 0 ? (
                                  <span className="text-green-600">+{formatCurrency(totalPnlDiff)}</span>
                                ) : (
                                  <span className="text-red-600">{formatCurrency(totalPnlDiff)}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {totalPnlDiff >= 0 ? (
                              <TrendingUp className="h-5 w-5 text-green-600" />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-red-600" />
                            )}
                            <span className={`text-2xl font-bold ${getPnlColor(totalPnlDiff)}`}>
                              {formatCurrency(totalPnlDiff)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {replacedCompareData.length} replaced items
                          </div>
                        </div>

                        {/* Total Trades Difference */}
                        <div className={`space-y-2 p-4 rounded-lg border ${totalTradesDiff >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium text-muted-foreground">Total Trades Change</span>
                            </div>
                            {totalTradesDiff !== 0 && (
                              <div className="flex items-center gap-1 text-xs font-medium">
                                {totalTradesDiff > 0 ? (
                                  <span className="text-blue-600">+{totalTradesDiff}</span>
                                ) : (
                                  <span className="text-orange-600">{totalTradesDiff}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-2xl font-bold ${totalTradesDiff >= 0 ? 'text-blue-500' : 'text-orange-500'}`}>
                              {totalTradesDiff >= 0 ? '+' : ''}{totalTradesDiff}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {totalOldTrades} → {totalNewTrades} trades
                          </div>
                        </div>

                        {/* Win/Loss Breakdown */}
                        <div className={`space-y-2 p-4 rounded-lg border ${totalWinsDiff >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium text-muted-foreground">Win/Loss Change</span>
                            </div>
                            {totalWinsDiff !== 0 && (
                              <div className="flex items-center gap-1 text-xs font-medium">
                                {totalWinsDiff > 0 ? (
                                  <span className="text-green-600">+{totalWinsDiff}</span>
                                ) : (
                                  <span className="text-red-600">{totalWinsDiff}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="text-lg font-bold text-green-500">
                                {totalWinsDiff >= 0 ? '+' : ''}{totalWinsDiff}
                              </div>
                              <div className="text-xs text-muted-foreground">Wins</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-red-500">
                                {totalLossesDiff >= 0 ? '+' : ''}{totalLossesDiff}
                              </div>
                              <div className="text-xs text-muted-foreground">Losses</div>
                            </div>
                          </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="space-y-2 p-4 rounded-lg border bg-muted/50">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Summary</span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Items:</span>
                              <span className="font-medium">{replacedCompareData.length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Old Total:</span>
                              <span className={`font-medium ${getPnlColor(totalOldPnl)}`}>
                                {formatCurrency(totalOldPnl)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>New Total:</span>
                              <span className={`font-medium ${getPnlColor(totalNewPnl)}`}>
                                {formatCurrency(totalNewPnl)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Individual Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Replaced Comparisons ({replacedCompareData.length})</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchReplacedCompareData}
                      disabled={loadingReplacedData}
                    >
                      <Loader2 className={`h-4 w-4 mr-2 ${loadingReplacedData ? 'animate-spin' : 'hidden'}`} />
                      Refresh
                    </Button>
                  </div>
                  
                  <div className="space-y-6 max-h-96 overflow-y-auto">
                    {(() => {
                      // Group items by month
                      const groupedByMonth = replacedCompareData.reduce((groups, item) => {
                        const date = new Date(item.date);
                        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        const monthLabel = date.toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long' 
                        });
                        
                        if (!groups[monthKey]) {
                          groups[monthKey] = {
                            monthLabel,
                            items: []
                          };
                        }
                        groups[monthKey].items.push(item);
                        return groups;
                      }, {} as Record<string, { monthLabel: string; items: ReplacedCompareData[] }>);

                      // Sort months chronologically (newest first)
                      const sortedMonths = Object.entries(groupedByMonth)
                        .sort(([a], [b]) => b.localeCompare(a));

                      return sortedMonths.map(([monthKey, { monthLabel, items }]) => (
                        <div key={monthKey} className="space-y-3">
                          {/* Month Header */}
                          <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-border"></div>
                            <h4 className="text-lg font-semibold text-muted-foreground px-4 py-2 bg-muted/50 rounded-lg">
                              {monthLabel} ({items.length} item{items.length !== 1 ? 's' : ''})
                            </h4>
                            <div className="h-px flex-1 bg-border"></div>
                          </div>
                          
                          {/* Month Summary */}
                          <div className="bg-muted/20 rounded-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              {(() => {
                                const monthOldPnl = items.reduce((sum, item) => sum + item.analysis.headline.totalPnl, 0);
                                const monthNewPnl = items.reduce((sum, item) => {
                                  const currentData = currentCompareDataMap.get(item.date);
                                  return sum + (currentData?.analysis.headline.totalPnl || 0);
                                }, 0);
                                const monthPnlDiff = monthNewPnl - monthOldPnl;
                                
                                const monthOldTrades = items.reduce((sum, item) => sum + item.analysis.headline.totalTrades, 0);
                                const monthNewTrades = items.reduce((sum, item) => {
                                  const currentData = currentCompareDataMap.get(item.date);
                                  return sum + (currentData?.analysis.headline.totalTrades || 0);
                                }, 0);
                                const monthTradesDiff = monthNewTrades - monthOldTrades;
                                
                                return (
                                  <>
                                    <div className="text-center">
                                      <div className="text-xs text-muted-foreground mb-1">Month PnL Change</div>
                                      <div className={`font-medium text-lg ${getPnlColor(monthPnlDiff)}`}>
                                        {formatCurrency(monthPnlDiff)}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {formatCurrency(monthOldPnl)} → {formatCurrency(monthNewPnl)}
                                      </div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-xs text-muted-foreground mb-1">Month Trades Change</div>
                                      <div className={`font-medium text-lg ${monthTradesDiff >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                        {monthTradesDiff >= 0 ? '+' : ''}{monthTradesDiff}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {monthOldTrades} → {monthNewTrades} trades
                                      </div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-xs text-muted-foreground mb-1">Items in Month</div>
                                      <div className="font-medium text-lg text-foreground">
                                        {items.length}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {items.length === 1 ? 'Replaced item' : 'Replaced items'}
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          
                          {/* Items Grid for this month */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {items.map((item) => {
                              const currentData = currentCompareDataMap.get(item.date);
                              const isLoadingCurrent = loadingCurrentDataMap.has(item.date);
                              const oldPnl = item.analysis.headline.totalPnl;
                              const newPnl = currentData?.analysis.headline.totalPnl;
                              const pnlDifference = newPnl !== undefined ? newPnl - oldPnl : undefined;

                              return (
                                <div
                                  key={`${item.date}-${item.metadata?.replacedAt}`}
                                  className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                                  onClick={() => handleReplacedDataClick(item)}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="text-xs">
                                        {item.date}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                                        Replaced
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <div title="View details">
                                        <Eye 
                                          className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" 
                                        />
                                      </div>
                                      <button
                                        onClick={(e) => handleDeleteReplacedData(item, e)}
                                        className="h-6 w-6 text-muted-foreground hover:text-red-600 hover:bg-red-50 hover:border-red-200 cursor-pointer transition-colors border border-muted-foreground/20 rounded flex items-center justify-center shadow-sm hover:shadow-md"
                                        title="Delete replaced comparison data"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="14"
                                          height="14"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <path d="M18 6 6 18" />
                                          <path d="m6 6 12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {/* PnL Comparison */}
                                  <div className="mb-2">
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                      <div className="text-center">
                                        <div className="text-xs text-muted-foreground mb-1">Old PnL</div>
                                        <div className={`font-medium ${getPnlColor(oldPnl)}`}>
                                          {formatCurrency(oldPnl)}
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-xs text-muted-foreground mb-1">New PnL</div>
                                        <div className={`font-medium ${isLoadingCurrent ? 'text-muted-foreground' : newPnl !== undefined ? getPnlColor(newPnl) : 'text-muted-foreground'}`}>
                                          {isLoadingCurrent ? 'Loading...' : newPnl !== undefined ? formatCurrency(newPnl) : 'N/A'}
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-xs text-muted-foreground mb-1">Difference</div>
                                        <div className={`font-medium ${isLoadingCurrent ? 'text-muted-foreground' : pnlDifference !== undefined ? getPnlColor(pnlDifference) : 'text-muted-foreground'}`}>
                                          {isLoadingCurrent ? 'Loading...' : pnlDifference !== undefined ? formatCurrency(pnlDifference) : 'N/A'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Other Stats */}
                                  <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Trades:</span>
                                      <span className="ml-1 font-medium">{item.analysis.headline.totalTrades}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Wins:</span>
                                      <span className="ml-1 font-medium text-green-600">{item.analysis.headline.wins}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Losses:</span>
                                      <span className="ml-1 font-medium text-red-600">{item.analysis.headline.losses}</span>
                                    </div>
                                  </div>
                                  
                                  {item.metadata?.replacedAt && (
                                    <div className="text-xs text-muted-foreground mt-2">
                                      Replaced: {new Date(item.metadata.replacedAt).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </>
            )}
          </CardContent>)}
        </Card>
      </div>

      {/* Tag Management Section */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                <div>
                  <CardTitle>Tag Management</CardTitle>
                  <CardDescription>
                    Create, edit, and delete tags for categorizing trading data
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTagManagerCollapsed(!isTagManagerCollapsed)}
                className="p-2"
              >
                {isTagManagerCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {!isTagManagerCollapsed && (
            <CardContent>
              <TagManager />
            </CardContent>
          )}
        </Card>
      </div>

      {/* Data Visualization Dialog */}
      <Dialog open={isDataVisualizationOpen} onOpenChange={setIsDataVisualizationOpen}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] w-[98vw] h-[98vh] overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Data Visualization
            </DialogTitle>
            <DialogDescription>
              Explore and visualize the structure and content of raw data files
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 overflow-hidden flex flex-col h-full">
            {/* File Selection and Controls */}
            <div className="space-y-3 flex-shrink-0">
              {/* Row 1: File Selection */}
              <div>
                <label className="block text-sm font-medium mb-1">Select File to Visualize</label>
                <select
                  value={selectedFile}
                  onChange={(e) => {
                    setSelectedFile(e.target.value);
                    if (e.target.value) {
                      fetchFileData(e.target.value);
                    } else {
                      setFileData(null);
                    }
                  }}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  <option value="">Choose a file...</option>
                  {existingFiles.map((file) => (
                    <option key={file.name} value={file.name}>
                      {file.name} ({file.size})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Row 2: Action Buttons */}
              {selectedFile && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => fetchFileData(selectedFile)}
                    disabled={loadingFileData}
                    variant="outline"
                    className="flex-1"
                  >
                    {loadingFileData ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4 mr-2" />
                    )}
                    {loadingFileData ? 'Loading...' : 'Refresh'}
                  </Button>
                  
                  <Button
                    onClick={() => fileData && expandAllNodes(fileData)}
                    disabled={!fileData || loadingFileData}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Expand All
                  </Button>
                  
                  <Button
                    onClick={collapseAllNodes}
                    disabled={expandedNodes.size === 0}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Collapse All
                  </Button>
                </div>
              )}
            </div>

            {/* Data Display - Takes remaining height */}
            {selectedFile && (
              <div className="flex-1 overflow-hidden">
                <Tabs defaultValue="structure" className="w-full h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                    <TabsTrigger value="structure">Structure</TabsTrigger>
                    <TabsTrigger value="data">Raw Data</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="structure" className="mt-2 flex-1 overflow-hidden">
                    {loadingFileData ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        Loading file structure...
                      </div>
                    ) : fileData ? (
                      <div className="border rounded-lg p-4 bg-muted/20 h-full overflow-auto">
                        <div className="font-mono text-sm">
                          {renderJsonNode(fileData)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Select a file to view its structure
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="data" className="mt-2 flex-1 overflow-hidden">
                    {loadingFileData ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        Loading file data...
                      </div>
                    ) : fileData ? (
                      <div className="border rounded-lg p-4 bg-muted/20 h-full overflow-auto">
                        <pre className="font-mono text-sm whitespace-pre-wrap">
                          {JSON.stringify(fileData, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Select a file to view its raw data
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Replaced Comparison Dialog */}
      <ReplacedCompareDialog
        isOpen={isReplacedDialogOpen}
        onClose={() => {
          setIsReplacedDialogOpen(false);
          setSelectedReplacedData(null);
        }}
        replacedData={selectedReplacedData}
        onDelete={handleReplacedDataDelete}
      />
    </div>
  );
} 