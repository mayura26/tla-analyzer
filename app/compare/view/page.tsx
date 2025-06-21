"use client";

import { useEffect, useState } from "react";
import { CompareWeeklyAccordion } from "@/components/CompareWeeklyAccordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ChevronDown, ChevronUp, DollarSign, Target, TrendingUp, TrendingDown } from "lucide-react";
import { ComparisonStats } from "@/lib/trading-comparison-stats-processor";
import { toast } from "sonner";

export default function CompareViewPage() {
  const [weeks, setWeeks] = useState<any[]>([]);
  const [stats, setStats] = useState<ComparisonStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statsExpanded, setStatsExpanded] = useState(false);

  const fetchData = async () => {
    try {
      const [weeksRes, statsRes] = await Promise.all([
        fetch("/api/trading-data/compare"),
        fetch("/api/trading-data/compare/stats")
      ]);

      if (!weeksRes.ok) {
        throw new Error(`Failed to fetch comparison data: ${weeksRes.statusText}`);
      }
      if (!statsRes.ok) {
        throw new Error(`Failed to fetch comparison stats: ${statsRes.statusText}`);
      }

      const [weeksData, statsData] = await Promise.all([
        weeksRes.json(),
        statsRes.json()
      ]);

      if (!Array.isArray(weeksData)) {
        throw new Error("Invalid weeks data format received");
      }

      setWeeks(weeksData);
      setStats(statsData);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load comparison data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleWeekMerged = async (weekStart: string) => {
    // Refresh the data after a week is merged
    setLoading(true);
    try {
      await fetchData();
    } catch (error) {
      toast.error('Failed to refresh data', {
        description: 'There was an error refreshing the comparison data.'
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      signDisplay: 'always'
    }).format(value);
  };

  const getPnlColor = (value: number) => {
    return value >= 0 ? 'text-green-500' : 'text-red-500';
  };

  const getPnlIcon = (value: number) => {
    return value >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  // Helper function to determine if a metric has improved
  const hasImproved = (compareValue: number, baseValue: number, isHigherBetter: boolean = true) => {
    if (isHigherBetter) {
      return compareValue > baseValue;
    } else {
      return compareValue < baseValue;
    }
  };

  // Helper function to get improvement indicator
  const getImprovementIndicator = (compareValue: number, baseValue: number, isHigherBetter: boolean = true) => {
    const improved = hasImproved(compareValue, baseValue, isHigherBetter);
    const diff = compareValue - baseValue;
    
    if (diff === 0) return null;

    if (improved) {
      return (
        <div className="flex items-center gap-1 text-green-500">
          <TrendingUp className="w-3 h-3" />
          <span className="text-xs font-medium">+{Math.abs(diff).toFixed(0)}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-red-500">
          <TrendingDown className="w-3 h-3" />
          <span className="text-xs font-medium">-{Math.abs(diff).toFixed(0)}</span>
        </div>
      );
    }
  };

  // Helper function to get improvement color for card backgrounds
  const getImprovementColor = (compareValue: number, baseValue: number, isHigherBetter: boolean = true) => {
    const improved = hasImproved(compareValue, baseValue, isHigherBetter);
    const diff = compareValue - baseValue;

    if (diff === 0) {
      return 'border-muted';
    }
    if (improved) {
      return 'border-green-500/30 bg-green-500/10';
    }
    return 'border-red-500/30 bg-red-500/10';
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Trading Levels Algo Comparison</h1>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : weeks.length === 0 ? (
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
        <>
          {/* Collapsible Stats Pane */}
          <Card className="mb-6">
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setStatsExpanded(!statsExpanded)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Comparison Statistics
                </CardTitle>
                {statsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </CardHeader>
            {statsExpanded && stats && (
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total PnL Difference */}
                  <div className={`space-y-2 p-4 rounded-lg border ${getImprovementColor(stats.totalPnlDiff, 0)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Total PnL Difference</span>
                      </div>
                      {stats.totalPnlDiff !== 0 && (
                        <div className="flex items-center gap-1 text-xs font-medium">
                          {stats.totalPnlDiff > 0 ? (
                            <span className="text-green-600">+{formatCurrency(stats.totalPnlDiff)}</span>
                          ) : (
                            <span className="text-red-600">{formatCurrency(stats.totalPnlDiff)}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getPnlIcon(stats.totalPnlDiff)}
                      <span className={`text-2xl font-bold ${getPnlColor(stats.totalPnlDiff)}`}>
                        {formatCurrency(stats.totalPnlDiff)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg: {formatCurrency(stats.avgPnlDiffPerWeek)}/week
                    </div>
                  </div>

                  {/* Total Trades Difference */}
                  <div className={`space-y-2 p-4 rounded-lg border ${getImprovementColor(stats.totalTradesDiff, 0)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Total Trades Difference</span>
                      </div>
                      {stats.totalTradesDiff !== 0 && (
                        <div className="flex items-center gap-1 text-xs font-medium">
                          {stats.totalTradesDiff > 0 ? (
                            <span className="text-blue-600">+{stats.totalTradesDiff}</span>
                          ) : (
                            <span className="text-orange-600">{stats.totalTradesDiff}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${stats.totalTradesDiff >= 0 ? 'text-blue-500' : 'text-orange-500'}`}>
                        {stats.totalTradesDiff >= 0 ? '+' : ''}{stats.totalTradesDiff}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg: {stats.avgTradesDiffPerWeek >= 0 ? '+' : ''}{stats.avgTradesDiffPerWeek.toFixed(1)}/week
                    </div>
                  </div>

                  {/* Win/Loss Breakdown */}
                  <div className={`space-y-2 p-4 rounded-lg border ${getImprovementColor(stats.totalWinsDiff, 0)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Win/Loss Difference</span>
                      </div>
                      {getImprovementIndicator(stats.totalWinsDiff, 0)}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-500">
                          +{stats.totalWinsDiff}
                        </div>
                        <div className="text-xs text-muted-foreground">Wins</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-500">
                          {stats.totalLossesDiff >= 0 ? '+' : ''}{stats.totalLossesDiff}
                        </div>
                        <div className="text-xs text-muted-foreground">Losses</div>
                      </div>
                    </div>
                  </div>

                  {/* Big Wins/Losses Breakdown */}
                  <div className={`space-y-2 p-4 rounded-lg border ${getImprovementColor(stats.totalBigWinsDiff, 0)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Big Wins/Losses</span>
                      </div>
                      {getImprovementIndicator(stats.totalBigWinsDiff, 0)}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {stats.totalBigWinsDiff >= 0 ? '+' : ''}{stats.totalBigWinsDiff}
                        </div>
                        <div className="text-xs text-muted-foreground">Big Wins</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">
                          {stats.totalBigLossesDiff >= 0 ? '+' : ''}{stats.totalBigLossesDiff}
                        </div>
                        <div className="text-xs text-muted-foreground">Big Losses</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Comparison Metrics */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Win/Draw/Loss Comparison */}
                  <div className={`space-y-3 p-4 rounded-lg border ${getImprovementColor(stats.compareWinDrawLoss.wins, stats.baseWinDrawLoss.wins)}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-muted-foreground">Win/Draw/Loss Comparison</div>
                      {getImprovementIndicator(stats.compareWinDrawLoss.wins, stats.baseWinDrawLoss.wins)}
                    </div>
                    
                    {/* Compare Data */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-blue-600">Compare Data</div>
                      <div className="flex items-center space-x-1">
                        <div className="h-4 bg-green-600 rounded" style={{ 
                          width: `${((stats.compareWinDrawLoss.wins) / (stats.totalCompareTrades || 1)) * 100}%` 
                        }}/>
                        <div className="h-4 bg-gray-400 rounded" style={{ 
                          width: `${((stats.compareWinDrawLoss.draws) / (stats.totalCompareTrades || 1)) * 100}%` 
                        }}/>
                        <div className="h-4 bg-red-600 rounded" style={{ 
                          width: `${((stats.compareWinDrawLoss.losses) / (stats.totalCompareTrades || 1)) * 100}%` 
                        }}/>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-green-600">{stats.compareWinDrawLoss.wins}</span>
                        <span className="text-gray-400">{stats.compareWinDrawLoss.draws}</span>
                        <span className="text-red-600">{stats.compareWinDrawLoss.losses}</span>
                      </div>
                    </div>

                    {/* Base Data */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-orange-600">Base Data</div>
                      <div className="flex items-center space-x-1">
                        <div className="h-4 bg-green-600 rounded" style={{ 
                          width: `${((stats.baseWinDrawLoss.wins) / (stats.totalBaseTrades || 1)) * 100}%` 
                        }}/>
                        <div className="h-4 bg-gray-400 rounded" style={{ 
                          width: `${((stats.baseWinDrawLoss.draws) / (stats.totalBaseTrades || 1)) * 100}%` 
                        }}/>
                        <div className="h-4 bg-red-600 rounded" style={{ 
                          width: `${((stats.baseWinDrawLoss.losses) / (stats.totalBaseTrades || 1)) * 100}%` 
                        }}/>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-green-600">{stats.baseWinDrawLoss.wins}</span>
                        <span className="text-gray-400">{stats.baseWinDrawLoss.draws}</span>
                        <span className="text-red-600">{stats.baseWinDrawLoss.losses}</span>
                      </div>
                    </div>
                  </div>

                  {/* Green vs Red Days Comparison */}
                  <div className={`space-y-3 p-4 rounded-lg border ${getImprovementColor(stats.compareGreenRed.greenDays, stats.baseGreenRed.greenDays)}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-muted-foreground">Green vs Red Days</div>
                      {getImprovementIndicator(stats.compareGreenRed.greenDays, stats.baseGreenRed.greenDays)}
                    </div>
                    
                    {/* Compare Data */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-blue-600">Compare Data</div>
                      <div className="flex items-center space-x-1">
                        <div className="h-4 bg-green-600 rounded" style={{ 
                          width: `${((stats.compareGreenRed.greenDays) / (stats.compareGreenRed.greenDays + stats.compareGreenRed.redDays || 1)) * 100}%` 
                        }}/>
                        <div className="h-4 bg-red-600 rounded" style={{ 
                          width: `${((stats.compareGreenRed.redDays) / (stats.compareGreenRed.greenDays + stats.compareGreenRed.redDays || 1)) * 100}%` 
                        }}/>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-green-600">{stats.compareGreenRed.greenDays} profitable</span>
                        <span className="text-red-600">{stats.compareGreenRed.redDays} non-profitable</span>
                      </div>
                    </div>

                    {/* Base Data */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-orange-600">Base Data</div>
                      <div className="flex items-center space-x-1">
                        <div className="h-4 bg-green-600 rounded" style={{ 
                          width: `${((stats.baseGreenRed.greenDays) / (stats.baseGreenRed.greenDays + stats.baseGreenRed.redDays || 1)) * 100}%` 
                        }}/>
                        <div className="h-4 bg-red-600 rounded" style={{ 
                          width: `${((stats.baseGreenRed.redDays) / (stats.baseGreenRed.greenDays + stats.baseGreenRed.redDays || 1)) * 100}%` 
                        }}/>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-green-600">{stats.baseGreenRed.greenDays} profitable</span>
                        <span className="text-red-600">{stats.baseGreenRed.redDays} non-profitable</span>
                      </div>
                    </div>
                  </div>

                  {/* PnL Distribution Comparison */}
                  <div className={`space-y-3 p-4 rounded-lg border ${getImprovementColor(
                    stats.comparePnlDistribution.bigWins + stats.comparePnlDistribution.highProfitDays,
                    stats.basePnlDistribution.bigWins + stats.basePnlDistribution.highProfitDays
                  )}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-muted-foreground">Daily PnL Distribution</div>
                      {getImprovementIndicator(
                        stats.comparePnlDistribution.bigWins + stats.comparePnlDistribution.highProfitDays,
                        stats.basePnlDistribution.bigWins + stats.basePnlDistribution.highProfitDays
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      {[
                        { label: '>$400', compareCount: stats.comparePnlDistribution.bigWins, baseCount: stats.basePnlDistribution.bigWins, className: 'bg-green-600' },
                        { label: '$100-$400', compareCount: stats.comparePnlDistribution.highProfitDays, baseCount: stats.basePnlDistribution.highProfitDays, className: 'bg-green-500' },
                        { label: '$0-$100', compareCount: stats.comparePnlDistribution.lowProfitDays, baseCount: stats.basePnlDistribution.lowProfitDays, className: 'bg-green-400' },
                        { label: '-$100-$0', compareCount: stats.comparePnlDistribution.lowLossDays, baseCount: stats.basePnlDistribution.lowLossDays, className: 'bg-red-400' },
                        { label: '-$400..-$100', compareCount: stats.comparePnlDistribution.highLossDays, baseCount: stats.basePnlDistribution.highLossDays, className: 'bg-red-500' },
                        { label: '<-$400', compareCount: stats.comparePnlDistribution.bigLosses, baseCount: stats.basePnlDistribution.bigLosses, className: 'bg-red-600' },
                      ].map((item, index) => {
                        const maxCount = Math.max(item.compareCount || 0, item.baseCount || 0, 1);
                        return (
                          <div key={index}>
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="text-muted-foreground">{item.label}</span>
                              <span className={`font-bold ${
                                (item.compareCount || 0) > (item.baseCount || 0) ? 'text-green-500' :
                                (item.compareCount || 0) < (item.baseCount || 0) ? 'text-red-500' : ''
                              }`}>
                                {item.compareCount || 0} vs {item.baseCount || 0}
                              </span>
                            </div>
                            <div className="flex items-center text-xs">
                              <div className="w-12 text-blue-500">Comp</div>
                              <div className="flex-1 bg-muted/50 rounded-sm">
                                <div className={`${item.className} h-3 rounded-sm`} style={{ width: `${((item.compareCount || 0) / maxCount) * 100}%` }} />
                              </div>
                            </div>
                            <div className="flex items-center text-xs mt-1">
                              <div className="w-12 text-orange-500">Base</div>
                              <div className="flex-1 bg-muted/50 rounded-sm">
                                <div className={`${item.className} h-3 rounded-sm`} style={{ width: `${((item.baseCount || 0) / maxCount) * 100}%` }} />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Summary</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Weeks:</span>
                        <span className="font-medium">{stats.totalWeeks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Compare Trades:</span>
                        <span className="font-medium">{stats.totalCompareTrades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base Trades:</span>
                        <span className="font-medium">{stats.totalBaseTrades}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          <CompareWeeklyAccordion weeks={weeks} onWeekMerged={handleWeekMerged} />
        </>
      )}
      <div className="mb-24" />
    </div>
  );
}
