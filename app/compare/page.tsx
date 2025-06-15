"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseTradingLog } from "@/lib/trading-log-parser";
import { toast } from "sonner";
import { CompareWeeklyAccordion } from "@/components/CompareWeeklyAccordion";
import type { WeekLog } from "@/lib/trading-data-store";

export default function CompareInputPage() {
  const [logData, setLogData] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
              weekStart: compareData.dailyStats.date.toISOString().split('T')[0],
              weekEnd: compareData.dailyStats.date.toISOString().split('T')[0],
              days: [{
                date: compareData.dailyStats.date.toISOString().split('T')[0],
                analysis: {
                  headline: {
                    totalPnl: compareData.dailyStats.totalPnl,
                    totalTrades: compareData.dailyStats.totalTrades,
                    wins: compareData.dailyStats.wins,
                    losses: compareData.dailyStats.losses,
                    bigWins: compareData.dailyStats.bigWins,
                    bigLosses: compareData.dailyStats.bigLosses,
                    trailingDrawdown: compareData.dailyStats.trailingDrawdown,
                    contracts: compareData.dailyStats.contracts,
                    maxPotentialGainPerContract: compareData.dailyStats.maxPotentialGainPerContract,
                    pnlPerTrade: compareData.dailyStats.pnlPerTrade,
                    maxProfit: compareData.dailyStats.maxProfit,
                    maxRisk: compareData.dailyStats.maxRisk,
                    maxDailyGain: compareData.dailyStats.maxDailyGain,
                    maxDailyLoss: compareData.dailyStats.maxDailyLoss
                  },
                  sessions: compareData.dailyStats.sessionBreakdown,
                  protectionStats: compareData.dailyStats.protectionStats,
                  tradeList: compareData.trades,
                  tradeBreakdown: {
                    ordersGenerated: 0,
                    ordersFilled: 0,
                    fillRate: 0,
                    chaseModeTradesPnl: 0,
                    chaseModeTrades: 0
                  },
                  tradeNearStoppedOut: []
                }
              }],
              weekHeadline: {
                totalPnl: compareData.dailyStats.totalPnl,
                totalTrades: compareData.dailyStats.totalTrades,
                wins: compareData.dailyStats.wins,
                losses: compareData.dailyStats.losses
              }
            };
            setCompareWeeks([compareWeek]);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to fetch comparison data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const parsedData = parseTradingLog(logData);
      
      const response = await fetch('/api/trading-data/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logData }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process log data');
      }

      const result = await response.json();
      if (result.success) {
        setLogData('');
        toast.success("Trading log data has been processed for comparison.");
        // Refresh the page to show updated comparison
        window.location.reload();
      }
    } catch (error) {
      console.error("Error processing data:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process trading log data");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Compare Trading Logs</h1>
        <p className="text-xl text-muted-foreground">
          Compare your trading logs with existing data
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Compare Trading Log Input</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="Paste your trading log data here for comparison..."
              value={logData}
              onChange={(e) => setLogData(e.target.value)}
              className="h-[400px] font-mono"
            />
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !logData.trim()}
              className="w-full"
            >
              {isSubmitting ? "Processing..." : "Submit for Comparison"}
            </Button>
          </div>
        </CardContent>
      </Card>

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
              <a href="/input">Upload Trading Logs</a>
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