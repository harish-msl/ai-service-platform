"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Copy, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import api from "@/lib/api";
import { toast } from "sonner";

const SCOPES = [
  { value: "QUERY_GENERATION", label: "Query Generation", description: "Generate SQL from natural language" },
  { value: "CHATBOT", label: "Chatbot", description: "AI chatbot conversations" },
  { value: "ANALYTICS", label: "Analytics", description: "Usage analytics and insights" },
  { value: "PREDICTIONS", label: "Predictions", description: "AI-powered predictions" },
  { value: "ADMIN", label: "Admin", description: "Administrative access" },
];

const apiKeySchema = z.object({
  name: z.string().min(1, "API key name is required").max(100, "Name is too long"),
  projectId: z.string().min(1, "Project is required"),
  scopes: z.array(z.string()).min(1, "Select at least one scope"),
  rateLimit: z.number().min(1, "Rate limit must be at least 1").max(100000, "Rate limit too high"),
  expiresAt: z.string().optional(),
});

type ApiKeyFormData = z.infer<typeof apiKeySchema>;

interface CreateApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Project {
  id: string;
  name: string;
  environment: string;
}

interface CreatedApiKey {
  id: string;
  key: string;
  name: string;
}

export default function CreateApiKeyModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateApiKeyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Fetch projects
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await api.get("/projects");
      return response.data;
    },
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      name: "",
      projectId: "",
      scopes: [],
      rateLimit: 1000,
      expiresAt: "",
    },
  });

  const projectId = watch("projectId");
  const scopes = watch("scopes");

  const onSubmit = async (data: ApiKeyFormData) => {
    setIsSubmitting(true);
    try {
      const response = await api.post("/api-keys", {
        ...data,
        expiresAt: data.expiresAt || null,
      });
      setCreatedKey(response.data);
      toast.success("API key generated successfully");
    } catch (error: any) {
      console.error("Failed to create API key:", error);
      toast.error(error.response?.data?.message || "Failed to create API key");
      setIsSubmitting(false);
    }
  };

  const handleCopyKey = async () => {
    if (createdKey) {
      try {
        await navigator.clipboard.writeText(createdKey.key);
        setCopiedKey(true);
        toast.success("API key copied to clipboard");
        setTimeout(() => setCopiedKey(false), 2000);
      } catch {
        toast.error("Failed to copy API key");
      }
    }
  };

  const handleClose = () => {
    if (createdKey) {
      onSuccess();
      setCreatedKey(null);
      setCopiedKey(false);
      reset();
      setIsSubmitting(false);
    } else if (!isSubmitting) {
      onOpenChange(false);
      reset();
    }
  };

  const toggleScope = (scope: string) => {
    const currentScopes = scopes || [];
    if (currentScopes.includes(scope)) {
      setValue("scopes", currentScopes.filter((s) => s !== scope));
    } else {
      setValue("scopes", [...currentScopes, scope]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {createdKey ? "API Key Generated" : "Generate New API Key"}
          </DialogTitle>
          <DialogDescription>
            {createdKey
              ? "Save this key securely. You won't be able to see it again."
              : "Create a new API key to access the platform's AI features."}
          </DialogDescription>
        </DialogHeader>

        {createdKey ? (
          // Show generated key
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4 border-2 border-primary">
              <Label className="text-xs text-muted-foreground mb-2 block">
                Your API Key
              </Label>
              <div className="flex items-center gap-2 bg-background rounded-md p-3">
                <code className="flex-1 text-sm font-mono break-all">
                  {createdKey.key}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyKey}
                  className="flex-shrink-0"
                >
                  {copiedKey ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                ⚠️ Important: Copy this key now
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                For security reasons, this key will only be shown once. Make sure to save it in a secure location.
              </p>
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          // Show form
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* API Key Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Key Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Production API Key"
                {...register("name")}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Project Selection */}
            <div className="space-y-2">
              <Label htmlFor="project">
                Project <span className="text-destructive">*</span>
              </Label>
              <Select
                value={projectId}
                onValueChange={(value: string) => setValue("projectId", value)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} ({project.environment})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.projectId && (
                <p className="text-sm text-destructive">{errors.projectId.message}</p>
              )}
            </div>

            {/* Scopes */}
            <div className="space-y-2">
              <Label>
                Scopes <span className="text-destructive">*</span>
              </Label>
              <div className="space-y-3 border rounded-lg p-4">
                {SCOPES.map((scope) => (
                  <div key={scope.value} className="flex items-start space-x-3">
                    <Checkbox
                      id={scope.value}
                      checked={scopes?.includes(scope.value)}
                      onCheckedChange={() => toggleScope(scope.value)}
                      disabled={isSubmitting}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor={scope.value}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {scope.label}
                      </label>
                      <p className="text-sm text-muted-foreground">
                        {scope.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {errors.scopes && (
                <p className="text-sm text-destructive">{errors.scopes.message}</p>
              )}
            </div>

            {/* Rate Limit */}
            <div className="space-y-2">
              <Label htmlFor="rateLimit">
                Rate Limit (requests per hour) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rateLimit"
                type="number"
                placeholder="1000"
                {...register("rateLimit", { valueAsNumber: true })}
                disabled={isSubmitting}
              />
              {errors.rateLimit && (
                <p className="text-sm text-destructive">{errors.rateLimit.message}</p>
              )}
            </div>

            {/* Expiry Date (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiry Date (Optional)</Label>
              <Input
                id="expiresAt"
                type="date"
                {...register("expiresAt")}
                disabled={isSubmitting}
                min={new Date().toISOString().split("T")[0]}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for no expiration
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate API Key"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
