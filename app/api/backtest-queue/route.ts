import { NextResponse } from 'next/server';
import { backtestQueueStore, type BacktestPriority, type BacktestStatus } from '@/lib/backtest-queue-store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as BacktestStatus | null;
    const statsOnly = searchParams.get('statsOnly') === 'true';

    if (statsOnly) {
      const stats = await backtestQueueStore.getQueueStats();
      return NextResponse.json(stats);
    }

    let queueItems;
    if (status) {
      queueItems = await backtestQueueStore.getQueueItemsByStatus(status);
    } else {
      queueItems = await backtestQueueStore.getAllQueueItems();
    }

    return NextResponse.json({
      success: true,
      items: queueItems,
      count: queueItems.length
    });
  } catch (error) {
    console.error('Error fetching backtest queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backtest queue' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { action, date, dates, priority, status, notes, addedBy } = await request.json();

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'add': {
        if (!date) {
          return NextResponse.json(
            { error: 'Date is required for add action' },
            { status: 400 }
          );
        }
        
        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return NextResponse.json(
            { error: 'Invalid date format. Use YYYY-MM-DD' },
            { status: 400 }
          );
        }

        await backtestQueueStore.addToQueue(
          date, 
          priority as BacktestPriority || 'medium',
          addedBy
        );
        break;
      }

      case 'addMultiple': {
        if (!dates || !Array.isArray(dates) || dates.length === 0) {
          return NextResponse.json(
            { error: 'Dates array is required for addMultiple action' },
            { status: 400 }
          );
        }

        // Validate all dates
        for (const d of dates) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
            return NextResponse.json(
              { error: `Invalid date format: ${d}. Use YYYY-MM-DD` },
              { status: 400 }
            );
          }
        }

        await backtestQueueStore.addMultipleToQueue(
          dates,
          priority as BacktestPriority || 'medium',
          addedBy
        );
        break;
      }

      case 'updateStatus': {
        if (!date || !status) {
          return NextResponse.json(
            { error: 'Date and status are required for updateStatus action' },
            { status: 400 }
          );
        }

        await backtestQueueStore.updateQueueItemStatus(date, status as BacktestStatus);
        break;
      }

      case 'updatePriority': {
        if (!date || !priority) {
          return NextResponse.json(
            { error: 'Date and priority are required for updatePriority action' },
            { status: 400 }
          );
        }

        await backtestQueueStore.updateQueueItemPriority(date, priority as BacktestPriority);
        break;
      }

      case 'addNotes': {
        if (!date || !notes) {
          return NextResponse.json(
            { error: 'Date and notes are required for addNotes action' },
            { status: 400 }
          );
        }

        await backtestQueueStore.addNotesToQueueItem(date, notes);
        break;
      }

      case 'remove': {
        if (!date) {
          return NextResponse.json(
            { error: 'Date is required for remove action' },
            { status: 400 }
          );
        }

        await backtestQueueStore.removeFromQueue(date);
        break;
      }

      case 'removeMultiple': {
        if (!dates || !Array.isArray(dates) || dates.length === 0) {
          return NextResponse.json(
            { error: 'Dates array is required for removeMultiple action' },
            { status: 400 }
          );
        }

        await backtestQueueStore.removeMultipleFromQueue(dates);
        break;
      }

      case 'clearCompleted': {
        const clearedCount = await backtestQueueStore.clearCompleted();
        return NextResponse.json({
          success: true,
          message: `Cleared ${clearedCount} completed items from queue`
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error managing backtest queue:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to manage backtest queue' },
      { status: 500 }
    );
  }
}
