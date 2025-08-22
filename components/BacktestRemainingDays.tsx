"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar,
  List, 
  Target,
  Flag
} from "lucide-react";
import { toast } from "sonner";
import type { BacktestQueueItem, BacktestPriority } from "@/lib/backtest-queue-store";

interface BacktestRemainingDaysProps {
  className?: string;
}

export interface BacktestRemainingDaysRef {
  refresh: () => Promise<void>;
}

type ViewMode = 'calendar' | 'list';
type SortOrder = 'newest' | 'oldest';

export const BacktestRemainingDays = forwardRef<BacktestRemainingDaysRef, BacktestRemainingDaysProps>(function BacktestRemainingDays({ className }, ref) {
  const [queueItems, setQueueItems] = useState<BacktestQueueItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortOrder, setSortOrder] = useState<SortOrder>('oldest');
  const [loading, setLoading] = useState(true);

  const fetchQueueItems = async () => {
    try {
      // Fetch both pending and completed items for visual feedback
      const [pendingResponse, completedResponse] = await Promise.all([
        fetch('/api/backtest-queue?status=pending'),
        fetch('/api/backtest-queue?status=completed')
      ]);
      
      if (!pendingResponse.ok || !completedResponse.ok) {
        throw new Error('Failed to fetch queue items');
      }
      
      const pendingData = await pendingResponse.json();
      const completedData = await completedResponse.json();
      
      // Combine pending and completed items, but limit completed to last 10 for performance
      const allItems = [
        ...(pendingData.items || []),
        ...((completedData.items || []).slice(0, 10))
      ];
      
      setQueueItems(allItems);
    } catch (error) {
      console.error('Error fetching queue items:', error);
      toast.error('Failed to load backtest queue items');
    } finally {
      setLoading(false);
    }
  };

  // Expose refresh method to parent via ref
  useImperativeHandle(ref, () => ({
    refresh: fetchQueueItems
  }));

  useEffect(() => {
    fetchQueueItems();
    // Refresh every 30 seconds to stay updated
    const interval = setInterval(fetchQueueItems, 30000);
    return () => clearInterval(interval);
  }, []);

  // Separate pending and completed items
  const pendingItems = queueItems.filter(item => item.status === 'pending');
  const completedItems = queueItems.filter(item => item.status === 'completed');

  const sortedItems = [...queueItems].sort((a, b) => {
    // Sort by string comparison to avoid timezone issues
    if (sortOrder === 'newest') {
      return b.date.localeCompare(a.date); // Newest first
    } else {
      return a.date.localeCompare(b.date); // Oldest first
    }
  });

  const formatDate = (dateStr: string) => {
    // Parse YYYY-MM-DD as local date to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      weekday: 'short'
    });
  };

  const formatDateLong = (dateStr: string) => {
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

  const getPriorityColor = (priority: BacktestPriority) => {
    switch (priority) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-orange-400';
      case 'low':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  const getPriorityBadge = (priority: BacktestPriority) => {
    const colors = {
      high: 'bg-red-500/20 text-red-400 border-red-500/30',
      medium: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      low: 'bg-muted/30 text-muted-foreground border-muted/30'
    };
    
    return (
      <Badge variant="outline" className={`${colors[priority]} text-xs`}>
        {priority}
      </Badge>
    );
  };

  // Group items by month for calendar view - only include months with pending items
  const groupedByMonth = sortedItems.reduce((acc, item) => {
    const monthKey = item.date.substring(0, 7); // YYYY-MM
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(item);
    return acc;
  }, {} as Record<string, BacktestQueueItem[]>);

  // Filter out months that only have completed items
  const filteredGroupedByMonth = Object.entries(groupedByMonth)
    .filter(([, items]) => items.some(item => item.status === 'pending'))
    .reduce((acc, [monthKey, items]) => {
      acc[monthKey] = items;
      return acc;
    }, {} as Record<string, BacktestQueueItem[]>);

  const renderCalendarView = () => {
    if (Object.keys(filteredGroupedByMonth).length === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No pending backtest items
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {Object.entries(filteredGroupedByMonth).map(([month, items]) => {
          // Parse month safely to avoid timezone issues
          const [year, monthNum] = month.split('-').map(Number);
          const monthName = new Date(year, monthNum - 1, 1).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long' 
          });
          
          // Create a map of pending items by day number
          const itemsByDay = items.reduce((acc, item) => {
            // Parse YYYY-MM-DD as local date to avoid timezone issues
            const day = parseInt(item.date.split('-')[2]);
            acc[day] = item;
            return acc;
          }, {} as Record<number, BacktestQueueItem>);
          
          // Get calendar info for the month
          const monthIndex = monthNum - 1;
          const firstDayOfMonth = new Date(year, monthIndex, 1);
          const lastDayOfMonth = new Date(year, monthIndex + 1, 0);
          const daysInMonth = lastDayOfMonth.getDate();
          const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
          
          // Create calendar grid
          const calendarDays = [];
          
          // Add empty cells for days before the first of the month
          for (let i = 0; i < startingDayOfWeek; i++) {
            calendarDays.push(
              <div key={`empty-start-${i}`} className="w-7 h-7" />
            );
          }
          
          // Add all days of the month
          for (let day = 1; day <= daysInMonth; day++) {
            const item = itemsByDay[day];
            
            if (item) {
              // Day has backtest (pending or completed)
              const isCompleted = item.status === 'completed';
              let dayClasses = 'w-7 h-7 text-xs font-medium rounded flex items-center justify-center border cursor-pointer transition-colors';
              
              if (isCompleted) {
                dayClasses += ' bg-green-500/10 text-green-400/80 border-green-500/30 hover:bg-green-500/15 opacity-70';
              } else {
                // Pending items - use priority colors
                if (item.priority === 'high') {
                  dayClasses += ' bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30';
                } else if (item.priority === 'medium') {
                  dayClasses += ' bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30';
                } else {
                  dayClasses += ' bg-muted/30 text-muted-foreground border-muted/30 hover:bg-muted/40';
                }
              }
              
              calendarDays.push(
                <div
                  key={day}
                  className={dayClasses}
                  title={`${formatDateLong(item.date)} - ${isCompleted ? 'Completed' : `${item.priority} priority`}`}
                >
                  {isCompleted ? '✓' : day}
                </div>
              );
            } else {
              // Regular day (no backtest pending)
              calendarDays.push(
                <div
                  key={day}
                  className="w-7 h-7 text-xs rounded flex items-center justify-center text-muted-foreground/40"
                >
                  {day}
                </div>
              );
            }
          }
          
          return (
            <div key={month} className="space-y-3">
              {/* Month Header */}
              <div className="text-sm font-medium text-center">
                {monthName}
              </div>
              
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <div key={index} className="w-7 h-6 text-xs font-medium text-muted-foreground flex items-center justify-center">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => {
    // Filter to only show pending items in list view
    const pendingItemsForList = sortedItems.filter(item => item.status === 'pending');
    
    if (pendingItemsForList.length === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No pending backtest items
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {pendingItemsForList.slice(0, 10).map((item) => {
          const baseClasses = "flex items-center justify-between p-2 rounded-lg transition-colors";
          const statusClasses = "bg-muted/20 hover:bg-muted/30";
          
          return (
            <div
              key={item.date}
              className={`${baseClasses} ${statusClasses}`}
            >
              <div className="flex items-center gap-2">
                <Flag className={`w-3 h-3 ${getPriorityColor(item.priority)}`} />
                <span className="text-sm font-medium">
                  {formatDate(item.date)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {getPriorityBadge(item.priority)}
              </div>
            </div>
          );
        })}
        
        {pendingItemsForList.length > 10 && (
          <div className="text-center pt-2">
            <span className="text-xs text-muted-foreground">
              +{pendingItemsForList.length - 10} more pending days
            </span>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" />
            Remaining Backtests
            {pendingItems.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingItems.length}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Sort Order */}
            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
              <SelectTrigger className="w-24 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('list')}
              >
                <List className="w-3 h-3" />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('calendar')}
              >
                <Calendar className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
        
        {(pendingItems.length > 0 || completedItems.length > 0) && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            {/* Pending Items */}
            {pendingItems.length > 0 && (
              <>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500/30 rounded-full" />
                  High: {pendingItems.filter(i => i.priority === 'high').length}
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-orange-500/30 rounded-full" />
                  Medium: {pendingItems.filter(i => i.priority === 'medium').length}
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-muted/30 rounded-full" />
                  Low: {pendingItems.filter(i => i.priority === 'low').length}
                </div>
              </>
            )}
            
            {/* Completed Items */}
            {completedItems.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500/30 rounded-full" />
                Completed: {completedItems.length}
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {viewMode === 'calendar' ? renderCalendarView() : renderListView()}
      </CardContent>
    </Card>
  );
});
