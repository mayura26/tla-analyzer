import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Welcome to TLA Analyzer</h1>
        <p className="text-xl text-muted-foreground">
          Your comprehensive trading log analysis tool
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Input Data</CardTitle>
            <CardDescription>
              Upload and parse your trading logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Start by uploading your trading logs. Our parser will automatically extract and organize your trading data.
            </p>
            <Button asChild>
              <Link href="/input">Go to Input</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compare Data</CardTitle>
            <CardDescription>
              Compare different trading periods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Compare trading data across different time periods to identify patterns and improvements.
            </p>
            <Button asChild>
              <Link href="/compare">Go to Compare</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
            <CardDescription>
              View detailed analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Access comprehensive analytics and visualizations of your trading performance.
            </p>
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
