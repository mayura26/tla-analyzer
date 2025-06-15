"use client";

import { useEffect, useState } from "react";
import { WeeklyLogAccordion } from "@/components/WeeklyLogAccordion";
import type { WeekLog } from "@/lib/trading-data-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  const [weeks, setWeeks] = useState<WeekLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeeks() {
      const res = await fetch("/api/trading-data/weeks");
      if (res.ok) {
        const data = await res.json();
        setWeeks(data);
      }
      setLoading(false);
    }
    fetchWeeks();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Trading Levels Algo</h1>
        <p className="text-xl text-muted-foreground">
          Backtested data for the Trading Levels Algo using 5MNQ
        </p>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : weeks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Trading Logs Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Start by uploading your trading logs to see your analysis.
            </p>
            <Button asChild>
              <Link href="/input">Upload Trading Logs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <WeeklyLogAccordion weeks={weeks} />
      )}
      <div className="mb-24" />
    </div>
  );
}
