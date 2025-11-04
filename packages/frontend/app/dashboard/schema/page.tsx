"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Database, Upload, FileText, Link2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import api from "@/lib/api";
import { toast } from "sonner";

const databaseSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  dialect: z.enum(["POSTGRESQL", "MYSQL", "SQLITE"]),
  host: z.string().optional(),
  port: z.string().optional(),
  user: z.string().optional(),
  password: z.string().optional(),
  database: z.string().min(1, "Database name is required"),
  autoDiscover: z.boolean().optional(),
});

type DatabaseFormData = z.infer<typeof databaseSchema>;

interface Project {
  id: string;
  name: string;
  environment: string;
}

interface SchemaPreview {
  tables: {
    name: string;
    columns: {
      name: string;
      type: string;
      nullable: boolean;
    }[];
  }[];
}

function parseConnectionString(connectionString?: string) {
  if (!connectionString) return { host: undefined, port: undefined, user: undefined, database: undefined };
  try {
    if (connectionString.startsWith("postgres") || connectionString.startsWith("mysql")) {
      // simple URL parse
      const url = new URL(connectionString);
      return {
        host: url.hostname,
        port: url.port || undefined,
        user: url.username || undefined,
        database: url.pathname ? url.pathname.replace(/^\//, "") : undefined,
      };
    }
    if (connectionString.startsWith("sqlite")) {
      return { host: undefined, port: undefined, user: undefined, database: connectionString.replace("sqlite://", "") };
    }
  } catch (e) {
    return { host: undefined, port: undefined, user: undefined, database: undefined };
  }
  return { host: undefined, port: undefined, user: undefined, database: undefined };
}

function maskUser(user?: string) {
  if (!user) return "-";
  if (user.length <= 2) return user[0] + "*";
  return user[0] + "****" + user[user.length - 1];
}

export default function SchemaPage() {
  const [activeTab, setActiveTab] = useState("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [manualSchema, setManualSchema] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [schemaPreview, setSchemaPreview] = useState<SchemaPreview | null>(null);
  const [showAllTables, setShowAllTables] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<{
    connectionString?: string;
    host?: string;
    port?: string;
    user?: string;
    database?: string;
    lastSyncedAt?: string;
    isAutoDiscovery?: boolean;
  } | null>(null);

  // Fetch projects
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await api.get("/projects");
      return response.data;
    },
  });

  // Database form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
  } = useForm<DatabaseFormData>({
    resolver: zodResolver(databaseSchema),
    defaultValues: {
      projectId: "",
      dialect: "POSTGRESQL",
      autoDiscover: false,
    },
  });

  const dialect = watch("dialect");
  const autoDiscover = watch("autoDiscover");

  // Upload schema mutation
  const uploadSchemaMutation = useMutation({
    mutationFn: async (data: { projectId: string; schema: string; method: string }) => {
      const formData = new FormData();
      formData.append("projectId", data.projectId);
      formData.append("method", data.method);
      
      if (activeTab === "file" && selectedFile) {
        formData.append("file", selectedFile);
      } else if (activeTab === "manual") {
        formData.append("schema", data.schema);
      }

      const response = await api.post("/schema/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Schema uploaded successfully");
      const preview = data.preview || (data.tables ? { tables: data.tables } : null);
      setSchemaPreview(preview);
      if (data.connectionString || data.lastSyncedAt) {
        const cs = data.connectionString;
        const parsed = parseConnectionString(cs);
        setConnectionInfo({
          connectionString: cs,
          host: parsed.host,
          port: parsed.port,
          user: parsed.user,
          database: parsed.database,
          lastSyncedAt: data.lastSyncedAt,
          isAutoDiscovery: data.isAutoDiscovery,
        });
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to upload schema");
    },
  });

  // Connect database mutation
  const connectDatabaseMutation = useMutation({
    mutationFn: async (data: DatabaseFormData) => {
      // Build connection string based on dialect
      let connectionString = "";
      
      if (data.dialect === "POSTGRESQL") {
        connectionString = `postgresql://${data.user}:${data.password}@${data.host}:${data.port || "5432"}/${data.database}`;
      } else if (data.dialect === "MYSQL") {
        connectionString = `mysql://${data.user}:${data.password}@${data.host}:${data.port || "3306"}/${data.database}`;
      } else if (data.dialect === "SQLITE") {
        connectionString = `sqlite://${data.database}`;
      }

      console.log("Connecting with:", { projectId: data.projectId, connectionString });

      const response = await api.post("/schema/sync", {
        projectId: data.projectId,
        connectionString,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Connected to database and imported schema successfully");
      console.log("Schema sync response:", data);
      const preview = data.preview || (data.tables ? { tables: data.tables } : null);
      setSchemaPreview(preview);
      if (data.connectionString || data.lastSyncedAt) {
        const cs = data.connectionString;
        const parsed = parseConnectionString(cs);
        setConnectionInfo({
          connectionString: cs,
          host: parsed.host,
          port: parsed.port,
          user: parsed.user,
          database: parsed.database,
          lastSyncedAt: data.lastSyncedAt,
          isAutoDiscovery: data.isAutoDiscovery,
        });
      }
    },
    onError: (error: any) => {
      console.error("Schema sync error:", error);
      
      // Extract error details
      let errorMessage = "Failed to connect to database";
      let errorDetails = "";
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Response error:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        });
        
        errorMessage = error.response.data?.message 
          || error.response.data?.error
          || `Server error (${error.response.status})`;
          
        // Get detailed error if available
        if (error.response.data?.details) {
          errorDetails = error.response.data.details;
        }
        
        // Check for specific error types
        if (error.response.status === 404) {
          errorMessage = "Project not found. Please select a valid project.";
        } else if (error.response.status === 403) {
          errorMessage = "You don't have permission to access this project.";
        } else if (error.response.status === 400) {
          errorMessage = error.response.data?.message || "Invalid database connection details.";
        } else if (error.response.status === 401) {
          errorMessage = "Please login again. Your session may have expired.";
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received:", error.request);
        errorMessage = "No response from server. Please check if the backend is running.";
      } else {
        // Something happened in setting up the request
        console.error("Request setup error:", error.message);
        errorMessage = error.message || "Failed to connect to database";
      }
      
      // Show error toast
      toast.error(errorMessage);
      
      // Show details if available
      if (errorDetails) {
        console.error("Error details:", errorDetails);
        setTimeout(() => {
          toast.error(errorDetails, { duration: 10000 });
        }, 500);
      }
    },
  });

  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".sql") || file.name.endsWith(".txt"))) {
      setSelectedFile(file);
    } else {
      toast.error("Please upload a .sql or .txt file");
    }
  };

  // Handle file upload from file input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Upload file schema
  const handleFileUpload = () => {
    if (!selectedProjectId) {
      toast.error("Please select a project");
      return;
    }
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    uploadSchemaMutation.mutate({
      projectId: selectedProjectId,
      schema: "",
      method: "file",
    });
  };

  // Upload manual schema
  const handleManualUpload = () => {
    if (!selectedProjectId) {
      toast.error("Please select a project");
      return;
    }
    if (!manualSchema.trim()) {
      toast.error("Please enter schema text");
      return;
    }

    uploadSchemaMutation.mutate({
      projectId: selectedProjectId,
      schema: manualSchema,
      method: "manual",
    });
  };

  // Connect to database
  const onDatabaseSubmit = (data: DatabaseFormData) => {
    if (!selectedProjectId) {
      toast.error("Please select a project first");
      return;
    }
    
    // Validate required fields based on dialect
    if (data.dialect !== "SQLITE") {
      if (!data.host) {
        toast.error("Host is required");
        return;
      }
      if (!data.user) {
        toast.error("User is required");
        return;
      }
      if (!data.password) {
        toast.error("Password is required");
        return;
      }
    }
    
    if (!data.database) {
      toast.error("Database name is required");
      return;
    }
    
    // Ensure projectId is set
    data.projectId = selectedProjectId;
    
    connectDatabaseMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Schema Management</h1>
        <p className="text-muted-foreground">
          Connect your database or upload schema for AI-powered SQL generation and intelligent queries
        </p>
      </div>

      {/* Project Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="max-w-md">
            <Label htmlFor="project">Select Project *</Label>
            <Select value={selectedProjectId} onValueChange={(value: string) => {
              setSelectedProjectId(value);
              setValue("projectId", value);
            }}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Choose a project" />
              </SelectTrigger>
              <SelectContent>
                {projects && projects.length > 0 ? (
                  projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} ({project.environment})
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">
                    No projects available. Create one first.
                  </div>
                )}
              </SelectContent>
            </Select>
            {!selectedProjectId && (
              <p className="text-sm text-muted-foreground mt-2">
                Please select a project to upload or connect schema
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Methods */}
      <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="file">
            <Upload className="w-4 h-4 mr-2" />
            File Upload
          </TabsTrigger>
          <TabsTrigger value="manual">
            <FileText className="w-4 h-4 mr-2" />
            Manual Input
          </TabsTrigger>
          <TabsTrigger value="database">
            <Link2 className="w-4 h-4 mr-2" />
            Database Connection
          </TabsTrigger>
        </TabsList>

        {/* Warning if no project selected */}
        {!selectedProjectId && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-900">Project Required</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Please select a project above before uploading or connecting a schema.
              </p>
            </div>
          </div>
        )}

        {/* File Upload Tab */}
        <TabsContent value="file" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Schema File</CardTitle>
              <CardDescription>
                Upload a .sql or .txt file containing your database schema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <Database className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  {selectedFile ? selectedFile.name : "Drop your schema file here"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to browse (.sql, .txt files)
                </p>
                <Input
                  type="file"
                  accept=".sql,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" asChild>
                    <span>Choose File</span>
                  </Button>
                </Label>
              </div>

              {selectedFile && (
                <div className="mt-4 flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleFileUpload}
                    disabled={uploadSchemaMutation.isPending}
                  >
                    {uploadSchemaMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Upload Schema"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Input Tab */}
        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Schema Input</CardTitle>
              <CardDescription>
                Paste your database schema directly (CREATE TABLE statements)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="CREATE TABLE users (&#10;  id SERIAL PRIMARY KEY,&#10;  name VARCHAR(255) NOT NULL,&#10;  email VARCHAR(255) UNIQUE NOT NULL,&#10;  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP&#10;);&#10;&#10;CREATE TABLE orders (&#10;  id SERIAL PRIMARY KEY,&#10;  user_id INTEGER REFERENCES users(id),&#10;  total DECIMAL(10, 2) NOT NULL,&#10;  status VARCHAR(50) DEFAULT 'pending',&#10;  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP&#10;);"
                value={manualSchema}
                onChange={(e) => setManualSchema(e.target.value)}
                rows={15}
                className="font-mono text-sm"
              />
              <Button
                onClick={handleManualUpload}
                disabled={uploadSchemaMutation.isPending || !manualSchema.trim()}
                className="w-full"
              >
                {uploadSchemaMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Upload Schema"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Connection Tab */}
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connect to Database</CardTitle>
              <CardDescription>
                Connect directly to your database to auto-discover the schema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onDatabaseSubmit)} className="space-y-4">
                {/* Dialect */}
                <div className="space-y-2">
                  <Label>Database Type</Label>
                  <Select
                    value={dialect}
                    onValueChange={(value: string) =>
                      setValue("dialect", value as "POSTGRESQL" | "MYSQL" | "SQLITE")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POSTGRESQL">PostgreSQL</SelectItem>
                      <SelectItem value="MYSQL">MySQL</SelectItem>
                      <SelectItem value="SQLITE">SQLite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {dialect !== "SQLITE" && (
                  <>
                    {/* Host */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="host">Host</Label>
                        <Input
                          id="host"
                          placeholder="localhost"
                          {...register("host")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="port">Port</Label>
                        <Input
                          id="port"
                          placeholder={dialect === "POSTGRESQL" ? "5432" : "3306"}
                          {...register("port")}
                        />
                      </div>
                    </div>

                    {/* User & Password */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="user">User</Label>
                        <Input
                          id="user"
                          placeholder="postgres"
                          {...register("user")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          {...register("password")}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Database Name */}
                <div className="space-y-2">
                  <Label htmlFor="database">Database Name</Label>
                  <Input
                    id="database"
                    placeholder={dialect === "SQLITE" ? "/path/to/database.db" : "my_database"}
                    {...register("database")}
                  />
                </div>

                {/* Auto Discover Toggle */}
                <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
                  <input
                    type="checkbox"
                    id="autoDiscover"
                    checked={autoDiscover}
                    onChange={(e) => setValue("autoDiscover", e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div>
                    <Label htmlFor="autoDiscover" className="cursor-pointer font-medium">
                      Auto-discover schema
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically scan and extract database structure
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={connectDatabaseMutation.isPending || !selectedProjectId}
                  className="w-full"
                >
                  {connectDatabaseMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 mr-2" />
                      Connect & Import Schema
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Connection Info */}
      {connectionInfo && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Database Connection</CardTitle>
                <CardDescription>Saved connection details for this project</CardDescription>
              </div>
              <Badge className="bg-blue-100 text-blue-800">Connected</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-sm text-muted-foreground">
                <div className="font-medium">Host</div>
                <div>{connectionInfo.host}:{connectionInfo.port}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                <div className="font-medium">User</div>
                <div>{maskUser(connectionInfo.user)}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                <div className="font-medium">Database</div>
                <div>{connectionInfo.database}</div>
              </div>
            </div>
            {connectionInfo.lastSyncedAt && (
              <p className="text-xs text-muted-foreground mt-3">Last synced: {new Date(connectionInfo.lastSyncedAt).toLocaleString()}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schema Preview */}
      {schemaPreview && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Schema Preview</CardTitle>
                <CardDescription>
                  {schemaPreview.tables.length} table(s) detected
                </CardDescription>
              </div>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Stored in Weaviate
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {schemaPreview.tables.slice(0,5).map((table) => (
                <div key={table.name} className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    {table.name}
                  </h4>
                  <div className="space-y-1">
                    {table.columns.map((column) => (
                      <div
                        key={column.name}
                        className="flex items-center justify-between text-sm py-1 px-2 hover:bg-muted rounded"
                      >
                        <span className="font-mono">{column.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{column.type}</Badge>
                          {!column.nullable && (
                            <Badge variant="secondary" className="text-xs">
                              NOT NULL
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {schemaPreview.tables.length > 5 && (
                <div className="pt-2">
                  <Dialog open={showAllTables} onOpenChange={setShowAllTables}>
                    <div className="flex justify-end">
                      <DialogTrigger asChild>
                        <Button variant="outline">View all ({schemaPreview.tables.length})</Button>
                      </DialogTrigger>
                    </div>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>All Tables</DialogTitle>
                        <DialogDescription>Full list of imported tables</DialogDescription>
                      </DialogHeader>
                      <div className="mt-4 space-y-3 max-h-72 overflow-auto">
                        {schemaPreview.tables.map((t) => (
                          <div key={t.name} className="border rounded p-3">
                            <div className="font-medium">{t.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">{t.columns.length} columns</div>
                          </div>
                        ))}
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button>Close</Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Why Schema Management?
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• <strong>AI SQL Generation:</strong> AI understands your database structure to generate accurate queries</li>
                <li>• <strong>Smart Chatbot:</strong> Ask questions about your data in natural language</li>
                <li>• <strong>Context-Aware:</strong> Schema is stored in Weaviate vector database for semantic search</li>
                <li>• <strong>Multi-Database:</strong> Supports PostgreSQL, MySQL, and SQLite dialects</li>
                <li>• <strong>Project-Specific:</strong> Each project can have its own database schema</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
