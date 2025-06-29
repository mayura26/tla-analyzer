"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { X } from "lucide-react";

interface SubmissionLog {
  id: string;
  date: string;
  time: string;
  timestamp: Date;
  dataDate?: string; // Date extracted from the trading log data
  submittedPnl?: number; // PnL from submitted data
  basePnl?: number; // PnL from base data
  pnlDifference?: number; // Difference between submitted and base PnL
  previousComparePnl?: number; // PnL from previous comparison data
  previousCompareDifference?: number; // Difference between submitted and previous compare PnL
  hadExistingCompare?: boolean; // Whether there was existing compare data
  wasReplaced?: boolean; // Whether this submission replaced existing data
  replacedDataDeleted?: boolean; // Whether the replaced data has been deleted
  baseNotes?: string; // Notes from base data
}

export default function ComparePage() {
  const [logData, setLogData] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionLog, setSubmissionLog] = useState<SubmissionLog[]>([]);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Function to get PnL color based on value (same logic as trading card)
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
  };

  // Function to get difference badge color and text color for dark theme readability
  const getDifferenceBadgeClass = (value: number) => {
    if (value >= 0) {
      if (value <= 50) return 'bg-gray-600 text-white border border-gray-400';
      if (value <= 150) return 'bg-green-200 text-green-900 border border-green-400';
      if (value <= 300) return 'bg-green-300 text-green-900 border border-green-400';
      return 'bg-green-600 text-white border border-green-700';
    } else {
      if (value >= -50) return 'bg-gray-600 text-white border border-gray-400';
      if (value >= -150) return 'bg-red-200 text-red-900 border border-red-400';
      if (value >= -300) return 'bg-red-400 text-white border border-red-600';
      return 'bg-red-600 text-white border border-red-700';
    }
  };

  // Function to extract date from trading log data
  const extractDataDate = (logData: string): string | undefined => {
    const lines = logData.split('\n');
    for (const line of lines) {
      const dateMatch = line.match(/(\d{4}-\d{2}-\d{2} \d{1,2}:\d{2}:\d{2} [AP]M)/);
      if (dateMatch) {
        const date = new Date(dateMatch[1]);
        return date.toLocaleDateString();
      }
    }
    return undefined;
  };

  // Function to extract PnL from trading log data
  const extractPnL = (logData: string): number | undefined => {
    const lines = logData.split('\n');
    for (const line of lines) {
      if (line.includes('TOTAL PNL:')) {
        const match = line.match(/TOTAL PNL: \$(-?\d+\.?\d*)/);
        if (match) {
          return parseFloat(match[1]);
        }
      }
    }
    return undefined;
  };

  // Function to fetch base data for a specific date
  const fetchBaseData = async (date: string): Promise<{ pnl?: number; notes?: string }> => {
    try {
      const response = await fetch(`/api/trading-data/base?date=${date}`);
      if (response.ok) {
        const baseData = await response.json();
        return {
          pnl: baseData.analysis.headline.totalPnl,
          notes: baseData.notes
        };
      }
    } catch (error) {
      console.error('Error fetching base data:', error);
    }
    return {};
  };

  // Function to fetch existing compare data for a specific date
  const fetchExistingCompareData = async (date: string): Promise<number | undefined> => {
    try {
      const response = await fetch(`/api/trading-data/compare/manage?date=${date}`);
      if (response.ok) {
        const compareData = await response.json();
        return compareData.analysis.headline.totalPnl;
      }
    } catch (error) {
      console.error('Error fetching existing compare data:', error);
    }
    return undefined;
  };

  // Function to delete replaced compare data
  const handleDeleteReplacedCompare = async (submission: SubmissionLog) => {
    if (!submission.dataDate || !submission.wasReplaced) return;
    
    if (!confirm('Are you sure you want to delete this replaced comparison data? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingIds(prev => new Set(prev).add(submission.id));
      
      // Convert date format for API call (MM/DD/YYYY to YYYY-MM-DD)
      const dateParts = submission.dataDate.split('/');
      if (dateParts.length !== 3) {
        throw new Error('Invalid date format');
      }
      const apiDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
      
      const response = await fetch('/api/trading-data/compare/replaced', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: apiDate }),
      });

      if (response.ok) {
        toast.success("Replaced comparison data successfully deleted");
        // Update the submission to mark it as deleted instead of removing it
        setSubmissionLog(prev => prev.map(log => 
          log.id === submission.id 
            ? { ...log, wasReplaced: false, replacedDataDeleted: true }
            : log
        ));
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete replaced comparison data");
      }
    } catch (error) {
      console.error('Error deleting replaced comparison data:', error);
      toast.error("Failed to delete replaced comparison data");
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(submission.id);
        return newSet;
      });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Extract data from the submitted log first
      const dataDate = extractDataDate(logData);
      const submittedPnl = extractPnL(logData);
      
      // Check for existing compare data if we have a date
      let previousComparePnl: number | undefined;
      let hadExistingCompare = false;
      if (dataDate) {
        // Convert date format for API call (MM/DD/YYYY to YYYY-MM-DD)
        const dateParts = dataDate.split('/');
        if (dateParts.length === 3) {
          const apiDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
          previousComparePnl = await fetchExistingCompareData(apiDate);
          hadExistingCompare = previousComparePnl !== undefined;
        }
      }

      const response = await fetch('/api/trading-data/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logData }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process comparison data');
      }

      const result = await response.json();
      if (result.success) {
        // Fetch base data if we have a date
        let basePnl: number | undefined;
        let baseNotes: string | undefined;
        if (dataDate) {
          // Convert date format for API call (MM/DD/YYYY to YYYY-MM-DD)
          const dateParts = dataDate.split('/');
          if (dateParts.length === 3) {
            const apiDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
            const baseData = await fetchBaseData(apiDate);
            basePnl = baseData.pnl;
            baseNotes = baseData.notes;
          }
        }

        // Calculate PnL differences
        const pnlDifference = submittedPnl !== undefined && basePnl !== undefined 
          ? submittedPnl - basePnl 
          : undefined;
        
        const previousCompareDifference = submittedPnl !== undefined && previousComparePnl !== undefined 
          ? submittedPnl - previousComparePnl 
          : undefined;

        // Add to submission log
        const now = new Date();
        const newSubmission: SubmissionLog = {
          id: Date.now().toString(),
          date: now.toLocaleDateString(),
          time: now.toLocaleTimeString(),
          timestamp: now,
          dataDate,
          submittedPnl,
          basePnl,
          pnlDifference,
          previousComparePnl: result.previousPnl || previousComparePnl,
          previousCompareDifference,
          hadExistingCompare: result.hadExistingCompare || hadExistingCompare,
          wasReplaced: result.replaced || false,
          replacedDataDeleted: false,
          baseNotes,
        };
        
        setSubmissionLog(prev => [newSubmission, ...prev]);
        setLogData('');
        
        if (result.replaced) {
          toast.success("Comparison data updated successfully. Previous comparison was saved for review due to significant differences.");
        } else if (result.hadExistingCompare) {
          toast.success("Comparison data updated successfully. Previous comparison was replaced.");
        } else {
          toast.success("Comparison data has been processed successfully.");
        }
      }
    } catch (error) {
      console.error("Error processing comparison data:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process comparison data");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Trading Log Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="Paste your trading log data for comparison..."
              value={logData}
              onChange={(e) => setLogData(e.target.value)}
              className="h-[200px] font-mono"
            />
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !logData.trim()}
              className="w-full"
            >
              {isSubmitting ? "Processing..." : "Submit Comparison Data"}
            </Button>
            
            {submissionLog.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Recent Submissions</h3>
                  <div className="space-y-1">
                    {submissionLog.map((log) => (
                      <div key={log.id}>
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="secondary" className="text-xs">
                            {log.dataDate ? `${log.dataDate} (${new Date(log.dataDate).toLocaleDateString('en-US', { weekday: 'short' })})` : log.date}
                          </Badge>
                          {log.hadExistingCompare && (
                            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                              Updated
                            </Badge>
                          )}
                          {log.wasReplaced && (
                            <Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300">
                              Replaced
                            </Badge>
                          )}
                          {log.replacedDataDeleted && (
                            <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600 border-gray-300">
                              Deleted
                            </Badge>
                          )}
                          <span className="text-muted-foreground">{log.time}</span>
                          {log.submittedPnl !== undefined && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className={`text-xs font-medium ${getPnlColor(log.submittedPnl)}`}>
                                Submitted: ${log.submittedPnl.toFixed(2)}
                              </span>
                            </>
                          )}
                          {log.basePnl !== undefined && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className={`text-xs ${getPnlColor(log.basePnl)}`}>
                                Base: ${log.basePnl.toFixed(2)}
                              </span>
                            </>
                          )}
                          {log.pnlDifference !== undefined && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <Badge variant="secondary" className={`text-xs font-bold ${getDifferenceBadgeClass(log.pnlDifference)}`}>
                                Diff: {log.pnlDifference >= 0 ? '+' : '-'}${Math.abs(log.pnlDifference).toFixed(2)}
                              </Badge>
                            </>
                          )}
                          {log.hadExistingCompare && log.previousComparePnl !== undefined && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className={`text-xs ${getPnlColor(log.previousComparePnl)}`}>
                                Prev: ${log.previousComparePnl.toFixed(2)}
                              </span>
                            </>
                          )}
                          {log.previousCompareDifference !== undefined && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <Badge variant="secondary" className={`text-xs font-bold ${getDifferenceBadgeClass(log.previousCompareDifference)}`}>
                                vs Prev: {log.previousCompareDifference >= 0 ? '+' : '-'}${Math.abs(log.previousCompareDifference).toFixed(2)}
                              </Badge>
                            </>
                          )}
                          {log.wasReplaced && !log.replacedDataDeleted && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 ml-auto text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteReplacedCompare(log)}
                              disabled={deletingIds.has(log.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        {log.baseNotes && log.baseNotes.trim() && (
                          <div className="mt-2 ml-4 p-2 bg-muted/30 rounded-lg border-l-2 border-blue-400">
                            <div className="text-xs font-medium text-blue-600 mb-1">Base Data Notes:</div>
                            <div className="text-xs text-muted-foreground whitespace-pre-wrap">{log.baseNotes}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
