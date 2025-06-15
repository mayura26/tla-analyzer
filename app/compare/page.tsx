"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ComparePage() {
  const [logData, setLogData] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
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
        setLogData('');
        toast.success("Comparison data has been processed successfully.");
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
              className="h-[400px] font-mono"
            />
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !logData.trim()}
              className="w-full"
            >
              {isSubmitting ? "Processing..." : "Submit Comparison Data"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
