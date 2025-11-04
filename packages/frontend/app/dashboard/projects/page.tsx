"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  Plus,
  Calendar,
  Key,
  TrendingUp,
  Edit,
  Trash2,
  Loader2,
  Database,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import CreateProjectModal from "@/components/projects/CreateProjectModal";
import DeleteProjectDialog from "@/components/projects/DeleteProjectDialog";
import api from "@/lib/api";
import { toast } from "sonner";

interface ProjectSchema {
  id: string;
  projectId: string;
  connectionString?: string;
  lastSyncedAt?: string;
  dialect: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  environment: "DEVELOPMENT" | "STAGING" | "PRODUCTION";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  schema?: ProjectSchema | null;
  _count?: {
    apiKeys: number;
    usage: number;
  };
}

export default function ProjectsPage() {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Parse connection string to get database info
  const parseConnectionString = (connectionString?: string) => {
    if (!connectionString) return null;
    try {
      if (connectionString.startsWith("postgres") || connectionString.startsWith("mysql")) {
        const url = new URL(connectionString);
        return {
          type: connectionString.startsWith("postgres") ? "PostgreSQL" : "MySQL",
          host: url.hostname,
          database: url.pathname ? url.pathname.replace(/^\//, "") : undefined,
        };
      }
      if (connectionString.startsWith("sqlite")) {
        return {
          type: "SQLite",
          database: connectionString.replace("sqlite://", ""),
        };
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  // Fetch projects
  const {
    data: projects,
    isLoading,
    error,
    refetch,
  } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await api.get("/projects?include=schema");
      return response.data;
    },
  });

  // Environment badge styling
  const getEnvironmentBadge = (env: string) => {
    const variants = {
      DEVELOPMENT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      STAGING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      PRODUCTION: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
    return variants[env as keyof typeof variants] || variants.DEVELOPMENT;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Handle project click
  const handleProjectClick = (projectId: string) => {
    router.push(`/dashboard/projects/${projectId}`);
  };

  // Handle delete success
  const handleDeleteSuccess = () => {
    setProjectToDelete(null);
    refetch();
    toast.success("Project deleted successfully");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Failed to load projects</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "An error occurred"}
          </p>
          <Button onClick={() => refetch()} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your AI projects and their configurations
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Project
        </Button>
      </div>

      {/* Projects Grid */}
      {projects && projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderKanban className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
              Get started by creating your first AI project. You&apos;ll be able to generate
              API keys, upload schemas, and start using AI features.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects?.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => handleProjectClick(project.id)}
            >
              <CardContent className="p-6">
                {/* Project Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                    <Badge className={`mt-2 ${getEnvironmentBadge(project.environment)}`}>
                      {project.environment}
                    </Badge>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/projects/${project.id}/edit`);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(project);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Project Description */}
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                  {project.description || "No description provided"}
                </p>

                {/* Database Connection Info */}
                {project.schema?.connectionString && (() => {
                  const connInfo = parseConnectionString(project.schema.connectionString);
                  return connInfo ? (
                    <div className="mb-3 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-900 dark:text-green-100">
                          Database Connected
                        </span>
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300">
                        <div className="flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          <span>{connInfo.type}</span>
                          {connInfo.database && (
                            <>
                              <span className="mx-1">•</span>
                              <span className="truncate">{connInfo.database}</span>
                            </>
                          )}
                        </div>
                        {connInfo.host && (
                          <div className="mt-1 text-[10px]">
                            Host: {connInfo.host}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Project Stats */}
                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center text-muted-foreground">
                      <Key className="w-4 h-4 mr-2" />
                      API Keys
                    </span>
                    <span className="font-semibold">{project._count?.apiKeys || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center text-muted-foreground">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      API Calls
                    </span>
                    <span className="font-semibold">
                      {project._count?.usage?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-2" />
                      Created
                    </span>
                    <span className="font-semibold">{formatDate(project.createdAt)}</span>
                  </div>
                </div>

                {/* Active Status */}
                {!project.isActive && (
                  <div className="mt-4 pt-4 border-t">
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      Inactive
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          refetch();
          toast.success("Project created successfully");
        }}
      />

      {/* Delete Confirmation Dialog */}
      {projectToDelete && (
        <DeleteProjectDialog
          project={projectToDelete}
          open={!!projectToDelete}
          onOpenChange={(open: boolean) => !open && setProjectToDelete(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
