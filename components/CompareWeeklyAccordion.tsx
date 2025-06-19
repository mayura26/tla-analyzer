"use client";
import { useState } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CompareTradingCard } from "@/components/CompareTradingCard";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Target, DollarSign } from "lucide-react";

interface CompareWeeklyAccordionProps {
  weeks: any[];
}

export function CompareWeeklyAccordion({ weeks }: CompareWeeklyAccordionProps) {
  const [openWeek, setOpenWeek] = useState(weeks.length > 0 ? weeks[0].weekStart : "");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      signDisplay: 'always'
    }).format(value)
  }

  const getPnlColor = (value: number) => {
    return value >= 0 ? 'text-green-500' : 'text-red-500'
  }

  const getPnlIcon = (value: number) => {
    return value >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
  }

  const getWinRateColor = (wins: number, total: number) => {
    const rate = (wins / total) * 100
    if (rate >= 60) return 'text-green-500'
    if (rate >= 40) return 'text-yellow-500'
    return 'text-red-500'
  }

  // Accepts analysis object and date
  const transformToDailyStats = (analysis: any, date: string) => {
    if (!analysis) return undefined;
    let dateParts = date.split('-');
    let localDate = new Date(
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

  return (
    <Accordion type="single" collapsible value={openWeek} onValueChange={setOpenWeek} className="w-full">
      {weeks.map((week: any) => {
        // Calculate Monday and Sunday for the week based on weekStart (no timezone conversion)
        let [sy, sm, sd] = week.weekStart.split('-');
        let weekStartDate = new Date(Number(sy), Number(sm) - 1, Number(sd));
        let dayOfWeek = weekStartDate.getDay();
        let monday = new Date(weekStartDate);
        monday.setDate(weekStartDate.getDate() - ((dayOfWeek + 6) % 7));
        let sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        // Calculate diffs for the week
        const diff = {
          pnlDiff: (week.compareHeadline.totalPnl || 0) - (week.baseHeadline.totalPnl || 0),
          tradesDiff: (week.compareHeadline.totalTrades || 0) - (week.baseHeadline.totalTrades || 0),
          winsDiff: (week.compareHeadline.wins || 0) - (week.baseHeadline.wins || 0),
          lossesDiff: (week.compareHeadline.losses || 0) - (week.baseHeadline.losses || 0),
          hasChanges:
            (week.compareHeadline.totalPnl || 0) !== (week.baseHeadline.totalPnl || 0) ||
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
          if (!baseStats || !compareStats) return;
          const pnlDiff = (compareStats.totalPnl ?? 0) - (baseStats.totalPnl ?? 0);
          const tradesDiff = (compareStats.totalTrades ?? 0) - (baseStats.totalTrades ?? 0);
          const winsDiff = (compareStats.wins ?? 0) - (baseStats.wins ?? 0);
          const lossesDiff = (compareStats.losses ?? 0) - (baseStats.losses ?? 0);
          const bigWinDiff = (compareStats.bigWins ?? 0) - (baseStats.bigWins ?? 0);
          const bigLossDiff = (compareStats.bigLosses ?? 0) - (baseStats.bigLosses ?? 0);
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
                    {diff.hasChanges && (
                      <div className="flex items-center gap-4 mt-2">
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
                      </div>
                    )}
                  </div>
                  {diff.hasChanges && (
                    <div className="flex items-center gap-2">
                      {getPnlIcon(diff.pnlDiff)}
                    </div>
                  )}
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