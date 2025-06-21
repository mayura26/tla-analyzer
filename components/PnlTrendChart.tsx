"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ComposedChart,
  Cell,
  Area,
  Line
} from 'recharts'
import { format, subDays } from 'date-fns'
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

interface PnlTrendChartProps {
  dailyLogs: DailyLog[];
}

// Format PnL for display
const formatPnL = (value: number) => {
  return `$${Math.round(value * 100) / 100}`;
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
  if (active && payload && payload.length && label) {
    const dailyPnlData = payload.find((p: any) => p.dataKey === 'dailyPnl');
    const rollingPnlData = payload.find((p: any) => p.dataKey === 'rollingPnl');
    
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground">{format(new Date(label), 'MMM dd, yyyy')}</p>
        <div className="space-y-1 mt-2">
          {dailyPnlData && (
            <p className="text-sm">
              <span className="text-muted-foreground">Daily PnL: </span>
              <span className={dailyPnlData.value >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatPnL(dailyPnlData.value)}
              </span>
            </p>
          )}
          {rollingPnlData && (
            <p className="text-sm">
              <span className="text-muted-foreground">Rolling PnL: </span>
              <span className={rollingPnlData.value >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatPnL(rollingPnlData.value)}
              </span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export function PnlTrendChart({ dailyLogs }: PnlTrendChartProps) {
  const { theme } = useTheme();
  
  // Get theme-appropriate colors
  const axisColor = theme === 'dark' ? '#a1a1aa' : '#71717a'; // muted-foreground equivalent
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'; // border equivalent

  if (!dailyLogs || dailyLogs.length === 0) {
    return (
      <Card className="bg-card/50">
        <CardHeader className="p-4">
          <CardTitle className="text-base">PnL Trend Chart</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedLogs = [...dailyLogs].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let cumulativePnl = 0;
  const chartData = sortedLogs.map(log => {
    cumulativePnl += log.analysis.headline.totalPnl;
    return {
      date: log.date,
      dailyPnl: log.analysis.headline.totalPnl,
      rollingPnl: cumulativePnl,
      trades: log.analysis.headline.totalTrades,
      wins: log.analysis.headline.wins,
      losses: log.analysis.headline.losses
    };
  });

  const rollingPnlValues = chartData.map(d => d.rollingPnl);
  const maxRollingPnl = Math.max(...rollingPnlValues, 0);
  const minRollingPnl = Math.min(...rollingPnlValues, 0);
  const padding = Math.max(Math.abs(maxRollingPnl), Math.abs(minRollingPnl)) * 0.1;

  return (
    <Card className="bg-card/50">
      <CardHeader className="p-4">
        <CardTitle className="text-base">PnL Trend Chart</CardTitle>
        <p className="text-sm text-muted-foreground">
          Daily PnL bars with rolling cumulative PnL line
        </p>
      </CardHeader>
      <CardContent className="p-4">
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              stroke={axisColor}
              tick={{ fill: axisColor, fontSize: 12 }}
            />
            <YAxis 
              yAxisId="rolling"
              orientation="left"
              stroke={axisColor}
              tickFormatter={(value) => formatPnL(value)}
              domain={[-Math.max(Math.abs(maxRollingPnl), Math.abs(minRollingPnl)), Math.max(Math.abs(maxRollingPnl), Math.abs(minRollingPnl))]}
              tick={{ fill: axisColor, fontSize: 12 }}
            />
            <YAxis 
              yAxisId="daily"
              orientation="right"
              stroke={axisColor}
              tickFormatter={(value) => formatPnL(value)}
              domain={[-700, 700]}
              tick={{ fill: axisColor, fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              content={<CustomTooltip />}
            />
            
            <Area
              yAxisId="rolling"
              type="monotone"
              dataKey="rollingPnl"
              stroke="none"
              fill="hsl(217.2 91.2% 59.8%)"
              fillOpacity={0.15}
            />
            
            <Bar 
              yAxisId="daily"
              dataKey="dailyPnl" 
              radius={[2, 2, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={entry.dailyPnl >= 0 ? 'hsl(142.1 76.2% 36.3%)' : 'hsl(0 84.2% 60.2%)'}
                />
              ))}
            </Bar>
            
            <Line 
              yAxisId="rolling"
              type="monotoneX" 
              dataKey="rollingPnl" 
              stroke="hsl(217.2 91.2% 59.8%)"
              strokeWidth={3}
              dot={false}
              activeDot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
        
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4" style={{ backgroundColor: 'hsl(142.1 76.2% 36.3%)' }}></div>
            <span className="text-muted-foreground">Positive Days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4" style={{ backgroundColor: 'hsl(0 84.2% 60.2%)' }}></div>
            <span className="text-muted-foreground">Negative Days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5" style={{ backgroundColor: 'hsl(217.2 91.2% 59.8%)' }}></div>
            <span className="text-muted-foreground">Rolling PnL</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 