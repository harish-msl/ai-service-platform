"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Database,
  Copy,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Info,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  environment: string;
  schema?: {
    dialect: string;
    connectionString?: string;
  };
}

interface QueryResult {
  query: string;
  explanation: string;
  confidence: number;
  dialect: string;
  tables: string[];
}

interface ExecutionResult {
  success: boolean;
  data?: any[];
  rowCount?: number;
  executionTime?: number;
  error?: string;
}

export default function QueryGeneratorPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);

  // Fetch projects
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await api.get("/projects");
      return response.data;
    },
  });

  // Generate query mutation
  const generateQueryMutation = useMutation({
    mutationFn: async (data: { question: string; projectId: string; context?: string }) => {
      const response = await api.post("/ai/query", data);
      return response.data;
    },
    onSuccess: (data) => {
      setQueryResult(data);
      setExecutionResult(null); // Reset execution result
      toast.success("SQL query generated successfully");
    },
    onError: () => {
      toast.error("Failed to generate query");
    },
  });

  // Execute query mutation
  const executeQueryMutation = useMutation({
    mutationFn: async (data: { query: string; projectId: string }) => {
      const response = await api.post("/ai/execute", data);
      return response.data;
    },
    onSuccess: (data) => {
      setExecutionResult(data);
      if (data.success) {
        toast.success(`Query executed successfully. ${data.rowCount} rows returned.`);
      } else {
        toast.error("Query execution failed");
      }
    },
    onError: () => {
      toast.error("Failed to execute query");
    },
  });

  // Handle generate query
  const handleGenerateQuery = () => {
    if (!question.trim() || !selectedProjectId) {
      if (!selectedProjectId) {
        toast.error("Please select a project first");
      } else {
        toast.error("Please enter a question");
      }
      return;
    }

    generateQueryMutation.mutate({
      question: question.trim(),
      projectId: selectedProjectId,
      context: context.trim() || undefined,
    });
  };

  // Handle copy query
  const handleCopyQuery = () => {
    if (queryResult?.query) {
      navigator.clipboard.writeText(queryResult.query);
      toast.success("Query copied to clipboard");
    }
  };

  // Handle execute query
  const handleExecuteQuery = () => {
    if (!queryResult?.query || !selectedProjectId) return;

    executeQueryMutation.mutate({
      query: queryResult.query,
      projectId: selectedProjectId,
    });
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600 dark:text-green-400";
    if (confidence >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  // Get confidence badge variant
  const getConfidenceBadgeVariant = (confidence: number): "default" | "secondary" | "destructive" => {
    if (confidence >= 80) return "default";
    if (confidence >= 50) return "secondary";
    return "destructive";
  };

  const selectedProject = projects?.find((p) => p.id === selectedProjectId);
  const hasConnection = selectedProject?.schema?.connectionString;

  const handleGenerate = () => {
    if (!question.trim() || !selectedProjectId) {
      if (!selectedProjectId) {
        toast.error("Please select a project first");
      } else {
        toast.error("Please enter a question");
      }
      return;
    }

    generateQueryMutation.mutate({
      question: question.trim(),
      projectId: selectedProjectId,
      context: context.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">SQL Query Generator</h1>
        <p className="text-muted-foreground">
          Convert natural language questions into SQL queries using AI
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Ask a Question
          </CardTitle>
          <CardDescription>
            Describe what data you want to retrieve in plain English
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project Selection */}
          <div className="space-y-2">
            <label htmlFor="project" className="text-sm font-medium">
              Select Project
            </label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger id="project">
                <SelectValue placeholder="Choose a project with schema" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{project.name}</span>
                      {project.schema && (
                        <Badge variant="outline" className="ml-2">
                          {project.schema.dialect}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProjectId && !selectedProject?.schema && (
              <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                <AlertCircle className="w-4 h-4" />
                <span>This project has no schema uploaded. Upload schema first.</span>
              </div>
            )}
          </div>

          {/* Question Input */}
          <div className="space-y-2">
            <label htmlFor="question" className="text-sm font-medium">
              Your Question
            </label>
            <Textarea
              id="question"
              placeholder="e.g., Show me all users who registered in the last 30 days and have made at least one purchase"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Context Input (Optional) */}
          <div className="space-y-2">
            <label htmlFor="context" className="text-sm font-medium">
              Additional Context (Optional)
            </label>
            <Textarea
              id="context"
              placeholder="e.g., The users table has columns: id, email, created_at, and the orders table tracks purchases"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Provide extra information about your database structure or specific requirements
            </p>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!selectedProjectId || !question.trim() || generateQueryMutation.isPending}
            size="lg"
            className="w-full ai-button"
          >
            {generateQueryMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating SQL...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate SQL Query
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Query Result Section */}
      {queryResult && (
        <div className="space-y-4">
          {/* Confidence Score */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Generated Query</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Confidence:</span>
                  <Badge variant={getConfidenceBadgeVariant(queryResult.confidence)}>
                    <span className={getConfidenceColor(queryResult.confidence)}>
                      {queryResult.confidence}%
                    </span>
                  </Badge>
                </div>
              </div>
              <CardDescription>
                Dialect: {queryResult.dialect} • Tables: {queryResult.tables.join(", ")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* SQL Code Display */}
              <div className="relative">
                <SyntaxHighlighter
                  language="sql"
                  style={vscDarkPlus}
                  customStyle={{
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                    padding: "1rem",
                  }}
                >
                  {queryResult.query}
                </SyntaxHighlighter>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyQuery}
                  className="absolute top-2 right-2"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {hasConnection ? (
                  <Button
                    onClick={handleExecuteQuery}
                    disabled={executeQueryMutation.isPending}
                  >
                    {executeQueryMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Execute Query
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="w-4 h-4" />
                    <span>Connect to database to execute queries</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Explanation Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5" />
                Query Explanation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {queryResult.explanation}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Execution Result Section */}
      {executionResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Execution Result</CardTitle>
              {executionResult.success ? (
                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Success
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Failed
                </Badge>
              )}
            </div>
            {executionResult.success && (
              <CardDescription>
                {executionResult.rowCount} row(s) • {executionResult.executionTime}ms
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {executionResult.success ? (
              executionResult.data && executionResult.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        {Object.keys(executionResult.data[0]).map((key) => (
                          <th
                            key={key}
                            className="text-left p-2 text-sm font-medium text-muted-foreground"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {executionResult.data.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-accent/50">
                          {Object.values(row).map((value, vIdx) => (
                            <td key={vIdx} className="p-2 text-sm">
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {executionResult.rowCount && executionResult.rowCount > 10 && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      Showing 10 of {executionResult.rowCount} rows
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data returned</p>
              )
            ) : (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Query execution failed
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    {executionResult.error}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Card */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Info className="w-5 h-5" />
            How to Use
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <p>1. Select a project that has a database schema uploaded</p>
          <p>2. Ask your question in plain English (e.g., &quot;Show me top 10 customers by revenue&quot;)</p>
          <p>3. Optionally provide additional context about your database structure</p>
          <p>4. Click &quot;Generate SQL Query&quot; to get AI-powered SQL</p>
          <p>5. Review the confidence score and explanation</p>
          <p>6. Execute the query if you have a database connection configured</p>
        </CardContent>
      </Card>
    </div>
  );
}
