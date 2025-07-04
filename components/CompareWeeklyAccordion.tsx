"use client";
import { useState } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CompareTradingCard } from "@/components/CompareTradingCard";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Target, DollarSign, GitMerge } from "lucide-react";
import { toast } from "sonner";

interface CompareWeeklyAccordionProps {
  weeks: any[];
  onWeekMerged?: (weekStart: string) => void;
}

export function CompareWeeklyAccordion({ weeks, onWeekMerged }: CompareWeeklyAccordionProps) {
  const [openWeek, setOpenWeek] = useState(weeks.length > 0 ? weeks[0].weekStart : "");
  const [mergeLoading, setMergeLoading] = useState<Record<string, boolean>>({});
  const [verifyLoading, setVerifyLoading] = useState<Record<string, boolean>>({});

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      signDisplay: 'always'
    }).format(value)
  }

  const getPnlIcon = (value: number) => {
    return value >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
  }

  // Accepts analysis object and date
  const transformToDailyStats = (analysis: any, date: string) => {
    if (!analysis) return undefined;
    const dateParts = date.split('-');
    const localDate = new Date(
      Number(dateParts[0]),
      Number(dateParts[1]) - 1,
      Number(dateParts[2])
    );
    return {
      date: localDate,
      totalTrades: analysis.headline.totalTrades,
      wins: analysis.headline.wins,
      losses: analysis.headline.losses,
      totalPnl: analysis.headline.totalPnl,
      totalPoints: analysis.headline.trailingDrawdown || 0,
      trailingDrawdown: analysis.headline.trailingDrawdown || 0,
      contracts: analysis.headline.contracts || 0,
      bigWins: analysis.headline.bigWins || 0,
      bigLosses: analysis.headline.bigLosses || 0,
      maxPotentialGainPerContract: analysis.headline.maxPotentialGainPerContract || 0,
      pnlPerTrade: analysis.headline.pnlPerTrade || 0,
      maxProfit: analysis.headline.maxProfit || 0,
      maxRisk: analysis.headline.maxRisk || 0,
      maxDailyGain: analysis.headline.maxDailyGain || 0,
      maxDailyLoss: analysis.headline.maxDailyLoss || 0,
      sessionBreakdown: {
        morning: analysis.sessions?.morning || { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
        main: analysis.sessions?.main || { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
        midday: analysis.sessions?.midday || { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
        afternoon: analysis.sessions?.afternoon || { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
        end: analysis.sessions?.end || { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
      },
      protectionStats: analysis.protectionStats,
      tradeList: analysis.tradeList || [],
    };
  };

  // Nuanced PnL diff color function (match CompareTradingCard)
  const getPnlDiffColor = (value: number) => {
    const abs = Math.abs(value);
    if (value >= 0) {
      if (abs < 40) return 'text-gray-100';
      if (abs < 150) return 'text-green-400';
      if (abs < 300) return 'text-green-600 font-bold';
      return 'text-green-800 font-extrabold';
    } else {
      if (abs < 40) return 'text-gray-100';
      if (abs < 150) return 'text-red-400';
      if (abs < 300) return 'text-red-600 font-bold';
      return 'text-red-800 font-extrabold';
    }
  };

  const verifyWeek = async (weekStart: string) => {
    setVerifyLoading(prev => ({ ...prev, [weekStart]: true }));
    
    try {
      const response = await fetch('/api/trading-data/compare/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verifyWeek',
          date: weekStart,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Call the callback to notify parent component
        if (onWeekMerged) {
          onWeekMerged(weekStart);
        }
        // Show success toast
        toast.success('Week verified successfully!', {
          description: result.message || 'All compare data for the week has been marked as verified.'
        });
      } else {
        console.error('Verification failed:', result.error);
        toast.error('Failed to verify week data', {
          description: result.error
        });
      }
    } catch (error) {
      console.error('Error verifying week:', error);
      toast.error('Error verifying week data', {
        description: 'An unexpected error occurred while verifying the week data.'
      });
    } finally {
      setVerifyLoading(prev => ({ ...prev, [weekStart]: false }));
    }
  };

  const mergeWeek = async (weekStart: string) => {
    setMergeLoading(prev => ({ ...prev, [weekStart]: true }));
    
    try {
      const response = await fetch('/api/trading-data/compare/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'mergeWeek',
          date: weekStart,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Call the callback to notify parent component
        if (onWeekMerged) {
          onWeekMerged(weekStart);
        }
        // Show success toast
        toast.success('Week merged successfully!', {
          description: result.message || 'All compare data for the week has been merged to base data.'
        });
      } else {
        console.error('Merge failed:', result.error);
        toast.error('Failed to merge week data', {
          description: result.error
        });
      }
    } catch (error) {
      console.error('Error merging week:', error);
      toast.error('Error merging week data', {
        description: 'An unexpected error occurred while merging the week data.'
      });
    } finally {
      setMergeLoading(prev => ({ ...prev, [weekStart]: false }));
    }
  };

  // If no weeks are provided, show a message
  if (weeks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No weeks with unverified days found.</p>
        <p className="text-sm mt-2">All days in the available weeks have been verified.</p>
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible value={openWeek} onValueChange={setOpenWeek} className="w-full">
      {weeks.map((week: any) => {
        // Calculate Monday and Sunday for the week based on weekStart (no timezone conversion)
        const [sy, sm, sd] = week.weekStart.split('-');
        const weekStartDate = new Date(Number(sy), Number(sm) - 1, Number(sd));
        const dayOfWeek = weekStartDate.getDay();
        const monday = new Date(weekStartDate);
        monday.setDate(weekStartDate.getDate() - ((dayOfWeek + 6) % 7));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        // Filter days with both baseAnalysis and compareAnalysis
        const daysWithData = week.days.filter((day: any) => day.baseAnalysis && day.compareAnalysis);

        // Calculate diffs for the week
        // Calculate sum of daily PnL diffs for the week
        let sumDailyPnlDiff = 0;
        week.days.forEach((day: any) => {
          const baseStats = day.baseAnalysis ? transformToDailyStats(day.baseAnalysis, day.date) : null;
          const compareStats = day.compareAnalysis ? transformToDailyStats(day.compareAnalysis, day.date) : null;
          if (baseStats && compareStats) {
            sumDailyPnlDiff += (compareStats.totalPnl - baseStats.totalPnl);
          }
        });
        const diff = {
          pnlDiff: sumDailyPnlDiff,
          tradesDiff: (week.compareHeadline.totalTrades || 0) - (week.baseHeadline.totalTrades || 0),
          winsDiff: (week.compareHeadline.wins || 0) - (week.baseHeadline.wins || 0),
          lossesDiff: (week.compareHeadline.losses || 0) - (week.baseHeadline.losses || 0),
          hasChanges:
            sumDailyPnlDiff !== 0 ||
            (week.compareHeadline.totalTrades || 0) !== (week.baseHeadline.totalTrades || 0) ||
            (week.compareHeadline.wins || 0) !== (week.baseHeadline.wins || 0) ||
            (week.compareHeadline.losses || 0) !== (week.baseHeadline.losses || 0)
        };

        // Split days into those with and without significant differences
        const daysWithDiffs: any[] = [];
        const daysNoDiffs: any[] = [];
        week.days.forEach((day: any) => {
          const baseStats = day.baseAnalysis ? transformToDailyStats(day.baseAnalysis, day.date) : null;
          const compareStats = day.compareAnalysis ? transformToDailyStats(day.compareAnalysis, day.date) : null;
          
          if (!baseStats && !compareStats) return;

          const pnlDiff = (compareStats?.totalPnl ?? 0) - (baseStats?.totalPnl ?? 0);
          const tradesDiff = (compareStats?.totalTrades ?? 0) - (baseStats?.totalTrades ?? 0);
          const winsDiff = (compareStats?.wins ?? 0) - (baseStats?.wins ?? 0);
          const lossesDiff = (compareStats?.losses ?? 0) - (baseStats?.losses ?? 0);
          const bigWinDiff = (compareStats?.bigWins ?? 0) - (baseStats?.bigWins ?? 0);
          const bigLossDiff = (compareStats?.bigLosses ?? 0) - (baseStats?.bigLosses ?? 0);
          
          const hasChanges = pnlDiff !== 0 || tradesDiff !== 0 || winsDiff !== 0 || lossesDiff !== 0 || bigWinDiff !== 0 || bigLossDiff !== 0;

          if (hasChanges) {
            daysWithDiffs.push(day);
          } else {
            daysNoDiffs.push(day);
          }
        });

        return (
          <AccordionItem key={week.weekStart} value={week.weekStart} className="border rounded-lg mb-4">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-lg">
                      Week of {format(monday, 'MMM dd')} - {format(sunday, 'MMM dd, yyyy')}
                    </span>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {daysWithData.length} day{daysWithData.length !== 1 ? 's' : ''}
                      </Badge>
                      {diff.hasChanges && (
                        <>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span className={`font-semibold ${getPnlDiffColor(diff.pnlDiff)}`}>
                              {formatCurrency(diff.pnlDiff)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {diff.winsDiff >= 0 ? '+' : ''}{diff.winsDiff}W / {diff.lossesDiff >= 0 ? '+' : ''}{diff.lossesDiff}L
                            </span>
                          </div>
                          <Badge variant="outline">
                            {diff.tradesDiff >= 0 ? '+' : ''}{diff.tradesDiff} trades
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {diff.hasChanges && getPnlIcon(diff.pnlDiff)}
                    <div
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 ml-2 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        verifyWeek(week.weekStart);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          e.preventDefault();
                          verifyWeek(week.weekStart);
                        }
                      }}
                    >
                      <Target className="w-4 h-4 mr-1" />
                      {verifyLoading[week.weekStart] ? 'Verifying...' : 'Verify Week'}
                    </div>
                    <div
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 ml-2 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        mergeWeek(week.weekStart);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          e.preventDefault();
                          mergeWeek(week.weekStart);
                        }
                      }}
                    >
                      <GitMerge className="w-4 h-4 mr-1" />
                      {mergeLoading[week.weekStart] ? 'Merging...' : 'Merge Week'}
                    </div>
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              {/* Days with significant differences */}
              {daysWithDiffs.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-4">
                  {daysWithDiffs
                    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((day: any) => {
                      const baseStats = day.baseAnalysis ? transformToDailyStats(day.baseAnalysis, day.date) : null;
                      const compareStats = day.compareAnalysis ? transformToDailyStats(day.compareAnalysis, day.date) : null;
                      if (!baseStats || !compareStats) return null;
                      return (
                        <CompareTradingCard
                          key={day.date}
                          baseStats={baseStats}
                          compareStats={compareStats}
                          metadata={day.metadata}
                          onMerge={() => onWeekMerged?.(week.weekStart)}
                        />
                      );
                    })}
                </div>
              )}
              {/* Days with no significant differences */}
              {daysNoDiffs.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground mb-2">No Significant Differences</div>
                  <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {daysNoDiffs
                      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((day: any) => {
                        const baseStats = day.baseAnalysis ? transformToDailyStats(day.baseAnalysis, day.date) : null;
                        const compareStats = day.compareAnalysis ? transformToDailyStats(day.compareAnalysis, day.date) : null;
                        if (!baseStats || !compareStats) return null;
                        return (
                          <CompareTradingCard
                            key={day.date}
                            baseStats={baseStats}
                            compareStats={compareStats}
                            metadata={day.metadata}
                            onMerge={() => onWeekMerged?.(week.weekStart)}
                          />
                        );
                      })}
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
} 