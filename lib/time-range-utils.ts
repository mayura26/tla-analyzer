import { DailyLog } from './trading-data-store'
import { TimeRange } from '@/components/TimeRangeFilter'

export function filterDailyLogsByTimeRange(dailyLogs: DailyLog[], timeRange: TimeRange): DailyLog[] {
  if (timeRange === 'all' || !dailyLogs || dailyLogs.length === 0) {
    return dailyLogs
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  let startDate: Date
  let endDate: Date = today

  switch (timeRange) {
    case 'wtd': {
      // Week to date - Monday of current week
      const dayOfWeek = now.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Sunday = 0, so go back 6 days
      startDate = new Date(today)
      startDate.setDate(today.getDate() + mondayOffset)
      break
    }
    
    case 'mtd': {
      // Month to date - first day of current month
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      break
    }
    
    case 'qtd': {
      // Quarter to date - first day of current quarter
      const quarter = Math.floor(today.getMonth() / 3)
      startDate = new Date(today.getFullYear(), quarter * 3, 1)
      break
    }
    
    case 'ytd': {
      // Year to date - first day of current year
      startDate = new Date(today.getFullYear(), 0, 1)
      break
    }
    
    case 'last-month': {
      // Last 4 weeks (28 days)
      startDate = new Date(today)
      startDate.setDate(today.getDate() - 28)
      break
    }
    
    case 'last-12-weeks': {
      // Last 12 weeks (84 days)
      startDate = new Date(today)
      startDate.setDate(today.getDate() - 84)
      break
    }
    
    case 'last-24-weeks': {
      // Last 24 weeks (168 days)
      startDate = new Date(today)
      startDate.setDate(today.getDate() - 168)
      break
    }
    
    default:
      return dailyLogs
  }

  // Convert dates to YYYY-MM-DD format for comparison
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  return dailyLogs.filter(log => {
    const logDate = log.date
    return logDate >= startDateStr && logDate <= endDateStr
  })
}

export function getTimeRangeDescription(timeRange: TimeRange): string {
  const config = {
    all: 'All Data',
    wtd: 'Week to Date',
    mtd: 'Month to Date', 
    qtd: 'Quarter to Date',
    ytd: 'Year to Date',
    'last-month': 'Last Month (4 weeks)',
    'last-12-weeks': 'Last 12 Weeks',
    'last-24-weeks': 'Last 24 Weeks'
  }
  
  return config[timeRange] || 'All Data'
}
