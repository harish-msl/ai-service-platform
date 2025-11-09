"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Key, Plus, Copy, Trash2, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import CreateApiKeyModal from "@/components/api-keys/CreateApiKeyModal";
import RevokeKeyDialog from "@/components/api-keys/RevokeKeyDialog";
import api from "@/lib/api";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  projectId: string;
  project: {
    id: string;
    name: string;
    environment: string;
  };
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type FilterType = "all" | "active" | "expired";

export default function ApiKeysPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch API keys
  const {
    data: apiKeys,
    isLoading,
    error,
    refetch,
  } = useQuery<ApiKey[]>({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const response = await api.get("/api-keys");
      return response.data;
    },
  });

  // Filter keys based on status
  const filteredKeys = apiKeys?.filter((key) => {
    if (filter === "active") {
      return key.isActive && (!key.expiresAt || new Date(key.expiresAt) > new Date());
    }
    if (filter === "expired") {
      return !key.isActive || (key.expiresAt && new Date(key.expiresAt) <= new Date());
    }
    return true; // all
  });

  // Copy key to clipboard
  const handleCopyKey = async (keyValue: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(keyValue);
      setCopiedKey(keyId);
      toast.success("API key copied to clipboard");
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error("Failed to copy API key");
    }
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Check if key is expired
  const isExpired = (key: ApiKey) => {
    if (!key.expiresAt) return false;
    return new Date(key.expiresAt) <= new Date();
  };

  // Handle revoke success
  const handleRevokeSuccess = () => {
    setKeyToRevoke(null);
    refetch();
    toast.success("API key revoked successfully");
  };

  // Mask API key
  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return `${key.substring(0, 8)}${"•".repeat(24)}${key.substring(key.length - 4)}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-10 w-80" />
          
          {/* API Keys List Skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                    <div className="flex gap-4">
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Failed to load API keys</p>
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
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage your API keys and access tokens
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Generate API Key
        </Button>
      </div>

      {/* Tabs for filtering */}
      <Tabs value={filter} onValueChange={(value: string) => setFilter(value as FilterType)}>
        <TabsList>
          <TabsTrigger value="all">
            All Keys ({apiKeys?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({apiKeys?.filter(k => k.isActive && (!k.expiresAt || new Date(k.expiresAt) > new Date())).length || 0})
          </TabsTrigger>
          <TabsTrigger value="expired">
            Expired ({apiKeys?.filter(k => !k.isActive || (k.expiresAt && new Date(k.expiresAt) <= new Date())).length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {filteredKeys && filteredKeys.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Key className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {filter === "all" ? "No API keys yet" : `No ${filter} API keys`}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                  {filter === "all"
                    ? "Generate your first API key to start using the platform's AI features."
                    : `You don't have any ${filter} API keys at the moment.`}
                </p>
                {filter === "all" && (
                  <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Your First API Key
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredKeys?.map((apiKey) => (
                <Card key={apiKey.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left side - Key info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold truncate">{apiKey.name}</h3>
                          {isExpired(apiKey) || !apiKey.isActive ? (
                            <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              <XCircle className="w-3 h-3 mr-1" />
                              {!apiKey.isActive ? "Revoked" : "Expired"}
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </div>

                        {/* API Key */}
                        <div className="flex items-center gap-2 mb-4 bg-muted rounded-md p-3">
                          <code className="flex-1 text-sm font-mono truncate">
                            {maskKey(apiKey.key)}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyKey(apiKey.key, apiKey.id)}
                            className="flex-shrink-0"
                          >
                            {copiedKey === apiKey.id ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>

                        {/* Metadata grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground mb-1">Project</p>
                            <p className="font-medium truncate">{apiKey.project.name}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Scopes</p>
                            <div className="flex flex-wrap gap-1">
                              {apiKey.scopes.slice(0, 2).map((scope) => (
                                <Badge key={scope} variant="outline" className="text-xs">
                                  {scope}
                                </Badge>
                              ))}
                              {apiKey.scopes.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{apiKey.scopes.length - 2}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Rate Limit</p>
                            <p className="font-medium">{apiKey.rateLimit.toLocaleString()}/hr</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Last Used</p>
                            <p className="font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(apiKey.lastUsedAt)}
                            </p>
                          </div>
                        </div>

                        {/* Expiry info */}
                        {apiKey.expiresAt && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-muted-foreground">
                              {isExpired(apiKey) ? "Expired on" : "Expires on"}{" "}
                              <span className="font-medium">{formatDate(apiKey.expiresAt)}</span>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right side - Actions */}
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setKeyToRevoke(apiKey)}
                          disabled={!apiKey.isActive}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Revoke
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create API Key Modal */}
      <CreateApiKeyModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          refetch();
        }}
      />

      {/* Revoke Key Dialog */}
      {keyToRevoke && (
        <RevokeKeyDialog
          apiKey={keyToRevoke}
          open={!!keyToRevoke}
          onOpenChange={(open: boolean) => !open && setKeyToRevoke(null)}
          onSuccess={handleRevokeSuccess}
        />
      )}
    </div>
  );
}
