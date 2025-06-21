# Compare Data Management Features

## Overview

We've implemented a comprehensive compare data management system that allows users to:

1. **Mark compare days as verified** - Track which days have been reviewed and approved
2. **Add notes to compare data** - Store contextual information about changes
3. **Merge compare data to base data** - Promote verified compare data to the main dataset

## API Endpoints

### GET `/api/trading-data/compare/manage?date=YYYY-MM-DD`
Retrieves compare data for a specific date, including any metadata (verification status, notes).

**Response:**
```json
{
  "date": "2025-06-13",
  "analysis": { /* trading analysis data */ },
  "metadata": {
    "verified": true,
    "notes": "User notes about this day",
    "verifiedAt": "2025-01-27T10:30:00.000Z",
    "verifiedBy": "user"
  }
}
```

### POST `/api/trading-data/compare/manage`
Performs various management actions on compare data.

**Actions:**

#### 1. Mark as Verified
```json
{
  "action": "verify",
  "date": "2025-06-13",
  "verifiedBy": "user"
}
```

#### 2. Add Notes
```json
{
  "action": "addNotes",
  "date": "2025-06-13",
  "notes": "User notes about the changes"
}
```

#### 3. Merge to Base Data
```json
{
  "action": "merge",
  "date": "2025-06-13"
}
```

## Data Structure Changes

### Extended DailyLog Interface
The `DailyLog` interface now includes optional metadata:

```typescript
export interface DailyLog {
  date: string;
  analysis: TradingLogAnalysis;
  metadata?: {
    verified?: boolean;
    notes?: string;
    verifiedAt?: string;
    verifiedBy?: string;
  };
}
```

## UI Integration

### CompareTradingDialog Component
The existing comparison dialog has been enhanced with a new "Manage" tab that provides:

- **Verification Toggle**: Switch to mark the day as verified
- **Notes Textarea**: Add contextual notes about the changes
- **Merge Button**: Promote verified compare data to base data
- **Loading States**: Visual feedback during API operations
- **Toast Notifications**: Success/error feedback using Sonner

### Features
- **Auto-loading**: Existing metadata is loaded when the dialog opens
- **Debounced Saving**: Notes are automatically saved after 1 second of inactivity
- **Real-time Updates**: Verification status and notes are saved immediately
- **Validation**: Merge button is disabled until the day is verified
- **Error Handling**: Comprehensive error handling with user feedback

## Backend Implementation

### TradingDataStore Methods
New methods added to the `TradingDataStore` class:

- `markCompareAsVerified(date, verifiedBy)`: Marks a compare day as verified
- `addCompareNotes(date, notes)`: Adds or updates notes for a compare day
- `mergeCompareToBase(date)`: Merges compare data to base data
- `getCompareByDate(date)`: Retrieves compare data for a specific date

### Data Persistence
- Metadata is stored alongside the trading analysis data
- All operations are persisted to the JSON files
- Backward compatibility is maintained for existing data

## Usage Workflow

1. **Review Changes**: User opens the comparison dialog and reviews the differences
2. **Add Notes**: User adds contextual notes about the changes (optional)
3. **Verify**: User marks the day as verified after reviewing
4. **Merge**: User clicks "Merge Changes" to promote the data to base dataset
5. **Confirmation**: Success notification confirms the merge operation

## Testing

A test script (`test-compare-manage.js`) is provided to verify the API functionality:

```bash
node test-compare-manage.js
```

The test script covers:
- Retrieving compare data
- Marking as verified
- Adding notes
- Verifying metadata persistence
- (Merge test is commented out to avoid data modification)

## Security Considerations

- All operations require valid date parameters
- Merge operations are irreversible (consider adding confirmation dialogs)
- API endpoints include proper error handling and validation
- No authentication is currently implemented (consider adding if needed)

## Future Enhancements

Potential improvements:
- **Bulk Operations**: Verify/merge multiple days at once
- **Audit Trail**: Track all changes with timestamps and user info
- **Confirmation Dialogs**: Add confirmation for destructive operations
- **Export/Import**: Backup and restore metadata
- **Search/Filter**: Find verified days or days with specific notes 