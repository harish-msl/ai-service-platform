"use client";

import { Sparkles, Brain, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIThinkingProps {
  variant?: "default" | "analyzing" | "generating";
}

export function AIThinking({ variant = "default" }: AIThinkingProps) {
  const messages = {
    default: "AI is thinking...",
    analyzing: "Analyzing your request...",
    generating: "Generating response...",
  };

  const icons = {
    default: Brain,
    analyzing: Zap,
    generating: Sparkles,
  };

  const Icon = icons[variant];
  const message = messages[variant];

  return (
    <div className="flex gap-4 justify-start animate-fadeIn">
      <div className="ai-avatar w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
        <Icon className="w-4 h-4 text-white animate-pulse" />
      </div>
      
      <div className="assistant-bubble bg-muted border border-border rounded-2xl px-5 py-4 max-w-[75%]">
        <div className="flex items-center gap-3">
          {/* Animated thinking dots */}
          <div className="flex gap-1">
            <div 
              className="w-2 h-2 rounded-full bg-primary animate-typing-dots"
              style={{ animationDelay: "0s" }}
            />
            <div 
              className="w-2 h-2 rounded-full bg-primary animate-typing-dots"
              style={{ animationDelay: "0.2s" }}
            />
            <div 
              className="w-2 h-2 rounded-full bg-primary animate-typing-dots"
              style={{ animationDelay: "0.4s" }}
            />
          </div>
          
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{message}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Processing your query with AI
            </p>
          </div>
        </div>
        
        {/* Progress bar shimmer effect */}
        <div className="mt-3 w-full h-1 bg-muted-foreground/10 rounded-full overflow-hidden">
          <div 
            className="h-full w-full animate-shimmer"
            style={{
              background: "linear-gradient(90deg, transparent 0%, hsl(217, 91%, 60%) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
            }}
          />
        </div>
      </div>
    </div>
  );
}
