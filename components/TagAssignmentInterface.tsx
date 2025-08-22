import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, Plus, Tag, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import type { TagAssignment } from '@/lib/trading-data-store';

export interface TagDefinition {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
}

interface TagAssignmentInterfaceProps {
  date: string;
  initialTagAssignments?: TagAssignment[];
  onTagAssignmentsChange?: (assignments: TagAssignment[]) => void;
  disabled?: boolean;
}

export function TagAssignmentInterface({ 
  date, 
  initialTagAssignments = [], 
  onTagAssignmentsChange,
  disabled = false 
}: TagAssignmentInterfaceProps) {
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinition[]>([]);
  const [tagAssignments, setTagAssignments] = useState<TagAssignment[]>(initialTagAssignments);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Load tag definitions on mount
  useEffect(() => {
    loadTagDefinitions();
  }, []);

  // Update local state when props change
  useEffect(() => {
    setTagAssignments(initialTagAssignments);
  }, [initialTagAssignments]);

  const loadTagDefinitions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/trading-data/tags');
      if (response.ok) {
        const tags = await response.json();
        setTagDefinitions(tags);
      } else {
        console.error('Failed to load tag definitions');
      }
    } catch (error) {
      console.error('Error loading tag definitions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewTag = async (name: string): Promise<TagDefinition | null> => {
    try {
      const response = await fetch('/api/trading-data/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (response.ok) {
        const newTag = await response.json();
        setTagDefinitions(prev => [...prev, newTag]);
        return newTag;
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create tag');
        return null;
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('Failed to create tag');
      return null;
    }
  };

  const saveTagAssignments = async (assignments: TagAssignment[]): Promise<boolean> => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/trading-data/compare/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateTags',
          date,
          tagAssignments: assignments
        }),
      });

      if (response.ok) {
        toast.success('Tag assignments saved successfully');
        if (onTagAssignmentsChange) {
          onTagAssignmentsChange(assignments);
        }
        return true;
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save tag assignments');
        return false;
      }
    } catch (error) {
      console.error('Error saving tag assignments:', error);
      toast.error('Failed to save tag assignments');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;

    // Check if tag already exists
    let tagToAssign: TagDefinition | null = tagDefinitions.find(tag => 
      tag.name.toLowerCase() === newTagName.trim().toLowerCase()
    ) || null;

    // Create new tag if it doesn't exist
    if (!tagToAssign) {
      tagToAssign = await createNewTag(newTagName.trim());
      if (!tagToAssign) return;
    }

    // Check if tag is already assigned
    if (tagAssignments.some(assignment => assignment.tagId === tagToAssign!.id)) {
      toast.error('This tag is already assigned to this day');
      setNewTagName('');
      return;
    }

    // Add assignment with default positive impact
    const newAssignment: TagAssignment = {
      tagId: tagToAssign.id,
      impact: 'positive',
      assignedAt: new Date().toISOString()
    };

    const updatedAssignments = [...tagAssignments, newAssignment];
    
    // Auto-save the new assignments
    const saveSuccess = await saveTagAssignments(updatedAssignments);
    if (saveSuccess) {
      setTagAssignments(updatedAssignments);
      setNewTagName('');
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    const updatedAssignments = tagAssignments.filter(assignment => assignment.tagId !== tagId);
    
    // Auto-save the updated assignments
    const saveSuccess = await saveTagAssignments(updatedAssignments);
    if (saveSuccess) {
      setTagAssignments(updatedAssignments);
    }
  };

  const handleToggleImpact = async (tagId: string) => {
    const updatedAssignments = tagAssignments.map(assignment => 
      assignment.tagId === tagId 
        ? { ...assignment, impact: assignment.impact === 'positive' ? 'negative' as const : 'positive' as const }
        : assignment
    );
    
    // Auto-save the updated assignments
    const saveSuccess = await saveTagAssignments(updatedAssignments);
    if (saveSuccess) {
      setTagAssignments(updatedAssignments);
    }
  };



  const getTagDefinition = (tagId: string) => {
    return tagDefinitions.find(tag => tag.id === tagId);
  };

  const getAvailableTags = () => {
    const assignedTagIds = tagAssignments.map(assignment => assignment.tagId);
    return tagDefinitions.filter(tag => !assignedTagIds.includes(tag.id));
  };

  const filteredAvailableTags = getAvailableTags().filter(tag =>
    newTagName === '' || tag.name.toLowerCase().includes(newTagName.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Tags</Label>
        <div className="text-sm text-muted-foreground">
          {tagAssignments.length} tag{tagAssignments.length !== 1 ? 's' : ''} assigned
        </div>
      </div>

      {/* Assigned Tags */}
      {tagAssignments.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Assigned Tags:</div>
          <div className="flex flex-wrap gap-2">
            {tagAssignments.map((assignment) => {
              const tagDef = getTagDefinition(assignment.tagId);
              if (!tagDef) return null;
              
              return (
                <div key={assignment.tagId} className="flex items-center gap-1">
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 pr-1 cursor-pointer hover:bg-muted/50"
                    style={{ borderColor: tagDef.color + '40', backgroundColor: tagDef.color + '10' }}
                    onClick={() => handleToggleImpact(assignment.tagId)}
                    title={`Click to change impact (currently ${assignment.impact})`}
                  >
                    <span style={{ color: tagDef.color }}>{tagDef.name}</span>
                    {assignment.impact === 'positive' ? (
                      <TrendingUp className="w-3 h-3 text-green-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500" />
                    )}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                    onClick={() => handleRemoveTag(assignment.tagId)}
                    disabled={disabled}
                    title="Remove tag"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add New Tag */}
      {!isAddingTag ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-center gap-2"
          onClick={() => setIsAddingTag(true)}
          disabled={disabled || isLoading}
        >
          <Plus className="w-4 h-4" />
          Add Tag
        </Button>
      ) : (
        <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter tag name or select existing..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                } else if (e.key === 'Escape') {
                  setNewTagName('');
                  setIsAddingTag(false);
                }
              }}
              disabled={disabled}
              autoFocus
            />
          </div>
          
          {/* Available Tags Suggestions */}
          {newTagName && filteredAvailableTags.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Existing tags:</div>
              <div className="flex flex-wrap gap-1">
                {filteredAvailableTags.slice(0, 5).map((tag) => (
                  <Button
                    key={tag.id}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setNewTagName(tag.name)}
                    style={{ color: tag.color }}
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {tag.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {filteredAvailableTags.find(tag => tag.name.toLowerCase() === newTagName.toLowerCase()) 
                ? 'Select existing tag' 
                : newTagName ? 'Create new tag' 
                : 'Enter tag name'}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewTagName('');
                  setIsAddingTag(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddTag}
                disabled={!newTagName.trim()}
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Saving Indicator */}
      {isSaving && (
        <div className="flex items-center justify-center pt-2 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving tags...
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading tags...
          </div>
        </div>
      )}
    </div>
  );
}
