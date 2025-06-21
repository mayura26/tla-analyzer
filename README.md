# TLA Analyzer

A comprehensive trading analysis application for the Trading Levels Algo (TLA) using 5MNQ data. This Next.js application provides detailed analytics, comparison tools, and data management for trading performance tracking.

## Features

### 📊 Dashboard Analytics
- **Real-time Statistics**: Total PnL, win rates, trade counts, and performance metrics
- **Visual Charts**: PnL distribution charts, win/loss breakdowns, and trend analysis
- **Weekly Grouping**: Automatic organization of trading data by weeks
- **Performance Tracking**: Historical data analysis with comprehensive statistics

### 🔄 Data Management
- **Trading Log Input**: Upload and process raw trading log data
- **Compare Data**: Compare different trading sessions and identify discrepancies
- **Data Verification**: Mark compare data as verified with notes and metadata
- **Merge Functionality**: Promote verified compare data to base dataset

### 📈 Weekly Analysis
- **Weekly Summaries**: Grouped trading data with weekly performance metrics
- **Notes System**: Add contextual notes to specific trading days
- **Accordion Interface**: Collapsible weekly views for easy navigation

### 🎨 Modern UI
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark/Light Theme**: Toggle between themes for comfortable viewing
- **Shadcn Components**: Beautiful, accessible UI components
- **Real-time Updates**: Live data updates with loading states

## Tech Stack

- **Framework**: Next.js 15.3.3 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn/ui with Radix UI primitives
- **Data Storage**: JSON files with file system persistence
- **State Management**: React hooks and local state
- **Notifications**: Sonner toast notifications

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tla-analyzer
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
tla-analyzer/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes for data operations
│   ├── compare/           # Data comparison pages
│   ├── input/             # Data input pages
│   ├── weekly/            # Weekly analysis pages
│   └── page.tsx           # Main dashboard
├── components/            # Reusable UI components
│   ├── ui/               # Shadcn/ui components
│   └── *.tsx             # Custom components
├── lib/                  # Core business logic
│   ├── trading-*.ts      # Trading analysis modules
│   └── utils.ts          # Utility functions
├── data/                 # JSON data storage
│   ├── all-days.json     # Main trading data
│   ├── compare-data.json # Comparison data
│   └── notes/            # Trading notes
└── public/               # Static assets
```

## Core Modules

### Trading Analysis
- **`trading-log-parser.ts`**: Parses raw trading log data
- **`trading-stats-processor.ts`**: Calculates comprehensive trading statistics
- **`trading-comparison-stats-processor.ts`**: Handles data comparison analytics
- **`trading-log-comparator.ts`**: Compares different trading sessions
- **`trading-data-store.ts`**: Manages data persistence and retrieval

### Key Features

#### Dashboard Analytics
The main dashboard provides:
- Total trading days and performance metrics
- Win rate and net win rate calculations
- Average trades and fill rates
- PnL distribution visualization
- Weekly performance breakdowns

#### Data Comparison System
- Upload comparison data for analysis
- Mark data as verified with notes
- Merge verified data to base dataset
- Track verification status and metadata

#### Weekly Analysis
- Group trading data by weeks
- Add contextual notes to specific days
- View weekly performance summaries
- Compare weekly performance metrics

## API Endpoints

### Dashboard
- **`GET /api/dashboard`** - Get comprehensive dashboard data
  - Returns: `{ dailyLogs: DailyLog[], stats: TradingStats, last4WeeksStats: TradingStats }`
  - Provides aggregated statistics and recent performance data

### Trading Data Management
- **`GET /api/trading-data`** - Retrieve all trading data
  - Returns: Base trading data for the entire dataset
- **`POST /api/trading-data`** - Process new trading log data
  - Body: `{ logData: string }` - Raw trading log text
  - Returns: `{ success: boolean }`
  - Automatically extracts date from log text (YYYY-MM-DD format)

### Weekly Data
- **`GET /api/trading-data/weeks`** - Get weekly grouped trading data
  - Returns: `WeekLog[]` - Trading data organized by weeks
  - Groups data by Monday-start weeks with performance summaries

### Notes Management
- **`GET /api/trading-data/notes?date=YYYY-MM-DD`** - Get notes for specific date
  - Returns: `{ success: boolean, data: NotesData }`
- **`GET /api/trading-data/notes?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`** - Get notes in date range
  - Returns: `{ success: boolean, data: NotesData[] }`
- **`POST /api/trading-data/notes`** - Save notes for a date
  - Body: `{ date: string, notes: string }`
  - Returns: `{ success: boolean, message: string, data: NotesData }`
- **`DELETE /api/trading-data/notes?date=YYYY-MM-DD`** - Delete notes for a date
  - Returns: `{ success: boolean, message: string }`

### Comparison Data
- **`GET /api/trading-data/compare`** - Get comparison data grouped by weeks
  - Returns: `WeekLog[]` with both compare and base data for each day
  - Includes metadata for verification status and notes
- **`POST /api/trading-data/compare`** - Process comparison trading log data
  - Body: `{ logData: string }` - Raw trading log text for comparison
  - Returns: `{ success: boolean }`

### Comparison Management
- **`GET /api/trading-data/compare/manage?date=YYYY-MM-DD`** - Get comparison data with metadata
  - Returns: `DailyLog` with verification status and notes
- **`POST /api/trading-data/compare/manage`** - Manage comparison data
  - Body: `{ action: string, date: string, ... }`
  - Actions:
    - `verify`: `{ action: 'verify', date: string, verified: boolean, verifiedBy?: string }`
    - `addNotes`: `{ action: 'addNotes', date: string, notes: string }`
    - `merge`: `{ action: 'merge', date: string }` - Merge single day to base
    - `mergeWeek`: `{ action: 'mergeWeek', date: string }` - Merge entire week to base

### Comparison Statistics
- **`GET /api/trading-data/compare/stats`** - Get comparison statistics
  - Returns: Comprehensive comparison analytics between base and compare datasets

## File Storage System

### Data Directory Structure
```
data/
├── all-days.json          # Main trading dataset (DailyLog[])
├── compare-data.json      # Comparison dataset (DailyLog[])
└── notes/                 # Individual note files
    ├── YYYY-MM-DD.json    # Notes for specific dates
    └── ...
