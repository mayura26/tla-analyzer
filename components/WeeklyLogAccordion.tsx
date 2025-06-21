"use client";
import { useState } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { TradingCard } from "@/components/trading-card";
import type { WeekLog, DailyLog } from "@/lib/trading-data-store";
import { DailyStats } from "@/lib/trading-log-parser";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Target, DollarSign } from "lucide-react";

interface WeeklyLogAccordionProps {
  weeks: WeekLog[];
  notesData: Record<string, string>;
  onNotesChange?: (date: string, notes: string) => void;
}

export function WeeklyLogAccordion({ weeks, notesData, onNotesChange }: WeeklyLogAccordionProps) {
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
      totalPoints: analysis.headline.trailingDrawdown || 0, // Using trailingDrawdown as points
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

  return (
    <Accordion type="single" collapsible value={openWeek} onValueChange={setOpenWeek} className="w-full">
      {weeks.map((week) => {
        // Calculate Monday and Sunday for the week based on weekStart (no timezone conversion)
        let [sy, sm, sd] = week.weekStart.split('-');
        let weekStartDate = new Date(Number(sy), Number(sm) - 1, Number(sd));
        // Get the day of the week (0 = Sunday, 1 = Monday, ... 6 = Saturday)
        let dayOfWeek = weekStartDate.getDay();
        // Calculate Monday (if already Monday, stays the same)
        let monday = new Date(weekStartDate);
        monday.setDate(weekStartDate.getDate() - ((dayOfWeek + 6) % 7));
        // Calculate Sunday
        let sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
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
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className={`font-semibold ${getPnlColor(week.weekHeadline.totalPnl ?? 0)}`}>
                          {formatCurrency(week.weekHeadline.totalPnl ?? 0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {week.weekHeadline.wins ?? 0}W / {week.weekHeadline.losses ?? 0}L
                        </span>
                      </div>
                      <Badge variant="outline">
                        {week.weekHeadline.totalTrades ?? 0} trades
                      </Badge>
                      <Badge variant="secondary" className={`ml-2 ${getWinRateColor(week.weekHeadline.wins ?? 0, (week.weekHeadline.wins ?? 0) + (week.weekHeadline.losses ?? 0))}`}>
                        {((week.weekHeadline.wins ?? 0) / ((week.weekHeadline.wins ?? 0) + (week.weekHeadline.losses ?? 0)) * 100).toFixed(1)}% WR
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPnlIcon(week.weekHeadline.totalPnl ?? 0)}
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {week.days
                  .sort((a, b) => {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    return dateA.getTime() - dateB.getTime();
                  })
                  .map((day) => (
                  <TradingCard key={day.date} stats={transformToDailyStats(day)} notes={notesData[day.date] || ""} onNotesChange={onNotesChange} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
} 