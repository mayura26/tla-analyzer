"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState, Fragment } from "react"
import { TradingStats } from "@/lib/trading-stats-processor"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ChevronDown, Loader2 } from "lucide-react"
import { getPnlColor, getTradeSession, getTradeSubSession } from "@/lib/utils"
import { PnlTrendChart } from "@/components/PnlTrendChart"
import { DrawdownChart } from "@/components/DrawdownChart"
import { parseISO } from "date-fns"

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
interface TradeListEntry {
  id: number;
  timestamp: string;
  totalPnl: number;
  wins: number;
  losses: number;
}

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
    sessions?: {
      [session: string]: {
        pnl: number;
        trades: number;
        avgPnlPerTrade: number;
      };
    };
    tradeList?: TradeListEntry[];
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

// Add function to group daily logs by day of the week
const groupLogsByDayOfWeek = (logs: DailyLog[]) => {
  if (!logs || logs.length === 0) {
    return {};
  }

  const dayOfWeekLogs: { [key: string]: DailyLog[] } = {
    'Monday': [],
    'Tuesday': [],
    'Wednesday': [],
    'Thursday': [],
    'Friday': [],
    'Saturday': [],
    'Sunday': []
  };

  logs.forEach(log => {
    // Parse date without timezone conversion using parseISO
    const date = parseISO(log.date);
    const dayOfWeek = date.getDay(); // Sunday - 0, Monday - 1, etc.
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];
    
    if (dayOfWeekLogs[dayName]) {
      dayOfWeekLogs[dayName].push(log);
    }
  });

  // Sort each day's logs by date (newest first) and take only the last 10
  Object.keys(dayOfWeekLogs).forEach(day => {
    dayOfWeekLogs[day].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    dayOfWeekLogs[day] = dayOfWeekLogs[day].slice(0, 10); // Keep only last 10
  });

  return dayOfWeekLogs;
};

const groupLogsBySession = (logs: DailyLog[]) => {
  if (!logs || logs.length === 0) {
    return {};
  }

  const BIG_WIN_THRESHOLD = 300;
  const BIG_LOSS_THRESHOLD = -300;

  const sessionLogs: { [key: string]: { 
    date: string; 
    pnl: number; 
    trades: number;
    wins: number;
    losses: number;
    draws: number;
    bigWins: number;
    bigLosses: number;
  }[] } = {
    'morning': [], 'main': [], 'midday': [], 'afternoon': [], 'end': []
  };

  logs.forEach(log => {
    if (!log.analysis.tradeList) return;

    const dailySessionStats: { [key: string]: { 
      pnl: number; trades: number; wins: number; losses: number; bigWins: number; bigLosses: number;
    } } = {
      'morning': { pnl: 0, trades: 0, wins: 0, losses: 0, bigWins: 0, bigLosses: 0 },
      'main': { pnl: 0, trades: 0, wins: 0, losses: 0, bigWins: 0, bigLosses: 0 },
      'midday': { pnl: 0, trades: 0, wins: 0, losses: 0, bigWins: 0, bigLosses: 0 },
      'afternoon': { pnl: 0, trades: 0, wins: 0, losses: 0, bigWins: 0, bigLosses: 0 },
      'end': { pnl: 0, trades: 0, wins: 0, losses: 0, bigWins: 0, bigLosses: 0 }
    };

    log.analysis.tradeList.forEach(trade => {
      const session = getTradeSession(trade.timestamp);
      const subSession = getTradeSubSession(trade.timestamp);
      const sessions = [session, subSession].filter(Boolean) as string[];

      sessions.forEach(s => {
        if (dailySessionStats[s]) {
          dailySessionStats[s].pnl += trade.totalPnl;
          dailySessionStats[s].trades += 1;
          if (trade.totalPnl > 0) dailySessionStats[s].wins += 1;
          if (trade.totalPnl < 0) dailySessionStats[s].losses += 1;
          if (trade.totalPnl >= BIG_WIN_THRESHOLD) dailySessionStats[s].bigWins += 1;
          if (trade.totalPnl <= BIG_LOSS_THRESHOLD) dailySessionStats[s].bigLosses += 1;
        }
      });
    });

    for (const session in dailySessionStats) {
      if (dailySessionStats[session].trades > 0) {
        sessionLogs[session].push({
          date: log.date,
          ...dailySessionStats[session],
          draws: dailySessionStats[session].trades - dailySessionStats[session].wins - dailySessionStats[session].losses,
        });
      }
    }
  });

  Object.keys(sessionLogs).forEach(session => {
    sessionLogs[session].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    sessionLogs[session] = sessionLogs[session].slice(0, 10);
  });

  return sessionLogs;
};

