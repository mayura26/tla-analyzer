"use client";

import { useEffect, useState } from "react";
import { QuarterlyLogAccordion } from "@/components/QuarterlyLogAccordion";
import type { WeekLog, NotesData } from "@/lib/trading-data-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  const [weeks, setWeeks] = useState<WeekLog[]>([]);
  const [notesData, setNotesData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const handleNotesChange = (date: string, notes: string) => {
    setNotesData(prev => ({
      ...prev,
      [date]: notes
    }));
  };

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch weeks data
        const weeksRes = await fetch("/api/trading-data/weeks");
        if (weeksRes.ok) {
          const weeksData = await weeksRes.json();
          setWeeks(weeksData);
          
          // If we have weeks data, fetch all notes for the date range
          if (weeksData.length > 0) {
            // Get the date range from all weeks
            const allDates: string[] = [];
            weeksData.forEach((week: WeekLog) => {
              week.days.forEach((day) => {
                allDates.push(day.date);
              });
            });
            
            if (allDates.length > 0) {
              // Sort dates to get min and max
              allDates.sort();
              const startDate = allDates[0];
              const endDate = allDates[allDates.length - 1];
              
              // Fetch all notes in the date range
              const notesRes = await fetch(`/api/trading-data/notes?startDate=${startDate}&endDate=${endDate}`);
              if (notesRes.ok) {
                const notesResponse = await notesRes.json();
                if (notesResponse.success && notesResponse.data) {
                  // Convert array of notes to a map for easy lookup
                  const notesMap: Record<string, string> = {};
                  notesResponse.data.forEach((note: NotesData) => {
                    notesMap[note.date] = note.notes;
                  });
                  setNotesData(notesMap);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
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
        <QuarterlyLogAccordion weeks={weeks} notesData={notesData} onNotesChange={handleNotesChange} />
      )}
      <div className="mb-24" />
    </div>
  );
}
