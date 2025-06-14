"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Daily Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>Total Trades: --</p>
              <p>Win Rate: --</p>
              <p>Total PnL: --</p>
            </div>
          </CardContent>
        </Card>

        {/* Trade Distribution Card */}
        <Card>
          <CardHeader>
            <CardTitle>Trade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>Morning Session: --</p>
              <p>Main Session: --</p>
              <p>Midday Session: --</p>
              <p>Afternoon Session: --</p>
              <p>End Session: --</p>
            </div>
          </CardContent>
        </Card>

        {/* Protection Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Protection Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>Blocked Trades: --</p>
              <p>Chase Mode Trades: --</p>
              <p>Fill Protection: --</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 