export default function Home() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [expandedSession4Weeks, setExpandedSession4Weeks] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(res => res.json())
      .then(setDashboardData)
      .finally(() => setLoading(false))
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="flex items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <div className="text-lg text-muted-foreground">Loading dashboard data...</div>
        </div>
      </main>
    );
  }

  const stats = dashboardData?.stats;
  const last4WeeksStats = dashboardData?.last4WeeksStats;
  const dayOfWeekLogs = dashboardData ? groupLogsByDayOfWeek(dashboardData.dailyLogs) : {};
  
  const sessionLogs = dashboardData ? groupLogsBySession(dashboardData.dailyLogs) : {};
  const recentLogs = dashboardData ? [...dashboardData.dailyLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20) : [];
  const sessionLogs4Weeks = dashboardData ? groupLogsBySession(recentLogs) : {};

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
          { title: 'Total PnL', value: formatPnL(stats?.totalPnl || 0), pnl: stats?.totalPnl || 0 },
          { title: 'Win Rate', value: formatPercent(stats?.winRate || 0) },
          { title: 'Net Win Rate', value: formatPercent(stats?.netWinRate || 0) },
          { title: 'Avg Trades', value: formatNumber(stats?.averageTrades || 0) },
          { title: 'Fill Rate', value: formatPercent(stats?.averageFillRate || 0) },
          { title: 'Avg PnL', value: formatPnL(stats?.averagePnl || 0), pnl: stats?.averagePnl || 0 },
          { title: 'Total Trades', value: stats?.totalTrades || 0 }
        ].map((stat, i) => (
          <Card key={i} className="bg-card/50">
            <CardHeader className="p-2 pb-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-1">
              <div className={`text-xl font-bold ${stat.pnl !== undefined ? getPnlColor(stat.pnl) : ''}`}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* PnL Trend Chart */}
      <PnlTrendChart dailyLogs={dashboardData?.dailyLogs || []} />

      {/* Drawdown Chart */}
      <DrawdownChart dailyLogs={dashboardData?.dailyLogs || []} />

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
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="day-of-week" className="border-none">
                <AccordionTrigger className="hover:no-underline py-0">
                  <CardTitle className="text-base">Day of Week Performance</CardTitle>
                </AccordionTrigger>
                <AccordionContent>
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
                          <TableHead>BW/BL</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                          const dayStats = stats?.dayOfWeekStats[day];
                          if (!dayStats || dayStats.totalDays === 0) return null;
                          
                          const dayLogs = dayOfWeekLogs[day] || [];
                          const isExpanded = expandedDay === day;
                          
                          return (
                            <Fragment key={day}>
                              <TableRow 
                                className="hover:bg-muted/50 text-sm cursor-pointer"
                                onClick={() => setExpandedDay(isExpanded ? null : day)}
                              >
                                <TableCell className="py-1 font-medium">
                                  <div className="flex items-center">
                                    {day.slice(0,3)}
                                    <ChevronDown className={`ml-2 h-4 w-4 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                  </div>
                                </TableCell>
                                <TableCell className="py-1">{dayStats.totalDays}</TableCell>
                                <TableCell className="py-1">{dayStats.totalTrades}</TableCell>
                                <TableCell className="py-1">{formatNumber(dayStats.averageTrades)}</TableCell>
                                <TableCell className={`py-1 ${getPnlColor(dayStats.totalPnl)}`}>
                                  {formatPnL(dayStats.totalPnl)}
                                </TableCell>
                                <TableCell className={`py-1 ${getPnlColor(dayStats.averagePnl)}`}>
                                  {formatPnL(dayStats.averagePnl)}
                                </TableCell>
                                <TableCell className="py-1">{formatPercent(dayStats.winRate)}</TableCell>
                                <TableCell className="py-1">{formatPercent(dayStats.netWinRate)}</TableCell>
                                <TableCell className="py-1">
                                  <span className="text-green-600">{dayStats.greenDays}</span>
                                  <span className="text-gray-400">/</span>
                                  <span className="text-red-600">{dayStats.redDays}</span>
                                </TableCell>
                                <TableCell className="py-1">
                                  <span className="text-green-600">{dayStats.bigWins}</span>
                                  <span className="text-gray-400">/</span>
                                  <span className="text-red-600">{dayStats.bigLosses}</span>
                                </TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow className="bg-transparent hover:bg-transparent">
                                  <TableCell colSpan={10} className="p-0">
                                    <div className="p-4">
                                      {dayLogs.length > 0 ? (
                                        <div className="space-y-2">
                                          <div className="text-xs text-muted-foreground font-medium mb-1">Last 10 {day}s:</div>
                                          <div className="space-y-2">
                                            {dayLogs.map((log) => {
                                              const h = log.analysis.headline;
                                              const winRate = h.totalTrades > 0 ? ((h.wins / h.totalTrades) * 100) : 0;
                                              return (
                                                <div key={log.date} className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded-md">
                                                  <div className="flex-1">
                                                    <div className="font-semibold text-foreground">{log.date}</div>
                                                    <div className="text-muted-foreground">
                                                      {h.totalTrades} trades • {h.wins}W/{h.losses}L • {formatPercent(winRate)}
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center space-x-2">
                                                    {(h.bigWins || 0) > 0 && <Badge className="text-xs border-transparent bg-green-500/20 text-green-700 hover:bg-green-500/30">{h.bigWins} BW</Badge>}
                                                    {(h.bigLosses || 0) > 0 && <Badge className="text-xs" variant="destructive">{h.bigLosses} BL</Badge>}
                                                    <div className={`text-sm font-bold w-20 text-right ${getPnlColor(h.totalPnl)}`}>
                                                      {formatPnL(h.totalPnl)}
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-xs text-muted-foreground text-center py-4">No recent data available for {day}s.</div>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardHeader>
        </Card>

        {/* Session Stats */}
        <Card className="bg-card/50">
          <CardHeader className="p-2">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="session-stats" className="border-none">
                <AccordionTrigger className="hover:no-underline py-0">
                  <CardTitle className="text-base">Session Performance</CardTitle>
                </AccordionTrigger>
                <AccordionContent>
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
                          const isExpanded = expandedSession === session;
                          const recentSessionLogs = sessionLogs[session as keyof typeof sessionLogs] || [];

                          return (
                            <Fragment key={session}>
                              <TableRow 
                                className="hover:bg-muted/50 text-sm cursor-pointer"
                                onClick={() => setExpandedSession(isExpanded ? null : session)}
                              >
                                <TableCell className={`py-1 font-medium capitalize ${isSubSession ? 'pl-6' : ''}`}>
                                  <div className="flex items-center">
                                    {isSubSession && <span className="mr-2">↳</span>}
                                    {session}
                                    <ChevronDown className={`ml-2 h-4 w-4 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                  </div>
                                </TableCell>
                                <TableCell className="py-1">{sessionStats.totalDays}</TableCell>
                                <TableCell className="py-1">{sessionStats.totalTrades}</TableCell>
                                <TableCell className="py-1">{formatNumber(sessionStats.averageTrades)}</TableCell>
                                <TableCell className={`py-1 ${getPnlColor(sessionStats.totalPnl)}`}>
                                  {formatPnL(sessionStats.totalPnl)}
                                </TableCell>
                                <TableCell className={`py-1 ${getPnlColor(sessionStats.averagePnl)}`}>
                                  {formatPnL(sessionStats.averagePnl)}
                                </TableCell>
                                <TableCell className="py-1">{formatPercent(sessionStats.winRate)}</TableCell>
                                <TableCell className="py-1">
                                  <span className="text-green-600">{sessionStats.greenDays}</span>
                                  <span className="text-gray-400">/</span>
                                  <span className="text-red-600">{sessionStats.redDays}</span>
                                </TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow className="bg-transparent hover:bg-transparent">
                                  <TableCell colSpan={8} className="p-0">
                                    <div className="p-4">
                                      {recentSessionLogs.length > 0 ? (
                                        <div className="space-y-2">
                                          <div className="text-xs text-muted-foreground font-medium mb-1">Last 10 {session} sessions:</div>
                                          <div className="space-y-2">
                                            {recentSessionLogs.map((log) => (
                                              <div key={log.date} className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded-md">
                                                <div className="flex-1">
                                                  <div className="font-semibold text-foreground">{log.date}</div>
                                                  <div className="text-muted-foreground">
                                                    {log.trades} trades &bull; {log.wins}W/{log.losses}L/{log.draws}D
                                                  </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                  {log.bigWins > 0 && <Badge className="text-xs border-transparent bg-green-500/20 text-green-700 hover:bg-green-500/30">{log.bigWins} BW</Badge>}
                                                  {log.bigLosses > 0 && <Badge className="text-xs" variant="destructive">{log.bigLosses} BL</Badge>}
                                                  <div className={`text-sm font-bold w-20 text-right ${getPnlColor(log.pnl)}`}>
                                                    {formatPnL(log.pnl)}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-xs text-muted-foreground text-center py-4">No recent data available for {session} sessions.</div>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardHeader>
        </Card>
      </div>

      {/* Last 4 Weeks Stats */}
      <Card className="bg-card/50">
        <CardHeader className="p-2">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="last-4-weeks" className="border-none">
              <AccordionTrigger className="hover:no-underline py-0">
                <CardTitle className="text-base">Last 4 Weeks Performance</CardTitle>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
                  {[
                    { title: 'Total Days', value: dashboardData?.last4WeeksStats?.totalDays || 0 },
                    { title: 'Total PnL', value: formatPnL(dashboardData?.last4WeeksStats?.totalPnl || 0), pnl: dashboardData?.last4WeeksStats?.totalPnl || 0 },
                    { title: 'Win Rate', value: formatPercent(dashboardData?.last4WeeksStats?.winRate || 0) },
                    { title: 'Net Win Rate', value: formatPercent(dashboardData?.last4WeeksStats?.netWinRate || 0) },
                    { title: 'Avg Trades', value: formatNumber(dashboardData?.last4WeeksStats?.averageTrades || 0) },
                    { title: 'Fill Rate', value: formatPercent(dashboardData?.last4WeeksStats?.averageFillRate || 0) },
                    { title: 'Avg PnL', value: formatPnL(dashboardData?.last4WeeksStats?.averagePnl || 0), pnl: dashboardData?.last4WeeksStats?.averagePnl || 0 },
                    { title: 'Total Trades', value: dashboardData?.last4WeeksStats?.totalTrades || 0 }
                  ].map((stat, i) => (
                    <Card key={i} className="bg-background">
                      <CardHeader className="p-2 pb-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-2 pt-1">
                        <div className={`text-xl font-bold ${stat.pnl !== undefined ? getPnlColor(stat.pnl) : ''}`}>{stat.value}</div>
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
                              const isExpanded = expandedSession4Weeks === session;
                              const recentSessionLogs = sessionLogs4Weeks[session as keyof typeof sessionLogs4Weeks] || [];

                              return (
                                <Fragment key={session}>
                                  <TableRow 
                                    className="hover:bg-muted/50 text-sm cursor-pointer"
                                    onClick={() => setExpandedSession4Weeks(isExpanded ? null : session)}
                                  >
                                    <TableCell className={`py-1 font-medium capitalize ${isSubSession ? 'pl-6' : ''}`}>
                                      <div className="flex items-center">
                                        {isSubSession && <span className="mr-2">↳</span>}
                                        {session}
                                        <ChevronDown className={`ml-2 h-4 w-4 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-1">{sessionStats.totalDays}</TableCell>
                                    <TableCell className="py-1">{sessionStats.totalTrades}</TableCell>
                                    <TableCell className="py-1">{formatNumber(sessionStats.averageTrades)}</TableCell>
                                    <TableCell className={`py-1 ${getPnlColor(sessionStats.totalPnl)}`}>
                                      {formatPnL(sessionStats.totalPnl)}
                                    </TableCell>
                                    <TableCell className={`py-1 ${getPnlColor(sessionStats.averagePnl)}`}>
                                      {formatPnL(sessionStats.averagePnl)}
                                    </TableCell>
                                    <TableCell className="py-1">{formatPercent(sessionStats.winRate)}</TableCell>
                                    <TableCell className="py-1">
                                      <span className="text-green-600">{sessionStats.greenDays}</span>
                                      <span className="text-gray-400">/</span>
                                      <span className="text-red-600">{sessionStats.redDays}</span>
                                    </TableCell>
                                  </TableRow>
                                  {isExpanded && (
                                    <TableRow className="bg-transparent hover:bg-transparent">
                                      <TableCell colSpan={8} className="p-0">
                                        <div className="p-4">
                                          {recentSessionLogs.length > 0 ? (
                                            <div className="space-y-2">
                                              <div className="text-xs text-muted-foreground font-medium mb-1">Last 10 {session} sessions:</div>
                                              <div className="space-y-2">
                                                {recentSessionLogs.map((log) => (
                                                  <div key={log.date} className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded-md">
                                                    <div className="flex-1">
                                                      <div className="font-semibold text-foreground">{log.date}</div>
                                                      <div className="text-muted-foreground">
                                                        {log.trades} trades &bull; {log.wins}W/{log.losses}L/{log.draws}D
                                                      </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                      {log.bigWins > 0 && <Badge className="text-xs border-transparent bg-green-500/20 text-green-700 hover:bg-green-500/30">{log.bigWins} BW</Badge>}
                                                      {log.bigLosses > 0 && <Badge className="text-xs" variant="destructive">{log.bigLosses} BL</Badge>}
                                                      <div className={`text-sm font-bold w-20 text-right ${getPnlColor(log.pnl)}`}>
                                                        {formatPnL(log.pnl)}
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="text-xs text-muted-foreground text-center py-4">No recent data available for {session} sessions.</div>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardHeader>
      </Card>
    </main>
  )
}