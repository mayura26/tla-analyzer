import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
    <CommandItem
      key={tag.id}
      value={tag.name}
      onSelect={() => {
        onTagSelect(tag.id);
        setOpen(false);
        setSearchValue('');
      }}
      className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent"
    >
      <div className="flex items-center gap-2 flex-1">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: tag.color }}
        />
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-medium truncate">{tag.name}</span>
          {tag.description && (
            <span className="text-xs text-muted-foreground truncate">
              {tag.description}
            </span>
          )}
        </div>
      </div>
      {showUsageInfo && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {tag.usageCount > 0 && (
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {tag.usageCount}
            </span>
          )}
          {tag.lastUsed && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatLastUsed(tag.lastUsed)}
            </span>
          )}
        </div>
      )}
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left font-normal"
          disabled={disabled}
        >
          <span className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            {placeholder}
          </span>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search tags or type to create new..."
            value={searchValue}
            onValueChange={setSearchValue}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false);
                setSearchValue('');
              }
              // Let Command component handle Enter for navigation
              // Only intercept Enter for tag creation when no results
            }}
            autoFocus
          />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty className="px-4 py-6 text-center">
              {searchValue ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">No matching tags found</div>
                  <div className="text-xs text-muted-foreground">
                    Use the "Create" option below or type to search
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No tags available</div>
              )}
            </CommandEmpty>

            {/* Recently Used Tags */}
            {recentTags.length > 0 && (
              <CommandGroup heading="Recently Used">
                {recentTags.map(tag => renderTagItem(tag, true))}
              </CommandGroup>
            )}

            {/* Popular Tags */}
            {popularTags.length > 0 && (
              <CommandGroup heading="Popular Tags">
                {popularTags.map(tag => renderTagItem(tag, true))}
              </CommandGroup>
            )}

            {/* Other Tags */}
            {otherTags.length > 0 && (
              <CommandGroup heading={recentTags.length > 0 || popularTags.length > 0 ? "Other Tags" : "All Tags"}>
                {otherTags.map(tag => renderTagItem(tag))}
              </CommandGroup>
            )}

            {/* Create New Tag Option */}
            {canCreateTag && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreateTag}
                  className="flex items-center gap-2 p-3 cursor-pointer text-primary hover:bg-accent"
                  disabled={isCreating}
                  value={`create-${searchValue.trim()}`}
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {isCreating ? 'Creating...' : `Create "${searchValue.trim()}"`}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Enter</kbd>
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
