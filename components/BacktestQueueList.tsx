"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  List, 
  Filter, 
  ArrowUpDown, 
  Clock, 
  CheckCircle2, 
  Trash2,
  Calendar,
  Flag
} from "lucide-react";
import { toast } from "sonner";
import type { BacktestQueueItem, BacktestPriority, BacktestStatus } from "@/lib/backtest-queue-store";

interface BacktestQueueListProps {
  queueItems: BacktestQueueItem[];
  onUpdateItem: (date: string, updates: Partial<BacktestQueueItem>) => void;
  onRemoveItems: (dates: string[]) => void;
  onBulkUpdatePriority: (dates: string[], priority: BacktestPriority) => void;
  loading?: boolean;
}

type SortField = 'date' | 'priority' | 'status' | 'addedAt';
type SortDirection = 'asc' | 'desc';

export function BacktestQueueList({ 
  queueItems, 
  onUpdateItem, 
  onRemoveItems, 
  onBulkUpdatePriority,
  loading = false 
}: BacktestQueueListProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<BacktestStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<BacktestPriority | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter and sort items
  const filteredAndSortedItems = queueItems
    .filter(item => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
      if (searchTerm && !item.date.includes(searchTerm) && !item.notes?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'date':
          // Sort by string comparison to avoid timezone issues
          comparison = a.date.localeCompare(b.date);
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'addedAt':
          // addedAt is ISO timestamp, Date parsing is okay
          comparison = new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'desc' ? -comparison : comparison;
    });

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filteredAndSortedItems.map(item => item.date)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (date: string, checked: boolean) => {
    const newSelection = new Set(selectedItems);
    if (checked) {
      newSelection.add(date);
    } else {
      newSelection.delete(date);
    }
    setSelectedItems(newSelection);
  };

  // Bulk actions
  const handleBulkRemove = () => {
    if (selectedItems.size === 0) return;
    
    if (confirm(`Are you sure you want to remove ${selectedItems.size} items from the queue?`)) {
      onRemoveItems(Array.from(selectedItems));
      setSelectedItems(new Set());
      toast.success(`Removed ${selectedItems.size} items from queue`);
    }
  };

  const handleBulkPriorityUpdate = (priority: BacktestPriority) => {
    if (selectedItems.size === 0) return;
    
    onBulkUpdatePriority(Array.from(selectedItems), priority);
    toast.success(`Updated priority for ${selectedItems.size} items`);
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Status/priority display helpers
  const getStatusIcon = (status: BacktestStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: BacktestStatus) => {
    const variants: Record<BacktestStatus, { variant: any; className: string }> = {
      'pending': { variant: 'secondary', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
      'completed': { variant: 'secondary', className: 'bg-green-500/20 text-green-400 border-green-500/30' }
    };
    
    const config = variants[status];
    return (
      <Badge 
        variant={config.variant}
        className={config.className}
      >
        {status.replace('-', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: BacktestPriority) => {
    const variants: Record<BacktestPriority, { className: string }> = {
      'high': { className: 'bg-red-500/20 text-red-400 border-red-500/30' },
      'medium': { className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      'low': { className: 'bg-muted/30 text-muted-foreground border-muted/30' }
    };
    
    return (
      <Badge 
        variant="outline" 
        className={`${variants[priority].className} capitalize`}
      >
        <Flag className="w-3 h-3 mr-1" />
        {priority}
      </Badge>
    );
  };

  const formatDate = (dateStr: string) => {
    // Parse YYYY-MM-DD as local date to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const allSelected = filteredAndSortedItems.length > 0 && selectedItems.size === filteredAndSortedItems.length;
  const someSelected = selectedItems.size > 0 && selectedItems.size < filteredAndSortedItems.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <List className="w-5 h-5" />
            Backtest Queue ({filteredAndSortedItems.length})
          </CardTitle>
          
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{selectedItems.size} selected</span>
              <Select onValueChange={(value) => handleBulkPriorityUpdate(value as BacktestPriority)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Set Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkRemove}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as BacktestStatus | 'all')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
                              <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as BacktestPriority | 'all')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 max-w-sm">
            <Input
              placeholder="Search dates or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredAndSortedItems.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            No items found matching the current filters.
          </div>
        ) : (
          <>
            {/* Header Row */}
            <div className="flex items-center gap-4 pb-2 text-sm font-medium text-muted-foreground border-b">
              <div className="w-8">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  ref={(checkbox) => {
                    if (checkbox) (checkbox as any).indeterminate = someSelected;
                  }}
                />
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('date')}
                className="flex items-center gap-1 px-2"
              >
                <Calendar className="w-4 h-4" />
                Date
                <ArrowUpDown className="w-3 h-3" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('status')}
                className="flex items-center gap-1 px-2"
              >
                Status
                <ArrowUpDown className="w-3 h-3" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('priority')}
                className="flex items-center gap-1 px-2"
              >
                <Flag className="w-4 h-4" />
                Priority
                <ArrowUpDown className="w-3 h-3" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('addedAt')}
                className="flex items-center gap-1 px-2"
              >
                Added
                <ArrowUpDown className="w-3 h-3" />
              </Button>

              <div className="flex-1">Notes</div>
              <div className="w-16">Actions</div>
            </div>

            {/* Queue Items */}
            <div className="space-y-2 pt-2">
              {filteredAndSortedItems.map((item) => (
                <div
                  key={item.date}
                  className={`flex items-center gap-4 p-3 rounded-lg border ${
                    selectedItems.has(item.date) ? 'bg-blue-500/10 border-blue-500/30' : 'hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    checked={selectedItems.has(item.date)}
                    onCheckedChange={(checked) => handleSelectItem(item.date, checked as boolean)}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{formatDate(item.date)}</span>
                      {getStatusIcon(item.status)}
                      {getStatusBadge(item.status)}
                      {getPriorityBadge(item.priority)}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Added {formatRelativeTime(item.addedAt)}
                      {item.completedAt && ` • Completed ${formatRelativeTime(item.completedAt)}`}
                    </div>
                    
                    {item.notes && (
                      <div className="text-sm text-muted-foreground mt-1 p-2 bg-muted/50 rounded">
                        {item.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Select
                      value={item.priority}
                      onValueChange={(priority) => onUpdateItem(item.date, { priority: priority as BacktestPriority })}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveItems([item.date])}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
