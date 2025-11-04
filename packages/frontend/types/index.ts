// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER" | "VIEWER";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Project types
export interface Project {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  environment: "DEVELOPMENT" | "STAGING" | "PRODUCTION";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  schema?: ProjectSchema;
  _count?: {
    apiKeys: number;
    usage: number;
  };
}

// API Key types
export interface ApiKey {
  id: string;
  key: string;
  name: string;
  projectId: string;
  scopes: ApiKeyScope[];
  rateLimit: number;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ApiKeyScope =
  | "QUERY_GENERATION"
  | "CHATBOT"
  | "ANALYTICS"
  | "PREDICTIONS"
  | "ADMIN";

// Schema types
export interface ProjectSchema {
  id: string;
  projectId: string;
  schemaText: string;
  schemaSummary: string;
  tables: any;
  dialect: "POSTGRESQL" | "MYSQL" | "SQLITE";
  connectionString: string | null;
  isAutoDiscovery: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Usage types
export interface ApiUsage {
  id: string;
  projectId: string;
  endpoint: string;
  model: string | null;
  tokensUsed: number;
  responseTime: number;
  success: boolean;
  errorMessage: string | null;
  metadata: any;
  createdAt: string;
}

// Chat types
export interface ChatMessage {
  id: string;
  conversationId: string;
  projectId: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  metadata: any;
  createdAt: string;
}

export interface Conversation {
  conversationId: string;
  messageCount: number;
  lastMessageDate: string;
  preview: string;
}

// AI types
export interface QueryGenerationRequest {
  question: string;
  projectId: string;
  context?: string;
}

export interface QueryGenerationResponse {
  query: string;
  explanation: string;
  dialect: string;
  confidence: number;
  usedVectorContext?: boolean;
}

export interface ChatRequest {
  message: string;
  projectId: string;
  conversationId?: string;
}

export interface ChatResponse {
  conversationId: string;
  message: string;
  timestamp: string;
  usedVectorContext?: boolean;
}

export interface AnalyticsRequest {
  projectId: string;
  type: "prediction" | "trend" | "anomaly" | "summary";
  query: string;
  parameters?: Record<string, any>;
}

// Stats types
export interface ProjectStats {
  totalApiCalls: number;
  successRate: number;
  avgResponseTime: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
}

export interface UsageTimeline {
  date: string;
  calls: number;
  tokens: number;
  avgResponseTime: number;
}
