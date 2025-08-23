import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Plus, Tag, Clock, TrendingUp } from 'lucide-react';

export interface TagDefinition {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
}

interface TagSelectorProps {
  tags: TagDefinition[];
  selectedTags: string[];
  onTagSelect: (tagId: string) => void;
  onTagCreate: (name: string) => Promise<TagDefinition | null>;
  disabled?: boolean;
  placeholder?: string;
}

export function TagSelector({
  tags,
  selectedTags,
  onTagSelect,
  onTagCreate,
  disabled = false,
  placeholder = "Select or create a tag..."
}: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [open]);

  const handleButtonClick = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setOpen(!open);
  };

  // Filter and sort tags
  const availableTags = tags.filter(tag => !selectedTags.includes(tag.id));
  
  // Sort tags by: 1) recently used, 2) popularity, 3) alphabetically
  const sortedTags = [...availableTags].sort((a, b) => {
    // If one has recent usage and the other doesn't
    if (a.lastUsed && !b.lastUsed) return -1;
    if (!a.lastUsed && b.lastUsed) return 1;
    
    // Both have recent usage - sort by most recent first
    if (a.lastUsed && b.lastUsed) {
      const timeDiff = new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      if (timeDiff !== 0) return timeDiff;
    }
    
    // Sort by usage count (more popular first)
    if (a.usageCount !== b.usageCount) {
      return b.usageCount - a.usageCount;
    }
    
    // Finally, sort alphabetically
    return a.name.localeCompare(b.name);
  });

  // Filter by search
  const filteredTags = searchValue
    ? sortedTags.filter(tag =>
        tag.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        (tag.description && tag.description.toLowerCase().includes(searchValue.toLowerCase()))
      )
    : sortedTags;

  // Group tags for better presentation
  const recentTags = filteredTags.filter(tag => {
    if (!tag.lastUsed) return false;
    const daysSinceUsed = (Date.now() - new Date(tag.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUsed <= 30; // Used in last 30 days
  }).slice(0, 5);

  const popularTags = filteredTags.filter(tag => 
    tag.usageCount >= 3 && !recentTags.some(rt => rt.id === tag.id)
  ).slice(0, 5);

  const otherTags = filteredTags.filter(tag => 
    !recentTags.some(rt => rt.id === tag.id) && 
    !popularTags.some(pt => pt.id === tag.id)
  );

  const handleCreateTag = async () => {
    if (!searchValue.trim() || isCreating) return;
    
    setIsCreating(true);
    try {
      const newTag = await onTagCreate(searchValue.trim());
      if (newTag) {
        onTagSelect(newTag.id);
        setSearchValue('');
        setOpen(false);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const canCreateTag = searchValue.trim() && 
    !filteredTags.some(tag => tag.name.toLowerCase() === searchValue.trim().toLowerCase());

  const formatLastUsed = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return 'Today';
    if (daysDiff === 1) return 'Yesterday';
    if (daysDiff <= 7) return `${daysDiff} days ago`;
    if (daysDiff <= 30) return `${Math.floor(daysDiff / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const renderTagItem = (tag: TagDefinition, showUsageInfo = false) => (
    <div
      key={tag.id}
      onClick={() => {
        onTagSelect(tag.id);
        setOpen(false);
        setSearchValue('');
      }}
      className="flex items-center justify-between p-1.5 cursor-pointer hover:bg-accent rounded-md transition-colors"
    >
      <div className="flex items-center gap-1.5 flex-1">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: tag.color }}
        />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-medium truncate">{tag.name}</span>
          {tag.description && (
            <span className="text-xs text-muted-foreground truncate">
              {tag.description}
            </span>
          )}
        </div>
      </div>
      {showUsageInfo && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {tag.usageCount > 0 && (
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span className="text-xs">{tag.usageCount}</span>
            </span>
          )}
          {tag.lastUsed && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span className="text-xs">{formatLastUsed(tag.lastUsed)}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="relative w-full">
      <Button
        ref={triggerRef}
        variant="outline"
        className="w-full justify-between text-left font-normal"
        disabled={disabled}
        onClick={handleButtonClick}
      >
        <span className="flex items-center gap-2">
          <Tag className="w-4 h-4" />
          {placeholder}
        </span>
        <ChevronDown className="w-4 h-4 opacity-50" />
      </Button>
      
      {open && (
        <div 
          className="fixed z-[99999] bg-popover border rounded-md shadow-lg overflow-visible"
          style={{
            top: dropdownPosition.top + 4,
            left: dropdownPosition.left,
            minWidth: Math.max(300, dropdownPosition.width),
            maxWidth: 450
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-h-[350px] overflow-y-auto">
            {/* Search Input */}
            <div className="p-2 border-b">
              <input
                type="text"
                placeholder="Search tags or type to create new..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    
                    // Check if there's an exact match first
                    const exactMatch = filteredTags.find(tag => 
                      tag.name.toLowerCase() === searchValue.trim().toLowerCase()
                    );
                    
                    if (exactMatch) {
                      // Select the existing tag
                      onTagSelect(exactMatch.id);
                      setOpen(false);
                      setSearchValue('');
                    } else if (canCreateTag) {
                      // Create new tag if search value doesn't match any existing tag
                      handleCreateTag();
                    }
                  } else if (e.key === 'Escape') {
                    setOpen(false);
                    setSearchValue('');
                  }
                }}
                className="w-full px-2.5 py-1.5 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="p-1">
              {/* Recently Used Tags */}
              {recentTags.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-medium text-muted-foreground mb-1 px-1.5">Recently Used</div>
                  {recentTags.map(tag => renderTagItem(tag, true))}
                </div>
              )}

              {/* Popular Tags */}
              {popularTags.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-medium text-muted-foreground mb-1 px-1.5">Popular Tags</div>
                  {popularTags.map(tag => renderTagItem(tag, true))}
                </div>
              )}

              {/* Other Tags */}
              {otherTags.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-medium text-muted-foreground mb-1 px-1.5">
                    {recentTags.length > 0 || popularTags.length > 0 ? "Other Tags" : "All Tags"}
                  </div>
                  {otherTags.map(tag => renderTagItem(tag))}
                </div>
              )}

              {/* No results */}
              {filteredTags.length === 0 && searchValue && (
                <div className="text-center py-3 text-muted-foreground text-xs space-y-1.5">
                  <div>No matching tags found</div>
                  <div className="text-xs">
                    Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to create "{searchValue.trim()}"
                  </div>
                </div>
              )}
              
              {filteredTags.length === 0 && !searchValue && (
                <div className="text-center py-3 text-muted-foreground text-xs">
                  No tags available
                </div>
              )}

              {/* Create New Tag Option */}
              {canCreateTag && (
                <div className="border-t pt-1.5 mt-1.5">
                  <div
                    onClick={handleCreateTag}
                    className="flex items-center gap-2 p-1.5 cursor-pointer text-primary hover:bg-accent rounded-md transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-sm">
                      {isCreating ? 'Creating...' : `Create "${searchValue.trim()}"`}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {open && (
        <div 
          className="fixed inset-0 z-[9998]" 
          onClick={() => {
            setOpen(false);
            setSearchValue('');
          }}
        />
      )}
    </div>
  );
}
