"use client";

import { useEffect, useState } from "react";
import { CompareWeeklyAccordion } from "@/components/CompareWeeklyAccordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function CompareViewPage() {
  const [weeks, setWeeks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/trading-data/compare");
        if (!res.ok) {
          throw new Error(`Failed to fetch comparison data: ${res.statusText}`);
        }
        const data = await res.json();
        if (!Array.isArray(data)) {
          throw new Error("Invalid data format received");
        }
        setWeeks(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to load comparison data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Trading Levels Algo Comparison</h1>
        <p className="text-xl text-muted-foreground">
          Compare your trading logs with existing data
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : weeks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Comparison Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Upload a trading log to compare with existing data.
            </p>
            <Button asChild>
              <Link href="/compare">Upload Comparison Log</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <CompareWeeklyAccordion weeks={weeks} />
      )}
      <div className="mb-24" />
    </div>
  );
}
