"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function InputPage() {
  const [logData, setLogData] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/trading-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logData }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process log data');
      }

      const result = await response.json();
      if (result.success) {
        setLogData('');
        toast.success("Trading log data has been processed successfully.");
      }
    } catch (error) {
      console.error("Error processing data:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process trading log data");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Trading Log Input</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="Paste your trading log data here..."
              value={logData}
              onChange={(e) => setLogData(e.target.value)}
              className="h-[200px] font-mono"
            />
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !logData.trim()}
              className="w-full"
            >
              {isSubmitting ? "Processing..." : "Submit Log Data"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 