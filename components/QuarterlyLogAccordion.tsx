"use client";
import { useState } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { WeeklyLogAccordion } from "@/components/WeeklyLogAccordion";
import type { WeekLog } from "@/lib/trading-data-store";
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";

interface QuarterlyLogAccordionProps {
  weeks: WeekLog[];
  notesData: Record<string, string>;
  onNotesChange?: (date: string, notes: string) => void;
}

interface QuarterData {
  quarter: string;
  year: number;
  weeks: WeekLog[];
  quarterHeadline: {
    totalPnl: number;
    totalTrades: number;
    wins: number;
    losses: number;
  };
}

export function QuarterlyLogAccordion({ weeks, notesData, onNotesChange }: QuarterlyLogAccordionProps) {
  const [openQuarter, setOpenQuarter] = useState<string>("");

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
    if (total === 0) return 'text-gray-500'
    const rate = (wins / total) * 100
    if (rate >= 60) return 'text-green-500'
    if (rate >= 40) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getQuarterFromDate = (dateStr: string): { quarter: string; year: number } => {
    // Parse date as local (no UTC shift) - same approach as WeeklyLogAccordion
    const dateParts = dateStr.split('-');
    const year = Number(dateParts[0]);
    const month = Number(dateParts[1]); // Month is 1-12, no need to adjust
    
    let quarter: string;
    if (month >= 1 && month <= 3) quarter = "Q1";
    else if (month >= 4 && month <= 6) quarter = "Q2";
    else if (month >= 7 && month <= 9) quarter = "Q3";
    else quarter = "Q4";
    
    return { quarter, year };
  }

  const groupWeeksByQuarter = (weeks: WeekLog[]): QuarterData[] => {
    const quarterMap = new Map<string, QuarterData>();
    
    weeks.forEach(week => {
      const { quarter, year } = getQuarterFromDate(week.weekStart);
      const key = `${quarter} ${year}`;
      
      if (!quarterMap.has(key)) {
        quarterMap.set(key, {
          quarter,
          year,
          weeks: [],
          quarterHeadline: {
            totalPnl: 0,
            totalTrades: 0,
            wins: 0,
            losses: 0
          }
        });
      }
      
      const quarterData = quarterMap.get(key)!;
      quarterData.weeks.push(week);
      quarterData.quarterHeadline.totalPnl += week.weekHeadline.totalPnl ?? 0;
      quarterData.quarterHeadline.totalTrades += week.weekHeadline.totalTrades ?? 0;
      quarterData.quarterHeadline.wins += week.weekHeadline.wins ?? 0;
      quarterData.quarterHeadline.losses += week.weekHeadline.losses ?? 0;
    });
    
    // Convert to array and sort by year and quarter
    return Array.from(quarterMap.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year; // Newest year first
      const quarterOrder = { "Q1": 1, "Q2": 2, "Q3": 3, "Q4": 4 };
      return quarterOrder[b.quarter as keyof typeof quarterOrder] - quarterOrder[a.quarter as keyof typeof quarterOrder];
    });
  };

  const quarters = groupWeeksByQuarter(weeks);

  return (
    <Accordion type="single" collapsible value={openQuarter} onValueChange={setOpenQuarter} className="w-full">
      {quarters.map((quarterData) => {
        const quarterKey = `${quarterData.quarter} ${quarterData.year}`;
        const totalTrades = quarterData.quarterHeadline.wins + quarterData.quarterHeadline.losses;
        const winRate = totalTrades > 0 ? (quarterData.quarterHeadline.wins / totalTrades) * 100 : 0;
        
        return (
          <AccordionItem key={quarterKey} value={quarterKey} className="border rounded-lg mb-6">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-xl">
                      {quarterData.quarter} {quarterData.year}
                    </span>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className={`font-semibold ${getPnlColor(quarterData.quarterHeadline.totalPnl)}`}>
                          {formatCurrency(quarterData.quarterHeadline.totalPnl)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {quarterData.quarterHeadline.wins}W / {quarterData.quarterHeadline.losses}L
                        </span>
                      </div>
                      <Badge variant="outline">
                        {quarterData.quarterHeadline.totalTrades} trades
                      </Badge>
                      <Badge variant="secondary" className={`ml-2 ${getWinRateColor(quarterData.quarterHeadline.wins, totalTrades)}`}>
                        {winRate.toFixed(1)}% WR
                      </Badge>
                      <Badge variant="outline">
                        {quarterData.weeks.length} weeks
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPnlIcon(quarterData.quarterHeadline.totalPnl)}
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <WeeklyLogAccordion 
                weeks={quarterData.weeks} 
                notesData={notesData} 
                onNotesChange={onNotesChange} 
              />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
} 