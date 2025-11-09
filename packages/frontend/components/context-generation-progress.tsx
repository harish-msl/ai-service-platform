"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Search,
  Brain,
  Sparkles,
  CheckCircle2,
  Loader2,
  FileSearch,
  Zap,
  Network,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  duration: number; // milliseconds
  color: string;
}

const GENERATION_STEPS: Step[] = [
  {
    id: "scanning",
    title: "Scanning Database Schema",
    description: "Analyzing tables, columns, and relationships...",
    icon: <Database className="w-5 h-5" />,
    duration: 3000,
    color: "text-blue-500",
  },
  {
    id: "indexing",
    title: "Indexing in Vector Database",
    description: "Creating semantic embeddings in Weaviate...",
    icon: <FileSearch className="w-5 h-5" />,
    duration: 4000,
    color: "text-purple-500",
  },
  {
    id: "analyzing",
    title: "AI Analysis in Progress",
    description: "Understanding business logic and patterns...",
    icon: <Brain className="w-5 h-5" />,
    duration: 8000,
    color: "text-pink-500",
  },
  {
    id: "generating",
    title: "Generating Context & Suggestions",
    description: "Creating intelligent prompts and summaries...",
    icon: <Sparkles className="w-5 h-5" />,
    duration: 5000,
    color: "text-yellow-500",
  },
  {
    id: "optimizing",
    title: "Optimizing for Performance",
    description: "Finalizing context structure...",
    icon: <Zap className="w-5 h-5" />,
    duration: 2000,
    color: "text-green-500",
  },
];

