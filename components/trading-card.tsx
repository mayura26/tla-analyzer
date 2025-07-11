import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DailyStats } from "@/lib/trading-log-parser"
import { format, parseISO } from "date-fns"
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Target, AlertTriangle, FileText, Loader2, Clock } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

interface TradingCardProps {
  stats: DailyStats
  notes?: string
  onNotesChange?: (date: string, notes: string) => void
  metadata?: {
    addedAt?: string
    verified?: boolean
    notes?: string
    verifiedAt?: string
    verifiedBy?: string
  }
}

export function TradingCard({ stats, notes: initialNotes = "", onNotesChange, metadata }: TradingCardProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedNotes, setHasUnsavedNotes] = useState(false)
  const { data: session, status } = useSession()

  // Check if user is authenticated admin
  const isAdmin = status === "authenticated" && session?.user?.role === "admin"

  // Update notes when prop changes
  useEffect(() => {
    setNotes(initialNotes);
    setHasUnsavedNotes(false);
  }, [initialNotes]);

  // Helper function to ensure date is in YYYY-MM-DD format
  const getFormattedDate = (dateInput: string | Date): string => {
    if (typeof dateInput === 'string') {
      // If it's already a YYYY-MM-DD string, return it
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return dateInput;
      }
      // If it's a date string, parse it without timezone conversion
      const date = parseISO(dateInput);
      return format(date, 'yyyy-MM-dd');
    } else {
      // If it's a Date object, format it directly
      return format(dateInput, 'yyyy-MM-dd');
    }
  };

  const saveNotes = async (newNotes: string) => {
    try {
      setIsSaving(true);
      const formattedDate = getFormattedDate(stats.date);
      const response = await fetch('/api/trading-data/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: formattedDate,
          notes: newNotes
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success("Notes saved successfully");
          if (onNotesChange) {
            onNotesChange(formattedDate, newNotes);
          }
        } else {
          toast.error(data.error || "Failed to save notes");
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save notes");
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error("Failed to save notes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
    setHasUnsavedNotes(true);
  };

  const handleSaveNotes = async () => {
    await saveNotes(notes);
    setHasUnsavedNotes(false);
  };

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

          {/* Only show notes section for authenticated admin users */}
          {isAdmin && (
            <AccordionItem value="notes">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">Notes</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes">Trading Day Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any notes about this trading day..."
                      value={notes}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      className="min-h-[100px] resize-none"
                      disabled={isSaving}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    {isSaving && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving notes...
                      </div>
                    )}
                    {hasUnsavedNotes && !isSaving && (
                      <div className="text-sm text-muted-foreground">
                        You have unsaved changes
                      </div>
                    )}
                    <Button
                      onClick={handleSaveNotes}
                      disabled={!hasUnsavedNotes || isSaving}
                      size="sm"
                      className="ml-auto"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        "Save Notes"
                      )}
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Show read-only notes for non-admin users if notes exist */}
          {!isAdmin && notes && notes.trim() && (
            <AccordionItem value="notes">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">Notes</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-2">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{notes}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>

      {/* Data Added Timestamp - always visible at bottom */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Clock className="w-3 h-3" />
          <span>
            Added: {metadata?.addedAt 
              ? format(parseISO(metadata.addedAt), 'MMM dd, yyyy HH:mm')
              : 'Unknown'
            }
          </span>
        </div>
      </div>
    </Card>
  )
} 