"use client";

import { useEffect, useState } from "react";
import { WeeklyLogAccordion } from "@/components/WeeklyLogAccordion";
import type { WeekLog } from "@/lib/trading-data-store";

export default function DashboardPage() {
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
      {loading ? (
        <div>Loading...</div>
      ) : weeks.length === 0 ? (
        <div>No trading logs found.</div>
      ) : (
        <WeeklyLogAccordion weeks={weeks} />
      )}
    </div>
  );
} 