"use client";

import { useEffect, useState } from "react";
import { CompareWeeklyAccordion } from "@/components/CompareWeeklyAccordion";
import type { WeekLog } from "@/lib/trading-data-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CompareViewPage() {
  const [baseWeeks, setBaseWeeks] = useState<WeekLog[]>([]);
  const [compareWeeks, setCompareWeeks] = useState<WeekLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [baseRes, compareRes] = await Promise.all([
          fetch("/api/trading-data/weeks"),
          fetch("/api/trading-data/compare")
        ]);

        if (baseRes.ok && compareRes.ok) {
          const [baseData, compareData] = await Promise.all([
            baseRes.json(),
            compareRes.json()
          ]);
          setBaseWeeks(baseData);
          if (compareData) {
            // Transform compare data into WeekLog format
            const compareWeek: WeekLog = {
              weekStart: compareData.date,
              weekEnd: compareData.date,
              days: [{
                date: compareData.date,
                analysis: {
                  headline: {
                    totalPnl: compareData.analysis.headline.totalPnl,
                    totalTrades: compareData.analysis.headline.totalTrades,
                    wins: compareData.analysis.headline.wins,
                    losses: compareData.analysis.headline.losses,
                    bigWins: compareData.analysis.headline.bigWins,
                    bigLosses: compareData.analysis.headline.bigLosses,
                    trailingDrawdown: compareData.analysis.headline.trailingDrawdown,
                    contracts: compareData.analysis.headline.contracts,
                    maxPotentialGainPerContract: compareData.analysis.headline.maxPotentialGainPerContract,
                    pnlPerTrade: compareData.analysis.headline.pnlPerTrade,
                    maxProfit: compareData.analysis.headline.maxProfit,
                    maxRisk: compareData.analysis.headline.maxRisk,
                    maxDailyGain: compareData.analysis.headline.maxDailyGain,
                    maxDailyLoss: compareData.analysis.headline.maxDailyLoss
                  },
                  sessions: compareData.analysis.sessions,
                  protectionStats: compareData.analysis.protectionStats,
                  tradeList: compareData.analysis.tradeList,
                  tradeBreakdown: compareData.analysis.tradeBreakdown,
                  tradeNearStoppedOut: compareData.analysis.tradeNearStoppedOut
                }
              }],
              weekHeadline: {
                totalPnl: compareData.analysis.headline.totalPnl,
                totalTrades: compareData.analysis.headline.totalTrades,
                wins: compareData.analysis.headline.wins,
                losses: compareData.analysis.headline.losses
              }
            };
            setCompareWeeks([compareWeek]);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Trading Levels Algo Comparison</h1>
        <p className="text-xl text-muted-foreground">
          Compare your trading logs with existing data
        </p>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : baseWeeks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Trading Logs Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Start by uploading your trading logs to see your analysis.
            </p>
            <Button asChild>
              <Link href="/input">Upload Trading Logs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : compareWeeks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Comparison Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Upload a trading log to compare with existing data.
            </p>
            <Button asChild>
              <Link href="/compare">Upload Comparison Log</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <CompareWeeklyAccordion baseWeeks={baseWeeks} compareWeeks={compareWeeks} />
      )}
      <div className="mb-24" />
    </div>
  );
} 