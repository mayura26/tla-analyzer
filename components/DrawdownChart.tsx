"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import { 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  ReferenceLine,
  ComposedChart
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { useTheme } from 'next-themes'

interface DailyLog {
  date: string;
  analysis: {
    headline: {
      totalPnl: number;
      totalTrades: number;
      wins: number;
      losses: number;
    };
  };
}

interface DrawdownChartProps {
  dailyLogs: DailyLog[];
}

// Format PnL for display
const formatPnL = (value: number) => {
  return `$${Math.round(value * 100) / 100}`;
};

// Custom tooltip component for drawdown
const DrawdownTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
  if (active && payload && payload.length && label) {
    const drawdownData = payload.find((p: any) => p.dataKey === 'drawdown');
    
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground">{format(parseISO(label), 'MMM dd, yyyy')}</p>
        <div className="space-y-1 mt-2">
          {drawdownData && (
            <p className="text-sm">
              <span className="text-muted-foreground">Drawdown: </span>
              <span className="text-pink-600">
                {formatPnL(drawdownData.value)}
              </span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export function DrawdownChart({ dailyLogs }: DrawdownChartProps) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get theme-appropriate colors
  const axisColor = theme === 'dark' ? '#a1a1aa' : '#71717a'; // muted-foreground equivalent
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'; // border equivalent

  const hasData = dailyLogs && dailyLogs.length > 0;

  return (
    <Card className="bg-card/50">
      <CardHeader className="px-2 py-0.5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Drawdown Analysis</CardTitle>
          </div>
          {hasData && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="p-4 pt-0">
          {hasData ? (
            <>
              {(() => {
                const sortedLogs = [...dailyLogs].sort((a, b) => 
                  parseISO(a.date).getTime() - parseISO(b.date).getTime()
                );

                let cumulativePnl = 0;
                let peakPnl = 0;
                const chartData = sortedLogs.map(log => {
                  cumulativePnl += log.analysis.headline.totalPnl;
                  peakPnl = Math.max(peakPnl, cumulativePnl);
                  const drawdown = cumulativePnl - peakPnl; // This will be negative or zero
                  
                  return {
                    date: log.date,
                    drawdown: drawdown,
                    zeroLine: 0, // Add a zero line for the area fill
                  };
                });

                const drawdownValues = chartData.map(d => d.drawdown);
                const minDrawdown = Math.min(...drawdownValues, 0);
                const maxDrawdown = Math.max(...drawdownValues, 0);

                return (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => format(parseISO(value), 'MMM dd')}
                        stroke={axisColor}
                        tick={{ fill: axisColor, fontSize: 12 }}
                      />
                      <YAxis 
                        stroke={axisColor}
                        tickFormatter={(value) => formatPnL(value)}
                        domain={[0, -Math.max(Math.abs(maxDrawdown), Math.abs(minDrawdown))]}
                        tick={{ fill: axisColor, fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          borderColor: 'hsl(var(--border))',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        content={<DrawdownTooltip />}
                      />
                      
                      <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      
                      <Area
                        type="monotoneX"
                        dataKey="drawdown"
                        stroke="none"
                        fill="hsl(330 100% 70%)"
                        fillOpacity={0.2}
                        baseValue={0}
                      />
                      
                      <Line 
                        type="monotoneX" 
                        dataKey="drawdown" 
                        stroke="hsl(330 100% 70%)"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 4, fill: 'hsl(330 100% 70%)' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                );
              })()}
              
              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5" style={{ backgroundColor: 'hsl(330 100% 70%)' }}></div>
                  <span className="text-muted-foreground">Drawdown</span>
                </div>
              </div>
            </>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
} 