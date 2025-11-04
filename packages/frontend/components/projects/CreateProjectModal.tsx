"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { toast } from "sonner";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  environment: z.enum(["DEVELOPMENT", "STAGING", "PRODUCTION"]),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateProjectModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateProjectModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      environment: "DEVELOPMENT",
    },
  });

  const environment = watch("environment");

  const onSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true);
    try {
      await api.post("/projects", data);
      reset();
      onSuccess();
    } catch (error: any) {
      console.error("Failed to create project:", error);
      toast.error(error.response?.data?.message || "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      if (!newOpen) {
        reset();
      }
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new AI project to start generating API keys and using AI features.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Project Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="My AI Project"
              {...register("name")}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="A brief description of your project..."
              rows={3}
              {...register("description")}
              disabled={isSubmitting}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Environment */}
          <div className="space-y-2">
            <Label htmlFor="environment">
              Environment <span className="text-destructive">*</span>
            </Label>
            <Select
              value={environment}
              onValueChange={(value: string) =>
                setValue("environment", value as "DEVELOPMENT" | "STAGING" | "PRODUCTION")
              }
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEVELOPMENT">Development</SelectItem>
                <SelectItem value="STAGING">Staging</SelectItem>
                <SelectItem value="PRODUCTION">Production</SelectItem>
              </SelectContent>
            </Select>
            {errors.environment && (
              <p className="text-sm text-destructive">{errors.environment.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
