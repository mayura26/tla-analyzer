import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TradeListEntry } from "@/lib/trading-log-parser";
import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Loader2, Trash2, CheckCircle2, ChevronDown, ChevronRight, ArrowRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { compareTradingLogs } from "@/lib/trading-log-comparator";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ReplacedCompareData {
  date: string;
  analysis: {
    headline: {
      totalPnl: number;
      totalTrades: number;
      wins: number;
      losses: number;
    };
    tradeList: TradeListEntry[];
  };
  metadata?: {
    replacedAt?: string;
    replacedReason?: string;
    originalDate?: string;
    addedAt?: string;
    notes?: string;
  };
}

interface CurrentCompareData {
  date: string;
  analysis: {
    headline: {
      totalPnl: number;
      totalTrades: number;
      wins: number;
      losses: number;
    };
    tradeList: TradeListEntry[];
  };
  metadata?: {
    notes?: string;
  };
}

interface ReplacedCompareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  replacedData: ReplacedCompareData | null;
  onDelete?: () => void;
}

export function ReplacedCompareDialog({ 
  isOpen, 
  onClose, 
  replacedData, 
  onDelete 
}: ReplacedCompareDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [markedTrades, setMarkedTrades] = useState<Set<string>>(new Set());
  const [collapsedTrades, setCollapsedTrades] = useState<Set<string>>(new Set());
  const [currentCompareData, setCurrentCompareData] = useState<CurrentCompareData | null>(null);
  const [loadingCurrentData, setLoadingCurrentData] = useState(false);
  const [baseNotes, setBaseNotes] = useState<string>("");
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Helper function to generate a unique key for a trade
  const getTradeKey = (trade: TradeListEntry) => {
    return `${trade.timestamp}-${trade.entryPrice}-${trade.direction}-${trade.totalPnl}`;
  };

  // Fetch current comparison data when dialog opens
  React.useEffect(() => {
    if (isOpen && replacedData) {
      fetchCurrentCompareData();
      fetchNotes();
    }
  }, [isOpen, replacedData]);

  const fetchCurrentCompareData = async () => {
    if (!replacedData) return;
    
    try {
      setLoadingCurrentData(true);
      const response = await fetch(`/api/trading-data/compare/manage?date=${replacedData.date}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentCompareData(data);
      } else {
        console.error('Failed to load current comparison data');
      }
    } catch (error) {
      console.error('Error fetching current comparison data:', error);
    } finally {
      setLoadingCurrentData(false);
    }
  };

  const fetchNotes = async () => {
    if (!replacedData) return;
    
    try {
      setLoadingNotes(true);
      const response = await fetch(`/api/trading-data/notes?date=${replacedData.date}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.notes) {
          setBaseNotes(data.data.notes);
        } else {
          setBaseNotes("");
        }
      } else {
        console.error('Failed to load base notes');
        setBaseNotes("");
      }
    } catch (error) {
      console.error('Error fetching base notes:', error);
      setBaseNotes("");
    } finally {
      setLoadingNotes(false);
    }
  };

  // Toggle trade marking
  const toggleTradeMarking = (trade: TradeListEntry) => {
    const tradeKey = getTradeKey(trade);
    setMarkedTrades(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tradeKey)) {
        newSet.delete(tradeKey);
        setCollapsedTrades(prevCollapsed => {
          const newCollapsed = new Set(prevCollapsed);
          newCollapsed.delete(tradeKey);
          return newCollapsed;
        });
      } else {
        newSet.add(tradeKey);
        setCollapsedTrades(prevCollapsed => {
          const newCollapsed = new Set(prevCollapsed);
          newCollapsed.add(tradeKey);
          return newCollapsed;
        });
      }
      return newSet;
    });
  };

  // Toggle trade collapse state
  const toggleTradeCollapse = (trade: TradeListEntry, event: React.MouseEvent) => {
    event.stopPropagation();
    const tradeKey = getTradeKey(trade);
    setCollapsedTrades(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tradeKey)) {
        newSet.delete(tradeKey);
      } else {
        newSet.add(tradeKey);
      }
      return newSet;
    });
  };

  // Clear all markings when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setMarkedTrades(new Set());
      setCollapsedTrades(new Set());
    }
  }, [isOpen]);

  const handleDelete = async () => {
    if (!replacedData) return;
    
    if (!confirm('Are you sure you want to delete this replaced comparison data? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch('/api/trading-data/compare/replaced', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: replacedData.date
        }),
      });

      if (response.ok) {
        toast.success("Replaced comparison data successfully deleted");
        if (onDelete) {
          onDelete();
        }
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete replaced comparison data");
      }
    } catch (error) {
      console.error('Error deleting replaced comparison data:', error);
      toast.error("Failed to delete replaced comparison data");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getPnlColor = (value: number) => {
    return value >= 0 ? 'text-green-500' : 'text-red-500';
  };

  const renderSubTradeComparison = (oldSubTrades: TradeListEntry['subTrades'][number][], newSubTrades: TradeListEntry['subTrades'][number][]) => {
    const maxLen = Math.max(oldSubTrades.length, newSubTrades.length);
    if (maxLen === 0) return null;
    
    // Check if there are any differences
    let hasDiff = false;
    for (let i = 0; i < maxLen; i++) {
      const oldSub = oldSubTrades[i];
      const newSub = newSubTrades[i];
      if (!oldSub || !newSub) { hasDiff = true; break; }
      if (
        oldSub.exitPrice !== newSub.exitPrice ||
        oldSub.quantity !== newSub.quantity ||
        oldSub.pnl !== newSub.pnl ||
        oldSub.points !== newSub.points ||
        oldSub.exitReason !== newSub.exitReason ||
        (oldSub.detailedExitReason || '') !== (newSub.detailedExitReason || '')
      ) { hasDiff = true; break; }
    }
    if (!hasDiff) return null;
    
    // Render side-by-side comparison
    return (
      <div className="col-span-2 mt-2">
        <div className="text-xs font-medium mb-1">Sub-trade Comparison</div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="font-semibold text-muted-foreground">#</div>
          <div className="font-semibold text-muted-foreground">Replaced</div>
          <div className="font-semibold text-muted-foreground">Current</div>
          {Array.from({ length: maxLen }).map((_, i) => {
            const oldSub = oldSubTrades[i];
            const newSub = newSubTrades[i];
            return (
              <React.Fragment key={i}>
                <div className="text-muted-foreground">{`Exit ${i + 1}`}</div>
                <div className="space-y-0.5">
                  {oldSub ? (
                    <>
                      <div>
                        exitPrice: <span className={oldSub && newSub && oldSub.exitPrice !== newSub.exitPrice ? 'bg-yellow-900/40 px-1 rounded' : ''}>{oldSub.exitPrice}</span>
                      </div>
                      <div>
                        quantity: <span className={oldSub && newSub && oldSub.quantity !== newSub.quantity ? 'bg-yellow-900/40 px-1 rounded' : ''}>{oldSub.quantity}</span>
                      </div>
                      <div>
                        pnl: <span className={oldSub && newSub && oldSub.pnl !== newSub.pnl ? 'bg-yellow-900/40 px-1 rounded' : ''}>{formatCurrency(oldSub.pnl)}</span>
                      </div>
                      <div>
                        points: <span className={oldSub && newSub && oldSub.points !== newSub.points ? 'bg-yellow-900/40 px-1 rounded' : ''}>{oldSub.points}</span>
                      </div>
                      <div>
                        exitReason: <span className={oldSub && newSub && oldSub.exitReason !== newSub.exitReason ? 'bg-yellow-900/40 px-1 rounded' : ''}>{oldSub.exitReason}</span>
                      </div>
                      {oldSub.detailedExitReason && (
                        <div>
                          detailedReason: <span className={oldSub && newSub && (oldSub.detailedExitReason || '') !== (newSub.detailedExitReason || '') ? 'bg-yellow-900/40 px-1 rounded' : ''}>{oldSub.detailedExitReason}</span>
                        </div>
                      )}
                    </>
                  ) : <span className="italic text-muted-foreground">—</span>}
                </div>
                <div className="space-y-0.5">
                  {newSub ? (
                    <>
                      <div>
                        exitPrice: <span className={oldSub && newSub && oldSub.exitPrice !== newSub.exitPrice ? 'bg-yellow-900/40 px-1 rounded' : ''}>{newSub.exitPrice}</span>
                      </div>
                      <div>
                        quantity: <span className={oldSub && newSub && oldSub.quantity !== newSub.quantity ? 'bg-yellow-900/40 px-1 rounded' : ''}>{newSub.quantity}</span>
                      </div>
                      <div>
                        pnl: <span className={oldSub && newSub && oldSub.pnl !== newSub.pnl ? 'bg-yellow-900/40 px-1 rounded' : ''}>{formatCurrency(newSub.pnl)}</span>
                      </div>
                      <div>
                        points: <span className={oldSub && newSub && oldSub.points !== newSub.points ? 'bg-yellow-900/40 px-1 rounded' : ''}>{newSub.points}</span>
                      </div>
                      <div>
                        exitReason: <span className={oldSub && newSub && oldSub.exitReason !== newSub.exitReason ? 'bg-yellow-900/40 px-1 rounded' : ''}>{newSub.exitReason}</span>
                      </div>
                      {newSub.detailedExitReason && (
                        <div>
                          detailedReason: <span className={oldSub && newSub && (oldSub.detailedExitReason || '') !== (newSub.detailedExitReason || '') ? 'bg-yellow-900/40 px-1 rounded' : ''}>{newSub.detailedExitReason}</span>
                        </div>
                      )}
                    </>
                  ) : <span className="italic text-muted-foreground">—</span>}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTrade = (trade: TradeListEntry, isModified = false, changes: { field: keyof TradeListEntry; oldValue: any; newValue: any }[] = []) => {
    const formatTime = (dateInput: Date | string) => {
      const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      return formatInTimeZone(date, 'UTC', 'HH:mm');
    };

    // Find subTrades change and get detailed diffs if present
    let subTradeComparison: React.ReactNode = null;
    const filteredChanges = changes.filter(change => {
      if (change.field === 'subTrades') {
        subTradeComparison = renderSubTradeComparison(change.oldValue, change.newValue);
        return false;
      }
      return true;
    });

    // Find PnL change if it exists
    const pnlChange = changes.find(change => change.field === 'totalPnl');

    const tradeKey = getTradeKey(trade);
    const isMarked = markedTrades.has(tradeKey);
    const isCollapsed = collapsedTrades.has(tradeKey);

    if (isMarked && isCollapsed) {
      return (
        <div 
          className="p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted/60 bg-muted/20 opacity-50 border border-muted-foreground/30"
          onClick={() => toggleTradeMarking(trade)}
          title="Click to unmark as reviewed"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="cursor-pointer p-1 hover:bg-muted/40 rounded"
                onClick={(e) => toggleTradeCollapse(trade, e)}
                title="Expand trade details"
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <Badge 
                variant="outline" 
                className={`${
                  trade.direction === 'LONG' ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'
                }`}
              >
                {trade.direction}
              </Badge>
              <span className="text-sm">{formatTime(trade.timestamp)}</span>
              {trade.isChaseTrade && (
                <Badge variant="outline" className="bg-yellow-400/20 text-yellow-400">
                  Chase
                </Badge>
              )}
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`${
                  trade.totalPnl >= 0 
                    ? 'bg-green-400/20 text-green-400 border-green-400/30' 
                    : 'bg-red-400/20 text-red-400 border-red-400/30'
                }`}
              >
                {formatCurrency(trade.totalPnl)}
              </Badge>
              <Badge variant="outline" className="text-xs">{trade.entryPrice}</Badge>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div 
        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted/60 ${
          isMarked 
            ? 'bg-muted/20 opacity-50 border border-muted-foreground/30' 
            : isModified 
              ? 'bg-muted/50' 
              : 'bg-muted/30'
        }`}
        onClick={() => toggleTradeMarking(trade)}
        title={isMarked ? "Click to unmark as reviewed" : "Click to mark as reviewed"}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isMarked && (
              <div 
                className="cursor-pointer p-1 hover:bg-muted/40 rounded"
                onClick={(e) => toggleTradeCollapse(trade, e)}
                title="Collapse trade details"
              >
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <Badge 
              variant="outline" 
              className={`${
                trade.direction === 'LONG' ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'
              }`}
            >
              {trade.direction}
            </Badge>
            <span className="text-sm">{formatTime(trade.timestamp)}</span>
            {trade.isChaseTrade && (
              <Badge variant="outline" className="bg-yellow-400/20 text-yellow-400">
                Chase
              </Badge>
            )}
            {isMarked && (
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-2">
            {isModified && pnlChange ? (
              <div className="flex items-center gap-1">
                <Badge 
                  variant="outline" 
                  className={`${
                    pnlChange.newValue - pnlChange.oldValue >= 0 
                      ? 'bg-green-400/20 text-green-400 border-green-400/30' 
                      : 'bg-red-400/20 text-red-400 border-red-400/30'
                  }`}
                >
                  {formatCurrency(pnlChange.newValue - pnlChange.oldValue)}
                </Badge>
                <span className="text-muted-foreground text-sm">
                  ({formatCurrency(pnlChange.oldValue)} → {formatCurrency(pnlChange.newValue)})
                </span>
              </div>
            ) : (
              <Badge 
                variant="outline" 
                className={`${
                  trade.totalPnl >= 0 
                    ? 'bg-green-400/20 text-green-400 border-green-400/30' 
                    : 'bg-red-400/20 text-red-400 border-red-400/30'
                }`}
              >
                {formatCurrency(trade.totalPnl)}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">{trade.entryPrice}</Badge>
          </div>
        </div>

        {/* Sub-trades */}
        {trade.subTrades.length > 0 && (
          <div className="mt-2 space-y-1">
            {trade.subTrades.map((subTrade, index) => (
              <div key={index} className="text-xs pl-4 border-l-2 border-muted-foreground/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        subTrade.exitReason === 'TP' ? 'bg-green-400/20 text-green-400' :
                        subTrade.exitReason === 'SL' ? 'bg-red-400/20 text-red-400' :
                        'bg-gray-400/20 text-gray-400'
                      }`}
                    >
                      {subTrade.exitReason}
                    </Badge>
                    <span>{subTrade.quantity} @ {subTrade.exitPrice}</span>
                  </div>
                  <span className={`${getPnlColor(subTrade.pnl)}`}>{formatCurrency(subTrade.pnl)}</span>
                </div>
                {subTrade.detailedExitReason && (
                  <div className="text-xs text-muted-foreground pl-4 mt-1">
                    {subTrade.detailedExitReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {isModified && (filteredChanges.length > 0 || subTradeComparison) && (
          <div className="mt-2 pt-2 border-t">
            <div className="text-xs text-muted-foreground">Changes:</div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {filteredChanges.map((change, index) => {
                const isDateLike = (val: any) => {
                  if (val instanceof Date) return true;
                  if (typeof val === 'string') {
                    try {
                      const d = parseISO(val);
                      return !isNaN(d.getTime());
                    } catch {
                      return false;
                    }
                  }
                  return false;
                };
                const formatToTime = (val: any) => {
                  if (val instanceof Date) {
                    return formatInTimeZone(val, 'UTC', 'HH:mm');
                  }
                  if (typeof val === 'string') {
                    try {
                      const d = parseISO(val);
                      if (!isNaN(d.getTime())) {
                        return formatInTimeZone(d, 'UTC', 'HH:mm');
                      }
                    } catch {
                      const d = new Date(val);
                      if (!isNaN(d.getTime())) {
                        return formatInTimeZone(d, 'UTC', 'HH:mm');
                      }
                    }
                  }
                  return String(val);
                };
                return (
                  <div key={index} className="text-xs">
                    <span className="text-muted-foreground">{change.field}:</span>
                    <span className="ml-1 line-through">
                      {isDateLike(change.oldValue)
                        ? formatToTime(change.oldValue)
                        : String(change.oldValue)}
                    </span>
                    <ArrowRight className="w-3 h-3 inline mx-1" />
                    <span className={getPnlColor(change.newValue)}>
                      {isDateLike(change.newValue)
                        ? formatToTime(change.newValue)
                        : String(change.newValue)}
                    </span>
                  </div>
                );
              })}
              {subTradeComparison}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTradeComparison = () => {
    if (!replacedData || !currentCompareData) return null;

    const replacedTrades = replacedData.analysis.tradeList || [];
    const currentTrades = currentCompareData.analysis.tradeList || [];

    // Compare trades using the existing comparison function
    const comparison = compareTradingLogs(
      { trades: replacedTrades, dailyStats: replacedData.analysis.headline as any },
      { trades: currentTrades, dailyStats: currentCompareData.analysis.headline as any }
    );

    // Compute the set of trade keys that actually require review (added, removed, modified)
    const reviewTradeKeys = [
      ...comparison.differences.trades.added.map(getTradeKey),
      ...comparison.differences.trades.removed.map(getTradeKey),
      ...comparison.differences.trades.modified.map(({ trade }) => getTradeKey(trade)),
    ];
    const reviewedCount = reviewTradeKeys.filter(key => markedTrades.has(key)).length;
    const totalTrades = reviewTradeKeys.length;

    const clearAllMarkings = () => {
      setMarkedTrades(new Set());
      setCollapsedTrades(new Set());
    };

    return (
      <div className="space-y-4">
        {/* Header with marking progress */}
        {totalTrades > 0 && (
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">
              {reviewedCount} of {totalTrades} trades marked as reviewed
              {comparison.differences.trades.idOnlyChanged.length > 0 && (
                <span className="ml-2 text-xs">
                  ({comparison.differences.trades.idOnlyChanged.length} ID-only changes auto-marked)
                </span>
              )}
            </div>
            {markedTrades.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllMarkings}
                className="text-xs"
              >
                Clear All
              </Button>
            )}
          </div>
        )}

        {comparison.differences.trades.added.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Added Trades (in Current)</div>
            <div className="space-y-2">
              {comparison.differences.trades.added.map(trade => renderTrade(trade))}
            </div>
          </div>
        )}

        {comparison.differences.trades.removed.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Removed Trades (from Replaced)</div>
            <div className="space-y-2">
              {comparison.differences.trades.removed.map(trade => renderTrade(trade))}
            </div>
          </div>
        )}

        {comparison.differences.trades.modified.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Modified Trades</div>
            <div className="space-y-2">
              {comparison.differences.trades.modified
                .sort((a, b) => {
                  const timeA = a.trade.timestamp instanceof Date 
                    ? a.trade.timestamp.getTime() 
                    : parseISO(a.trade.timestamp).getTime();
                  const timeB = b.trade.timestamp instanceof Date 
                    ? b.trade.timestamp.getTime() 
                    : parseISO(b.trade.timestamp).getTime();
                  return timeA - timeB;
                })
                .map(({ trade, changes }) => renderTrade(trade, true, changes))}
            </div>
          </div>
        )}

        {comparison.differences.trades.idOnlyChanged.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2 text-muted-foreground">
              Trades with Only ID Changes (Auto-marked as Reviewed)
            </div>
            <div className="space-y-2 opacity-60">
              {comparison.differences.trades.idOnlyChanged.map(({ trade, changes }) => renderTrade(trade, true, changes))}
            </div>
          </div>
        )}

        {totalTrades === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No differences found between replaced and current comparison data</p>
          </div>
        )}
      </div>
    );
  };

  if (!replacedData) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Replaced vs Current Comparison</span>
            <Button
              onClick={handleDelete}
              variant="destructive"
              size="sm"
              className="gap-2"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Header bar for date and PnL comparison */}
        <div className="bg-muted/80 rounded-lg px-6 py-4 mb-4 border border-muted-foreground/10 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-lg">
                {replacedData.date ? (() => {
                  const date = typeof replacedData.date === 'string' 
                    ? parseISO(replacedData.date) 
                    : replacedData.date;
                  return format(date, 'MMM dd, yyyy (EEE)');
                })() : ''}
              </span>
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                Replaced vs Current
              </Badge>
            </div>
            {currentCompareData && (
              <span className={`font-bold text-lg ${getPnlColor(currentCompareData.analysis.headline.totalPnl - replacedData.analysis.headline.totalPnl)}`}> 
                {formatCurrency(currentCompareData.analysis.headline.totalPnl - replacedData.analysis.headline.totalPnl)}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-background/50 rounded-lg p-3 border border-muted-foreground/20">
              <div className="text-sm text-muted-foreground mb-1">Replaced PnL</div>
              <div className={`text-lg font-semibold ${getPnlColor(replacedData.analysis.headline.totalPnl)}`}>
                {formatCurrency(replacedData.analysis.headline.totalPnl)}
              </div>
            </div>
            
            <div className="bg-background/50 rounded-lg p-3 border border-muted-foreground/20">
              <div className="text-sm text-muted-foreground mb-1">Current PnL</div>
              <div className={`text-lg font-semibold ${currentCompareData ? getPnlColor(currentCompareData.analysis.headline.totalPnl) : 'text-muted-foreground'}`}>
                {currentCompareData ? formatCurrency(currentCompareData.analysis.headline.totalPnl) : 'Loading...'}
              </div>
            </div>

            <div className="bg-background/50 rounded-lg p-3 border border-muted-foreground/20">
              <div className="text-sm text-muted-foreground mb-1">Difference</div>
              <div className={`text-lg font-semibold ${currentCompareData ? getPnlColor(currentCompareData.analysis.headline.totalPnl - replacedData.analysis.headline.totalPnl) : 'text-muted-foreground'}`}>
                {currentCompareData ? formatCurrency(currentCompareData.analysis.headline.totalPnl - replacedData.analysis.headline.totalPnl) : 'Loading...'}
              </div>
            </div>
          </div>

          {replacedData.metadata?.replacedAt && (
            <div className="mt-3 pt-3 border-t border-muted-foreground/20">
              <div className="text-sm text-muted-foreground">
                Replaced: {new Date(replacedData.metadata.replacedAt).toLocaleString()}
                {replacedData.metadata.replacedReason && (
                  <span className="ml-2">• {replacedData.metadata.replacedReason}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div className="space-y-4">
          <div className="text-lg font-semibold">Notes</div>
          
          {/* Loading state for notes */}
          {loadingNotes && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading notes...</span>
              </div>
            </div>
          )}

          {/* Notes content */}
          {!loadingNotes && (
            <Accordion type="multiple" className="w-full">
              {/* Replaced Compare Notes */}
              {replacedData.metadata?.notes && replacedData.metadata.notes.trim() && (
                <AccordionItem value="replaced-notes">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2 w-full">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Replaced Compare Notes</span>
                      <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 text-xs">
                        Replaced
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2 pb-2">
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-md p-3 border border-muted-foreground/20">
                        {replacedData.metadata.notes}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Base Notes */}
              {baseNotes && baseNotes.trim() && (
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
                        {baseNotes}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Current Compare Notes */}
              {currentCompareData?.metadata?.notes && currentCompareData.metadata.notes.trim() && (
                <AccordionItem value="current-notes">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2 w-full">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Current Compare Notes</span>
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 text-xs">
                        Current
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2 pb-2">
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-md p-3 border border-muted-foreground/20">
                        {currentCompareData.metadata.notes}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* No notes message */}
              {!loadingNotes && 
               (!replacedData.metadata?.notes || !replacedData.metadata.notes.trim()) &&
               (!baseNotes || !baseNotes.trim()) &&
               (!currentCompareData?.metadata?.notes || !currentCompareData.metadata.notes.trim()) && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No notes available for this comparison</p>
                </div>
              )}
            </Accordion>
          )}
        </div>

        {/* Loading state */}
        {loadingCurrentData && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading current comparison data...</span>
            </div>
          </div>
        )}

        {/* Trade Comparison */}
        {!loadingCurrentData && (
          <div className="space-y-4">
            <div className="text-lg font-semibold">Trade Differences</div>
            {renderTradeComparison()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 