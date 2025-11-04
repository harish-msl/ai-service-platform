import Link from "next/link";
import { ArrowRight, Database, MessageSquare, TrendingUp, Zap, Sparkles, Shield, Rocket } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full ai-badge mb-6 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Enterprise AI Platform
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6">
            AI-as-a-Service Platform
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Self-hosted AI platform for database operations, natural language SQL generation,
            and intelligent analytics. 93% cost reduction with enterprise-grade security.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/login"
              className="ai-button inline-flex items-center px-6 py-3 rounded-lg font-medium"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-all font-medium"
            >
              Documentation
            </Link>
          </div>
        </div>

        {/* Bento Grid - 2025 Layout */}
        <div className="bento-grid grid-cols-1 md:grid-cols-12 mb-16">
          {/* Large Feature - SQL Generation */}
          <div className="bento-card md:col-span-7 md:row-span-2 p-8 elevation-1">
            <div className="flex items-start justify-between mb-6">
              <div className="p-3 rounded-lg bg-primary/10">
                <Database className="h-8 w-8 text-primary" />
              </div>
              <span className="ai-badge px-3 py-1 text-xs font-medium rounded-full">AI-Powered</span>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">
              Natural Language to SQL
            </h3>
            <p className="text-muted-foreground mb-6">
              Transform your questions into precise SQL queries. Our AI understands your database schema
              and generates optimized queries with intelligent indexing suggestions.
            </p>
            <div className="glass p-4 rounded-lg">
              <code className="text-sm text-foreground">
                "Show me top 10 customers by revenue this month"
                <br />
                <span className="text-primary">→ SELECT customer_name, SUM(revenue) ...</span>
              </code>
            </div>
          </div>

          {/* Medium Feature - Chatbot */}
          <div className="bento-card md:col-span-5 p-6 elevation-1">
            <div className="p-3 rounded-lg bg-accent mb-4 w-fit">
              <MessageSquare className="h-6 w-6 text-accent-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              AI Chatbot
            </h3>
            <p className="text-muted-foreground text-sm">
              Context-aware conversations with project knowledge and conversation history using RAG.
            </p>
          </div>

          {/* Stats Card */}
          <div className="bento-card md:col-span-5 p-6 elevation-1">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">93%</div>
                <div className="text-xs text-muted-foreground">Cost Savings</div>
              </div>
              <div className="text-center border-x border-border">
                <div className="text-3xl font-bold text-primary mb-1">100+</div>
                <div className="text-xs text-muted-foreground">Projects</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">500+</div>
                <div className="text-xs text-muted-foreground">Users</div>
              </div>
            </div>
          </div>

          {/* Analytics Feature */}
          <div className="bento-card md:col-span-4 p-6 elevation-1 interactive">
            <div className="p-3 rounded-lg bg-accent mb-4 w-fit">
              <TrendingUp className="h-6 w-6 text-accent-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              Predictive Analytics
            </h3>
            <p className="text-muted-foreground text-sm">
              Trend analysis, forecasting, and anomaly detection powered by ML models.
            </p>
          </div>

          {/* RAG Feature */}
          <div className="bento-card md:col-span-4 p-6 elevation-1 interactive">
            <div className="p-3 rounded-lg bg-accent mb-4 w-fit">
              <Zap className="h-6 w-6 text-accent-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              RAG-Enhanced
            </h3>
            <p className="text-muted-foreground text-sm">
              Retrieval Augmented Generation with Weaviate vector database for context.
            </p>
          </div>

          {/* Security Feature */}
          <div className="bento-card md:col-span-4 p-6 elevation-1 interactive">
            <div className="p-3 rounded-lg bg-accent mb-4 w-fit">
              <Shield className="h-6 w-6 text-accent-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              Enterprise Security
            </h3>
            <p className="text-muted-foreground text-sm">
              Self-hosted with JWT authentication, API key management, and rate limiting.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="glass p-8 md:p-12 rounded-2xl text-center elevation-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6 text-sm font-medium">
            <Rocket className="h-4 w-4" />
            Ready to Deploy
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Start Building with AI Today
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join 100+ internal projects using our platform. Break-even in 1-2 months with ₹2.7 Crore annual savings.
          </p>
          <Link
            href="/login"
            className="ai-button inline-flex items-center px-8 py-4 rounded-lg font-medium text-lg"
          >
            Get Started Now
            <ArrowRight className="ml-2 h-6 w-6" />
          </Link>
        </div>
      </div>
    </div>
  );
}
