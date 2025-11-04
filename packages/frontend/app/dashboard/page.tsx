"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Layers, 
  Key, 
  Activity, 
  Zap, 
  Plus,
  Sparkles,
  TrendingUp,
  Database
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Welcome back, <span className="text-primary">Admin User!</span>
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your AI projects
        </p>
      </div>

      {/* Stats Cards - Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Layers className="w-5 h-5" />}
          title="Total Projects"
          value="0"
          subtitle="Active projects"
        />
        <StatCard
          icon={<Key className="w-5 h-5" />}
          title="API Keys"
          value="0"
          subtitle="Generated keys"
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          title="API Calls"
          value="0"
          subtitle="Total requests"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          title="Success Rate"
          value="0%"
          subtitle="Successful calls"
        />
      </div>

      {/* Quick Actions - Bento Style */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard
            icon={<Layers className="w-8 h-8" />}
            title="Create Project"
            description="Start a new AI project"
            onClick={() => console.log('Create project')}
          />
          <ActionCard
            icon={<Key className="w-8 h-8" />}
            title="Generate API Key"
            description="Create a new API key"
            onClick={() => console.log('Generate key')}
            variant="ai"
          />
          <ActionCard
            icon={<Sparkles className="w-8 h-8" />}
            title="Test AI Features"
            description="Try SQL generation or chat"
            onClick={() => console.log('Test features')}
            variant="ai"
          />
        </div>
      </div>

      {/* Getting Started */}
      <Card className="p-8">
        <h2 className="text-2xl font-semibold mb-6">Getting Started</h2>
        <div className="space-y-6">
          <StepItem
            number="1"
            title="Create a Project"
            description="Go to Projects and create your first AI project"
            icon={<Layers className="w-5 h-5" />}
          />
          <StepItem
            number="2"
            title="Upload Database Schema"
            description="Upload your schema for AI-powered SQL generation"
            icon={<Database className="w-5 h-5" />}
          />
          <StepItem
            number="3"
            title="Generate API Key"
            description="Create an API key to integrate with your applications"
            icon={<Key className="w-5 h-5" />}
          />
        </div>
      </Card>
    </div>
  );
}

// Stat Card Component with Enhanced Hover
function StatCard({ 
  icon, 
  title, 
  value, 
  subtitle 
}: { 
  icon: React.ReactNode; 
  title: string; 
  value: string; 
  subtitle: string;
}) {
  return (
    <Card className="p-6 space-y-3 cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          {icon}
        </div>
        <TrendingUp className="w-4 h-4 text-green-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <h3 className="text-3xl font-bold mt-1">{value}</h3>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </div>
    </Card>
  );
}

// Action Card Component with AI Glow Effect
function ActionCard({ 
  icon, 
  title, 
  description, 
  onClick,
  variant = "default"
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  onClick: () => void;
  variant?: "default" | "ai";
}) {
  return (
    <Card
      onClick={onClick}
      className={`p-6 cursor-pointer group transition-all ${
        variant === "ai" 
          ? "border-primary/50 hover:border-primary hover:shadow-lg" 
          : ""
      }`}
    >
      <div className={`p-3 w-fit rounded-lg mb-4 transition-colors ${
        variant === "ai" 
          ? "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground" 
          : "bg-secondary text-foreground group-hover:bg-primary group-hover:text-primary-foreground"
      }`}>
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
          {title}
          {variant === "ai" && (
            <Sparkles className="w-4 h-4 text-primary" />
          )}
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Card>
  );
}

// Step Item Component
function StepItem({ 
  number, 
  title, 
  description, 
  icon 
}: { 
  number: string; 
  title: string; 
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 items-start group cursor-pointer">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
        {number}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{title}</h3>
          <div className="text-muted-foreground">{icon}</div>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}