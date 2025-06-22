"use client";

import { useEffect, useState } from "react";
import { CompareWeeklyAccordion } from "@/components/CompareWeeklyAccordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ChevronDown, ChevronUp, DollarSign, Target, TrendingUp, TrendingDown, EyeOff } from "lucide-react";
import { ComparisonStats } from "@/lib/trading-comparison-stats-processor";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function CompareViewPage() {
  const [weeks, setWeeks] = useState<any[]>([]);
  const [stats, setStats] = useState<ComparisonStats | null>(null);
  const [filteredStats, setFilteredStats] = useState<ComparisonStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [showOnlyUnverified, setShowOnlyUnverified] = useState(false);

  // Filter weeks to show only those with unverified days when filter is enabled
  const filteredWeeks = showOnlyUnverified 
    ? weeks.map(week => ({
        ...week,
        days: week.days.filter((day: any) => {
          // Show day if it has no metadata or if verified is false/undefined
          return !day.metadata || !day.metadata.verified;
        })
      })).filter(week => week.days.length > 0) // Remove weeks with no unverified days
    : weeks;

  // Use filtered stats when filter is enabled
  const displayStats = showOnlyUnverified ? filteredStats : stats;

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
      
      // Calculate filtered stats for unverified days only
      if (weeksData.length > 0) {
        const unverifiedDays = weeksData.flatMap(week => 
          week.days.filter((day: any) => !day.metadata || !day.metadata.verified)
        );
        
        if (unverifiedDays.length > 0) {
          // Create a simplified stats object for unverified days
          const totalComparePnl = unverifiedDays.reduce((sum, day) => sum + (day.compareAnalysis?.headline?.totalPnl || 0), 0);
          const totalBasePnl = unverifiedDays.reduce((sum, day) => sum + (day.baseAnalysis?.headline?.totalPnl || 0), 0);
          const totalCompareTrades = unverifiedDays.reduce((sum, day) => sum + (day.compareAnalysis?.headline?.totalTrades || 0), 0);
          const totalBaseTrades = unverifiedDays.reduce((sum, day) => sum + (day.baseAnalysis?.headline?.totalTrades || 0), 0);
          const totalWinsDiff = unverifiedDays.reduce((sum, day) => {
            const compareWins = day.compareAnalysis?.headline?.wins || 0;
            const baseWins = day.baseAnalysis?.headline?.wins || 0;
            return sum + (compareWins - baseWins);
          }, 0);
          const totalLossesDiff = unverifiedDays.reduce((sum, day) => {
            const compareLosses = day.compareAnalysis?.headline?.losses || 0;
            const baseLosses = day.baseAnalysis?.headline?.losses || 0;
            return sum + (compareLosses - baseLosses);
          }, 0);
          
          const unverifiedStats: ComparisonStats = {
            totalPnlDiff: totalComparePnl - totalBasePnl,
            avgPnlDiffPerWeek: (totalComparePnl - totalBasePnl) / Math.max(1, Math.ceil(unverifiedDays.length / 7)),
            totalTradesDiff: totalCompareTrades - totalBaseTrades,
            avgTradesDiffPerWeek: (totalCompareTrades - totalBaseTrades) / Math.max(1, Math.ceil(unverifiedDays.length / 7)),
            totalWinsDiff,
            totalLossesDiff,
            totalBigWinsDiff: unverifiedDays.reduce((sum, day) => {
              const compareBigWins = day.compareAnalysis?.headline?.bigWins || 0;
              const baseBigWins = day.baseAnalysis?.headline?.bigWins || 0;
              return sum + (compareBigWins - baseBigWins);
            }, 0),
            totalBigLossesDiff: unverifiedDays.reduce((sum, day) => {
              const compareBigLosses = day.compareAnalysis?.headline?.bigLosses || 0;
              const baseBigLosses = day.baseAnalysis?.headline?.bigLosses || 0;
              return sum + (compareBigLosses - baseBigLosses);
            }, 0),
            totalWeeks: Math.ceil(unverifiedDays.length / 7),
            totalCompareTrades,
            totalBaseTrades,
            totalComparePnl,
            totalBasePnl,
            winRateDiff: 0, // Simplified for unverified filter
            compareWinRate: totalCompareTrades > 0 ? (totalWinsDiff + totalBaseTrades * 0.5) / totalCompareTrades * 100 : 0,
            baseWinRate: totalBaseTrades > 0 ? (totalWinsDiff + totalBaseTrades * 0.5) / totalBaseTrades * 100 : 0,
            compareAvgPnlPerTrade: totalCompareTrades > 0 ? totalComparePnl / totalCompareTrades : 0,
            baseAvgPnlPerTrade: totalBaseTrades > 0 ? totalBasePnl / totalBaseTrades : 0,
            pnlDiffPerTrade: (totalCompareTrades > 0 ? totalComparePnl / totalCompareTrades : 0) - (totalBaseTrades > 0 ? totalBasePnl / totalBaseTrades : 0),
            // Simplified breakdowns for unverified days
            compareWinDrawLoss: { wins: 0, draws: 0, losses: 0, breakdown: "0-0-0" },
            baseWinDrawLoss: { wins: 0, draws: 0, losses: 0, breakdown: "0-0-0" },
            compareGreenRed: { greenDays: 0, redDays: 0 },
            baseGreenRed: { greenDays: 0, redDays: 0 },
            comparePnlDistribution: { bigWins: 0, highProfitDays: 0, lowProfitDays: 0, lowLossDays: 0, highLossDays: 0, bigLosses: 0 },
            basePnlDistribution: { bigWins: 0, highProfitDays: 0, lowProfitDays: 0, lowLossDays: 0, highLossDays: 0, bigLosses: 0 }
          };
          
          setFilteredStats(unverifiedStats);
        } else {
          setFilteredStats(null);
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load comparison data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleWeekMerged = async () => {
    // Refresh the data after a week is merged
    setLoading(true);
    try {
      await fetchData();
    } catch {
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
        
        {/* Filter Controls */}
        <div className="flex items-center space-x-2 mb-4">
          <Switch
            id="unverified-filter"
            checked={showOnlyUnverified}
            onCheckedChange={setShowOnlyUnverified}
          />
          <Label htmlFor="unverified-filter" className="flex items-center gap-2 cursor-pointer">
            <EyeOff className="w-4 h-4" />
            Show only unverified days
          </Label>
          {showOnlyUnverified && (
            <Badge variant="secondary" className="ml-2">
              {filteredWeeks.reduce((total, week) => total + week.days.length, 0)} unverified days
            </Badge>
          )}
        </div>
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
            {statsExpanded && displayStats && (
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total PnL Difference */}
                  <div className={`space-y-2 p-4 rounded-lg border ${getImprovementColor(displayStats.totalPnlDiff, 0)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Total PnL Difference</span>
                      </div>
                      {displayStats.totalPnlDiff !== 0 && (
                        <div className="flex items-center gap-1 text-xs font-medium">
                          {displayStats.totalPnlDiff > 0 ? (
                            <span className="text-green-600">+{formatCurrency(displayStats.totalPnlDiff)}</span>
                          ) : (
                            <span className="text-red-600">{formatCurrency(displayStats.totalPnlDiff)}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getPnlIcon(displayStats.totalPnlDiff)}
                      <span className={`text-2xl font-bold ${getPnlColor(displayStats.totalPnlDiff)}`}>
                        {formatCurrency(displayStats.totalPnlDiff)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg: {formatCurrency(displayStats.avgPnlDiffPerWeek)}/week
                    </div>
                  </div>

                  {/* Total Trades Difference */}
                  <div className={`space-y-2 p-4 rounded-lg border ${getImprovementColor(displayStats.totalTradesDiff, 0)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Total Trades Difference</span>
                      </div>
                      {displayStats.totalTradesDiff !== 0 && (
                        <div className="flex items-center gap-1 text-xs font-medium">
                          {displayStats.totalTradesDiff > 0 ? (
                            <span className="text-blue-600">+{displayStats.totalTradesDiff}</span>
                          ) : (
                            <span className="text-orange-600">{displayStats.totalTradesDiff}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${displayStats.totalTradesDiff >= 0 ? 'text-blue-500' : 'text-orange-500'}`}>
                        {displayStats.totalTradesDiff >= 0 ? '+' : ''}{displayStats.totalTradesDiff}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg: {displayStats.avgTradesDiffPerWeek >= 0 ? '+' : ''}{displayStats.avgTradesDiffPerWeek.toFixed(1)}/week
                    </div>
                  </div>

                  {/* Win/Loss Breakdown */}
                  <div className={`space-y-2 p-4 rounded-lg border ${getImprovementColor(displayStats.totalWinsDiff, 0)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Win/Loss Difference</span>
                      </div>
                      {getImprovementIndicator(displayStats.totalWinsDiff, 0)}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-500">
                          +{displayStats.totalWinsDiff}
                        </div>
                        <div className="text-xs text-muted-foreground">Wins</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-500">
                          {displayStats.totalLossesDiff >= 0 ? '+' : ''}{displayStats.totalLossesDiff}
                        </div>
                        <div className="text-xs text-muted-foreground">Losses</div>
                      </div>
                    </div>
                  </div>

                  {/* Big Wins/Losses Breakdown */}
                  <div className={`space-y-2 p-4 rounded-lg border ${getImprovementColor(displayStats.totalBigWinsDiff, 0)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Big Wins/Losses</span>
                      </div>
                      {getImprovementIndicator(displayStats.totalBigWinsDiff, 0)}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {displayStats.totalBigWinsDiff >= 0 ? '+' : ''}{displayStats.totalBigWinsDiff}
                        </div>
                        <div className="text-xs text-muted-foreground">Big Wins</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">
                          {displayStats.totalBigLossesDiff >= 0 ? '+' : ''}{displayStats.totalBigLossesDiff}
                        </div>
                        <div className="text-xs text-muted-foreground">Big Losses</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Comparison Metrics */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Win/Draw/Loss Comparison */}
                  <div className={`space-y-3 p-4 rounded-lg border ${getImprovementColor(displayStats.compareWinDrawLoss.wins, displayStats.baseWinDrawLoss.wins)}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-muted-foreground">Win/Draw/Loss Comparison</div>
                      {getImprovementIndicator(displayStats.compareWinDrawLoss.wins, displayStats.baseWinDrawLoss.wins)}
                    </div>

                    {/* Compare Data */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-blue-600">Compare Data</div>
                      <div className="flex items-center space-x-1">
                        <div className="h-4 bg-green-600 rounded" style={{
                          width: `${((displayStats.compareWinDrawLoss.wins) / (displayStats.totalCompareTrades || 1)) * 100}%`
                        }} />
                        <div className="h-4 bg-gray-400 rounded" style={{
                          width: `${((displayStats.compareWinDrawLoss.draws) / (displayStats.totalCompareTrades || 1)) * 100}%`
                        }} />
                        <div className="h-4 bg-red-600 rounded" style={{
                          width: `${((displayStats.compareWinDrawLoss.losses) / (displayStats.totalCompareTrades || 1)) * 100}%`
                        }} />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-green-600">{displayStats.compareWinDrawLoss.wins}</span>
                        <span className="text-gray-400">{displayStats.compareWinDrawLoss.draws}</span>
                        <span className="text-red-600">{displayStats.compareWinDrawLoss.losses}</span>
                      </div>
                    </div>

                    {/* Base Data */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-orange-600">Base Data</div>
                      <div className="flex items-center space-x-1">
                        <div className="h-4 bg-green-600 rounded" style={{
                          width: `${((displayStats.baseWinDrawLoss.wins) / (displayStats.totalBaseTrades || 1)) * 100}%`
                        }} />
                        <div className="h-4 bg-gray-400 rounded" style={{
                          width: `${((displayStats.baseWinDrawLoss.draws) / (displayStats.totalBaseTrades || 1)) * 100}%`
                        }} />
                        <div className="h-4 bg-red-600 rounded" style={{
                          width: `${((displayStats.baseWinDrawLoss.losses) / (displayStats.totalBaseTrades || 1)) * 100}%`
                        }} />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-green-600">{displayStats.baseWinDrawLoss.wins}</span>
                        <span className="text-gray-400">{displayStats.baseWinDrawLoss.draws}</span>
                        <span className="text-red-600">{displayStats.baseWinDrawLoss.losses}</span>
                      </div>
                    </div>
                  </div>

                  {/* Green vs Red Days Comparison */}
                  <div className={`space-y-3 p-4 rounded-lg border ${getImprovementColor(displayStats.compareGreenRed.greenDays, displayStats.baseGreenRed.greenDays)}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-muted-foreground">Green vs Red Days</div>
                      {getImprovementIndicator(displayStats.compareGreenRed.greenDays, displayStats.baseGreenRed.greenDays)}
                    </div>

                    {/* Compare Data */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-blue-600">Compare Data</div>
                      <div className="flex items-center space-x-1">
                        <div className="h-4 bg-green-600 rounded" style={{
                          width: `${((displayStats.compareGreenRed.greenDays) / (displayStats.compareGreenRed.greenDays + displayStats.compareGreenRed.redDays || 1)) * 100}%`
                        }} />
                        <div className="h-4 bg-red-600 rounded" style={{
                          width: `${((displayStats.compareGreenRed.redDays) / (displayStats.compareGreenRed.greenDays + displayStats.compareGreenRed.redDays || 1)) * 100}%`
                        }} />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-green-600">{displayStats.compareGreenRed.greenDays} profitable</span>
                        <span className="text-red-600">{displayStats.compareGreenRed.redDays} non-profitable</span>
                      </div>
                    </div>

                    {/* Base Data */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-orange-600">Base Data</div>
                      <div className="flex items-center space-x-1">
                        <div className="h-4 bg-green-600 rounded" style={{
                          width: `${((displayStats.baseGreenRed.greenDays) / (displayStats.baseGreenRed.greenDays + displayStats.baseGreenRed.redDays || 1)) * 100}%`
                        }} />
                        <div className="h-4 bg-red-600 rounded" style={{
                          width: `${((displayStats.baseGreenRed.redDays) / (displayStats.baseGreenRed.greenDays + displayStats.baseGreenRed.redDays || 1)) * 100}%`
                        }} />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-green-600">{displayStats.baseGreenRed.greenDays} profitable</span>
                        <span className="text-red-600">{displayStats.baseGreenRed.redDays} non-profitable</span>
                      </div>
                    </div>
                  </div>

                  {/* PnL Distribution Comparison */}
                  <div className={`space-y-3 p-4 rounded-lg border ${getImprovementColor(
                    displayStats.comparePnlDistribution.bigWins + displayStats.comparePnlDistribution.highProfitDays,
                    displayStats.basePnlDistribution.bigWins + displayStats.basePnlDistribution.highProfitDays
                  )}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-muted-foreground">Daily PnL Distribution</div>
                      {getImprovementIndicator(
                        displayStats.comparePnlDistribution.bigWins + displayStats.comparePnlDistribution.highProfitDays,
                        displayStats.basePnlDistribution.bigWins + displayStats.basePnlDistribution.highProfitDays
                      )}
                    </div>

                    <div className="space-y-4">
                      {[
                        { label: '>$400', compareCount: displayStats.comparePnlDistribution.bigWins, baseCount: displayStats.basePnlDistribution.bigWins, className: 'bg-green-600' },
                        { label: '$100-$400', compareCount: displayStats.comparePnlDistribution.highProfitDays, baseCount: displayStats.basePnlDistribution.highProfitDays, className: 'bg-green-500' },
                        { label: '$0-$100', compareCount: displayStats.comparePnlDistribution.lowProfitDays, baseCount: displayStats.basePnlDistribution.lowProfitDays, className: 'bg-green-400' },
                        { label: '-$100-$0', compareCount: displayStats.comparePnlDistribution.lowLossDays, baseCount: displayStats.basePnlDistribution.lowLossDays, className: 'bg-red-400' },
                        { label: '-$400..-$100', compareCount: displayStats.comparePnlDistribution.highLossDays, baseCount: displayStats.basePnlDistribution.highLossDays, className: 'bg-red-500' },
                        { label: '<-$400', compareCount: displayStats.comparePnlDistribution.bigLosses, baseCount: displayStats.basePnlDistribution.bigLosses, className: 'bg-red-600' },
                      ].map((item, index) => {
                        const maxCount = Math.max(item.compareCount || 0, item.baseCount || 0, 1);
                        return (
                          <div key={index}>
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="text-muted-foreground">{item.label}</span>
                              <span className={`font-bold ${(item.compareCount || 0) > (item.baseCount || 0) ? 'text-green-500' :
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
                        <span className="font-medium">{displayStats.totalWeeks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Compare Trades:</span>
                        <span className="font-medium">{displayStats.totalCompareTrades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base Trades:</span>
                        <span className="font-medium">{displayStats.totalBaseTrades}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          <CompareWeeklyAccordion weeks={filteredWeeks} onWeekMerged={handleWeekMerged} />
        </>
      )}
      <div className="mb-24" />
    </div>
  );
}
