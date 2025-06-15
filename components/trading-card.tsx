import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DailyStats, SessionStats } from "@/lib/trading-log-parser"
import { format, isAfter, isBefore, parse } from "date-fns"
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, DollarSign, Percent, Target, AlertTriangle, ChevronDown } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface TradingCardProps {
  stats: DailyStats
}

export function TradingCard({ stats }: TradingCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      signDisplay: 'always'
    }).format(value)
  }

  const formatPercentage = (value: number, total: number) => {
    return `${((value / total) * 100).toFixed(1)}%`
  }

  const getPnlColor = (value: number) => {
    if (value >= 0) {
      if (value < 100) return 'text-gray-100';
      if (value < 300) return 'text-green-400';
      return 'text-green-600 font-bold';
    } else {
      if (value > -100) return 'text-gray-100';
      if (value > -300) return 'text-red-400';
      return 'text-red-600 font-bold';
    }
  }

  const getPnlIcon = (value: number) => {
    return value >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />
  }

  const getPnlBgColor = (value: number) => {
    if (value >= 0) {
      if (value < 100) return 'bg-gray-700';
      if (value < 300) return 'bg-green-400/30';
      return 'bg-green-600/80';
    } else {
      if (value > -100) return 'bg-gray-700';
      if (value > -300) return 'bg-red-400/30';
      return 'bg-red-600/80';
    }
  }

  const getWinRateColor = (wins: number, total: number) => {
    const rate = (wins / total) * 100
    if (rate >= 60) return 'text-green-500'
    if (rate >= 40) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getSessionCategory = (time: string) => {
    const tradeTime = parse(time, 'HH:mm', new Date())
    const morningStart = parse('08:40', 'HH:mm', new Date())
    const morningEnd = parse('10:00', 'HH:mm', new Date())
    const mainEnd = parse('16:00', 'HH:mm', new Date())
    const middayEnd = parse('12:45', 'HH:mm', new Date())
    const endSessionStart = parse('15:25', 'HH:mm', new Date())

    if (isAfter(tradeTime, endSessionStart)) return 'End'
    if (isBefore(tradeTime, morningEnd) && isAfter(tradeTime, morningStart)) return 'Morning'
    if (isBefore(tradeTime, mainEnd) && isAfter(tradeTime, morningEnd)) {
      if (isBefore(tradeTime, middayEnd)) return 'Midday'
      return 'Afternoon'
    }
    return 'Other'
  }

  const categorizeSessions = (sessionData: Record<string, { pnl: number; trades: number }>) => {
    const categorized: Record<string, { pnl: number; trades: number }> = {
      'Morning': { pnl: 0, trades: 0 },
      'Midday': { pnl: 0, trades: 0 },
      'Afternoon': { pnl: 0, trades: 0 },
      'End': { pnl: 0, trades: 0 }
    }

    Object.entries(sessionData).forEach(([time, data]) => {
      const category = getSessionCategory(time)
      if (categorized[category]) {
        categorized[category].pnl += data.pnl
        categorized[category].trades += data.trades
      }
    })

    return categorized
  }

  return (
    <Card className="w-full max-w-full md:max-w-md lg:max-w-lg hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-2xl font-bold truncate">
              {format(stats.date, 'MMMM dd, yyyy')}
            </CardTitle>
            <p className="text-sm text-muted-foreground truncate">
              {format(stats.date, 'EEEE')}
            </p>
          </div>
          <div className="flex flex-col items-end space-y-1 min-w-0">
            <Badge variant={stats.totalPnl >= 0 ? "default" : "destructive"} className={`text-gray-100 text-base md:text-lg px-3 md:px-4 py-1 ${getPnlBgColor(stats.totalPnl)}`}>
              <div className="flex items-center gap-2 min-w-0">
                {getPnlIcon(stats.totalPnl)}
                <span className="truncate">{formatCurrency(stats.totalPnl)}</span>
              </div>
            </Badge>
            <span className="text-xs md:text-sm text-muted-foreground truncate">
              {stats.totalTrades} trades
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 pb-2">
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="performance">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span className="font-medium">Performance Stats</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-2">
              <div className="grid grid-cols-1 gap-2 md:gap-4">
                {/* Win Rate */}
                <div className="flex items-center justify-between p-2 md:p-3 bg-muted/50 rounded-lg min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs md:text-sm truncate">Win Rate</span>
                  </div>
                  <span className={`font-semibold ${getWinRateColor(stats.wins, stats.totalTrades)} text-xs md:text-base`}>
                    {formatPercentage(stats.wins, stats.totalTrades)}
                  </span>
                </div>

                {/* Wins Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 md:p-3 bg-muted/50 rounded-lg min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-muted-foreground text-xs md:text-sm truncate">Wins</span>
                    </div>
                    <span className="font-semibold text-green-500 text-xs md:text-base">{stats.wins}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 md:p-3 bg-muted/20 rounded-lg min-w-0 ml-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-muted-foreground text-xs md:text-sm truncate">Big Wins</span>
                    </div>
                    <span className="font-semibold text-green-500 text-xs md:text-base">{stats.bigWins}</span>
                  </div>
                </div>

                {/* Losses Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 md:p-3 bg-muted/50 rounded-lg min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      <span className="text-muted-foreground text-xs md:text-sm truncate">Losses</span>
                    </div>
                    <span className="font-semibold text-red-500 text-xs md:text-base">{stats.losses}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 md:p-3 bg-muted/20 rounded-lg min-w-0 ml-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      <span className="text-muted-foreground text-xs md:text-sm truncate">Big Losses</span>
                    </div>
                    <span className="font-semibold text-red-500 text-xs md:text-base">{stats.bigLosses}</span>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="sessions">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="font-medium">Session Breakdown</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-2">
              <div className="grid grid-cols-1 gap-2 md:gap-3">
                {/* Morning Session */}
                <div className="flex flex-wrap justify-between items-center p-2 md:p-3 bg-muted/30 rounded-lg min-w-0">
                  <span className="text-xs md:text-sm font-medium capitalize min-w-0 truncate">Morning</span>
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-wrap">
                    <span className={`text-xs md:text-sm font-medium ${getPnlColor(stats.sessionBreakdown.morning.pnl)} min-w-0 truncate`}>
                      {formatCurrency(stats.sessionBreakdown.morning.pnl)}
                    </span>
                    <Badge variant="outline" className="text-[10px] md:text-xs px-2 py-0.5">
                      {stats.sessionBreakdown.morning.trades} trades
                    </Badge>
                  </div>
                </div>

                {/* Main Session with Subsets */}
                <div className="space-y-2">
                  <div className="flex flex-wrap justify-between items-center p-2 md:p-3 bg-muted/30 rounded-lg min-w-0">
                    <span className="text-xs md:text-sm font-medium capitalize min-w-0 truncate">Main</span>
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-wrap">
                      <span className={`text-xs md:text-sm font-medium ${getPnlColor(stats.sessionBreakdown.main.pnl)} min-w-0 truncate`}>
                        {formatCurrency(stats.sessionBreakdown.main.pnl)}
                      </span>
                      <Badge variant="outline" className="text-[10px] md:text-xs px-2 py-0.5">
                        {stats.sessionBreakdown.main.trades} trades
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Midday Subset */}
                  <div className="flex flex-wrap justify-between items-center p-2 md:p-3 bg-muted/20 rounded-lg min-w-0 ml-4">
                    <span className="text-xs md:text-sm font-medium capitalize min-w-0 truncate">Midday</span>
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-wrap">
                      <span className={`text-xs md:text-sm font-medium ${getPnlColor(stats.sessionBreakdown.midday.pnl)} min-w-0 truncate`}>
                        {formatCurrency(stats.sessionBreakdown.midday.pnl)}
                      </span>
                      <Badge variant="outline" className="text-[10px] md:text-xs px-2 py-0.5">
                        {stats.sessionBreakdown.midday.trades} trades
                      </Badge>
                    </div>
                  </div>

                  {/* Afternoon Subset */}
                  <div className="flex flex-wrap justify-between items-center p-2 md:p-3 bg-muted/20 rounded-lg min-w-0 ml-4">
                    <span className="text-xs md:text-sm font-medium capitalize min-w-0 truncate">Afternoon</span>
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-wrap">
                      <span className={`text-xs md:text-sm font-medium ${getPnlColor(stats.sessionBreakdown.afternoon.pnl)} min-w-0 truncate`}>
                        {formatCurrency(stats.sessionBreakdown.afternoon.pnl)}
                      </span>
                      <Badge variant="outline" className="text-[10px] md:text-xs px-2 py-0.5">
                        {stats.sessionBreakdown.afternoon.trades} trades
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* End Session */}
                <div className="flex flex-wrap justify-between items-center p-2 md:p-3 bg-muted/30 rounded-lg min-w-0">
                  <span className="text-xs md:text-sm font-medium capitalize min-w-0 truncate">End</span>
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-wrap">
                    <span className={`text-xs md:text-sm font-medium ${getPnlColor(stats.sessionBreakdown.end.pnl)} min-w-0 truncate`}>
                      {formatCurrency(stats.sessionBreakdown.end.pnl)}
                    </span>
                    <Badge variant="outline" className="text-[10px] md:text-xs px-2 py-0.5">
                      {stats.sessionBreakdown.end.trades} trades
                    </Badge>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="protection">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Protection Stats</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                <div className="space-y-2 md:space-y-3">
                  <div className="flex justify-between items-center p-2 md:p-3 bg-muted/30 rounded-lg min-w-0">
                    <span className="text-xs md:text-sm font-medium min-w-0 truncate">Blocked Trades</span>
                    <Badge variant="outline" className="text-[10px] md:text-xs px-2 py-0.5">
                      {Object.values(stats.protectionStats.blockedTrades).reduce((a, b) => a + b, 0)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 md:p-3 bg-muted/30 rounded-lg min-w-0">
                    <span className="text-xs md:text-sm font-medium min-w-0 truncate">Fill Protection</span>
                    <Badge variant="outline" className="text-[10px] md:text-xs px-2 py-0.5">
                      {Object.values(stats.protectionStats.fillProtection).reduce((a, b) => a + b, 0)}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2 md:space-y-3">
                  <div className="flex justify-between items-center p-2 md:p-3 bg-muted/30 rounded-lg min-w-0">
                    <span className="text-xs md:text-sm font-medium min-w-0 truncate">Chase Mode</span>
                    <Badge variant="outline" className="text-[10px] md:text-xs px-2 py-0.5">
                      {stats.protectionStats.chaseMode.trades} trades
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 md:p-3 bg-muted/30 rounded-lg min-w-0">
                    <span className="text-xs md:text-sm font-medium min-w-0 truncate">Restarts</span>
                    <Badge variant="outline" className="text-[10px] md:text-xs px-2 py-0.5">
                      {stats.protectionStats.chaseMode.restarts}
                    </Badge>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
} 