"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Send,
  Sparkles,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  MessageSquare,
  Plus,
  Trash2,
  Code,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/providers/auth-provider";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface Project {
  id: string;
  name: string;
  environment: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface Conversation {
  id: string;
  projectId: string;
  preview: string;
  lastMessageAt: Date;
  messageCount: number;
}

export default function ChatPage() {
  const { accessToken } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [currentConversationId, setCurrentConversationId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch projects
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await api.get("/projects");
      return response.data;
    },
  });

  // Fetch conversations
  const { data: conversations, refetch: refetchConversations } = useQuery<Conversation[]>({
    queryKey: ["conversations", selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const response = await api.get(`/ai/chat/conversations?projectId=${selectedProjectId}`);
      return response.data;
    },
    enabled: !!selectedProjectId,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Handle streaming chat (ORIGINAL WORKING IMPLEMENTATION)
  const handleStreamingChat = async (message: string, conversationId: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!accessToken) {
        reject(new Error("No authentication token found"));
        toast.error("Please login again");
        return;
      }

      // Create placeholder message for streaming content
      const streamingMessageId = generateUUID();
      const placeholderMessage: Message = {
        id: streamingMessageId,
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, placeholderMessage]);

      // Build SSE URL with query parameters
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
      const params = new URLSearchParams({
        projectId: selectedProjectId,
        message: message,
      });
      
      if (conversationId) {
        params.append("conversationId", conversationId);
      }
      
      // Use fetch with ReadableStream for SSE with authentication
      const url = `${baseUrl}/ai/chat/stream?${params.toString()}`;
      
      fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "text/event-stream",
        },
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          if (!reader) {
            throw new Error("No response body");
          }

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              setIsLoading(false);
              refetchConversations();
              resolve();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const dataString = line.slice(6).trim();
                
                if (!dataString || dataString.startsWith(":")) {
                  continue;
                }
                
                try {
                  const data = JSON.parse(dataString);

                  if (data.type === "token") {
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === streamingMessageId
                          ? { ...msg, content: msg.content + data.content }
                          : msg
                      )
                    );
                  } else if (data.type === "complete") {
                    setIsLoading(false);
                    refetchConversations();
                  } else if (data.type === "conversationId") {
                    if (!currentConversationId) {
                      setCurrentConversationId(data.conversationId);
                    }
                  } else if (data.type === "error") {
                    console.error("SSE error from backend:", data.message);
                    toast.error(data.message || "An error occurred");
                    setIsLoading(false);
                    setMessages((prev) => prev.filter((msg) => msg.id !== streamingMessageId));
                    reject(new Error(data.message || "Stream error"));
                  }
                } catch (e) {
                  console.warn("Non-JSON SSE data received:", dataString, e);
                  if (dataString.toLowerCase().includes("error")) {
                    toast.error("Connection error occurred");
                    setIsLoading(false);
                    setMessages((prev) => prev.filter((msg) => msg.id !== streamingMessageId));
                    reject(new Error(dataString));
                  }
                }
              }
            }
          }
        })
        .catch((error) => {
          console.error("Streaming error:", error);
          setIsLoading(false);
          setMessages((prev) => prev.filter((msg) => msg.id !== streamingMessageId));
          
          const errorMessage = error.message || "Streaming failed";
          if (errorMessage.toLowerCase().includes("connection")) {
            toast.error("AI service connection failed. Check if backend is running.");
          } else {
            toast.error(`Streaming error: ${errorMessage}`);
          }
          reject(error);
        });
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || !selectedProjectId) {
      if (!selectedProjectId) {
        toast.error("Please select a project first");
      }
      return;
    }

    const messageToSend = input.trim();
    const conversationId = currentConversationId || "";

    // Add user message
    const userMessage: Message = {
      id: generateUUID(),
      role: "user",
      content: messageToSend,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      await handleStreamingChat(messageToSend, conversationId);
    } catch (error) {
      console.error("Chat error:", error);
    }
  };

  const handleCopy = async (content: string, messageId: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleNewConversation = () => {
    setCurrentConversationId("");
    setMessages([]);
    toast.success("New conversation started");
  };

  const handleDeleteConversation = async (convId: string) => {
    try {
      await api.delete(`/ai/chat/conversation/${convId}`);
      if (convId === currentConversationId) {
        handleNewConversation();
      }
      refetchConversations();
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error("Failed to delete conversation");
    }
  };

  const handleLoadConversation = async (convId: string) => {
    try {
      const response = await api.get(`/ai/chat/history/${convId}?projectId=${selectedProjectId}`);
      const history = response.data;
      
      setCurrentConversationId(convId);
      setMessages(history.map((msg: any) => ({
        id: msg.id,
        role: msg.role.toLowerCase(),
        content: msg.content,
      })));
      
      toast.success("Conversation loaded");
    } catch (error) {
      toast.error("Failed to load conversation");
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Conversations */}
        <Card className="lg:col-span-1 h-[calc(100vh-8rem)]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Chats
              </CardTitle>
              <Button size="icon" variant="ghost" onClick={handleNewConversation}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <CardDescription>Previous conversations</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="px-4 space-y-2 pb-4">
                {conversations && conversations.length > 0 ? (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        "group relative p-3 rounded-lg border cursor-pointer transition-all",
                        "hover:bg-accent hover:border-primary/50",
                        currentConversationId === conv.id && "bg-accent border-primary"
                      )}
                      onClick={() => handleLoadConversation(conv.id)}
                    >
                      <p className="text-sm font-medium line-clamp-2 mb-1">{conv.preview}</p>
                      <p className="text-xs text-muted-foreground">
                        {conv.messageCount} messages
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conv.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No conversations yet
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Chat Area */}
        <Card className="lg:col-span-3 h-[calc(100vh-8rem)] flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle>AI Chat Assistant</CardTitle>
                  <CardDescription>Ask questions about your data or get SQL query help</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          {/* Messages Area */}
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea ref={scrollAreaRef} className="flex-1 px-6">
              <div className="space-y-6 py-6">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <Sparkles className="w-16 h-16 text-primary/20 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Select a project and ask me anything about your database, SQL queries, or data analysis.
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-4",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                      
                      <div
                        className={cn(
                          "group relative max-w-[85%] rounded-2xl px-4 py-3",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted border border-border"
                        )}
                      >
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {message.role === "assistant" ? (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                code({ node, inline, className, children, ...props }: any) {
                                  const match = /language-(\w+)/.exec(className || "");
                                  const codeString = String(children).replace(/\n$/, "");
                                  
                                  return !inline && match ? (
                                    <div className="relative my-4" key={`code-${message.id}-${codeString.substring(0, 20)}`}>
                                      <div className="absolute right-2 top-2 z-10">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 px-2"
                                          onClick={() => handleCopy(codeString, message.id)}
                                        >
                                          {copiedMessageId === message.id ? (
                                            <Check className="w-3 h-3" />
                                          ) : (
                                            <Code className="w-3 h-3" />
                                          )}
                                        </Button>
                                      </div>
                                      <SyntaxHighlighter
                                        style={oneDark}
                                        language={match[1]}
                                        PreTag="div"
                                        {...props}
                                      >
                                        {codeString}
                                      </SyntaxHighlighter>
                                    </div>
                                  ) : (
                                    <code className={cn("rounded px-1 py-0.5 text-sm font-mono", className)} {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          )}
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          className={cn(
                            "absolute -right-8 top-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity",
                            message.role === "user" ? "text-primary-foreground" : ""
                          )}
                          onClick={() => handleCopy(message.content, message.id)}
                        >
                          {copiedMessageId === message.id ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>

                      {message.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold">You</span>
                        </div>
                      )}
                    </div>
                  ))
                )}

                {isLoading && (
                  <div className="flex gap-4 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="bg-muted border border-border rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t p-4 bg-background">
              {!selectedProjectId ? (
                <div className="flex items-center justify-center p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">
                    Please select a project to start chatting
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e as any);
                        }
                      }}
                      placeholder="Ask me anything about your data..."
                      className="w-full min-h-[60px] max-h-[200px] resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground mt-1 px-1">
                      Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">Shift + Enter</kbd> for new line
                    </p>
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isLoading || !input.trim()}
                    className="self-start h-[60px] px-6"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
