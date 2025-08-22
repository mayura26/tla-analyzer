import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DailyStats } from "@/lib/trading-log-parser";
import { format, parseISO } from "date-fns";
import { TrendingUp, TrendingDown, Target, DollarSign, Trophy, CheckCircle2, FileText, Clock } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useState, useEffect } from "react";
import { CompareTradingDialog } from "./CompareTradingDialog";

interface CompareTradingCardProps {
  baseStats: DailyStats;
  compareStats: DailyStats;
  metadata?: {
    verified?: boolean;
    notes?: string;
    verifiedAt?: string;
    verifiedBy?: string;
    addedAt?: string;
  } | null;
  onMerge?: () => void;
}

export function CompareTradingCard({ baseStats, compareStats, metadata, onMerge }: CompareTradingCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVerified, setIsVerified] = useState(metadata?.verified || false);
  const [notes, setNotes] = useState<string>(metadata?.notes || "");
  const [baseDayNotes, setBaseDayNotes] = useState<string>("");

  // Fetch base day notes when component mounts
  useEffect(() => {
    const fetchBaseDayNotes = async () => {
      try {
        const formattedDate = format(baseStats.date, 'yyyy-MM-dd');
        const response = await fetch(`/api/trading-data/notes?date=${formattedDate}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && data.data.notes) {
            setBaseDayNotes(data.data.notes);
          }
        }
      } catch (error) {
        console.error('Error fetching base day notes:', error);
      }
    };

    fetchBaseDayNotes();
  }, [baseStats.date]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      signDisplay: 'always'
    }).format(value)
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
    return value >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
  }

  const getWinRateColor = (wins: number, total: number) => {
    const rate = total > 0 ? (wins / total) * 100 : 0;
    if (rate >= 60) return 'text-green-500';
    if (rate >= 40) return 'text-yellow-500';
    return 'text-red-500';
  }

  const calculateDifference = (base: number, compare: number) => {
    const diff = compare - base;
    return {
      value: diff,
      percentage: base !== 0 ? (diff / Math.abs(base)) * 100 : 0
    };
  };

  const formatDifference = (diff: { value: number; percentage: number }) => {
    return `${formatCurrency(diff.value)} (${diff.value >= 0 ? '+' : ''}${Math.abs(diff.percentage).toFixed(1)}%)`;
  };

  const pnlDiff = calculateDifference(baseStats.totalPnl, compareStats.totalPnl);
  const tradesDiff = compareStats.totalTrades - baseStats.totalTrades;
  const winsDiff = compareStats.wins - baseStats.wins;
  const lossesDiff = compareStats.losses - baseStats.losses;
  const bigWinDiff = compareStats.bigWins - baseStats.bigWins;
  const bigLossDiff = compareStats.bigLosses - baseStats.bigLosses;

  const hasChanges = pnlDiff.value !== 0 || tradesDiff !== 0 || winsDiff !== 0 || lossesDiff !== 0 || bigWinDiff !== 0 || bigLossDiff !== 0;

  // Enhanced badge color function with muted green/red colors
  const getBadgeColors = (value: number) => {
    const abs = Math.abs(value);
    if (value >= 0) {
      if (abs <= 50) return 'bg-green-50 text-green-700 border-green-300 dark:bg-green-950/40 dark:text-green-500 dark:border-green-600';
      if (abs < 150) return 'bg-green-200 text-green-900 border-green-400 dark:bg-green-950/60 dark:text-green-300 dark:border-green-700';
      if (abs < 300) return 'bg-green-300 text-green-900 border-green-500 dark:bg-green-950/70 dark:text-green-200 dark:border-green-600';
      return 'bg-green-400 text-green-900 border-green-600 dark:bg-green-950/80 dark:text-green-100 dark:border-green-500';
    } else {
      if (abs <= 50) return 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-500 dark:border-red-600';
      if (abs < 150) return 'bg-red-200 text-red-900 border-red-400 dark:bg-red-950/60 dark:text-red-300 dark:border-red-700';
      if (abs < 300) return 'bg-red-300 text-red-900 border-red-500 dark:bg-red-950/70 dark:text-red-200 dark:border-red-600';
      return 'bg-red-400 text-red-900 border-red-600 dark:bg-red-950/80 dark:text-red-100 dark:border-red-500';
    }
  };

  // Muted style for no significant differences
  const mutedCardClass = !hasChanges ? "opacity-60 scale-90 bg-muted border-muted text-muted-foreground shadow-none rounded-md p-1 min-h-0" : "";
  const mutedHeaderClass = !hasChanges ? "py-1" : "";
  const mutedTitleClass = !hasChanges ? "text-base text-muted-foreground font-medium text-center w-full" : "";
  const mutedContentClass = !hasChanges ? "py-1 px-2" : "";

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open dialog if clicking on accordion triggers specifically
    const target = e.target as HTMLElement;
    if (target.closest('[data-slot="accordion-trigger"]')) {
      e.stopPropagation();
      return;
    }
    setIsDialogOpen(true);
  };

  return (
    <>
      <Card 
        className={`relative ${mutedCardClass} cursor-pointer hover:shadow-lg transition-shadow duration-200`}
        onClick={handleCardClick}
      >
        {/* Verification indicator */}
        {isVerified && (
          <div className="absolute top-2 right-2 z-10" title="This day has been verified">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
        )}
        
        <CardHeader className={`pb-2 ${mutedHeaderClass}`}>
          <CardTitle className={`text-lg ${mutedTitleClass}`}>
            {format(baseStats.date, 'MMM dd, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent className={mutedContentClass}>
          {hasChanges ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <Badge 
                    className={`font-semibold text-sm px-3 py-1 ${getBadgeColors(pnlDiff.value)}`}
                  >
                    {formatDifference(pnlDiff)}
                  </Badge>
                </div>
                {getPnlIcon(pnlDiff.value)}
              </div>

              <div className={`flex items-center gap-4 flex-wrap ${
                winsDiff === 0 && lossesDiff === 0 && tradesDiff === 0 && bigWinDiff === 0 && bigLossDiff === 0
                  ? 'text-muted-foreground opacity-70'
                  : 'text-foreground font-semibold'
              }`}>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {winsDiff >= 0 ? '+' : ''}{winsDiff}W / {lossesDiff >= 0 ? '+' : ''}{lossesDiff}L
                  </span>
                </div>
                <Badge variant="outline">
                  {tradesDiff >= 0 ? '+' : ''}{tradesDiff} trades
                </Badge>
                <span className="flex items-center gap-1">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  {bigWinDiff >= 0 ? '+' : ''}{bigWinDiff}BW / {bigLossDiff >= 0 ? '+' : ''}{bigLossDiff}BL
                </span>
              </div>

              <Accordion type="single" collapsible>
                <AccordionItem value="compare-details">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="grid grid-cols-2 gap-4 w-full">
                      <div className="flex flex-col items-start space-y-1">
                        <div className="text-sm text-muted-foreground">Base Stats</div>
                        <div className="font-medium">
                          <span className={getPnlColor(baseStats.totalPnl)}>{formatCurrency(baseStats.totalPnl)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-start space-y-1">
                        <div className="text-sm text-muted-foreground">Compare Stats</div>
                        <div className="font-medium">
                          <span className={getPnlColor(compareStats.totalPnl)}>{formatCurrency(compareStats.totalPnl)}</span>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 w-full">
                      <div className="flex flex-col gap-2 pt-2 pb-2">
                        <div className={`text-xs font-semibold ${getWinRateColor(baseStats.wins, baseStats.totalTrades)}`}>WR: {baseStats.totalTrades > 0 ? ((baseStats.wins / baseStats.totalTrades) * 100).toFixed(1) : '0.0'}%</div>
                        <Badge variant="outline" className="text-[10px] md:text-xs px-2 py-0.5">{baseStats.totalTrades} trades</Badge>
                        <div className="text-sm">{baseStats.wins}W / {baseStats.losses}L</div>
                        <div className="text-sm">{baseStats.bigWins}BW / {baseStats.bigLosses}BL</div>
                      </div>
                      <div className="flex flex-col gap-2 pt-2 pb-2">
                        <div className={`text-xs font-semibold ${getWinRateColor(compareStats.wins, compareStats.totalTrades)}`}>WR: {compareStats.totalTrades > 0 ? ((compareStats.wins / compareStats.totalTrades) * 100).toFixed(1) : '0.0'}%</div>
                        <Badge variant="outline" className="text-[10px] md:text-xs px-2 py-0.5">{compareStats.totalTrades} trades</Badge>
                        <div className="text-sm">{compareStats.wins}W / {compareStats.losses}L</div>
                        <div className="text-sm">{compareStats.bigWins}BW / {compareStats.bigLosses}BL</div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Base Day Notes accordion - only show if base day notes exist */}
                {baseDayNotes && baseDayNotes.trim() && (
                  <AccordionItem value="base-notes">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2 w-full">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Base Day Notes</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2 pb-2">
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-md p-3 border border-muted-foreground/20">
                          {baseDayNotes}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Compare Notes accordion - only show if notes exist */}
                {notes && notes.trim() && (
                  <AccordionItem value="notes">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2 w-full">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Compare Notes</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2 pb-2">
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-md p-3 border">
                          {notes}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>
          ) : (
            // Only show the date, no extra text or padding
            <></>
          )}
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

      <CompareTradingDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        baseStats={baseStats}
        compareStats={compareStats}
        onMerge={onMerge}
        onVerificationChange={(verified) => setIsVerified(verified)}
        onNotesChange={handleNotesChange}
      />
    </>
  );
} 