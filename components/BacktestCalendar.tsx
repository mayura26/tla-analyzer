"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import type { BacktestQueueItem, BacktestPriority } from "@/lib/backtest-queue-store";

interface BacktestCalendarProps {
  selectedMonth: string; // YYYY-MM format
  onMonthChange: (month: string) => void;
  onDatesSelected: (dates: string[]) => void;
  queueItems: BacktestQueueItem[];
  availableDates: string[];
}

interface DateInfo {
  date: string;
  status: 'available' | 'queued' | 'completed' | 'unavailable';
  priority?: BacktestPriority;
  queueItem?: BacktestQueueItem;
}

export function BacktestCalendar({ 
  selectedMonth, 
  onMonthChange, 
  onDatesSelected, 
  queueItems,
  availableDates 
}: BacktestCalendarProps) {
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

  // Parse current month
  const [year, month] = selectedMonth.split('-').map(Number);
  const currentDate = new Date(year, month - 1, 1);

  // Get month info
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' });
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  // Create date info map for the month
  const dateInfoMap = new Map<string, DateInfo>();
  
  // Initialize all dates in the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const queueItem = queueItems.find(item => item.date === date);
    const isAvailable = availableDates.includes(date);
    
    let status: DateInfo['status'] = 'unavailable';
    if (queueItem) {
      status = queueItem.status === 'completed' ? 'completed' : 'queued';
    } else if (isAvailable) {
      status = 'available';
    }

    dateInfoMap.set(date, {
      date,
      status,
      priority: queueItem?.priority,
      queueItem
    });
  }

  // Navigation functions
  const goToPreviousMonth = () => {
    const prevMonth = new Date(year, month - 2, 1);
    const monthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(monthStr);
  };

  const goToNextMonth = () => {
    const nextMonth = new Date(year, month, 1);
    const monthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(monthStr);
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(monthStr);
  };

  // Date selection functions
  const toggleDateSelection = (date: string) => {
    const dateInfo = dateInfoMap.get(date);
    if (!dateInfo || dateInfo.status === 'unavailable') return;

    const newSelected = new Set(selectedDates);
    if (newSelected.has(date)) {
      newSelected.delete(date);
    } else {
      newSelected.add(date);
    }
    setSelectedDates(newSelected);
    onDatesSelected(Array.from(newSelected));
  };

  const selectAllAvailable = () => {
    const availableInMonth = Array.from(dateInfoMap.values())
      .filter(info => info.status === 'available')
      .map(info => info.date);
    
    const newSelected = new Set(availableInMonth);
    setSelectedDates(newSelected);
    onDatesSelected(Array.from(newSelected));
    toast.success(`Selected ${availableInMonth.length} available dates`);
  };

  const clearSelection = () => {
    setSelectedDates(new Set());
    onDatesSelected([]);
  };

  // Get status styling
  const getDateStyling = (dateInfo: DateInfo, isSelected: boolean) => {
    const baseClasses = "w-10 h-10 text-sm font-medium rounded-lg flex items-center justify-center transition-colors cursor-pointer border";
    
    if (isSelected) {
      return `${baseClasses} bg-blue-500 text-white border-blue-600 hover:bg-blue-600`;
    }

    switch (dateInfo.status) {
      case 'completed':
        return `${baseClasses} bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30`;
      case 'queued':
        const priorityColors = {
          high: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
          medium: 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30',
          low: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30'
        };
        return `${baseClasses} ${priorityColors[dateInfo.priority || 'medium']}`;
      case 'available':
        return `${baseClasses} bg-muted/50 text-foreground border-border hover:bg-muted/70`;
      case 'unavailable':
      default:
        return `${baseClasses} bg-muted/30 text-muted-foreground/40 border-muted/20 cursor-not-allowed opacity-50`;
    }
  };

  // Create calendar grid
  const calendarDays = [];
  
  // Add empty cells for days before the first of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(
      <div key={`empty-${i}`} className="w-10 h-10" />
    );
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateInfo = dateInfoMap.get(date)!;
    const isSelected = selectedDates.has(date);

    calendarDays.push(
      <div
        key={date}
        className={getDateStyling(dateInfo, isSelected)}
        onClick={() => toggleDateSelection(date)}
        title={`${date} - ${dateInfo.status}${dateInfo.priority ? ` (${dateInfo.priority} priority)` : ''}`}
      >
        {day}
      </div>
    );
  }

  const stats = {
    available: Array.from(dateInfoMap.values()).filter(info => info.status === 'available').length,
    queued: Array.from(dateInfoMap.values()).filter(info => info.status === 'queued').length,
    completed: Array.from(dateInfoMap.values()).filter(info => info.status === 'completed').length,
    selected: selectedDates.size
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Backtest Calendar
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={goToCurrentMonth}
            className="text-sm"
          >
            Today
          </Button>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <h3 className="text-xl font-semibold">{monthName} {year}</h3>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllAvailable}
            disabled={stats.available === 0}
            className="text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Select All Available ({stats.available})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearSelection}
            disabled={stats.selected === 0}
            className="text-sm"
          >
            <Minus className="w-4 h-4 mr-1" />
            Clear Selection
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500/20 border border-green-500/30 rounded" />
            <span>Completed ({stats.completed})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500/20 border border-orange-500/30 rounded" />
            <span>Queued ({stats.queued})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted/50 border border-border rounded" />
            <span>Available ({stats.available})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 border border-blue-600 rounded" />
            <span>Selected ({stats.selected})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted/30 border border-muted/20 rounded opacity-50" />
            <span className="opacity-75">Unavailable</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays}
        </div>
      </CardContent>
    </Card>
  );
}
