"use client";

import { useEffect, useState } from "react";
import { CompareWeeklyAccordion } from "@/components/CompareWeeklyAccordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ChevronDown, ChevronUp, DollarSign, Target, TrendingUp, TrendingDown, EyeOff, FileText, Tag, Filter } from "lucide-react";
import { ComparisonStats } from "@/lib/trading-comparison-stats-processor";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TagAssignment } from "@/lib/trading-data-store";

interface TagDefinition {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
}

interface CompareTaggedDay {
  date: string;
  tagAssignments: TagAssignment[];
  comparePnl: number;
  basePnl: number;
  pnlDifference: number;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}

interface TagAnalytics {
  tagId: string;
  tag: TagDefinition;
  totalDays: number;
  positiveDays: number;
  negativeDays: number;
  totalPnlImpact: number;
  avgPnlImpact: number;
}

export default function CompareViewPage() {
  const [weeks, setWeeks] = useState<any[]>([]);
  const [stats, setStats] = useState<ComparisonStats | null>(null);
  const [taggedDays, setTaggedDays] = useState<CompareTaggedDay[]>([]);
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinition[]>([]);
  const [tagAnalytics, setTagAnalytics] = useState<TagAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [showOnlyUnverified, setShowOnlyUnverified] = useState(false);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');

  const fetchData = async () => {
    try {
      const tagFilterParam = selectedTagFilter === 'all' ? '' : `&tagFilter=${selectedTagFilter}`;
      const [weeksRes, statsRes, taggedDaysRes, tagDefinitionsRes] = await Promise.all([
        fetch(`/api/trading-data/compare${showOnlyUnverified ? '?unverifiedOnly=true' : ''}`),
        fetch(`/api/trading-data/compare/stats${showOnlyUnverified ? '?unverifiedOnly=true' : ''}`),
        fetch(`/api/trading-data/compare/tags${showOnlyUnverified || selectedTagFilter !== 'all' ? '?' : ''}${showOnlyUnverified ? 'unverifiedOnly=true' : ''}${tagFilterParam}`),
        fetch('/api/trading-data/tags')
      ]);

      if (!weeksRes.ok) {
        throw new Error(`Failed to fetch comparison data: ${weeksRes.statusText}`);
      }
      if (!statsRes.ok) {
        throw new Error(`Failed to fetch comparison stats: ${statsRes.statusText}`);
      }
      if (!taggedDaysRes.ok) {
        throw new Error(`Failed to fetch tagged days: ${taggedDaysRes.statusText}`);
      }
      if (!tagDefinitionsRes.ok) {
        throw new Error(`Failed to fetch tag definitions: ${tagDefinitionsRes.statusText}`);
      }

      const [weeksData, statsData, taggedDaysData, tagDefinitionsData] = await Promise.all([
        weeksRes.json(),
        statsRes.json(),
        taggedDaysRes.json(),
        tagDefinitionsRes.json()
      ]);

      if (!Array.isArray(weeksData)) {
        throw new Error("Invalid weeks data format received");
      }

      setWeeks(weeksData);
      setStats(statsData);
      setTaggedDays(taggedDaysData);
      setTagDefinitions(tagDefinitionsData);
      
      // Calculate tag analytics
      calculateTagAnalytics(taggedDaysData, tagDefinitionsData);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load comparison data");
    } finally {
      setLoading(false);
    }
  };

  const calculateTagAnalytics = (taggedDaysData: CompareTaggedDay[], tagDefinitionsData: TagDefinition[]) => {
    const analytics = new Map<string, TagAnalytics>();

    // Initialize analytics for each tag
    tagDefinitionsData.forEach(tag => {
      analytics.set(tag.id, {
        tagId: tag.id,
        tag,
        totalDays: 0,
        positiveDays: 0,
        negativeDays: 0,
        totalPnlImpact: 0,
        avgPnlImpact: 0
      });
    });

    // Calculate metrics for each tagged day
    taggedDaysData.forEach(day => {
      day.tagAssignments.forEach(assignment => {
        const analytic = analytics.get(assignment.tagId);
        if (analytic) {
          analytic.totalDays++;
          if (assignment.impact === 'positive') {
            analytic.positiveDays++;
          } else {
            analytic.negativeDays++;
          }
          // Only add PnL impact if the assignment impact matches the actual PnL direction
          if (
            (assignment.impact === 'positive' && day.pnlDifference > 0) ||
            (assignment.impact === 'negative' && day.pnlDifference < 0)
          ) {
            analytic.totalPnlImpact += Math.abs(day.pnlDifference);
          } else if (
            (assignment.impact === 'positive' && day.pnlDifference < 0) ||
            (assignment.impact === 'negative' && day.pnlDifference > 0)
          ) {
            analytic.totalPnlImpact -= Math.abs(day.pnlDifference);
          }
        }
      });
    });

    // Calculate averages and filter out tags with no data
    const analyticsArray = Array.from(analytics.values())
      .filter(analytic => analytic.totalDays > 0)
      .map(analytic => ({
        ...analytic,
        avgPnlImpact: analytic.totalPnlImpact / analytic.totalDays
      }))
      .sort((a, b) => Math.abs(b.totalPnlImpact) - Math.abs(a.totalPnlImpact));

    setTagAnalytics(analyticsArray);
  };

  useEffect(() => {
    fetchData();
  }, [showOnlyUnverified, selectedTagFilter]);

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
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center space-x-2">
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
                {weeks.reduce((total, week) => total + week.days.length, 0)} unverified days
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="tag-filter">Filter by tag:</Label>
            <Select value={selectedTagFilter} onValueChange={setSelectedTagFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                {tagDefinitions.map(tag => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTagFilter !== 'all' && (
              <Badge variant="secondary" className="ml-2">
                {taggedDays.length} tagged days
              </Badge>
            )}
          </div>
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
                  Update Statistics
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
                        <span className="text-sm font-medium text-muted-foreground">Total PnL Change</span>
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
                        <span className="text-sm font-medium text-muted-foreground">Total Trades Change</span>
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
                        <span className="text-sm font-medium text-muted-foreground">Win/Loss Change</span>
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
                        <span className="text-sm font-medium text-muted-foreground">Big Wins/Losses Change</span>
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

                    {/* Updated Data */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-blue-600">Updated Data</div>
                      <div className="flex items-center space-x-1">
                        <div className="h-4 bg-green-600 rounded" style={{
                          width: `${((stats.compareWinDrawLoss.wins) / (stats.totalCompareTrades || 1)) * 100}%`
                        }} />
                        <div className="h-4 bg-gray-400 rounded" style={{
                          width: `${((stats.compareWinDrawLoss.draws) / (stats.totalCompareTrades || 1)) * 100}%`
                        }} />
                        <div className="h-4 bg-red-600 rounded" style={{
                          width: `${((stats.compareWinDrawLoss.losses) / (stats.totalCompareTrades || 1)) * 100}%`
                        }} />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-green-600">{stats.compareWinDrawLoss.wins}</span>
                        <span className="text-gray-400">{stats.compareWinDrawLoss.draws}</span>
                        <span className="text-red-600">{stats.compareWinDrawLoss.losses}</span>
                      </div>
                    </div>

                    {/* Original Data */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-orange-600">Original Data</div>
                      <div className="flex items-center space-x-1">
                        <div className="h-4 bg-green-600 rounded" style={{
                          width: `${((stats.baseWinDrawLoss.wins) / (stats.totalBaseTrades || 1)) * 100}%`
                        }} />
                        <div className="h-4 bg-gray-400 rounded" style={{
                          width: `${((stats.baseWinDrawLoss.draws) / (stats.totalBaseTrades || 1)) * 100}%`
                        }} />
                        <div className="h-4 bg-red-600 rounded" style={{
                          width: `${((stats.baseWinDrawLoss.losses) / (stats.totalBaseTrades || 1)) * 100}%`
                        }} />
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

                    {/* Updated Data */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-blue-600">Updated Data</div>
                      <div className="flex items-center space-x-1">
                        <div className="h-4 bg-green-600 rounded" style={{
                          width: `${((stats.compareGreenRed.greenDays) / (stats.compareGreenRed.greenDays + stats.compareGreenRed.redDays || 1)) * 100}%`
                        }} />
                        <div className="h-4 bg-red-600 rounded" style={{
                          width: `${((stats.compareGreenRed.redDays) / (stats.compareGreenRed.greenDays + stats.compareGreenRed.redDays || 1)) * 100}%`
                        }} />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-green-600">{stats.compareGreenRed.greenDays} profitable</span>
                        <span className="text-red-600">{stats.compareGreenRed.redDays} non-profitable</span>
                      </div>
                    </div>

                    {/* Original Data */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-orange-600">Original Data</div>
                      <div className="flex items-center space-x-1">
                        <div className="h-4 bg-green-600 rounded" style={{
                          width: `${((stats.baseGreenRed.greenDays) / (stats.baseGreenRed.greenDays + stats.baseGreenRed.redDays || 1)) * 100}%`
                        }} />
                        <div className="h-4 bg-red-600 rounded" style={{
                          width: `${((stats.baseGreenRed.redDays) / (stats.baseGreenRed.greenDays + stats.baseGreenRed.redDays || 1)) * 100}%`
                        }} />
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
                              <span className={`font-bold ${(item.compareCount || 0) > (item.baseCount || 0) ? 'text-green-500' :
                                  (item.compareCount || 0) < (item.baseCount || 0) ? 'text-red-500' : ''
                                }`}>
                                {item.compareCount || 0} vs {item.baseCount || 0}
                              </span>
                            </div>
                            <div className="flex items-center text-xs">
                              <div className="w-12 text-blue-500">Updated</div>
                              <div className="flex-1 bg-muted/50 rounded-sm">
                                <div className={`${item.className} h-3 rounded-sm`} style={{ width: `${((item.compareCount || 0) / maxCount) * 100}%` }} />
                              </div>
                            </div>
                            <div className="flex items-center text-xs mt-1">
                              <div className="w-12 text-orange-500">Original</div>
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
                        <span className="text-muted-foreground">Updated Trades:</span>
                        <span className="font-medium">{stats.totalCompareTrades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Original Trades:</span>
                        <span className="font-medium">{stats.totalBaseTrades}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Tag Analytics */}
          {tagAnalytics.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Tag Performance Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tagAnalytics.map((analytic) => (
                    <div key={analytic.tagId} className={`p-4 rounded-lg border ${
                      analytic.totalPnlImpact >= 0 ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: analytic.tag.color }}
                          />
                          <span className="font-medium text-sm">{analytic.tag.name}</span>
                        </div>
                        <div className={`flex items-center gap-1 ${getPnlColor(analytic.totalPnlImpact)}`}>
                          {getPnlIcon(analytic.totalPnlImpact)}
                          <span className="font-bold text-sm">{formatCurrency(analytic.totalPnlImpact)}</span>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Total days:</span>
                          <span className="font-medium">{analytic.totalDays}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Positive impact:</span>
                          <span className="font-medium text-green-600">{analytic.positiveDays}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Negative impact:</span>
                          <span className="font-medium text-red-600">{analytic.negativeDays}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg per day:</span>
                          <span className={`font-medium ${getPnlColor(analytic.avgPnlImpact)}`}>
                            {formatCurrency(analytic.avgPnlImpact)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tagged Days Log */}
          {taggedDays.length > 0 && (
            <Card className="mb-6">
              <CardHeader
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setTagsExpanded(!tagsExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Tagged Days Log
                    <Badge variant="secondary" className="ml-2">
                      {taggedDays.length} tagged days
                    </Badge>
                  </CardTitle>
                  {tagsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </CardHeader>
              {tagsExpanded && (
                <CardContent>
                  <div className="space-y-4">
                    {taggedDays.map((day, index) => (
                      <div key={index} className={`p-4 rounded-lg border ${day.verified ? 'border-green-500/30 bg-green-500/10' : 'border-muted'}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{day.date}</span>
                            {day.verified && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                Verified
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Updated: {formatCurrency(day.comparePnl)}</div>
                              <div className="text-sm text-muted-foreground">Original: {formatCurrency(day.basePnl)}</div>
                            </div>
                            <div className={`flex items-center gap-1 ${getPnlColor(day.pnlDifference)}`}>
                              {getPnlIcon(day.pnlDifference)}
                              <span className="font-bold">{formatCurrency(day.pnlDifference)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {day.tagAssignments.map((assignment, tagIndex) => {
                            const tagDef = tagDefinitions.find(t => t.id === assignment.tagId);
                            if (!tagDef) return null;
                            
                            return (
                              <Badge
                                key={tagIndex}
                                variant="outline"
                                className="flex items-center gap-1"
                                style={{ borderColor: tagDef.color + '40', backgroundColor: tagDef.color + '10' }}
                              >
                                <span style={{ color: tagDef.color }}>{tagDef.name}</span>
                                {assignment.impact === 'positive' ? (
                                  <TrendingUp className="w-3 h-3 text-green-500" />
                                ) : (
                                  <TrendingDown className="w-3 h-3 text-red-500" />
                                )}
                              </Badge>
                            );
                          })}
                        </div>
                        {day.verified && day.verifiedAt && (
                          <div className="text-xs text-muted-foreground mt-2">
                            Verified {new Date(day.verifiedAt).toLocaleDateString()}
                            {day.verifiedBy && ` by ${day.verifiedBy}`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          <CompareWeeklyAccordion weeks={weeks} onWeekMerged={handleWeekMerged} />
        </>
      )}
      <div className="mb-24" />
    </div>
  );
}