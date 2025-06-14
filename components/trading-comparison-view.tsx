"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

interface DayComparison {
  date: Date;
  hasChanges: boolean;
  changes: {
    trades: {
      added: any[];
      removed: any[];
      modified: any[];
    };
    dailyStats: any[];
  };
}

interface TradingComparisonViewProps {
  comparisonResults: any;
  onUpdateBase: (options: {
    mergeAll?: boolean;
    mergeTradeIds?: number[];
    mergeDailyStats?: boolean;
    selectedDates?: Date[];
  }) => void;
}

export function TradingComparisonView({ comparisonResults, onUpdateBase }: TradingComparisonViewProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedTradeIds, setSelectedTradeIds] = useState<number[]>([]);
  const [mergeDailyStats, setMergeDailyStats] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Group changes by date
  const daysWithChanges = new Map<string, DayComparison>();
  
  // Process trades
  comparisonResults.differences.trades.added.forEach((trade: any) => {
    const date = new Date(trade.timestamp);
    const dateKey = format(date, 'yyyy-MM-dd');
    if (!daysWithChanges.has(dateKey)) {
      daysWithChanges.set(dateKey, {
        date,
        hasChanges: true,
        changes: {
          trades: { added: [], removed: [], modified: [] },
          dailyStats: []
        }
      });
    }
    daysWithChanges.get(dateKey)!.changes.trades.added.push(trade);
  });

  comparisonResults.differences.trades.removed.forEach((trade: any) => {
    const date = new Date(trade.timestamp);
    const dateKey = format(date, 'yyyy-MM-dd');
    if (!daysWithChanges.has(dateKey)) {
      daysWithChanges.set(dateKey, {
        date,
        hasChanges: true,
        changes: {
          trades: { added: [], removed: [], modified: [] },
          dailyStats: []
        }
      });
    }
    daysWithChanges.get(dateKey)!.changes.trades.removed.push(trade);
  });

  comparisonResults.differences.trades.modified.forEach(({ trade, changes }: any) => {
    const date = new Date(trade.timestamp);
    const dateKey = format(date, 'yyyy-MM-dd');
    if (!daysWithChanges.has(dateKey)) {
      daysWithChanges.set(dateKey, {
        date,
        hasChanges: true,
        changes: {
          trades: { added: [], removed: [], modified: [] },
          dailyStats: []
        }
      });
    }
    daysWithChanges.get(dateKey)!.changes.trades.modified.push({ trade, changes });
  });

  // Process daily stats
  comparisonResults.differences.dailyStats.forEach((change: any) => {
    const date = new Date(comparisonResults.compare.dailyStats.date);
    const dateKey = format(date, 'yyyy-MM-dd');
    if (!daysWithChanges.has(dateKey)) {
      daysWithChanges.set(dateKey, {
        date,
        hasChanges: true,
        changes: {
          trades: { added: [], removed: [], modified: [] },
          dailyStats: []
        }
      });
    }
    daysWithChanges.get(dateKey)!.changes.dailyStats.push(change);
  });

  const handleDateSelect = (date: Date) => {
    setSelectedDay(date);
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayChanges = daysWithChanges.get(dateKey);
    if (dayChanges) {
      // Select all trades for this day
      const tradeIds = [
        ...dayChanges.changes.trades.added.map((t: any) => t.id),
        ...dayChanges.changes.trades.modified.map(({ trade }: any) => trade.id)
      ];
      setSelectedTradeIds(tradeIds);
    }
  };

  const handleTradeSelection = (tradeId: number, checked: boolean) => {
    setSelectedTradeIds(prev => 
      checked 
        ? [...prev, tradeId]
        : prev.filter(id => id !== tradeId)
    );
  };

  const handleUpdateBase = () => {
    onUpdateBase({
      mergeTradeIds: selectedTradeIds,
      mergeDailyStats,
      selectedDates
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Calendar Overview */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Changes Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="multiple"
            selected={Array.from(daysWithChanges.values()).map(d => d.date)}
            onSelect={(dates) => setSelectedDates(dates || [])}
            modifiers={{
              hasChanges: (date) => daysWithChanges.has(format(date, 'yyyy-MM-dd'))
            }}
            modifiersStyles={{
              hasChanges: { backgroundColor: 'rgb(34 197 94 / 0.2)' }
            }}
            onDayClick={handleDateSelect}
          />
        </CardContent>
      </Card>

      {/* Day Details */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>
            {selectedDay ? format(selectedDay, 'MMMM d, yyyy') : 'Select a day to view changes'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDay && (
            <div className="space-y-4">
              {(() => {
                const dateKey = format(selectedDay, 'yyyy-MM-dd');
                const dayChanges = daysWithChanges.get(dateKey);
                if (!dayChanges) return <p>No changes for this day</p>;

                return (
                  <>
                    {/* Added Trades */}
                    {dayChanges.changes.trades.added.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Added Trades</h3>
                        {dayChanges.changes.trades.added.map((trade: any) => (
                          <div key={trade.id} className="flex items-center space-x-2 mb-2">
                            <Checkbox
                              id={`trade-${trade.id}`}
                              checked={selectedTradeIds.includes(trade.id)}
                              onCheckedChange={(checked) => 
                                handleTradeSelection(trade.id, checked as boolean)
                              }
                            />
                            <label htmlFor={`trade-${trade.id}`}>
                              Trade {trade.id}: {trade.direction} at {trade.entryPrice}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Modified Trades */}
                    {dayChanges.changes.trades.modified.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Modified Trades</h3>
                        {dayChanges.changes.trades.modified.map(({ trade, changes }: any) => (
                          <div key={trade.id} className="flex items-center space-x-2 mb-2">
                            <Checkbox
                              id={`trade-${trade.id}`}
                              checked={selectedTradeIds.includes(trade.id)}
                              onCheckedChange={(checked) => 
                                handleTradeSelection(trade.id, checked as boolean)
                              }
                            />
                            <label htmlFor={`trade-${trade.id}`}>
                              Trade {trade.id}: {changes.map((c: any) => 
                                `${c.field}: ${c.oldValue} → ${c.newValue}`
                              ).join(', ')}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Daily Stats Changes */}
                    {dayChanges.changes.dailyStats.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Daily Stats Changes</h3>
                        <div className="flex items-center space-x-2 mb-4">
                          <Checkbox
                            id="merge-daily-stats"
                            checked={mergeDailyStats}
                            onCheckedChange={(checked) => setMergeDailyStats(checked as boolean)}
                          />
                          <label htmlFor="merge-daily-stats">
                            Merge Daily Stats Changes
                          </label>
                        </div>
                        {dayChanges.changes.dailyStats.map((change: any, index: number) => (
                          <div key={index} className="ml-6 mb-2">
                            {change.field}: {JSON.stringify(change.oldValue)} → {JSON.stringify(change.newValue)}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end space-x-2 mt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSelectedDay(null);
                          setSelectedTradeIds([]);
                          setMergeDailyStats(false);
                        }}
                      >
                        Clear Selection
                      </Button>
                      <Button 
                        onClick={handleUpdateBase}
                        disabled={selectedTradeIds.length === 0 && !mergeDailyStats}
                      >
                        Update Base
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 