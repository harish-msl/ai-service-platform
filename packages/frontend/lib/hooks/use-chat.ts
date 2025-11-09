"use client";

import { useChat as useAIChat, UseChatOptions } from "@ai-sdk/react";
import { useAuth } from "@/lib/providers/auth-provider";

/**
 * Custom useChat hook that automatically adds authentication headers
 * Wraps Vercel AI SDK's useChat with auth context
 */
export function useChat(options?: UseChatOptions) {
  const { accessToken } = useAuth();

  return useAIChat({
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
