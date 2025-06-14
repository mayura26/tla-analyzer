"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseTradingLog } from "@/lib/trading-log-parser";
import { compareTradingLogs } from "@/lib/trading-log-comparator";
import { TradingComparisonView } from "@/components/trading-comparison-view";

export default function ComparePage() {
  const [compareData, setCompareData] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<any>(null);
  const [baseData, setBaseData] = useState<any>(null);

  useEffect(() => {
    // Load base data when component mounts
    fetchBaseData();
  }, []);

  const fetchBaseData = async () => {
    try {
      const response = await fetch('/api/trading-data');
      if (!response.ok) throw new Error('Failed to fetch base data');
      const data = await response.json();
      setBaseData(data);
    } catch (error) {
      console.error('Error fetching base data:', error);
      alert('Error loading base data');
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const parsedData = parseTradingLog(compareData);
      
      if (!baseData) {
        alert("Please set base data first");
        return;
      }

      const comparison = compareTradingLogs(baseData, parsedData);
      setComparisonResults(comparison);
    } catch (error) {
      console.error("Error processing comparison data:", error);
      alert("Error processing data. Please check the format.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBase = async (options: {
    mergeAll?: boolean;
    mergeTradeIds?: number[];
    mergeDailyStats?: boolean;
    selectedDates?: Date[];
  }) => {
    try {
      const response = await fetch('/api/trading-data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mergeOptions: options }),
      });

      if (!response.ok) throw new Error('Failed to update base data');
      
      const updatedData = await response.json();
      setBaseData(updatedData);
      alert("Base data updated successfully!");
      setComparisonResults(null);
      setCompareData("");
    } catch (error) {
      console.error("Error updating base data:", error);
      alert("Error updating base data");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Compare Trading Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="Paste your new trading log data here for comparison..."
              value={compareData}
              onChange={(e) => setCompareData(e.target.value)}
              className="min-h-[400px] font-mono"
            />
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !compareData.trim()}
              className="w-full"
            >
              {isSubmitting ? "Processing..." : "Compare Data"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {comparisonResults && (
        <div className="mt-8">
          <TradingComparisonView 
            comparisonResults={comparisonResults}
            onUpdateBase={handleUpdateBase}
          />
        </div>
      )}
    </div>
  );
} 