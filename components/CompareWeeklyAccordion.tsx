"use client";
import { useState } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CompareTradingCard } from "@/components/CompareTradingCard";
import type { WeekLog, DailyLog } from "@/lib/trading-data-store";
import { DailyStats } from "@/lib/trading-log-parser";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Target, DollarSign } from "lucide-react";

interface CompareWeeklyAccordionProps {
  baseWeeks: WeekLog[];
  compareWeeks: WeekLog[];
}

export function CompareWeeklyAccordion({ baseWeeks, compareWeeks }: CompareWeeklyAccordionProps) {
  const [openWeek, setOpenWeek] = useState(baseWeeks.length > 0 ? baseWeeks[0].weekStart : "");

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

  const transformToDailyStats = (day: DailyLog): DailyStats => {
    const { analysis } = day;
    // Parse date as local (no UTC shift)
    let dateParts = day.date.split('-');
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
        morning: analysis.sessions.morning || { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
        main: analysis.sessions.main || { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
        midday: analysis.sessions.midday || { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
        afternoon: analysis.sessions.afternoon || { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
        end: analysis.sessions.end || { pnl: 0, trades: 0, avgPnlPerTrade: 0 },
      },
      protectionStats: analysis.protectionStats,
    };
  };

  const calculateWeekDifference = (baseWeek: WeekLog, compareWeek: WeekLog) => {
    const basePnl = baseWeek.weekHeadline.totalPnl ?? 0;
    const comparePnl = compareWeek.weekHeadline.totalPnl ?? 0;
    const pnlDiff = comparePnl - basePnl;
    const tradesDiff = (compareWeek.weekHeadline.totalTrades ?? 0) - (baseWeek.weekHeadline.totalTrades ?? 0);
    const winsDiff = (compareWeek.weekHeadline.wins ?? 0) - (baseWeek.weekHeadline.wins ?? 0);
    const lossesDiff = (compareWeek.weekHeadline.losses ?? 0) - (baseWeek.weekHeadline.losses ?? 0);

    return {
      pnlDiff,
      tradesDiff,
      winsDiff,
      lossesDiff,
      hasChanges: pnlDiff !== 0 || tradesDiff !== 0 || winsDiff !== 0 || lossesDiff !== 0
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
      {baseWeeks.map((baseWeek) => {
        const compareWeek = compareWeeks.find(w => w.weekStart === baseWeek.weekStart);
        if (!compareWeek) return null;

        // Find overlapping days by date
        const overlappingDates = baseWeek.days
          .map(day => day.date)
          .filter(date => compareWeek.days.some(cd => cd.date === date));
        const baseDays = baseWeek.days.filter(day => overlappingDates.includes(day.date));
        const compareDays = compareWeek.days.filter(day => overlappingDates.includes(day.date));

        // Recalculate weekHeadline for base and compare using only overlapping days
        const recalcHeadline = (days: DailyLog[]) => days.reduce((acc, d) => {
          acc.totalPnl = (acc.totalPnl || 0) + (d.analysis.headline.totalPnl || 0);
          acc.totalTrades = (acc.totalTrades || 0) + (d.analysis.headline.totalTrades || 0);
          acc.wins = (acc.wins || 0) + (d.analysis.headline.wins || 0);
          acc.losses = (acc.losses || 0) + (d.analysis.headline.losses || 0);
          return acc;
        }, {} as any);
        const baseHeadline = recalcHeadline(baseDays);
        const compareHeadline = recalcHeadline(compareDays);

        const diff = {
          pnlDiff: (compareHeadline.totalPnl || 0) - (baseHeadline.totalPnl || 0),
          tradesDiff: (compareHeadline.totalTrades || 0) - (baseHeadline.totalTrades || 0),
          winsDiff: (compareHeadline.wins || 0) - (baseHeadline.wins || 0),
          lossesDiff: (compareHeadline.losses || 0) - (baseHeadline.losses || 0),
          hasChanges:
            (compareHeadline.totalPnl || 0) !== (baseHeadline.totalPnl || 0) ||
            (compareHeadline.totalTrades || 0) !== (baseHeadline.totalTrades || 0) ||
            (compareHeadline.wins || 0) !== (baseHeadline.wins || 0) ||
            (compareHeadline.losses || 0) !== (baseHeadline.losses || 0)
        };
        // Parse weekStart and weekEnd as local dates
        let [sy, sm, sd] = baseWeek.weekStart.split('-');
        let weekStartDate = new Date(Number(sy), Number(sm) - 1, Number(sd));
        let [ey, em, ed] = baseWeek.weekEnd.split('-');
        let weekEndDate = new Date(Number(ey), Number(em) - 1, Number(ed));

        return (
          <AccordionItem key={baseWeek.weekStart} value={baseWeek.weekStart} className="border rounded-lg mb-4">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-lg">
                      Week of {format(weekStartDate, 'MMM dd')} - {format(weekEndDate, 'MMM dd, yyyy')}
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
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {baseDays
                  .sort((a, b) => {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    return dateA.getTime() - dateB.getTime();
                  })
                  .map((baseDay) => {
                    const compareDay = compareDays.find(d => d.date === baseDay.date);
                    if (!compareDay) return null;

                    return (
                      <CompareTradingCard
                        key={baseDay.date}
                        baseStats={transformToDailyStats(baseDay)}
                        compareStats={transformToDailyStats(compareDay)}
                      />
                    );
                  })}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
} 