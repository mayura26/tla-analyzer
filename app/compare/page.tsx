"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

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
}

export default function ComparePage() {
  const [logData, setLogData] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionLog, setSubmissionLog] = useState<SubmissionLog[]>([]);

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
  const fetchBaseData = async (date: string): Promise<number | undefined> => {
    try {
      const response = await fetch(`/api/trading-data/base?date=${date}`);
      if (response.ok) {
        const baseData = await response.json();
        return baseData.analysis.headline.totalPnl;
      }
    } catch (error) {
      console.error('Error fetching base data:', error);
    }
    return undefined;
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
        if (dataDate) {
          // Convert date format for API call (MM/DD/YYYY to YYYY-MM-DD)
          const dateParts = dataDate.split('/');
          if (dateParts.length === 3) {
            const apiDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
            basePnl = await fetchBaseData(apiDate);
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
                      <div key={log.id} className="flex items-center gap-2 text-sm">
                        <Badge variant="secondary" className="text-xs">
                          {log.dataDate || log.date}
                        </Badge>
                        {log.hadExistingCompare && (
                          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                            Updated
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
