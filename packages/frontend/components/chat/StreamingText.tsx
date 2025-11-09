"use client";

import { useEffect, useState, useRef } from "react";

interface StreamingTextProps {
  text: string;
  isStreaming?: boolean;
  className?: string;
}

export function StreamingText({ text, isStreaming = false, className = "" }: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const previousTextRef = useRef("");
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isStreaming) {
      // If not streaming, show full text immediately
      setDisplayedText(text);
      previousTextRef.current = text;
      return;
    }

    // Calculate new tokens (difference between previous and current text)
    const previousLength = previousTextRef.current.length;
    const newTokens = text.slice(previousLength);
    
    if (newTokens.length === 0) {
      return;
    }

    // Animate new tokens appearing
    let currentIndex = 0;
    const totalNewTokens = newTokens.length;
    
    const animateTokens = () => {
      if (currentIndex < totalNewTokens) {
        setDisplayedText(previousTextRef.current + newTokens.slice(0, currentIndex + 1));
        currentIndex++;
        animationFrameRef.current = requestAnimationFrame(animateTokens);
      } else {
        previousTextRef.current = text;
      }
    };

    animateTokens();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [text, isStreaming]);

  return (
    <span className={className}>
      {displayedText}
      {isStreaming && (
        <span className="inline-block w-1 h-4 ml-0.5 bg-primary animate-pulse" />
      )}
    </span>
  );
}
