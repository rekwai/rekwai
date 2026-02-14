"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RequirementTypeSelector } from "@/components/requirement/requirement-type-selector";

interface AddExtractedRequirementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: { description: string; types: string[] }) => Promise<void>;
  existingTypes: string[];
}

export function AddExtractedRequirementDialog({
  open,
  onOpenChange,
  onAdd,
  existingTypes,
}: AddExtractedRequirementDialogProps) {
  const [description, setDescription] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      await onAdd({ description, types });
      setDescription("");
      setTypes([]);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add requirement:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Extracted Requirement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Enter requirement description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <Label>Types</Label>
            <RequirementTypeSelector
              selectedTypes={types}
              onSelectedTypesChange={setTypes}
              availableTypes={existingTypes}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!description.trim() || isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Requirement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
