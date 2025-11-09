"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, X, Edit2, RefreshCw, Loader2 } from "lucide-react";

interface ContextPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewData: {
    aiGeneratedContext: string;
    contextSummary: string;
    initialPrompts: string[];
    projectName: string;
    projectDescription: string;
  } | null;
  onConfirm: (editedData: {
    aiGeneratedContext: string;
    contextSummary: string;
    initialPrompts: string[];
  }) => void;
  onRegenerate: () => void;
  isConfirming?: boolean;
  isRegenerating?: boolean;
}

export function ContextPreviewModal({
  isOpen,
  onClose,
  previewData,
  onConfirm,
  onRegenerate,
  isConfirming = false,
  isRegenerating = false,
}: ContextPreviewModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState("");
  const [editedContext, setEditedContext] = useState("");
  const [editedPrompts, setEditedPrompts] = useState<string[]>([]);

  // Initialize edited values when preview data changes
  useState(() => {
    if (previewData) {
      setEditedSummary(previewData.contextSummary);
      setEditedContext(previewData.aiGeneratedContext);
      setEditedPrompts([...previewData.initialPrompts]);
    }
  });

  const handleConfirm = () => {
    if (!previewData) return;

    onConfirm({
      aiGeneratedContext: isEditing ? editedContext : previewData.aiGeneratedContext,
      contextSummary: isEditing ? editedSummary : previewData.contextSummary,
      initialPrompts: isEditing ? editedPrompts : previewData.initialPrompts,
    });
  };

  const handlePromptChange = (index: number, value: string) => {
    const updated = [...editedPrompts];
    updated[index] = value;
    setEditedPrompts(updated);
  };

  const handleAddPrompt = () => {
    setEditedPrompts([...editedPrompts, ""]);
  };

  const handleRemovePrompt = (index: number) => {
    setEditedPrompts(editedPrompts.filter((_, i) => i !== index));
  };

  if (!previewData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 flex-shrink-0" />
            <DialogTitle className="text-lg sm:text-xl">AI-Generated Context Preview</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            Review and edit the AI-generated context for <strong>{previewData.projectName}</strong>.
            You can accept it as-is or make improvements before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-4">
          {/* Project Info */}
          <div className="rounded-lg bg-muted/50 p-3 sm:p-4">
            <h3 className="text-sm font-semibold mb-2">Project Information</h3>
            <p className="text-xs sm:text-sm text-muted-foreground break-words">
              <strong>Name:</strong> {previewData.projectName}
            </p>
            {previewData.projectDescription && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                <strong>Description:</strong> {previewData.projectDescription}
              </p>
            )}
          </div>

          {/* Context Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="summary" className="text-sm sm:text-base font-semibold">
                Context Summary
              </Label>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-7 sm:h-8 text-xs sm:text-sm"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
            {isEditing ? (
              <Textarea
                id="summary"
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                className="min-h-[120px] font-mono text-xs sm:text-sm"
                placeholder="Enter context summary..."
              />
            ) : (
              <div className="rounded-lg border bg-card p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap break-words">
                  {previewData.contextSummary}
                </p>
              </div>
            )}
          </div>

          {/* Suggestion Prompts */}
          <div className="space-y-2">
            <Label className="text-sm sm:text-base font-semibold">
              Initial Suggestion Prompts ({isEditing ? editedPrompts.length : previewData.initialPrompts.length})
            </Label>
            {isEditing ? (
              <div className="space-y-2">
                {editedPrompts.map((prompt, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={prompt}
                      onChange={(e) => handlePromptChange(index, e.target.value)}
                      placeholder={`Suggestion ${index + 1}...`}
                      className="flex-1 text-xs sm:text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePrompt(index)}
                      className="shrink-0 h-9 w-9 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddPrompt}
                  className="w-full text-xs sm:text-sm"
                >
                  + Add Prompt
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {previewData.initialPrompts.map((prompt, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="justify-start px-3 py-2 text-xs sm:text-sm font-normal break-words whitespace-normal h-auto"
                  >
                    {prompt}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Full AI Context (collapsible) */}
          <details className="space-y-2">
            <summary className="cursor-pointer text-sm sm:text-base font-semibold hover:text-primary transition-colors">
              Full AI Analysis (Click to expand)
            </summary>
            {isEditing ? (
              <Textarea
                value={editedContext}
                onChange={(e) => setEditedContext(e.target.value)}
                className="min-h-[200px] font-mono text-xs"
                placeholder="Enter full AI-generated context..."
              />
            ) : (
              <div className="rounded-lg border bg-muted/50 p-3 sm:p-4 max-h-[300px] overflow-y-auto">
                <p className="text-xs text-muted-foreground whitespace-pre-wrap font-mono break-words">
                  {previewData.aiGeneratedContext}
                </p>
              </div>
            )}
          </details>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onRegenerate}
            disabled={isRegenerating || isConfirming}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            {isRegenerating ? (
              <>
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Regenerate
              </>
            )}
          </Button>
          <Button 
            variant="ghost" 
            onClick={onClose} 
            disabled={isConfirming}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isConfirming}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            {isConfirming ? (
              <>
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                {isEditing ? "Save Changes" : "Accept & Save"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