// Floating particles component
const FloatingParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-primary/30 rounded-full"
          initial={{
            x: Math.random() * 100 + "%",
            y: Math.random() * 100 + "%",
          }}
          animate={{
            x: [
              Math.random() * 100 + "%",
              Math.random() * 100 + "%",
              Math.random() * 100 + "%",
            ],
            y: [
              Math.random() * 100 + "%",
              Math.random() * 100 + "%",
              Math.random() * 100 + "%",
            ],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
};

interface ContextGenerationProgressProps {
  isOpen: boolean;
  realProgress?: {
    step: string;
    progress: number;
    message: string;
  } | null;
  totalSteps?: number;
}

export function ContextGenerationProgress({
  isOpen,
  realProgress = null,
  totalSteps = GENERATION_STEPS.length,
}: ContextGenerationProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [funFact, setFunFact] = useState(0);

  const funFacts = [
    "💡 Our AI analyzes relationships between tables to understand your data model!",
    "🚀 Vector databases enable semantic search across your schema documentation!",
    "🎯 AI-generated prompts are tailored specifically to your database structure!",
    "⚡ The context helps AI generate 95% more accurate SQL queries!",
    "🧠 Machine learning identifies common query patterns in your schema!",
  ];

  // Use real progress if available, otherwise use dummy animation
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setProgress(0);
      setCompletedSteps(new Set());
      return;
    }

    // If we have real progress data, use it
    if (realProgress) {
      const stepIndex = GENERATION_STEPS.findIndex(s => s.id === realProgress.step);
      if (stepIndex >= 0) {
        setCurrentStep(stepIndex);
        setProgress(realProgress.progress);
        
        // Mark all previous steps as completed
        const completed = new Set<number>();
        for (let i = 0; i < stepIndex; i++) {
          completed.add(i);
        }
        setCompletedSteps(completed);
      }
      return;
    }

    // Fallback to dummy animation if no real progress
    const factTimer = setInterval(() => {
      setFunFact((prev) => (prev + 1) % funFacts.length);
    }, 4000);

    let stepTimer: NodeJS.Timeout;
    let progressTimer: NodeJS.Timeout;

    const runStep = (stepIndex: number) => {
      if (stepIndex >= GENERATION_STEPS.length) {
        setProgress(100);
        clearInterval(factTimer);
        return;
      }

      setCurrentStep(stepIndex);
      const step = GENERATION_STEPS[stepIndex];
      const stepProgress = (stepIndex / GENERATION_STEPS.length) * 100;

      // Animate progress for this step
      let elapsed = 0;
      const increment = 50; // Update every 50ms
      progressTimer = setInterval(() => {
        elapsed += increment;
        const stepPercentage = Math.min((elapsed / step.duration) * 100, 100);
        const totalProgress =
          stepProgress + (stepPercentage / GENERATION_STEPS.length) * 100;
        setProgress(Math.min(totalProgress, 100));

        if (elapsed >= step.duration) {
          clearInterval(progressTimer);
          setCompletedSteps((prev) => new Set(prev).add(stepIndex));

          // Move to next step
          stepTimer = setTimeout(() => {
            runStep(stepIndex + 1);
          }, 300);
        }
      }, increment);
    };

    runStep(0);

    return () => {
      clearTimeout(stepTimer);
      clearInterval(progressTimer);
      clearInterval(factTimer);
    };
  }, [isOpen, realProgress]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/10 backdrop-blur-sm p-1 overflow-auto"
      >
        <FloatingParticles />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="w-full max-w-3xl my-auto"
        >
          <Card className="w-full shadow-2xl border-2 relative overflow-hidden">
            {/* Gradient background animation */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 animate-gradient-shift" />
            
            <CardContent className="p-4 sm:p-6 md:p-8 relative z-10">
              {/* Header */}
              <div className="text-center mb-6 md:mb-8">
                <motion.div
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="inline-block mb-3 md:mb-4"
                >
                  <div className="relative">
                    <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-purple-500" />
                    <motion.div
                      className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                </motion.div>
                <motion.h2
                  className="text-xl sm:text-2xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
                  animate={{ opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Generating AI Context
                </motion.h2>
                <p className="text-sm sm:text-base text-muted-foreground px-4">
                  Analyzing your database with artificial intelligence...
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mb-6 md:mb-8">
                <div className="relative">
                  <Progress value={progress} className="h-2 md:h-3" />
                  <motion.div
                    className="absolute top-0 left-0 h-2 md:h-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full opacity-50"
                    style={{ width: `${progress}%` }}
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Step {currentStep + 1} of {GENERATION_STEPS.length}
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-primary">
                    {Math.round(progress)}%
                  </p>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                {GENERATION_STEPS.map((step, index) => {
                  const isActive = currentStep === index;
                  const isCompleted = completedSteps.has(index);
                  const isPending = index > currentStep;

                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{
                        opacity: isPending ? 0.4 : 1,
                        x: 0,
                        scale: isActive ? 1.02 : 1,
                      }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-lg border transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary shadow-lg shadow-primary/20"
                          : isCompleted
                          ? "bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800"
                          : "bg-muted/30 border-transparent"
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`flex-shrink-0 ${
                          isCompleted ? "text-green-500" : step.color
                        }`}
                      >
                        {isCompleted ? (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring" }}
                          >
                            <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
                          </motion.div>
                        ) : isActive ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          >
                            <Loader2 className="w-5 h-5 md:w-6 md:h-6" />
                          </motion.div>
                        ) : (
                          <div className="opacity-50 [&>svg]:w-5 [&>svg]:h-5 md:[&>svg]:w-6 md:[&>svg]:h-6">
                            {step.icon}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`text-sm md:text-base font-semibold mb-0.5 md:mb-1 ${
                            isActive ? "text-primary" : ""
                          }`}
                        >
                          {step.title}
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {isActive && realProgress?.message ? realProgress.message : step.description}
                        </p>

                        {/* Active step animation */}
                        {isActive && (
                          <motion.div
                            className="mt-2 h-0.5 md:h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{
                              duration: step.duration / 1000,
                              ease: "linear",
                            }}
                          />
                        )}
                      </div>

                      {/* Status indicator */}
                      <div className="flex-shrink-0">
                        {isCompleted && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-2 h-2 md:w-3 md:h-3 bg-green-500 rounded-full shadow-lg shadow-green-500/50"
                          />
                        )}
                        {isActive && (
                          <motion.div
                            animate={{
                              scale: [1, 1.8, 1],
                              opacity: [1, 0.5, 1],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                            }}
                            className="w-2 h-2 md:w-3 md:h-3 bg-primary rounded-full shadow-lg shadow-primary/50"
                          />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Fun facts carousel */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={funFact}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                  className="p-3 md:p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  <p className="text-xs sm:text-sm text-center text-blue-900 dark:text-blue-100 font-medium">
                    {funFacts[funFact]}
                  </p>
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
