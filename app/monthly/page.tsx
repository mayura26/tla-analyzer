"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2, Calendar, Clock, ChevronDown } from "lucide-react";
import type { MonthLog } from "@/lib/trading-data-store";

// Utility functions (same as main page)
const formatPnL = (value: number) => {
  return `$${Math.round(value * 100) / 100}`;
};

const formatPercent = (value: number) => {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
};

const getPnlColor = (value: number) => {
  return value >= 0 ? 'text-green-500' : 'text-red-500';
};

const getWinRateColor = (wins: number, total: number) => {
  if (total === 0) return 'text-gray-500';
  const rate = (wins / total) * 100;
  if (rate >= 60) return 'text-green-500';
  if (rate >= 40) return 'text-yellow-500';
  return 'text-red-500';
};

const formatMonthRange = (monthStart: string, monthEnd: string) => {
  // Parse dates without timezone conversion
  const [startYear, startMonth] = monthStart.split('-').map(Number);
  const [endYear, endMonth] = monthEnd.split('-').map(Number);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const shortMonthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  if (startYear === endYear) {
    return `${monthNames[startMonth - 1]} ${startYear}`;
  } else {
    return `${shortMonthNames[startMonth - 1]} ${startYear} - ${shortMonthNames[endMonth - 1]} ${endYear}`;
  }
};

