"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { 
  ArrowLeft, 
  Sparkles, 
  Database, 
  FileJson, 
  Copy, 
  Download, 
  RefreshCw, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Edit,
  Loader2
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { toast } from "sonner";

interface ProjectContext {
  id: string;
  projectId: string;
  aiGeneratedContext: string;
  contextSummary: string;
  initialPrompts: string[];
  manualContextJson?: any;
  lastAiGeneratedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  environment: "DEVELOPMENT" | "STAGING" | "PRODUCTION";
}

export default function ProjectContextPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const projectId = params.id as string;

  const [expandedAiContext, setExpandedAiContext] = useState(true);
  const [expandedManualContext, setExpandedManualContext] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch project details
  const { data: project } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}`);
      return response.data;
    },
  });

  // Fetch project context
  const {
    data: projectContext,
    isLoading,
    error,
    refetch,
  } = useQuery<ProjectContext>({
    queryKey: ["project-context", projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/context`);
      return response.data;
    },
  });

  // Regenerate context mutation
  const regenerateContextMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/projects/${projectId}/context/generate`, {
        force: true,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Context regeneration started!");
      queryClient.invalidateQueries({ queryKey: ["project-context", projectId] });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to regenerate context");
    },
  });

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Download as JSON
  const downloadAsJson = () => {
    if (!projectContext) return;
    
    const dataStr = JSON.stringify(projectContext, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `project-context-${projectId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Context downloaded as JSON!");
  };

  // Environment badge styling
  const getEnvironmentBadge = (env: string) => {
    const variants = {
      DEVELOPMENT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      STAGING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      PRODUCTION: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
    return variants[env as keyof typeof variants] || variants.DEVELOPMENT;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading project context...</p>
        </div>
      </div>
    );
  }

  if (error || !projectContext) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/projects/${projectId}`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Project Context</h1>
            {project && (
              <p className="text-muted-foreground mt-1">{project.name}</p>
            )}
          </div>
        </div>

        {/* No Context Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Database className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Context Generated Yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Generate AI context to enable intelligent chat responses, query suggestions, and better understanding of your project.
              </p>
              <Button onClick={() => router.push("/dashboard/schema")}>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Context
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/projects/${projectId}`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Project Context</h1>
            {project && (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-muted-foreground">{project.name}</p>
                <Badge className={getEnvironmentBadge(project.environment)}>
                  {project.environment}
                </Badge>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadAsJson}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button 
            onClick={() => regenerateContextMutation.mutate()}
            disabled={regenerateContextMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${regenerateContextMutation.isPending ? 'animate-spin' : ''}`} />
            {regenerateContextMutation.isPending ? "Regenerating..." : "Regenerate"}
          </Button>
        </div>
      </div>

      {/* Metadata Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Generated</p>
                <p className="text-sm font-semibold mt-1">
                  {new Date(projectContext.lastAiGeneratedAt).toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Suggestion Prompts</p>
                <p className="text-sm font-semibold mt-1">
                  {projectContext.initialPrompts?.length || 0} prompts
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <Database className="w-5 h-5 text-purple-600 dark:text-purple-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Context Size</p>
                <p className="text-sm font-semibold mt-1">
                  {projectContext.aiGeneratedContext.length.toLocaleString()} characters
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ai-context">AI Context</TabsTrigger>
          <TabsTrigger value="manual-context">Manual Context</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Context Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Context Summary
              </CardTitle>
              <CardDescription>
                High-level overview of your project context
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  {projectContext.contextSummary}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Initial Suggestion Prompts */}
          {projectContext.initialPrompts && projectContext.initialPrompts.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Suggestion Prompts
                    </CardTitle>
                    <CardDescription>
                      Pre-configured prompts for quick queries
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(
                      projectContext.initialPrompts.join("\n"),
                      "Prompts"
                    )}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {projectContext.initialPrompts.map((prompt: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 bg-muted rounded-lg border border-border hover:border-primary transition-colors cursor-pointer group"
                      onClick={() => copyToClipboard(prompt, "Prompt")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm">{prompt}</p>
                        <Copy className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Context Tab */}
        <TabsContent value="ai-context" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    AI Generated Context
                  </CardTitle>
                  <CardDescription>
                    Full AI analysis of your database schema
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {projectContext.aiGeneratedContext.length.toLocaleString()} characters
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(
                      projectContext.aiGeneratedContext,
                      "AI Context"
                    )}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedAiContext(!expandedAiContext)}
                  >
                    {expandedAiContext ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-1" />
                        Collapse
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-1" />
                        Expand
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {expandedAiContext && (
              <CardContent>
                <div className="bg-muted p-6 rounded-lg border border-border max-h-[600px] overflow-y-auto">
                  <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                    {projectContext.aiGeneratedContext}
                  </pre>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Manual Context Tab */}
        <TabsContent value="manual-context" className="space-y-6 mt-6">
          {projectContext.manualContextJson ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileJson className="w-5 h-5" />
                      Manual Context (Custom JSON)
                    </CardTitle>
                    <CardDescription>
                      User-defined business rules and custom context
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(
                        typeof projectContext.manualContextJson === 'string'
                          ? projectContext.manualContextJson
                          : JSON.stringify(projectContext.manualContextJson, null, 2),
                        "Manual Context"
                      )}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedManualContext(!expandedManualContext)}
                    >
                      {expandedManualContext ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" />
                          Collapse
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" />
                          Expand
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {expandedManualContext && (
                <CardContent>
                  <div className="bg-muted p-6 rounded-lg border border-border max-h-[600px] overflow-y-auto">
                    <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                      {typeof projectContext.manualContextJson === 'string'
                        ? projectContext.manualContextJson
                        : JSON.stringify(projectContext.manualContextJson, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              )}
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FileJson className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Manual Context</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    Upload custom context JSON to add business rules, best practices, and examples specific to your project.
                  </p>
                  <Button onClick={() => router.push("/dashboard/schema")}>
                    <FileJson className="w-4 h-4 mr-2" />
                    Upload Manual Context
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
