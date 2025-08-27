import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Plus, Edit, Trash2, Tag, Calendar, BarChart3, X } from 'lucide-react';
import { toast } from 'sonner';

export interface TagDefinition {
  id: string;
  name: string;
  description?: string;
  color: string;
  image?: string; // Base64 encoded image data
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
}

interface TagManagerProps {
  className?: string;
}

export function TagManager({ className }: TagManagerProps) {
  const [tags, setTags] = useState<TagDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTag, setEditingTag] = useState<TagDefinition | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [tagToDelete, setTagToDelete] = useState<TagDefinition | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Form states
  const [tagName, setTagName] = useState('');
  const [tagDescription, setTagDescription] = useState('');
  const [tagColor, setTagColor] = useState('#3b82f6');
  const [tagImage, setTagImage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'usageCount' | 'lastUsed'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Load tags on mount
  useEffect(() => {
    loadTags();
  }, []);

  // Global paste event listener
  useEffect(() => {
    const handleGlobalPaste = (event: ClipboardEvent) => {
      // Only handle paste if we're in a create or edit dialog
      if (!isCreateDialogOpen && !isEditDialogOpen) return;
      
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result as string;
              if (result) {
                setTagImage(result);
                toast.success('Image pasted successfully!');
              }
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => {
      document.removeEventListener('paste', handleGlobalPaste);
    };
  }, [isCreateDialogOpen, isEditDialogOpen]);

  const loadTags = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/trading-data/tags');
      if (response.ok) {
        const tagsData = await response.json();
        setTags(tagsData);
      } else {
        console.error('Failed to load tags');
        toast.error('Failed to load tags');
      }
    } catch (error) {
      console.error('Error loading tags:', error);
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!tagName.trim()) {
      toast.error('Tag name is required');
      return;
    }

    try {
      const response = await fetch('/api/trading-data/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tagName.trim(),
          description: tagDescription.trim() || undefined,
          color: tagColor,
          image: tagImage || undefined,
        }),
      });

      if (response.ok) {
        const newTag = await response.json();
        setTags(prev => [...prev, newTag]);
        toast.success('Tag created successfully');
        setIsCreateDialogOpen(false);
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create tag');
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('Failed to create tag');
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag || !tagName.trim()) {
      toast.error('Tag name is required');
      return;
    }

    try {
      const response = await fetch('/api/trading-data/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingTag.id,
          name: tagName.trim(),
          description: tagDescription.trim() || undefined,
          color: tagColor,
          image: tagImage || undefined,
        }),
      });

      if (response.ok) {
        const updatedTag = await response.json();
        setTags(prev => prev.map(tag => tag.id === editingTag.id ? updatedTag : tag));
        toast.success('Tag updated successfully');
        setIsEditDialogOpen(false);
        setEditingTag(null);
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update tag');
      }
    } catch (error) {
      console.error('Error updating tag:', error);
      toast.error('Failed to update tag');
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      setDeletingTagId(tagId);
      const response = await fetch(`/api/trading-data/tags?id=${tagId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTags(prev => prev.filter(tag => tag.id !== tagId));
        toast.success('Tag deleted successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete tag');
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast.error('Failed to delete tag');
    } finally {
      setDeletingTagId(null);
    }
  };

  const openDeleteDialog = (tag: TagDefinition) => {
    setTagToDelete(tag);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (tagToDelete) {
      handleDeleteTag(tagToDelete.id);
      setIsDeleteDialogOpen(false);
      setTagToDelete(null);
    }
  };

  const openEditDialog = (tag: TagDefinition) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagDescription(tag.description || '');
    setTagColor(tag.color);
    setTagImage(tag.image || '');
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setTagName('');
    setTagDescription('');
    setTagColor('#3b82f6');
    setTagImage('');
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  // Handle paste events for images
  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            if (result) {
              setTagImage(result);
              toast.success('Image pasted successfully!');
            }
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  // Handle image file upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setTagImage(result);
          toast.success('Image uploaded successfully!');
        }
      };
      reader.readAsDataURL(file);
    } else if (file) {
      toast.error('Please select an image file');
    }
  };

  // Remove image
  const removeImage = () => {
    setTagImage('');
    toast.success('Image removed');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const predefinedColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
  ];

  // Filter and sort tags
  const filteredTags = tags
    .filter(tag =>
      tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tag.description && tag.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'usageCount':
          aValue = a.usageCount || 0;
          bValue = b.usageCount || 0;
          break;
        case 'lastUsed':
          aValue = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
          bValue = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  return (
    <div className={className}>
      {/* Header with tag count and create button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {tags.length} tags
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={openCreateDialog}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Tag
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-4">
          {/* Search and filter */}
          <div className="flex items-center gap-4">
            <div className="flex-1 flex items-center gap-2 max-w-md">
              <Input
                placeholder="Search tags by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="px-2"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Sort controls */}
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm border rounded px-2 py-1 bg-background"
              >
                <option value="name">Sort by Name</option>
                <option value="createdAt">Sort by Created Date</option>
                <option value="usageCount">Sort by Usage Count</option>
                <option value="lastUsed">Sort by Last Used</option>
              </select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-2"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {filteredTags.length} of {tags.length} tags
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading tags...</span>
              </div>
            </div>
          )}

          {/* Tags list */}
          {!loading && filteredTags.length === 0 && searchTerm && (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tags match your search</p>
              <p className="text-sm">Try adjusting your search terms</p>
            </div>
          )}

          {!loading && filteredTags.length === 0 && !searchTerm && (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tags found</p>
              <p className="text-sm">Create your first tag to get started</p>
            </div>
          )}

          {!loading && filteredTags.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTags.map((tag) => (
                <div
                  key={tag.id}
                  className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                >
                  {/* Tag header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: tag.color }}
                      />
                      <h4 className="font-medium text-sm">{tag.name}</h4>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(tag)}
                        className="h-8 w-8 p-0 hover:bg-muted"
                        title="Edit tag"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(tag)}
                        disabled={deletingTagId === tag.id}
                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                        title="Delete tag"
                      >
                        {deletingTagId === tag.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Tag image */}
                  {tag.image && (
                    <div className="mb-3">
                      <img
                        src={tag.image}
                        alt={`${tag.name} tag image`}
                        className="w-full h-24 object-cover rounded border"
                      />
                    </div>
                  )}

                  {/* Tag description */}
                  {tag.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {tag.description}
                    </p>
                  )}

                  {/* Tag stats */}
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>Created: {formatDate(tag.createdAt)}</span>
                    </div>
                    {tag.lastUsed && (
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-3 w-3" />
                        <span>Last used: {formatDateTime(tag.lastUsed)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Tag className="h-3 w-3" />
                      <span>Used {tag.usageCount} time{tag.usageCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Refresh button */}
          {!loading && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={loadTags}
                disabled={loading}
                className="gap-2"
              >
                <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Tags
              </Button>
            </div>
          )}
        </div>

      {/* Create Tag Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Tag</DialogTitle>
            <DialogDescription>
              Create a new tag to categorize your trading data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Image instructions */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">💡 Image Tips:</p>
                <ul className="text-xs space-y-1">
                  <li>• Copy an image from anywhere (screenshot, web, etc.)</li>
                  <li>• Press Ctrl+V to paste it directly</li>
                  <li>• Or use the file upload option below</li>
                </ul>
              </div>
            </div>
            
            <div>
              <Label htmlFor="tag-name">Tag Name</Label>
              <Input
                id="tag-name"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="Enter tag name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="tag-description">Description (Optional)</Label>
              <Textarea
                id="tag-description"
                value={tagDescription}
                onChange={(e) => setTagDescription(e.target.value)}
                placeholder="Enter tag description"
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="tag-color">Color</Label>
              <div className="mt-1 space-y-2">
                <Input
                  id="tag-color"
                  type="color"
                  value={tagColor}
                  onChange={(e) => setTagColor(e.target.value)}
                  className="w-16 h-10 p-1 border rounded cursor-pointer"
                />
                <div className="flex gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => setTagColor(color)}
                      title={`Select ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="tag-image">Image (Optional)</Label>
              <div className="mt-1 space-y-3">
                {/* Image preview */}
                {tagImage && (
                  <div className="relative">
                    <img
                      src={tagImage}
                      alt="Tag image preview"
                      className="w-full h-32 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removeImage}
                      className="absolute top-2 right-2 h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                {/* Image input methods */}
                <div className="space-y-2">
                  {/* File upload */}
                  <div>
                    <Label htmlFor="image-upload" className="text-sm text-muted-foreground">
                      Upload Image
                    </Label>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="mt-1"
                    />
                  </div>
                  
                  {/* Paste area */}
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Or Paste Image (Ctrl+V)
                    </Label>
                    <div
                      className="mt-1 p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center cursor-pointer hover:border-muted-foreground/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onPaste={handlePaste}
                      onClick={() => {
                        // Focus the element to make it clear it's ready for pasting
                        const element = document.activeElement as HTMLElement;
                        if (element) element.focus();
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label="Paste image here"
                    >
                      <div className="text-sm text-muted-foreground">
                        {tagImage ? 'Image pasted! Click to paste a different one.' : 'Paste an image from your clipboard here'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Click here and press Ctrl+V, or just press Ctrl+V anywhere
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateTag}>
                Create Tag
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Tag Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>
              Update the tag information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Image instructions */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">💡 Image Tips:</p>
                <ul className="text-xs space-y-1">
                  <li>• Copy an image from anywhere (screenshot, web, etc.)</li>
                  <li>• Press Ctrl+V to paste it directly</li>
                  <li>• Or use the file upload option below</li>
                </ul>
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-tag-name">Tag Name</Label>
              <Input
                id="edit-tag-name"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="Enter tag name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-tag-description">Description (Optional)</Label>
              <Textarea
                id="edit-tag-description"
                value={tagDescription}
                onChange={(e) => setTagDescription(e.target.value)}
                placeholder="Enter tag description"
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-tag-color">Color</Label>
              <div className="mt-1 space-y-2">
                <Input
                  id="edit-tag-color"
                  type="color"
                  value={tagColor}
                  onChange={(e) => setTagColor(e.target.value)}
                  className="w-16 h-10 p-1 border rounded cursor-pointer"
                />
                <div className="flex gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => setTagColor(color)}
                      title={`Select ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-tag-image">Image (Optional)</Label>
              <div className="mt-1 space-y-3">
                {/* Image preview */}
                {tagImage && (
                  <div className="relative">
                    <img
                      src={tagImage}
                      alt="Tag image preview"
                      className="w-full h-32 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removeImage}
                      className="absolute top-2 right-2 h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                {/* Image input methods */}
                <div className="space-y-2">
                  {/* File upload */}
                  <div>
                    <Label htmlFor="edit-image-upload" className="text-sm text-muted-foreground">
                      Upload Image
                    </Label>
                    <Input
                      id="edit-image-upload"
                      type="file"
                      accept="image/*"
                      className="mt-1"
                      onChange={handleImageUpload}
                    />
                  </div>
                  
                  {/* Paste area */}
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Or Paste Image (Ctrl+V)
                    </Label>
                    <div
                      className="mt-1 p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center cursor-pointer hover:border-muted-foreground/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onPaste={handlePaste}
                      onClick={() => {
                        // Focus the element to make it clear it's ready for pasting
                        const element = document.activeElement as HTMLElement;
                        if (element) element.focus();
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label="Paste image here"
                    >
                      <div className="text-sm text-muted-foreground">
                        {tagImage ? 'Image pasted! Click to paste a different one.' : 'Paste an image from your clipboard here'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Click here and press Ctrl+V, or just press Ctrl+V anywhere
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateTag}>
                Update Tag
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the tag "{tagToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Tag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