export default function MonthlyPage() {
  const [months, setMonths] = useState<MonthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const monthsRes = await fetch("/api/trading-data/monthly");
        if (monthsRes.ok) {
          const monthsData = await monthsRes.json();
          setMonths(monthsData);
        }
      } catch (error) {
        console.error('Error fetching monthly data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="flex items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <div className="text-lg text-muted-foreground">Loading monthly data...</div>
        </div>
      </main>
    );
  }

  if (months.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Monthly Trading Analysis</h1>
          <p className="text-xl text-muted-foreground">
            Monthly breakdown of trading performance
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>No Trading Data Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Start by uploading your trading logs to see your monthly analysis.
            </p>
            <Button asChild>
              <Link href="/input">Upload Trading Logs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col p-3 space-y-3">
      <div className="mb-4">
        <h1 className="text-4xl font-bold mb-2">Monthly Trading Analysis</h1>
        <p className="text-xl text-muted-foreground">
          Monthly breakdown of trading performance
        </p>
      </div>

      {/* Monthly Breakdown Table */}
      <Card className="bg-card/50">
        <CardHeader className="p-2">
          <CardTitle className="text-base">Monthly Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead></TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Trades</TableHead>
                  <TableHead>Total PnL</TableHead>
                  <TableHead>Avg PnL/Day</TableHead>
                  <TableHead>Win Rate</TableHead>
                  <TableHead>Net Win Rate</TableHead>
                  <TableHead>Profitable Days</TableHead>
                  <TableHead>Big Wins/Losses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {months.map((month) => {
                  const totalTrades = month.monthHeadline.wins + month.monthHeadline.losses + month.monthHeadline.draws;
                  const winRate = totalTrades > 0 ? (month.monthHeadline.wins / totalTrades) * 100 : 0;
                  const isExpanded = expandedMonth === month.monthStart;

                  return (
                    <>
                      <TableRow
                        key={month.monthStart}
                        className="hover:bg-muted/50 text-sm cursor-pointer"
                        onClick={() => setExpandedMonth(isExpanded ? null : month.monthStart)}
                      >
                        <TableCell className="py-2">
                          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                        </TableCell>
                        <TableCell className="py-2 font-medium">
                          {formatMonthRange(month.monthStart, month.monthEnd)}
                        </TableCell>
                        <TableCell className="py-2">{month.monthHeadline.totalDays}</TableCell>
                        <TableCell className="py-2">{month.monthHeadline.totalTrades}</TableCell>
                        <TableCell className={`py-2 ${getPnlColor(month.monthHeadline.totalPnl)}`}>
                          {formatPnL(month.monthHeadline.totalPnl)}
                        </TableCell>
                        <TableCell className={`py-2 ${getPnlColor(month.monthHeadline.avgPnlPerDay)}`}>
                          {formatPnL(month.monthHeadline.avgPnlPerDay)}
                        </TableCell>
                        <TableCell className={`py-2 ${getWinRateColor(month.monthHeadline.wins, totalTrades)}`}>
                          {formatPercent(winRate)}
                        </TableCell>
                        <TableCell className={`py-2 ${getWinRateColor(month.monthHeadline.wins + month.monthHeadline.draws, totalTrades)}`}>
                          {formatPercent(month.monthHeadline.netWinRate)}
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-green-600">{month.monthHeadline.profitableDays}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-red-600">{month.monthHeadline.losingDays}</span>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-green-600">{month.monthHeadline.bigWins}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-red-600">{month.monthHeadline.bigLosses}</span>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-transparent hover:bg-transparent">
                          <TableCell colSpan={10} className="p-0">
                            <div className="p-4 bg-muted/30">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                {/* Win/Draw/Loss Chart */}
                                <Card className="bg-background">
                                  <CardHeader className="p-3">
                                    <CardTitle className="text-sm">Win/Draw/Loss Breakdown</CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-3">
                                    <div className="flex items-center space-x-1 mb-2">
                                      <div className="h-6 bg-green-600 rounded" style={{
                                        width: `${((month.monthHeadline.wins || 0) / (month.monthHeadline.totalTrades || 1)) * 100}%`
                                      }} />
                                      <div className="h-6 bg-gray-400 rounded" style={{
                                        width: `${((month.monthHeadline.draws || 0) / (month.monthHeadline.totalTrades || 1)) * 100}%`
                                      }} />
                                      <div className="h-6 bg-red-600 rounded" style={{
                                        width: `${((month.monthHeadline.losses || 0) / (month.monthHeadline.totalTrades || 1)) * 100}%`
                                      }} />
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-green-600">{month.monthHeadline.wins || 0} wins</span>
                                      <span className="text-gray-400">{month.monthHeadline.draws || 0} draws</span>
                                      <span className="text-red-600">{month.monthHeadline.losses || 0} losses</span>
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Green vs Red Chart */}
                                <Card className="bg-background">
                                  <CardHeader className="p-3">
                                    <CardTitle className="text-sm">Green vs Red Days</CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-3">
                                    <div className="flex items-center space-x-1 mb-2">
                                      <div className="h-6 bg-green-600 rounded" style={{
                                        width: `${((month.monthHeadline.profitableDays || 0) / (month.monthHeadline.totalDays || 1)) * 100}%`
                                      }} />
                                      <div className="h-6 bg-red-600 rounded" style={{
                                        width: `${((month.monthHeadline.losingDays || 0) / (month.monthHeadline.totalDays || 1)) * 100}%`
                                      }} />
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-green-600">{month.monthHeadline.profitableDays || 0} profitable</span>
                                      <span className="text-red-600">{month.monthHeadline.losingDays || 0} non-profitable</span>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>

                              {/* PnL Distribution Chart */}
                              <Card className="bg-background mb-4">
                                <CardHeader className="p-3">
                                  <CardTitle className="text-sm">Daily PnL Distribution</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3">
                                  <div className="space-y-1">
                                    {[
                                      { label: '>$400', count: month.pnlDistribution.highProfitDays, className: 'bg-green-600' },
                                      { label: '$100-$400', count: month.pnlDistribution.midProfitDays, className: 'bg-green-500' },
                                      { label: '$0-$100', count: month.pnlDistribution.lowProfitDays, className: 'bg-green-400' },
                                      { label: '-$100-$0', count: month.pnlDistribution.lowLossDays, className: 'bg-red-400' },
                                      { label: '-$400 - -$100', count: month.pnlDistribution.midLossDays, className: 'bg-red-500' },
                                      { label: '<-$400', count: month.pnlDistribution.highLossDays, className: 'bg-red-600' },
                                    ].map((item, index) => {
                                      const maxCount = Math.max(
                                        month.pnlDistribution.highProfitDays,
                                        month.pnlDistribution.midProfitDays,
                                        month.pnlDistribution.lowProfitDays,
                                        month.pnlDistribution.lowLossDays,
                                        month.pnlDistribution.midLossDays,
                                        month.pnlDistribution.highLossDays,
                                        1
                                      );
                                      return (
                                        <div key={index} className="flex items-center text-xs">
                                          <div className="w-24 text-muted-foreground">{item.label}</div>
                                          <div className="w-8 text-right font-bold">{item.count}</div>
                                          <div className="flex-1 ml-2">
                                            <div className={`${item.className} h-4 rounded-sm`} style={{ width: `${(item.count / maxCount) * 100}%` }}></div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </CardContent>
                              </Card>

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Session Performance for this month */}
                                <Card className="bg-background">
                                  <CardHeader className="p-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <Clock className="w-4 h-4" />
                                      Session Performance
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-3">
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="hover:bg-transparent">
                                            <TableHead className="text-xs">Session</TableHead>
                                            <TableHead className="text-xs">Days</TableHead>
                                            <TableHead className="text-xs">Trades</TableHead>
                                            <TableHead className="text-xs">Total PnL</TableHead>
                                            <TableHead className="text-xs">Avg PnL/Trade</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {['morning', 'main', 'midday', 'afternoon', 'end'].map(session => {
                                            const sessionData = month.sessionBreakdown[session as keyof typeof month.sessionBreakdown];
                                            return (
                                              <TableRow key={session} className="hover:bg-muted/50 text-xs">
                                                <TableCell className="py-1 font-medium capitalize">{session}</TableCell>
                                                <TableCell className="py-1">{sessionData.days}</TableCell>
                                                <TableCell className="py-1">{sessionData.trades}</TableCell>
                                                <TableCell className={`py-1 ${getPnlColor(sessionData.pnl)}`}>
                                                  {formatPnL(sessionData.pnl)}
                                                </TableCell>
                                                <TableCell className={`py-1 ${getPnlColor(sessionData.avgPnlPerTrade)}`}>
                                                  {formatPnL(sessionData.avgPnlPerTrade)}
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Day of Week Performance for this month */}
                                <Card className="bg-background">
                                  <CardHeader className="p-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <Calendar className="w-4 h-4" />
                                      Day of Week Performance
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-3">
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="hover:bg-transparent">
                                            <TableHead className="text-xs">Day</TableHead>
                                            <TableHead className="text-xs">Days</TableHead>
                                            <TableHead className="text-xs">Trades</TableHead>
                                            <TableHead className="text-xs">Total PnL</TableHead>
                                            <TableHead className="text-xs">Avg PnL/Day</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => {
                                            const dayData = month.dayBreakdown[day as keyof typeof month.dayBreakdown];
                                            const avgPnlPerDay = dayData.days > 0 ? dayData.pnl / dayData.days : 0;
                                            return (
                                              <TableRow key={day} className="hover:bg-muted/50 text-xs">
                                                <TableCell className="py-1 font-medium capitalize">{day}</TableCell>
                                                <TableCell className="py-1">{dayData.days}</TableCell>
                                                <TableCell className="py-1">{dayData.trades}</TableCell>
                                                <TableCell className={`py-1 ${getPnlColor(dayData.pnl)}`}>
                                                  {formatPnL(dayData.pnl)}
                                                </TableCell>
                                                <TableCell className={`py-1 ${getPnlColor(avgPnlPerDay)}`}>
                                                  {formatPnL(avgPnlPerDay)}
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
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="mb-24" />
    </main>
  );
} 