"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Filter } from "lucide-react"

export type TimeRange = 
  | 'all'
  | 'wtd' // Week to date
  | 'mtd' // Month to date
  | 'qtd' // Quarter to date
  | 'ytd' // Year to date
  | 'last-month' // Last 4 weeks
  | 'last-12-weeks'
  | 'last-24-weeks'

interface TimeRangeFilterProps {
  selectedRange: TimeRange
  onRangeChange: (range: TimeRange) => void
  filteredDataCount: number
  totalDataCount: number
}

const timeRangeConfig = {
  all: { label: 'All Data', shortLabel: 'All' },
  wtd: { label: 'Week to Date', shortLabel: 'WTD' },
  mtd: { label: 'Month to Date', shortLabel: 'MTD' },
  qtd: { label: 'Quarter to Date', shortLabel: 'QTD' },
  ytd: { label: 'Year to Date', shortLabel: 'YTD' },
  'last-month': { label: 'Last Month (4 weeks)', shortLabel: 'Last Month' },
  'last-12-weeks': { label: 'Last 12 Weeks', shortLabel: '12W' },
  'last-24-weeks': { label: 'Last 24 Weeks', shortLabel: '24W' }
}

export function TimeRangeFilter({ 
  selectedRange, 
  onRangeChange, 
  filteredDataCount, 
  totalDataCount 
}: TimeRangeFilterProps) {
  const quickButtons: TimeRange[] = ['wtd', 'mtd', 'qtd', 'ytd', 'last-month', 'last-12-weeks', 'last-24-weeks']
  
  return (
    <Card className="bg-card/50">
      <CardHeader className="p-1">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Filter className="h-3 w-3" />
          Time Range Filter
          <Badge variant="secondary" className="ml-auto text-xs">
            {filteredDataCount} of {totalDataCount} days
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-1 pt-0">
        <div className="flex flex-wrap gap-0.5">
          <Button
            variant={selectedRange === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onRangeChange('all')}
            className="text-xs h-6 px-1.5"
          >
            <Calendar className="h-3 w-3 mr-0.5" />
            {timeRangeConfig.all.shortLabel}
          </Button>
          
          {quickButtons.map((range) => (
            <Button
              key={range}
              variant={selectedRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => onRangeChange(range)}
              className="text-xs h-6 px-1.5"
            >
              {timeRangeConfig[range].shortLabel}
            </Button>
          ))}
        </div>
        
        {selectedRange !== 'all' && (
          <div className="mt-0.5 text-xs text-muted-foreground">
            Showing: {timeRangeConfig[selectedRange].label}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
