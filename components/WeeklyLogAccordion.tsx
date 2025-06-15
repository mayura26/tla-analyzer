"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import type { WeekLog, DailyLog } from "@/lib/trading-data-store";

interface WeeklyLogAccordionProps {
  weeks: WeekLog[];
}

export function WeeklyLogAccordion({ weeks }: WeeklyLogAccordionProps) {
  const [openWeek, setOpenWeek] = useState(weeks.length > 0 ? weeks[0].weekStart : "");

  return (
    <Accordion type="single" collapsible value={openWeek} onValueChange={setOpenWeek}>
      {weeks.map((week) => (
        <AccordionItem key={week.weekStart} value={week.weekStart}>
          <AccordionTrigger>
            <div className="flex flex-col w-full">
              <span className="font-bold text-lg">
                Week of {week.weekStart} - {week.weekEnd}
              </span>
              <span className="text-sm text-muted-foreground">
                PnL: {week.weekHeadline.totalPnl ?? 0} | Trades: {week.weekHeadline.totalTrades ?? 0} | Wins: {week.weekHeadline.wins ?? 0} | Losses: {week.weekHeadline.losses ?? 0}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {week.days.map((day) => (
                <Card key={day.date}>
                  <CardHeader>
                    <CardTitle>{day.date}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p>Total Trades: {day.analysis.headline.totalTrades}</p>
                      <p>Win Rate: {day.analysis.headline.wins} / {day.analysis.headline.totalTrades}</p>
                      <p>Total PnL: {day.analysis.headline.totalPnl}</p>
                      <p>Big Wins: {day.analysis.headline.bigWins ?? 0}</p>
                      <p>Big Losses: {day.analysis.headline.bigLosses ?? 0}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
} 