import { NextResponse } from 'next/server';
import { tradingDataStore } from '@/lib/trading-data-store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
       
    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    const compareData = await tradingDataStore.getCompareByDate(date);
    
    if (!compareData) {
      return NextResponse.json(
        { error: 'Compare data not found for the specified date' },
        { status: 404 }
      );
    }

    return NextResponse.json(compareData);
  } catch (error) {
    console.error("Error in compare manage GET:", error);
    return NextResponse.json(
      { error: "Failed to retrieve compare data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { action, date, notes, verifiedBy, verified, tagId, impact, tagAssignments } = await request.json();
        
    if (!action || !date) {
      return NextResponse.json(
        { error: 'Action and date are required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'verify':
        if (typeof verified !== 'boolean') {
          return NextResponse.json(
            { error: 'Verified parameter must be a boolean' },
            { status: 400 }
          );
        }
        result = await tradingDataStore.markCompareAsVerified(date, verified, verifiedBy);
        if (!result) {
          return NextResponse.json(
            { error: 'Compare data not found for the specified date' },
            { status: 404 }
          );
        }
        return NextResponse.json({ 
          success: true, 
          message: verified ? 'Compare data marked as verified' : 'Compare data marked as unverified',
          data: result 
        });

      case 'addNotes':
        if (!notes) {
          return NextResponse.json(
            { error: 'Notes are required for addNotes action' },
            { status: 400 }
          );
        }
        result = await tradingDataStore.addCompareNotes(date, notes);
        if (!result) {
          return NextResponse.json(
            { error: 'Compare data not found for the specified date' },
            { status: 404 }
          );
        }
        return NextResponse.json({ 
          success: true, 
          message: 'Notes added to compare data',
          data: result 
        });

      case 'merge':
        const mergeResult = await tradingDataStore.mergeCompareToBase(date);
        if (!mergeResult) {
          return NextResponse.json(
            { error: 'Compare data not found for the specified date' },
            { status: 404 }
          );
        }
        return NextResponse.json({ 
          success: true, 
          message: 'Compare data successfully merged to base data' 
        });

      case 'mergeWeek':
        const mergeWeekResult = await tradingDataStore.mergeWeekCompareToBase(date);
        if (!mergeWeekResult) {
          return NextResponse.json(
            { error: 'No compare data found for the specified week' },
            { status: 404 }
          );
        }
        return NextResponse.json({ 
          success: true, 
          message: 'All compare data for the week successfully merged to base data' 
        });

      case 'verifyWeek':
        const verifyWeekResult = await tradingDataStore.verifyWeek(date, verifiedBy);
        if (!verifyWeekResult) {
          return NextResponse.json(
            { error: 'No compare data found for the specified week' },
            { status: 404 }
          );
        }
        return NextResponse.json({ 
          success: true, 
          message: 'All compare data for the week successfully marked as verified' 
        });

      case 'assignTag':
        if (!tagId || !impact) {
          return NextResponse.json(
            { error: 'TagId and impact are required for assignTag action' },
            { status: 400 }
          );
        }
        if (impact !== 'positive' && impact !== 'negative') {
          return NextResponse.json(
            { error: 'Impact must be either "positive" or "negative"' },
            { status: 400 }
          );
        }
        result = await tradingDataStore.assignCompareTag(date, tagId, impact);
        if (!result) {
          return NextResponse.json(
            { error: 'Compare data not found for the specified date' },
            { status: 404 }
          );
        }
        return NextResponse.json({ 
          success: true, 
          message: 'Tag assigned to compare data',
          data: result 
        });

      case 'removeTag':
        if (!tagId) {
          return NextResponse.json(
            { error: 'TagId is required for removeTag action' },
            { status: 400 }
          );
        }
        result = await tradingDataStore.removeCompareTag(date, tagId);
        if (!result) {
          return NextResponse.json(
            { error: 'Compare data not found for the specified date' },
            { status: 404 }
          );
        }
        return NextResponse.json({ 
          success: true, 
          message: 'Tag removed from compare data',
          data: result 
        });

      case 'updateTags':
        if (!tagAssignments || !Array.isArray(tagAssignments)) {
          return NextResponse.json(
            { error: 'TagAssignments array is required for updateTags action' },
            { status: 400 }
          );
        }
        result = await tradingDataStore.updateCompareTagAssignments(date, tagAssignments);
        if (!result) {
          return NextResponse.json(
            { error: 'Compare data not found for the specified date' },
            { status: 404 }
          );
        }
        return NextResponse.json({ 
          success: true, 
          message: 'Tag assignments updated for compare data',
          data: result 
        });

      case 'delete':
        const deleteResult = await tradingDataStore.deleteCompareByDate(date);
        if (!deleteResult) {
          return NextResponse.json(
            { error: 'Compare data not found for the specified date' },
            { status: 404 }
          );
        }
        return NextResponse.json({ 
          success: true, 
          message: 'Compare data successfully deleted' 
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: verify, addNotes, merge, mergeWeek, verifyWeek, assignTag, removeTag, updateTags, delete' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in compare manage POST:", error);
    return NextResponse.json(
      { error: "Failed to process compare data management request" },
      { status: 500 }
    );
  }
} 