```

### Data Formats

#### Main Trading Data (`all-days.json`)
```json
[
  {
    "date": "2025-06-20",
    "analysis": {
      "headline": {
        "totalPnl": 441.8,
        "totalTrades": 6,
        "wins": 1,
        "losses": 0,
        "bigWins": 1,
        "bigLosses": 0,
        "trailingDrawdown": 0,
        "contracts": 5,
        "maxPotentialGainPerContract": 88.36,
        "pnlPerTrade": 73.63,
        "maxProfit": 360,
        "maxRisk": 260,
        "maxDailyGain": 500,
        "maxDailyLoss": -5000
      },
      "sessions": {
        "morning": { "pnl": 23.8, "trades": 1, "avgPnlPerTrade": 23.8 },
        "main": { "pnl": 418, "trades": 5, "avgPnlPerTrade": 83.6 },
        "midday": { "pnl": 94.4, "trades": 3, "avgPnlPerTrade": 31.47 },
        "afternoon": { "pnl": 323.6, "trades": 2, "avgPnlPerTrade": 161.8 },
        "end": { "pnl": 0, "trades": 0, "avgPnlPerTrade": 0 }
      },
      "protectionStats": {
        "blockedTrades": {
          "protective": 8,
          "dynamicRange": 0,
          "bounceProtect": 9,
          "predictiveWickProtect": 6,
          "badStructure": 0,
          "atrProtect": 0,
          "volDeltaProtect": 8,
          "softChaseProtect": 0
        },
        "fillProtection": {
          "fillProtect": 1,
          "maxFillProtect": 0,
          "chaseFillProtect": 0,
          "chopZoneFill": 0,
          "fillProactive": 0
        },
        "chaseMode": {
          "trades": 2,
          "restarts": 4
        }
      },
      "tradeBreakdown": {
        "ordersGenerated": 12,
        "ordersFilled": 6,
        "fillRate": 50,
        "chaseModeTradesPnl": 367.9,
        "chaseModeTrades": 3
      },
      "tradeList": [
        {
          "id": 2,
          "timestamp": "2025-06-20T13:24:00.000Z",
          "direction": "LONG",
          "entryPrice": 22047,
          "quantity": 5,
          "totalPnl": 23.8,
          "subTrades": [
            {
              "exitPrice": 22056.75,
              "quantity": 3,
              "pnl": 53.28,
              "points": 9,
              "exitReason": "TP",
              "exitTimestamp": "2025-06-20T13:27:00.000Z"
            }
          ],
          "isChaseTrade": false,
          "exitTimestamp": "2025-06-20T13:33:00.000Z"
        }
      ],
      "tradeNearStoppedOut": []
    }
  }
]
```

#### Comparison Data (`compare-data.json`)
```json
[
  {
    "date": "2025-06-20",
    "analysis": { /* Same structure as main data */ },
    "metadata": {
      "verified": true,
      "notes": "User notes about this comparison",
      "verifiedAt": "2025-01-27T10:30:00.000Z",
      "verifiedBy": "user"
    }
  }
]
```

#### Notes Data (`notes/YYYY-MM-DD.json`)
```json
{
  "date": "2024-01-15",
  "notes": "Trading notes for this specific day",
  "lastModified": "2025-06-21T20:54:38.689Z"
}
```

### Storage Management

#### TradingDataStore Class
The application uses a singleton `TradingDataStore` class that provides:

- **Dual Storage Support**: File system (server) and localStorage (client)
- **Automatic Directory Creation**: Ensures data directories exist
- **Data Persistence**: Automatic saving to JSON files
- **Data Loading**: Lazy loading of data from storage
- **Error Handling**: Graceful fallbacks for missing data

#### Key Methods
- `addDailyLog(day: DailyLog)` - Add trading data to main dataset
- `addCompareLog(day: DailyLog)` - Add trading data to comparison dataset
- `getAllDays()` - Retrieve all main trading data
- `getCompareData()` - Retrieve all comparison data
- `groupLogsByWeek()` - Group data by weeks for analysis
- `markCompareAsVerified()` - Mark comparison data as verified
- `addCompareNotes()` - Add notes to comparison data
- `mergeCompareToBase()` - Merge verified data to main dataset

#### Data Validation
- Date format validation (YYYY-MM-DD)
- Required field validation for API requests
- Automatic date extraction from trading log text
- Duplicate date handling (replaces existing data)

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding Components
When adding new UI components, use the shadcn/ui CLI:
```bash
npx shadcn@latest add <component-name>
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is private and proprietary.

---

Built with Next.js, TypeScript, and Tailwind CSS. Designed for professional trading analysis and performance tracking.
