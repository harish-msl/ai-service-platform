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

interface ApiKey {
  id: string;
  name: string;
  key: string;
  project: {
    name: string;
  };
}

interface RevokeKeyDialogProps {
  apiKey: ApiKey;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function RevokeKeyDialog({
  apiKey,
  open,
  onOpenChange,
  onSuccess,
}: RevokeKeyDialogProps) {
  const [isRevoking, setIsRevoking] = useState(false);

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      await api.delete(`/api-keys/${apiKey.id}`);
      onSuccess();
    } catch (error: any) {
      console.error("Failed to revoke API key:", error);
      toast.error(error.response?.data?.message || "Failed to revoke API key");
      setIsRevoking(false);
    }
  };

  // Mask API key for display
  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return `${key.substring(0, 8)}${"•".repeat(16)}${key.substring(key.length - 4)}`;
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
              <DialogTitle>Revoke API Key</DialogTitle>
              <DialogDescription className="mt-1">
                This action cannot be undone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm">
            Are you sure you want to revoke the API key{" "}
            <span className="font-semibold">{apiKey.name}</span>?
          </p>

          {/* Key details */}
          <div className="rounded-lg border bg-muted p-4 space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Key Name</p>
              <p className="text-sm font-medium">{apiKey.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Project</p>
              <p className="text-sm font-medium">{apiKey.project.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">API Key</p>
              <code className="text-sm font-mono">{maskKey(apiKey.key)}</code>
            </div>
          </div>

          {/* Warning */}
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm font-semibold text-destructive mb-2">
              ⚠️ Warning
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>This API key will immediately stop working</li>
              <li>Any applications using this key will lose access</li>
              <li>This action cannot be reversed</li>
              <li>You&apos;ll need to generate a new key to restore access</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRevoking}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRevoke}
            disabled={isRevoking}
          >
            {isRevoking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Revoking...
              </>
            ) : (
              "Revoke API Key"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
