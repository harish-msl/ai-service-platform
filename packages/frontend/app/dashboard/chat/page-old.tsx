"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Send,
  MessageSquare,
  Copy,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/providers/auth-provider";

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
  timestamp: Date;
  conversationId: string;
}

interface Conversation {
  id: string;
  projectId: string;
  preview: string;
  lastMessageAt: Date;
  messageCount: number;
}

export default function ChatPage() {
  const { accessToken } = useAuth(); // Get auth token from context
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [currentConversationId, setCurrentConversationId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true); // Enable streaming by default for faster perceived performance
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch projects
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await api.get("/projects");
      return response.data;
    },
  });

  // Fetch conversations for selected project
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedProjectId) {
      if (!selectedProjectId) {
        toast.error("Please select a project first");
      }
      return;
    }

    // Generate conversation ID if new conversation (proper UUID)
    const conversationId = currentConversationId || generateUUID();
    if (!currentConversationId) {
      setCurrentConversationId(conversationId);
    }

    // Add user message to UI
    const userMessage: Message = {
      id: generateUUID(),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
      conversationId,
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = inputMessage;
    setInputMessage("");
    setIsTyping(true);

    try {
      if (useStreaming) {
        // SSE Streaming mode
        await handleStreamingChat(messageToSend, conversationId);
      } else {
        // REST API mode
        await handleRestChat(messageToSend, conversationId);
      }
    } catch (error: any) {
      // Error already handled in specific handlers, just log it
      console.error("Chat error:", error);
    }

    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // REST API chat handler
  const handleRestChat = async (message: string, conversationId: string) => {
    try {
      const response = await api.post("/ai/chat", {
        projectId: selectedProjectId,
        message: message,
        conversationId,
      }, {
        timeout: 300000, // 5 minutes timeout for LLM response (Ollama can be slow on first run)
      });

      // Add AI response to UI
      const aiMessage: Message = {
        id: generateUUID(),
        role: "assistant",
        content: response.data.response,
        timestamp: new Date(),
        conversationId: response.data.conversationId,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
      refetchConversations();
    } catch (error: any) {
      setIsTyping(false);
      
      // Handle specific error types
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error("Request timed out. The AI service might be unavailable or overloaded.");
      } else if (error.response?.status === 500) {
        toast.error("AI service error. Please check if vLLM server is running.");
      } else {
        toast.error(error.response?.data?.message || "Failed to get response from AI");
      }
      
      throw error;
    }
  };

  // SSE Streaming chat handler
  const handleStreamingChat = async (message: string, conversationId: string) => {
    return new Promise<void>((resolve, reject) => {
      // Get auth token from context
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
        timestamp: new Date(),
        conversationId,
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
              setIsTyping(false);
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
                
                // Skip empty data or comments
                if (!dataString || dataString.startsWith(":")) {
                  continue;
                }
                
                try {
                  const data = JSON.parse(dataString);

                  if (data.type === "token") {
                    // Append token to message
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === streamingMessageId
                          ? { ...msg, content: msg.content + data.content }
                          : msg
                      )
                    );
                  } else if (data.type === "complete") {
                    setIsTyping(false);
                    refetchConversations();
                  } else if (data.type === "conversationId") {
                    // Update conversation ID if needed
                    if (!currentConversationId) {
                      setCurrentConversationId(data.conversationId);
                    }
                  } else if (data.type === "error") {
                    // Handle error event from backend
                    console.error("SSE error from backend:", data.message);
                    toast.error(data.message || "An error occurred");
                    setIsTyping(false);
                    // Remove placeholder message on error
                    setMessages((prev) => prev.filter((msg) => msg.id !== streamingMessageId));
                    reject(new Error(data.message || "Stream error"));
                  }
                } catch (e) {
                  // JSON parse error - likely plain text error message
                  console.warn("Non-JSON SSE data received:", dataString, e);
                  // If it looks like an error message, treat it as such
                  if (dataString.toLowerCase().includes("error")) {
                    toast.error("Connection error occurred");
                    setIsTyping(false);
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
          setIsTyping(false);
          
          // Remove the placeholder message on error
          setMessages((prev) => prev.filter((msg) => msg.id !== streamingMessageId));
          
          // Show helpful error message
          const errorMessage = error.message || "Streaming failed";
          if (errorMessage.toLowerCase().includes("connection")) {
            toast.error("AI service connection failed. Try disabling streaming mode or check if backend is running.");
          } else {
            toast.error(`Streaming error: ${errorMessage}`);
          }
          
          reject(error);
        });
    });
  };

  // Handle textarea auto-resize
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle copy message
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Message copied to clipboard");
  };

  // Handle regenerate response
  const handleRegenerateResponse = async (messageIndex: number) => {
    if (messageIndex === 0) return;

    // Get the previous user message
    const userMessage = messages[messageIndex - 1];
    if (userMessage.role !== "user") return;

    // Remove the assistant message and regenerate
    setMessages((prev) => prev.filter((_, idx) => idx !== messageIndex));
    setIsTyping(true);

    try {
      const response = await api.post("/ai/chat", {
        projectId: selectedProjectId,
        message: userMessage.content,
        conversationId: currentConversationId,
      });

      const aiMessage: Message = {
        id: generateUUID(),
        role: "assistant",
        content: response.data.response,
        timestamp: new Date(),
        conversationId: response.data.conversationId,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    } catch (error: any) {
      setIsTyping(false);
      toast.error(error.response?.data?.message || "Failed to regenerate response");
    }
  };

  // Handle new conversation
  const handleNewConversation = () => {
    setCurrentConversationId("");
    setMessages([]);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Handle load conversation
  const handleLoadConversation = async (conversationId: string) => {
    try {
      const response = await api.get(`/ai/chat/history/${conversationId}?projectId=${selectedProjectId}`);
      setMessages(response.data);
      setCurrentConversationId(conversationId);
    } catch {
      toast.error("Failed to load conversation");
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-4">
      {/* Conversations Sidebar */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <CardTitle className="text-lg">Conversations</CardTitle>
            </div>
          </div>
          <CardDescription>
            {selectedProjectId ? "Ready to chat" : "Select a project to start"}
          </CardDescription>
        </CardHeader>

        <div className="p-4">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {(Array.isArray(projects) ? projects : []).map((project) => (
                <SelectItem key={project?.id || Math.random().toString()} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="px-4 pb-4">
          <Button onClick={handleNewConversation} className="w-full" variant="outline">
            <MessageSquare className="w-4 h-4 mr-2" />
            New Conversation
          </Button>
        </div>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2 pb-4">
            {conversations && conversations.length > 0 ? (
              (Array.isArray(conversations) ? conversations : []).map((conversation) => (
                <button
                  key={conversation?.id || Math.random().toString()}
                  onClick={() => handleLoadConversation(conversation.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    currentConversationId === conversation.id
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-accent"
                  }`}
                >
                  <p className="text-sm font-medium line-clamp-2 mb-1">
                    {conversation.preview}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{conversation.messageCount} messages</span>
                    <span>
                      {new Date(conversation.lastMessageAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Chat Assistant</CardTitle>
              <CardDescription>
                Ask questions about your data or get SQL query help
              </CardDescription>
            </div>
            {selectedProjectId && (
              <Badge variant="secondary">
                {projects?.find((p) => p.id === selectedProjectId)?.name}
              </Badge>
            )}
          </div>
        </CardHeader>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-6">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
                <p className="text-muted-foreground max-w-sm">
                  Ask me anything about your database, request SQL queries, or get help with
                  data analysis.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {(Array.isArray(messages) ? messages : []).map((message, index) => (
                <div
                  key={message?.id || `msg-${index}`}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs font-medium opacity-70">
                        {message.role === "user" ? "You" : "AI Assistant"}
                      </span>
                      <span className="text-xs opacity-50">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    {message.role === "assistant" && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyMessage(message.content)}
                          className="h-7 px-2"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRegenerateResponse(index)}
                          className="h-7 px-2"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Regenerate
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-4 bg-muted">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        AI is typing...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <CardContent className="border-t p-4">
          {!selectedProjectId ? (
            <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Please select a project to start chatting
              </p>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  placeholder="Type your message... (Shift+Enter for new line, Enter to send)"
                  value={inputMessage}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  className="min-h-[60px] max-h-[200px] resize-none"
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                size="lg"
                className="ai-button"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>Press Shift+Enter for new line, Enter to send</span>
              <div className="flex items-center gap-2 border-l pl-3">
                <Checkbox
                  id="streaming"
                  checked={useStreaming}
                  onCheckedChange={(checked) => setUseStreaming(checked as boolean)}
                />
                <Label htmlFor="streaming" className="flex items-center gap-1 cursor-pointer text-xs font-normal">
                  <Zap className="w-3 h-3" />
                  Stream responses
                </Label>
              </div>
            </div>
            {selectedProjectId && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span>Ready</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
