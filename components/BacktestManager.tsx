"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  List, 
  Plus, 
  Target, 
  Clock, 
  CheckCircle2, 
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { BacktestCalendar } from "./BacktestCalendar";
import { BacktestQueueList } from "./BacktestQueueList";
import type { BacktestQueueItem, BacktestPriority } from "@/lib/backtest-queue-store";

interface AvailableDatesResponse {
  success: boolean;
  availableDates: string[];
  groupedByMonth: Record<string, string[]>;
  stats: {
    totalAvailable: number;
    filteredCount: number;
    totalBaseDays: number;
    totalComparedDays: number;
    monthsWithAvailableDates: number;
    availableForNewBacktest: number;
    availableForRetest: number;
  };
}

interface QueueStatsResponse {
  total: number;
  pending: number;
  completed: number;
  byPriority: Record<BacktestPriority, number>;
}

export function BacktestManager() {
  // State
  const [activeView, setActiveView] = useState<'calendar' | 'list'>('calendar');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [queueItems, setQueueItems] = useState<BacktestQueueItem[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableStats, setAvailableStats] = useState<AvailableDatesResponse['stats'] | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStatsResponse | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<BacktestPriority>('medium');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch data
  const fetchAvailableDates = async (month?: string) => {
    try {
      const params = new URLSearchParams();
      if (month) params.append('month', month);
      
      const response = await fetch(`/api/backtest-queue/available-dates?${params}`);
      if (!response.ok) throw new Error('Failed to fetch available dates');
      
      const data: AvailableDatesResponse = await response.json();
      setAvailableDates(data.availableDates);
      setAvailableStats(data.stats);
    } catch (error) {
      console.error('Error fetching available dates:', error);
      toast.error('Failed to load available dates');
    }
  };

  const fetchQueueItems = async () => {
    try {
      const response = await fetch('/api/backtest-queue');
      if (!response.ok) throw new Error('Failed to fetch queue items');
      
      const data = await response.json();
      setQueueItems(data.items || []);
    } catch (error) {
      console.error('Error fetching queue items:', error);
      toast.error('Failed to load backtest queue');
    }
  };

  const fetchQueueStats = async () => {
    try {
      const response = await fetch('/api/backtest-queue?statsOnly=true');
      if (!response.ok) throw new Error('Failed to fetch queue stats');
      
      const data: QueueStatsResponse = await response.json();
      setQueueStats(data);
    } catch (error) {
      console.error('Error fetching queue stats:', error);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAvailableDates(selectedMonth),
        fetchQueueItems(),
        fetchQueueStats()
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchAllData();
  }, [selectedMonth]);

  // Handlers
  const handleAddToQueue = async () => {
    if (selectedDates.length === 0) {
      toast.error('Please select dates to add to the queue');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/backtest-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addMultiple',
          dates: selectedDates,
          priority: selectedPriority
        }),
      });

      if (!response.ok) throw new Error('Failed to add dates to queue');

      setSelectedDates([]);
      await fetchQueueItems();
      await fetchQueueStats();
      toast.success(`Added ${selectedDates.length} dates to backtest queue`);
    } catch (error) {
      console.error('Error adding to queue:', error);
      toast.error('Failed to add dates to queue');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateItem = async (date: string, updates: Partial<BacktestQueueItem>) => {
    try {
      if (updates.priority) {
        await fetch('/api/backtest-queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updatePriority',
            date,
            priority: updates.priority
          }),
        });
      }

      if (updates.status) {
        await fetch('/api/backtest-queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateStatus',
            date,
            status: updates.status
          }),
        });
      }

      await fetchQueueItems();
      await fetchQueueStats();
      toast.success('Queue item updated');
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update queue item');
    }
  };

  const handleRemoveItems = async (dates: string[]) => {
    try {
      await fetch('/api/backtest-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'removeMultiple',
          dates
        }),
      });

      await fetchQueueItems();
      await fetchQueueStats();
      toast.success(`Removed ${dates.length} items from queue`);
    } catch (error) {
      console.error('Error removing items:', error);
      toast.error('Failed to remove items from queue');
    }
  };

  const handleBulkUpdatePriority = async (dates: string[], priority: BacktestPriority) => {
    try {
      await Promise.all(
        dates.map(date =>
          fetch('/api/backtest-queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'updatePriority',
              date,
              priority
            }),
          })
        )
      );

      await fetchQueueItems();
      await fetchQueueStats();
    } catch (error) {
      console.error('Error bulk updating priority:', error);
      toast.error('Failed to update priorities');
    }
  };

  const handleClearCompleted = async () => {
    if (!queueStats?.completed || queueStats.completed === 0) {
      toast.info('No completed items to clear');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${queueStats.completed} completed items from the queue?`)) {
      return;
    }

    try {
      const response = await fetch('/api/backtest-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clearCompleted' }),
      });

      if (!response.ok) throw new Error('Failed to clear completed items');

      await fetchQueueItems();
      await fetchQueueStats();
      toast.success('Cleared completed items from queue');
    } catch (error) {
      console.error('Error clearing completed:', error);
      toast.error('Failed to clear completed items');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <Target className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{availableStats?.totalAvailable || 0}</p>
              <p className="text-xs text-muted-foreground">Available Days</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <Clock className="h-8 w-8 text-orange-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{queueStats?.pending || 0}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <CheckCircle2 className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{queueStats?.completed || 0}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Management Controls */}
      {selectedDates.length > 0 && (
        <Card className="border-green-500/30 bg-green-500/10">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-green-400 bg-green-500/20 border-green-500/30">
                {selectedDates.length} dates selected
              </Badge>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">Priority:</label>
                <Select value={selectedPriority} onValueChange={(value) => setSelectedPriority(value as BacktestPriority)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleAddToQueue}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {submitting ? 'Adding...' : 'Add to Queue'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Interface */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'calendar' | 'list')}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              List View
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {queueStats && queueStats.completed > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCompleted}
                className="text-red-500 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Completed ({queueStats.completed})
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="calendar" className="space-y-4">
          <BacktestCalendar
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            onDatesSelected={setSelectedDates}
            queueItems={queueItems}
            availableDates={availableDates}
          />
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <BacktestQueueList
            queueItems={queueItems}
            onUpdateItem={handleUpdateItem}
            onRemoveItems={handleRemoveItems}
            onBulkUpdatePriority={handleBulkUpdatePriority}
            loading={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
