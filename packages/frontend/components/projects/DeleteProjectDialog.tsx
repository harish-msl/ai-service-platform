"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  _count?: {
    apiKeys: number;
    usage: number;
  };
}

interface DeleteProjectDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
  onSuccess,
}: DeleteProjectDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/projects/${project.id}`);
      onSuccess();
    } catch (error: any) {
      console.error("Failed to delete project:", error);
      toast.error(error.response?.data?.message || "Failed to delete project");
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Delete Project</DialogTitle>
              <DialogDescription className="mt-1">
                This action cannot be undone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{project.name}</span>?
          </p>

          {(project._count?.apiKeys || 0) > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950 p-4">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                ⚠️ Warning: This project has {project._count?.apiKeys} API key(s)
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                All associated API keys will be permanently deleted.
              </p>
            </div>
          )}

          {(project._count?.usage || 0) > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950 p-4">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                📊 This project has {project._count?.usage.toLocaleString()} API call(s)
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                All usage history will be permanently deleted.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm font-semibold text-destructive">
              This will permanently delete:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              <li>The project and all its data</li>
              <li>All associated API keys ({project._count?.apiKeys || 0})</li>
              <li>All usage history ({project._count?.usage?.toLocaleString() || 0} calls)</li>
              <li>Project schema (if uploaded)</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Project"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
