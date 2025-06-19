"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { TradingStats } from "@/lib/trading-stats-processor"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

// Add PnL formatter utility
const formatPnL = (value: number) => {
  return `$${Math.round(value * 100) / 100}`;
}

// Add number formatter utility
const formatNumber = (value: number) => {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const formatPercent = (value: number) => {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}

// Define types for the processed data
interface DailyLog {
  date: string;
  analysis: {
    headline: {
      totalPnl: number;
      totalTrades: number;
      wins: number;
      losses: number;
      bigWins?: number;
      bigLosses?: number;
      draws?: number;
      winRate?: string | number;
      netRate?: string | number;
      maxWin?: number;
      maxLoss?: number;
    };
    tradeBreakdown?: {
      fillRate?: number | string;
    };
    greenDay?: number | string;
    redDay?: number | string;
    plus100?: number | string;
    mid?: number | string;
    minus100?: number | string;
  };
}

interface DashboardData {
  dailyLogs: DailyLog[];
  stats: TradingStats;
  last4WeeksStats: TradingStats;
}

const groupLogsByWeek = (logs: DailyLog[]) => {
  if (!logs || logs.length === 0) {
    return [];
  }

  const weeklyLogs: { [key: string]: DailyLog[] } = {};

  logs.forEach(log => {
    // Parse date as UTC to avoid timezone issues. 'YYYY-MM-DD' is interpreted as
    // UTC midnight, but getDay() can use the local timezone, causing day-of-week errors.
    const parts = log.date.split('-').map(Number);
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));

    const dayOfWeek = date.getUTCDay(); // Sunday - 0, Monday - 1, etc.

    // Create a new date object for the Monday of that week.
    const monday = new Date(date);
    const diff = date.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    monday.setUTCDate(diff);

    const weekKey = monday.toISOString().split('T')[0];

    if (!weeklyLogs[weekKey]) {
      weeklyLogs[weekKey] = [];
    }
    weeklyLogs[weekKey].push(log);
  });

  for (const weekKey in weeklyLogs) {
    weeklyLogs[weekKey].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  return Object.entries(weeklyLogs)
    .map(([week, logs]) => ({ week, logs }))
    .sort((a, b) => new Date(b.week).getTime() - new Date(a.week).getTime());
};

