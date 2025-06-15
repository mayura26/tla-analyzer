import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DailyStats, SessionStats } from "@/lib/trading-log-parser";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Target, DollarSign, ArrowRight, Trophy, AlertTriangle, Plus, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { compareTradingLogs } from "@/lib/trading-log-comparator";

interface SubTrade {
  exitPrice: number;
  quantity: number;
  pnl: number;
  points: number;
  exitReason: 'TP' | 'SL' | 'MANUAL';
}

interface TradeListEntry {
  id: number;
  timestamp: Date;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  quantity: number;
  totalPnl: number;
  subTrades: SubTrade[];
  isChaseTrade: boolean;
}

interface CompareTradingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  baseStats: DailyStats & { tradeList?: TradeListEntry[] };
  compareStats: DailyStats & { tradeList?: TradeListEntry[] };
}

type SessionKey = keyof DailyStats['sessionBreakdown'];

export function CompareTradingDialog({ isOpen, onClose, baseStats, compareStats }: CompareTradingDialogProps) {
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

  const getWinRateColor = (wins: number, total: number) => {
    const rate = (wins / total) * 100;
    if (rate >= 60) return 'text-green-500';
    if (rate >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSubTradeDiffs = (oldSubTrades: SubTrade[], newSubTrades: SubTrade[]) => {
    const diffs: React.ReactNode[] = [];
    const maxLen = Math.max(oldSubTrades.length, newSubTrades.length);
    for (let i = 0; i < maxLen; i++) {
      const oldSub = oldSubTrades[i];
      const newSub = newSubTrades[i];
      if (!oldSub && newSub) {
        diffs.push(
          <div key={i} className="ml-2">
            <span className="text-muted-foreground">Added sub-trade:</span> {newSub.quantity} @ {newSub.exitPrice} ({newSub.exitReason}) <span className={getPnlColor(newSub.pnl)}>{formatCurrency(newSub.pnl)}</span>
          </div>
        );
      } else if (oldSub && !newSub) {
        diffs.push(
          <div key={i} className="ml-2">
            <span className="text-muted-foreground">Removed sub-trade:</span> {oldSub.quantity} @ {oldSub.exitPrice} ({oldSub.exitReason}) <span className={getPnlColor(oldSub.pnl)}>{formatCurrency(oldSub.pnl)}</span>
          </div>
        );
      } else if (oldSub && newSub) {
        // Compare fields
        const fieldDiffs: React.ReactNode[] = [];
        if (oldSub.exitPrice !== newSub.exitPrice) fieldDiffs.push(<span key="exitPrice">exitPrice: <span className="line-through">{oldSub.exitPrice}</span> <ArrowRight className="w-3 h-3 inline mx-1" /> {newSub.exitPrice}</span>);
        if (oldSub.quantity !== newSub.quantity) fieldDiffs.push(<span key="quantity">quantity: <span className="line-through">{oldSub.quantity}</span> <ArrowRight className="w-3 h-3 inline mx-1" /> {newSub.quantity}</span>);
        if (oldSub.pnl !== newSub.pnl) fieldDiffs.push(<span key="pnl">pnl: <span className="line-through">{formatCurrency(oldSub.pnl)}</span> <ArrowRight className="w-3 h-3 inline mx-1" /> <span className={getPnlColor(newSub.pnl)}>{formatCurrency(newSub.pnl)}</span></span>);
        if (oldSub.points !== newSub.points) fieldDiffs.push(<span key="points">points: <span className="line-through">{oldSub.points}</span> <ArrowRight className="w-3 h-3 inline mx-1" /> {newSub.points}</span>);
        if (oldSub.exitReason !== newSub.exitReason) fieldDiffs.push(<span key="exitReason">exitReason: <span className="line-through">{oldSub.exitReason}</span> <ArrowRight className="w-3 h-3 inline mx-1" /> {newSub.exitReason}</span>);
        if (fieldDiffs.length > 0) {
          diffs.push(
            <div key={i} className="ml-2">
              <span className="text-muted-foreground">Sub-trade {i + 1}:</span> {fieldDiffs.map((fd, idx) => <span key={idx} className="ml-1">{fd}</span>)}
            </div>
          );
        }
      }
    }
    return diffs;
  };

  const renderSubTradeComparison = (oldSubTrades: SubTrade[], newSubTrades: SubTrade[]) => {
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
        oldSub.exitReason !== newSub.exitReason
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
    const formatTime = (date: Date) => format(date, 'HH:mm:ss');
    const isWin = trade.totalPnl > 0;

    // Find subTrades change and get detailed diffs if present
    let subTradeDiffs: React.ReactNode[] = [];
    let subTradeComparison: React.ReactNode = null;
    const filteredChanges = changes.filter(change => {
      if (change.field === 'subTrades') {
        subTradeComparison = renderSubTradeComparison(change.oldValue, change.newValue);
        // Only keep this change if there are actual diffs
        return false;
      }
      return true;
    });

    return (
      <div className={`p-3 rounded-lg ${isModified ? 'bg-muted/50' : 'bg-muted/30'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
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
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-medium ${getPnlColor(trade.totalPnl)}`}>{formatCurrency(trade.totalPnl)}</span>
            <Badge variant="outline" className="text-xs">{trade.quantity} @ {trade.entryPrice}</Badge>
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
              </div>
            ))}
          </div>
        )}

        {isModified && (filteredChanges.length > 0 || subTradeComparison) && (
          <div className="mt-2 pt-2 border-t">
            <div className="text-xs text-muted-foreground">Changes:</div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {filteredChanges.map((change, index) => (
                <div key={index} className="text-xs">
                  <span className="text-muted-foreground">{change.field}:</span>
                  <span className="ml-1 line-through">{String(change.oldValue)}</span>
                  <ArrowRight className="w-3 h-3 inline mx-1" />
                  <span className={getPnlColor(change.newValue)}>{String(change.newValue)}</span>
                </div>
              ))}
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

    return (
      <div className="space-y-4">
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
              {comparison.differences.trades.modified.map(({ trade, changes }) => renderTrade(trade, true, changes))}
            </div>
          </div>
        )}

        {comparison.differences.trades.idOnlyChanged.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2 text-muted-foreground">Trades with Only ID Changes</div>
            <div className="space-y-2 opacity-60">
              {comparison.differences.trades.idOnlyChanged.map(({ trade, changes }) => renderTrade(trade, true, changes))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detailed Comparison</DialogTitle>
        </DialogHeader>
        {/* Styled header bar for date and PnL diff */}
        <div className="flex items-center justify-between bg-muted/80 rounded-lg px-6 py-3 mb-4 border border-muted-foreground/10 shadow-sm">
          <span className="font-semibold text-lg">
            {baseStats.date ? format(new Date(baseStats.date), 'MMM dd, yyyy (EEE)') : ''}
          </span>
          <span className={`font-bold text-lg ${getPnlColor(compareStats.totalPnl - baseStats.totalPnl)}`}> 
            {formatCurrency(compareStats.totalPnl - baseStats.totalPnl)}
          </span>
        </div>
        <Tabs defaultValue="sessions">
          <TabsList>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
          </TabsList>
          <TabsContent value="sessions" className="mt-4">
            {renderSessionComparison()}
          </TabsContent>
          <TabsContent value="trades" className="mt-4">
            {renderTradeComparison()}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 