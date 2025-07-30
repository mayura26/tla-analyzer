import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DailyStats, TradeListEntry } from "@/lib/trading-log-parser";
import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowRight, CheckCircle2, Loader2, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { compareTradingLogs } from "@/lib/trading-log-comparator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface CompareTradingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  baseStats: DailyStats & { tradeList?: TradeListEntry[] };
  compareStats: DailyStats & { tradeList?: TradeListEntry[] };
  onMerge?: () => void;
  onVerificationChange?: (verified: boolean) => void;
  onNotesChange?: (notes: string) => void;
}

type SessionKey = keyof DailyStats['sessionBreakdown'];

export function CompareTradingDialog({ isOpen, onClose, baseStats, compareStats, onMerge, onVerificationChange, onNotesChange }: CompareTradingDialogProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [notes, setNotes] = useState("");
  const [baseDayNotes, setBaseDayNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [hasUnsavedNotes, setHasUnsavedNotes] = useState(false);
  const [markedTrades, setMarkedTrades] = useState<Set<string>>(new Set());
  const [collapsedTrades, setCollapsedTrades] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper function to generate a unique key for a trade
  const getTradeKey = (trade: TradeListEntry) => {
    return `${trade.timestamp}-${trade.entryPrice}-${trade.direction}-${trade.totalPnl}`;
  };

  // Toggle trade marking
  const toggleTradeMarking = (trade: TradeListEntry) => {
    const tradeKey = getTradeKey(trade);
    setMarkedTrades(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tradeKey)) {
        newSet.delete(tradeKey);
        // When unmarking, also expand the trade
        setCollapsedTrades(prevCollapsed => {
          const newCollapsed = new Set(prevCollapsed);
          newCollapsed.delete(tradeKey);
          return newCollapsed;
        });
      } else {
        newSet.add(tradeKey);
        // When marking, also collapse the trade
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
    event.stopPropagation(); // Prevent triggering the parent click
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
  useEffect(() => {
    if (isOpen) {
      setMarkedTrades(new Set());
      setCollapsedTrades(new Set());
    }
  }, [isOpen]);

  // Automatically mark ID-only changed trades as processed
  useEffect(() => {
    if (isOpen && baseStats.tradeList && compareStats.tradeList) {
      const baseTrades = baseStats.tradeList;
      const compareTrades = compareStats.tradeList;
      
      // Compare trades using the existing comparison function
      const comparison = compareTradingLogs(
        { trades: baseTrades, dailyStats: baseStats },
        { trades: compareTrades, dailyStats: compareStats }
      );

      if (comparison.differences.trades.idOnlyChanged.length > 0) {
        const idOnlyTradeKeys = comparison.differences.trades.idOnlyChanged.map(({ trade }) => getTradeKey(trade));
        
        // Only update if there are new ID-only trades to mark
        setMarkedTrades(prev => {
          const newSet = new Set(prev);
          let hasChanges = false;
          idOnlyTradeKeys.forEach(key => {
            if (!newSet.has(key)) {
              newSet.add(key);
              hasChanges = true;
            }
          });
          return hasChanges ? newSet : prev;
        });
        
        setCollapsedTrades(prev => {
          const newSet = new Set(prev);
          let hasChanges = false;
          idOnlyTradeKeys.forEach(key => {
            if (!newSet.has(key)) {
              newSet.add(key);
              hasChanges = true;
            }
          });
          return hasChanges ? newSet : prev;
        });
      }
    }
  }, [isOpen, baseStats.tradeList, compareStats.tradeList, baseStats, compareStats]);

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

  // Load existing metadata when dialog opens
  useEffect(() => {
    if (isOpen && baseStats.date) {
      loadExistingMetadata();
    }
  }, [isOpen, baseStats.date]);

  const loadExistingMetadata = async () => {
    try {
      setIsLoading(true);
      const formattedDate = getFormattedDate(baseStats.date);
      console.log('Loading metadata for date:', baseStats.date, '-> formatted:', formattedDate);
      
      // Load both compare metadata and base day notes
      const [metadataResponse, baseNotesResponse] = await Promise.all([
        fetch(`/api/trading-data/compare/manage?date=${formattedDate}`),
        fetch(`/api/trading-data/notes?date=${formattedDate}`)
      ]);
      
      if (metadataResponse.ok) {
        const data = await metadataResponse.json();
        if (data.metadata) {
          setIsVerified(data.metadata.verified || false);
          setNotes(data.metadata.notes || "");
        }
      }
      
      if (baseNotesResponse.ok) {
        const baseNotesData = await baseNotesResponse.json();
        if (baseNotesData.success && baseNotesData.data && baseNotesData.data.notes) {
          setBaseDayNotes(baseNotesData.data.notes);
        } else {
          setBaseDayNotes("");
        }
      }
    } catch (error) {
      console.error('Error loading metadata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveVerificationStatus = async (verified: boolean) => {
    try {
      setIsSaving(true);
      const formattedDate = getFormattedDate(baseStats.date);
      const response = await fetch('/api/trading-data/compare/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verify',
          date: formattedDate,
          verified,
          verifiedBy: 'user'
        }),
      });

      if (response.ok) {
        toast.success(verified ? "Day marked as verified" : "Day marked as unverified");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update verification status");
      }
    } catch (error) {
      console.error('Error saving verification status:', error);
      toast.error("Failed to save verification status");
    } finally {
      setIsSaving(false);
    }
  };

  const saveNotes = async (newNotes: string) => {
    try {
      setIsSaving(true);
      const formattedDate = getFormattedDate(baseStats.date);
      const response = await fetch('/api/trading-data/compare/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'addNotes',
          date: formattedDate,
          notes: newNotes
        }),
      });

      if (response.ok) {
        toast.success("Notes saved successfully");
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

  const handleVerificationChange = async (verified: boolean) => {
    setIsVerified(verified);
    await saveVerificationStatus(verified);
    if (onVerificationChange) {
      onVerificationChange(verified);
    }
  };

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
    setHasUnsavedNotes(true);
  };

  const handleSaveNotes = async () => {
    await saveNotes(notes);
    setHasUnsavedNotes(false);
    if (onNotesChange) {
      onNotesChange(notes);
    }
  };

  const handleMerge = async () => {
    try {
      setIsMerging(true);
      const formattedDate = getFormattedDate(baseStats.date);
      const response = await fetch('/api/trading-data/compare/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'merge',
          date: formattedDate
        }),
      });

      if (response.ok) {
        toast.success("Compare data successfully merged to base data");
        // Call the parent's onMerge callback
        if (onMerge) {
          onMerge();
        }
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to merge data");
      }
    } catch (error) {
      console.error('Error merging data:', error);
      toast.error("Failed to merge data");
    } finally {
      setIsMerging(false);
    }
  };

  const handleDelete = async () => {
    // Show confirmation dialog
    if (!confirm('Are you sure you want to delete this compare data? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      const formattedDate = getFormattedDate(baseStats.date);
      const response = await fetch('/api/trading-data/compare/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          date: formattedDate
        }),
      });

      if (response.ok) {
        toast.success("Compare data successfully deleted");
        // Call the parent's onMerge callback to refresh the data
        if (onMerge) {
          onMerge();
        }
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete data");
      }
    } catch (error) {
      console.error('Error deleting data:', error);
      toast.error("Failed to delete data");
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

  const formatDifference = (diff: { value: number; percentage: number }) => {
    const sign = diff.value >= 0 ? '+' : '';
    return `${sign}${formatCurrency(diff.value)} (${sign}${diff.percentage.toFixed(1)}%)`;
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
          <div className="font-semibold text-muted-foreground">Base</div>
          <div className="font-semibold text-muted-foreground">Compare</div>
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
    // Format time without timezone conversion - display exactly as in file
    const formatTime = (dateInput: Date | string) => {
      // Convert string to Date if needed
      const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      // Format the time directly without any timezone compensation
      return formatInTimeZone(date, 'UTC', 'HH:mm');
    };

    // Find subTrades change and get detailed diffs if present
    let subTradeComparison: React.ReactNode = null;
    const filteredChanges = changes.filter(change => {
      if (change.field === 'subTrades') {
        subTradeComparison = renderSubTradeComparison(change.oldValue, change.newValue);
        // Only keep this change if there are actual diffs
        return false;
      }
      return true;
    });

    // Find PnL change if it exists
    const pnlChange = changes.find(change => change.field === 'totalPnl');

    // Check if this trade is marked and collapsed
    const tradeKey = getTradeKey(trade);
    const isMarked = markedTrades.has(tradeKey);
    const isCollapsed = collapsedTrades.has(tradeKey);

    // If marked and collapsed, show minimized version
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
                // Helper to check if a value is a date or date string
                const isDateLike = (val: any) => {
                  if (val instanceof Date) return true;
                  if (typeof val === 'string') {
                    // Use parseISO to avoid timezone conversion
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
                    // Format without timezone conversion
                    return formatInTimeZone(val, 'UTC', 'HH:mm');
                  }
                  if (typeof val === 'string') {
                    try {
                      const d = parseISO(val);
                      if (!isNaN(d.getTime())) {
                        return formatInTimeZone(d, 'UTC', 'HH:mm');
                      }
                    } catch {
                      // If parseISO fails, try regular Date parsing but be careful
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

  const renderSessionComparison = () => {
    const sessions = (Object.keys(baseStats.sessionBreakdown) as SessionKey[]).filter(session => session.toLowerCase() !== 'main');
    return (
      <div className="space-y-4">
        {sessions.map(session => {
          const baseSession = baseStats.sessionBreakdown[session];
          const compareSession = compareStats.sessionBreakdown[session];
          const pnlDiff = {
            value: compareSession.pnl - baseSession.pnl,
            percentage: (compareSession.pnl - baseSession.pnl) / (Math.abs(baseSession.pnl) || 1) * 100,
          };
          const isZeroDiff = pnlDiff.value === 0 && (!isFinite(pnlDiff.percentage) || pnlDiff.percentage === 0);

          return (
            <div key={session} className={`p-4 rounded-lg bg-muted/30${isZeroDiff ? ' opacity-60' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium capitalize">{session}</div>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Base</div>
                    <div className="text-muted-foreground">
                      {formatCurrency(baseSession.pnl)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {baseSession.trades} trades
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Compare</div>
                    <div className="text-muted-foreground">
                      {formatCurrency(compareSession.pnl)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {compareSession.trades} trades
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Difference</span>
                  <span className={`font-medium ${getPnlColor(pnlDiff.value)}`}>{formatDifference(pnlDiff)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTradeComparison = () => {
    // Get trade lists from the stats
    const baseTrades = baseStats.tradeList || [];
    const compareTrades = compareStats.tradeList || [];

    // Compare trades using the existing comparison function
    const comparison = compareTradingLogs(
      { trades: baseTrades, dailyStats: baseStats },
      { trades: compareTrades, dailyStats: compareStats }
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
            <div className="text-sm font-medium mb-2">Added Trades</div>
            <div className="space-y-2">
              {comparison.differences.trades.added.map(trade => renderTrade(trade))}
            </div>
          </div>
        )}

        {comparison.differences.trades.removed.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Removed Trades</div>
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
                  // Sort by timestamp without timezone conversion
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
      </div>
    );
  };

  const renderManageTab = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading metadata...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Day Verification</Label>
            <div className="text-sm text-muted-foreground">
              {isVerified ? "This day has been verified and reviewed" : "Mark this day as verified after reviewing the changes"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            <div className="flex items-center gap-2">
              {isVerified && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Verified</span>
                </div>
              )}
              <Switch
                checked={isVerified}
                onCheckedChange={handleVerificationChange}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          {/* Base Day Notes */}
          {baseDayNotes && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Base Day Notes</Label>
              <div className="p-3 bg-muted/30 rounded-lg border border-muted-foreground/20">
                <div className="text-sm whitespace-pre-wrap">{baseDayNotes}</div>
              </div>
            </div>
          )}

          {/* Compare Notes */}
          <div className="space-y-2">
            <Label>Compare Notes</Label>
            <Textarea
              placeholder="Add any notes about the changes or verification..."
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              className="min-h-[100px]"
              disabled={isLoading}
            />
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
                disabled={!hasUnsavedNotes || isSaving || isLoading}
                size="sm"
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
        </div>

        <Separator />

        <div className="flex justify-end gap-2">
          <Button
            onClick={handleDelete}
            variant="destructive"
            className="gap-2"
            disabled={isDeleting || isLoading}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {isDeleting ? "Deleting..." : "Delete Compare"}
          </Button>
          <Button
            onClick={handleMerge}
            className="gap-2"
            disabled={!isVerified || isMerging || isLoading}
          >
            {isMerging ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {isMerging ? "Merging..." : "Merge Changes"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Detailed Comparison</DialogTitle>
        </DialogHeader>
        
        {/* Sticky header bar for date and PnL diff */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-muted-foreground/10 -mx-6 px-6 py-4 mb-4">
          <div className="bg-muted/80 rounded-lg px-6 py-4 border border-muted-foreground/10 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-lg">
                  {baseStats.date ? (() => {
                    // Format date without timezone conversion
                    const date = typeof baseStats.date === 'string' 
                      ? parseISO(baseStats.date) 
                      : baseStats.date;
                    return format(date, 'MMM dd, yyyy (EEE)');
                  })() : ''}
                </span>
                {isVerified && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Verified</span>
                  </div>
                )}
              </div>
              <span className={`font-bold text-lg ${getPnlColor(compareStats.totalPnl - baseStats.totalPnl)}`}> 
                {formatCurrency(compareStats.totalPnl - baseStats.totalPnl)}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* PnL Card */}
              <div className="bg-background/50 rounded-lg p-3 border border-muted-foreground/20">
                <div className="text-sm text-muted-foreground mb-1">PnL</div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Old</span>
                  <span>New</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-lg">
                  <span className={`font-semibold ${getPnlColor(baseStats.totalPnl)}`}>
                    {formatCurrency(baseStats.totalPnl)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <span className={`font-semibold ${getPnlColor(compareStats.totalPnl)}`}>
                    {formatCurrency(compareStats.totalPnl)}
                  </span>
                </div>
              </div>
              
              {/* Win/Loss Card */}
              <div className="bg-background/50 rounded-lg p-3 border border-muted-foreground/20">
                <div className="text-sm text-muted-foreground mb-1">Win/Loss Record</div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Old</span>
                  <span>New</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-lg font-semibold">
                  <span>{baseStats.wins}-{baseStats.losses}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <span>{compareStats.wins}-{compareStats.losses}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <Tabs defaultValue="sessions">
            <TabsList className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm w-full">
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="trades">Trades</TabsTrigger>
              <TabsTrigger value="manage">Manage</TabsTrigger>
            </TabsList>
            <TabsContent value="sessions" className="mt-4">
              {renderSessionComparison()}
            </TabsContent>
            <TabsContent value="trades" className="mt-4">
              {renderTradeComparison()}
            </TabsContent>
            <TabsContent value="manage" className="mt-4">
              {renderManageTab()}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
} 