export default function Home() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(res => res.json())
      .then(setDashboardData)
      .finally(() => setLoading(false))
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading dashboard data...</div>
        </div>
      </main>
    );
  }

  const stats = dashboardData?.stats;
  const last4WeeksStats = dashboardData?.last4WeeksStats;
  const weeklyGroupedLogs = dashboardData ? groupLogsByWeek(dashboardData.dailyLogs) : [];

  const pnlDistribution = stats ? [
    { label: '>$400', count: stats.bigWins, className: 'bg-green-600' },
    { label: '$100-$400', count: stats.pnlBreakdown.highProfitDays - stats.bigWins, className: 'bg-green-500' },
    { label: '$0-$100', count: stats.pnlBreakdown.lowProfitDays, className: 'bg-green-400' },
    { label: '-$100-$0', count: stats.pnlBreakdown.lowLossDays, className: 'bg-red-400' },
    { label: '-$400 - -$100', count: stats.pnlBreakdown.highLossDays - stats.bigLosses, className: 'bg-red-500' },
    { label: '<-$400', count: stats.bigLosses, className: 'bg-red-600' },
  ] : [];

  const maxCount = stats ? Math.max(...pnlDistribution.map(d => d.count), 1) : 1;

  const pnlDistribution4Weeks = last4WeeksStats ? [
    { label: '>$400', count: last4WeeksStats.bigWins, className: 'bg-green-600' },
    { label: '$100-$400', count: last4WeeksStats.pnlBreakdown.highProfitDays - last4WeeksStats.bigWins, className: 'bg-green-500' },
    { label: '$0-$100', count: last4WeeksStats.pnlBreakdown.lowProfitDays, className: 'bg-green-400' },
    { label: '-$100-$0', count: last4WeeksStats.pnlBreakdown.lowLossDays, className: 'bg-red-400' },
    { label: '-$400 - -$100', count: last4WeeksStats.pnlBreakdown.highLossDays - last4WeeksStats.bigLosses, className: 'bg-red-500' },
    { label: '<-$400', count: last4WeeksStats.bigLosses, className: 'bg-red-600' },
  ] : [];

  const maxCount4Weeks = last4WeeksStats ? Math.max(...pnlDistribution4Weeks.map(d => d.count), 1) : 1;

  return (
    <main className="flex min-h-screen flex-col p-3 space-y-3">
      {/* Top Stats Row */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          { title: 'Total Days', value: stats?.totalDays || 0 },
          { title: 'Total PnL', value: formatPnL(stats?.totalPnl || 0), className: (stats?.totalPnl || 0) >= 0 ? 'text-green-600' : 'text-red-600' },
          { title: 'Win Rate', value: formatPercent(stats?.winRate || 0) },
          { title: 'Net Win Rate', value: formatPercent(stats?.netWinRate || 0) },
          { title: 'Avg Trades', value: formatNumber(stats?.averageTrades || 0) },
          { title: 'Fill Rate', value: formatPercent(stats?.averageFillRate || 0) },
          { title: 'Avg PnL', value: formatPnL(stats?.averagePnl || 0), className: (stats?.averagePnl || 0) >= 0 ? 'text-green-600' : 'text-red-600' },
          { title: 'Total Trades', value: stats?.totalTrades || 0 }
        ].map((stat, i) => (
          <Card key={i} className="bg-card/50">
            <CardHeader className="p-2 pb-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-1">
              <div className={`text-xl font-bold ${stat.className || ''}`}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trading Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Win/Draw/Loss */}
        <Card className="bg-card/50">
          <CardHeader className="p-2 pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Win/Draw/Loss</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="flex items-center space-x-1">
              <div className="h-6 bg-green-600 rounded" style={{ 
                width: `${((stats?.winDrawLossBreakdown.wins || 0) / (stats?.totalTrades || 1)) * 100}%` 
              }}/>
              <div className="h-6 bg-gray-400 rounded" style={{ 
                width: `${((stats?.winDrawLossBreakdown.draws || 0) / (stats?.totalTrades || 1)) * 100}%` 
              }}/>
              <div className="h-6 bg-red-600 rounded" style={{ 
                width: `${((stats?.winDrawLossBreakdown.losses || 0) / (stats?.totalTrades || 1)) * 100}%` 
              }}/>
            </div>
            <div className="flex justify-between mt-1 text-sm">
              <span className="text-green-600">{stats?.winDrawLossBreakdown.wins || 0}</span>
              <span className="text-gray-400">{stats?.winDrawLossBreakdown.draws || 0}</span>
              <span className="text-red-600">{stats?.winDrawLossBreakdown.losses || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Green vs Red */}
        <Card className="bg-card/50">
          <CardHeader className="p-2 pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Green vs Red</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="flex items-center space-x-1">
              <div className="h-6 bg-green-600 rounded" style={{ 
                width: `${((stats?.greenDays || 0) / (stats?.totalDays || 1)) * 100}%` 
              }}/>
              <div className="h-6 bg-red-600 rounded" style={{ 
                width: `${((stats?.redDays || 0) / (stats?.totalDays || 1)) * 100}%` 
              }}/>
            </div>
            <div className="flex justify-between mt-1 text-sm">
              <span className="text-green-600">{stats?.greenDays || 0} profitable</span>
              <span className="text-red-600">{stats?.redDays || 0} non-profitable</span>
            </div>
          </CardContent>
        </Card>

        {/* PnL Distribution */}
        <Card className="bg-card/50 md:col-span-2">
          <CardHeader className="p-2 pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Daily PnL Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-1">
              {pnlDistribution.map((item, index) => (
                <div key={index} className="flex items-center text-xs">
                  <div className="w-24 text-muted-foreground">{item.label}</div>
                  <div className="w-8 text-right font-bold">{item.count}</div>
                  <div className="flex-1 ml-2">
                    <div className={`${item.className} h-4 rounded-sm`} style={{ width: `${(item.count / maxCount) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Day of Week Stats */}
        <Card className="bg-card/50">
          <CardHeader className="p-2">
            <CardTitle className="text-base">Day of Week Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Day</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Trades</TableHead>
                    <TableHead>Avg</TableHead>
                    <TableHead>Total PnL</TableHead>
                    <TableHead>Avg PnL</TableHead>
                    <TableHead>Win%</TableHead>
                    <TableHead>Net%</TableHead>
                    <TableHead>G/R</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                    const dayStats = stats?.dayOfWeekStats[day];
                    if (!dayStats || dayStats.totalDays === 0) return null;
                    
                    return (
                      <TableRow key={day} className="hover:bg-transparent text-sm">
                        <TableCell className="py-1 font-medium">{day.slice(0,3)}</TableCell>
                        <TableCell className="py-1">{dayStats.totalDays}</TableCell>
                        <TableCell className="py-1">{dayStats.totalTrades}</TableCell>
                        <TableCell className="py-1">{formatNumber(dayStats.averageTrades)}</TableCell>
                        <TableCell className={`py-1 ${dayStats.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPnL(dayStats.totalPnl)}
                        </TableCell>
                        <TableCell className={`py-1 ${dayStats.averagePnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPnL(dayStats.averagePnl)}
                        </TableCell>
                        <TableCell className="py-1">{formatPercent(dayStats.winRate)}</TableCell>
                        <TableCell className="py-1">{formatPercent(dayStats.netWinRate)}</TableCell>
                        <TableCell className="py-1">
                          <span className="text-green-600">{dayStats.greenDays}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-red-600">{dayStats.redDays}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Session Stats */}
        <Card className="bg-card/50">
          <CardHeader className="p-2">
            <CardTitle className="text-base">Session Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Session</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Trades</TableHead>
                    <TableHead>Avg</TableHead>
                    <TableHead>Total PnL</TableHead>
                    <TableHead>Avg PnL</TableHead>
                    <TableHead>Win%</TableHead>
                    <TableHead>G/R</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {['morning', 'main', 'midday', 'afternoon', 'end'].map(session => {
                    const sessionStats = stats?.sessionStats[session as keyof typeof stats.sessionStats];
                    if (!sessionStats || sessionStats.totalDays === 0) return null;
                    
                    const isSubSession = session === 'midday' || session === 'afternoon';

                    return (
                      <TableRow key={session} className="hover:bg-transparent text-sm">
                        <TableCell className={`py-1 font-medium capitalize ${isSubSession ? 'pl-6' : ''}`}>
                          {isSubSession && <span className="mr-2">↳</span>}
                          {session}
                        </TableCell>
                        <TableCell className="py-1">{sessionStats.totalDays}</TableCell>
                        <TableCell className="py-1">{sessionStats.totalTrades}</TableCell>
                        <TableCell className="py-1">{formatNumber(sessionStats.averageTrades)}</TableCell>
                        <TableCell className={`py-1 ${sessionStats.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPnL(sessionStats.totalPnl)}
                        </TableCell>
                        <TableCell className={`py-1 ${sessionStats.averagePnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPnL(sessionStats.averagePnl)}
                        </TableCell>
                        <TableCell className="py-1">{formatPercent(sessionStats.winRate)}</TableCell>
                        <TableCell className="py-1">
                          <span className="text-green-600">{sessionStats.greenDays}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-red-600">{sessionStats.redDays}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last 4 Weeks Stats */}
      <Card className="bg-card/50">
        <CardHeader className="p-2">
          <CardTitle className="text-base">Last 4 Weeks Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { title: 'Total Days', value: dashboardData?.last4WeeksStats?.totalDays || 0 },
              { title: 'Total PnL', value: formatPnL(dashboardData?.last4WeeksStats?.totalPnl || 0), className: (dashboardData?.last4WeeksStats?.totalPnl || 0) >= 0 ? 'text-green-600' : 'text-red-600' },
              { title: 'Win Rate', value: formatPercent(dashboardData?.last4WeeksStats?.winRate || 0) },
              { title: 'Net Win Rate', value: formatPercent(dashboardData?.last4WeeksStats?.netWinRate || 0) },
              { title: 'Avg Trades', value: formatNumber(dashboardData?.last4WeeksStats?.averageTrades || 0) },
              { title: 'Fill Rate', value: formatPercent(dashboardData?.last4WeeksStats?.averageFillRate || 0) },
              { title: 'Avg PnL', value: formatPnL(dashboardData?.last4WeeksStats?.averagePnl || 0), className: (dashboardData?.last4WeeksStats?.averagePnl || 0) >= 0 ? 'text-green-600' : 'text-red-600' },
              { title: 'Total Trades', value: dashboardData?.last4WeeksStats?.totalTrades || 0 }
            ].map((stat, i) => (
              <Card key={i} className="bg-background">
                <CardHeader className="p-2 pb-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-2 pt-1">
                  <div className={`text-xl font-bold ${stat.className || ''}`}>{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
            {/* Win/Draw/Loss */}
            <Card className="bg-background">
              <CardHeader className="p-2 pb-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Win/Draw/Loss</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="flex items-center space-x-1">
                  <div className="h-6 bg-green-600 rounded" style={{
                    width: `${((last4WeeksStats?.winDrawLossBreakdown.wins || 0) / (last4WeeksStats?.totalTrades || 1)) * 100}%`
                  }}/>
                  <div className="h-6 bg-gray-400 rounded" style={{
                    width: `${((last4WeeksStats?.winDrawLossBreakdown.draws || 0) / (last4WeeksStats?.totalTrades || 1)) * 100}%`
                  }}/>
                  <div className="h-6 bg-red-600 rounded" style={{
                    width: `${((last4WeeksStats?.winDrawLossBreakdown.losses || 0) / (last4WeeksStats?.totalTrades || 1)) * 100}%`
                  }}/>
                </div>
                <div className="flex justify-between mt-1 text-sm">
                  <span className="text-green-600">{last4WeeksStats?.winDrawLossBreakdown.wins || 0}</span>
                  <span className="text-gray-400">{last4WeeksStats?.winDrawLossBreakdown.draws || 0}</span>
                  <span className="text-red-600">{last4WeeksStats?.winDrawLossBreakdown.losses || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Green vs Red */}
            <Card className="bg-background">
              <CardHeader className="p-2 pb-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Green vs Red</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="flex items-center space-x-1">
                  <div className="h-6 bg-green-600 rounded" style={{
                    width: `${((last4WeeksStats?.greenDays || 0) / (last4WeeksStats?.totalDays || 1)) * 100}%`
                  }}/>
                  <div className="h-6 bg-red-600 rounded" style={{
                    width: `${((last4WeeksStats?.redDays || 0) / (last4WeeksStats?.totalDays || 1)) * 100}%`
                  }}/>
                </div>
                <div className="flex justify-between mt-1 text-sm">
                  <span className="text-green-600">{last4WeeksStats?.greenDays || 0} profitable</span>
                  <span className="text-red-600">{last4WeeksStats?.redDays || 0} non-profitable</span>
                </div>
              </CardContent>
            </Card>

            {/* PnL Distribution */}
            <Card className="bg-background md:col-span-2">
              <CardHeader className="p-2 pb-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Daily PnL Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="space-y-1">
                  {pnlDistribution4Weeks.map((item, index) => (
                    <div key={index} className="flex items-center text-xs">
                      <div className="w-24 text-muted-foreground">{item.label}</div>
                      <div className="w-8 text-right font-bold">{item.count}</div>
                      <div className="flex-1 ml-2">
                        <div className={`${item.className} h-4 rounded-sm`} style={{ width: `${(item.count / maxCount4Weeks) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-2">
            <Card className="bg-background">
              <CardHeader className="p-2">
                <CardTitle className="text-base">Session Performance</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Session</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Trades</TableHead>
                        <TableHead>Avg</TableHead>
                        <TableHead>Total PnL</TableHead>
                        <TableHead>Avg PnL</TableHead>
                        <TableHead>Win%</TableHead>
                        <TableHead>G/R</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {['morning', 'main', 'midday', 'afternoon', 'end'].map(session => {
                        const sessionStats = last4WeeksStats?.sessionStats[session as keyof typeof last4WeeksStats.sessionStats];
                        if (!sessionStats || sessionStats.totalDays === 0) return null;
                        
                        const isSubSession = session === 'midday' || session === 'afternoon';

                        return (
                          <TableRow key={session} className="hover:bg-transparent text-sm">
                            <TableCell className={`py-1 font-medium capitalize ${isSubSession ? 'pl-6' : ''}`}>
                              {isSubSession && <span className="mr-2">↳</span>}
                              {session}
                            </TableCell>
                            <TableCell className="py-1">{sessionStats.totalDays}</TableCell>
                            <TableCell className="py-1">{sessionStats.totalTrades}</TableCell>
                            <TableCell className="py-1">{formatNumber(sessionStats.averageTrades)}</TableCell>
                            <TableCell className={`py-1 ${sessionStats.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPnL(sessionStats.totalPnl)}
                            </TableCell>
                            <TableCell className={`py-1 ${sessionStats.averagePnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPnL(sessionStats.averagePnl)}
                            </TableCell>
                            <TableCell className="py-1">{formatPercent(sessionStats.winRate)}</TableCell>
                            <TableCell className="py-1">
                              <span className="text-green-600">{sessionStats.greenDays}</span>
                              <span className="text-gray-400">/</span>
                              <span className="text-red-600">{sessionStats.redDays}</span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Trading Overview */}
      <Card className="bg-card/50">
        <CardHeader className="p-2">
          <CardTitle className="text-base">Trading Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <WeeklyLogAccordion weeklyLogs={weeklyGroupedLogs} />
        </CardContent>
      </Card>
    </main>
  )
}

function WeeklyLogAccordion({ weeklyLogs }: { weeklyLogs: { week: string; logs: DailyLog[] }[] }) {
  if (!weeklyLogs.length) return <div className="h-[300px] flex items-center justify-center">No data</div>

  return (
    <Accordion type="single" collapsible className="w-full">
      {weeklyLogs.map(({ week, logs }) => {
        const weekPnl = logs.reduce((acc, log) => acc + log.analysis.headline.totalPnl, 0);
        const weekTrades = logs.reduce((acc, log) => acc + log.analysis.headline.totalTrades, 0);
        const firstDay = logs[0].date;
        const lastDay = logs[logs.length - 1].date;

        return (
          <AccordionItem value={week} key={week}>
            <AccordionTrigger>
              <div className="flex justify-between w-full pr-4">
                <span>Week of {firstDay} - {lastDay}</span>
                <div className="flex space-x-4">
                  <span>Trades: {weekTrades}</span>
                  <span className={weekPnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                    PnL: {formatPnL(weekPnl)}
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <DashboardTable data={logs} />
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

function DashboardTable({ data }: { data: DailyLog[] }) {
  if (!data.length) return <div className="h-[300px] flex items-center justify-center">No data</div>

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Date</TableHead>
            <TableHead>PnL</TableHead>
            <TableHead>Trades</TableHead>
            <TableHead>Wins</TableHead>
            <TableHead>Losses</TableHead>
            <TableHead>Win%</TableHead>
            <TableHead>Fill%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => {
            const h = row.analysis.headline || {}
            const winRate = h.totalTrades > 0 ? ((h.wins / h.totalTrades) * 100) : 0
            return (
              <TableRow key={row.date || i} className="hover:bg-transparent text-sm">
                <TableCell className="py-1">{row.date}</TableCell>
                <TableCell className={`py-1 ${h.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPnL(h.totalPnl)}
                </TableCell>
                <TableCell className="py-1">{h.totalTrades}</TableCell>
                <TableCell className="py-1">{h.wins}</TableCell>
                <TableCell className="py-1">{h.losses}</TableCell>
                <TableCell className="py-1">{formatPercent(winRate)}</TableCell>
                <TableCell className="py-1">{row.analysis.tradeBreakdown?.fillRate || '-'}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}