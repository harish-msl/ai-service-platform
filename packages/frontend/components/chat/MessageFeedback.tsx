import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

interface MessageFeedbackProps {
  messageId: string;
  projectId: string;
  onFeedbackSubmit?: (feedback: {
    messageId: string;
    rating: -1 | 0 | 1;
    stars?: number;
    helpful: boolean;
    comment?: string;
  }) => void;
  className?: string;
}

export const MessageFeedback: React.FC<MessageFeedbackProps> = ({
  messageId,
  projectId,
  onFeedbackSubmit,
  className,
}) => {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState<-1 | 0 | 1 | null>(null);
  const [stars, setStars] = useState<number>(0);
  const [showStars, setShowStars] = useState(false);
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleThumbsUp = async () => {
    if (isSubmitted) return;
    
    setRating(1);
    setShowStars(true);
    
    // Auto-submit positive feedback after short delay
    setTimeout(() => {
      submitFeedback(1, true);
    }, 500);
  };

  const handleThumbsDown = async () => {
    if (isSubmitted) return;
    
    setRating(-1);
    setShowComment(true);
  };

  const handleStarClick = (starValue: number) => {
    setStars(starValue);
  };

  const submitFeedback = async (
    ratingValue: -1 | 0 | 1,
    helpful: boolean,
    commentValue?: string,
    starsValue?: number
  ) => {
    if (isSubmitting || isSubmitted) return;

    setIsSubmitting(true);

    try {
      const feedback = {
        messageId,
        projectId,
        rating: ratingValue,
        stars: starsValue || stars || undefined,
        helpful,
        comment: commentValue || comment || undefined,
      };

      // Call API
      const response = await fetch('http://localhost:3001/api/v1/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(feedback),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `Failed to submit feedback: ${response.statusText}`);
      }

      setIsSubmitted(true);
      
      // Show success toast
      toast({
        title: "Feedback submitted",
        description: "Thank you for helping us improve!",
        duration: 3000,
      });
      
      // Callback for parent component
      if (onFeedbackSubmit) {
        onFeedbackSubmit(feedback);
      }

      // Hide comment/stars after submission
      setTimeout(() => {
        setShowComment(false);
        setShowStars(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Failed to submit feedback",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
        duration: 5000,
      });
      // Reset on error
      setIsSubmitting(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = () => {
    submitFeedback(rating || -1, false, comment);
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Thumbs Up/Down Buttons */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Was this helpful?</span>
        
        <HoverCard openDelay={200}>
          <HoverCardTrigger asChild>
            <Button
              onClick={handleThumbsUp}
              disabled={isSubmitted}
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 w-8 p-0 transition-all duration-200',
                'hover:bg-green-100 dark:hover:bg-green-900/30',
                rating === 1 && 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'
              )}
              aria-label="Thumbs up"
            >
              <ThumbsUp className={cn(
                'h-4 w-4 transition-transform',
                rating === 1 && 'scale-110'
              )} />
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-auto p-2 text-xs" side="top">
            This answer was helpful
          </HoverCardContent>
        </HoverCard>

        <HoverCard openDelay={200}>
          <HoverCardTrigger asChild>
            <Button
              onClick={handleThumbsDown}
              disabled={isSubmitted}
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 w-8 p-0 transition-all duration-200',
                'hover:bg-red-100 dark:hover:bg-red-900/30',
                rating === -1 && 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
              )}
              aria-label="Thumbs down"
            >
              <ThumbsDown className={cn(
                'h-4 w-4 transition-transform',
                rating === -1 && 'scale-110'
              )} />
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-auto p-2 text-xs" side="top">
            This answer was not helpful
          </HoverCardContent>
        </HoverCard>

        {isSubmitted && (
          <span className="text-xs text-green-600 dark:text-green-400 animate-in fade-in duration-300">
            Thanks for your feedback!
          </span>
        )}
      </div>

      {/* Star Rating (shows after thumbs up) */}
      {showStars && !isSubmitted && (
        <div className="flex items-center gap-2 animate-in slide-in-from-left duration-300">
          <span className="text-xs text-muted-foreground">Rate quality:</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((starValue) => (
              <Button
                key={starValue}
                onClick={() => handleStarClick(starValue)}
                variant="ghost"
                size="sm"
                className={cn(
                  'h-6 w-6 p-0 hover:scale-110 transition-transform',
                  stars >= starValue
                    ? 'text-yellow-500 hover:text-yellow-600'
                    : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'
                )}
                aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
                disabled={isSubmitting}
              >
                <Star
                  className="h-4 w-4"
                  fill={stars >= starValue ? 'currentColor' : 'none'}
                />
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Comment Field (shows after thumbs down) */}
      {showComment && !isSubmitted && (
        <div className="flex flex-col gap-2 animate-in slide-in-from-left duration-300">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What could be improved? (optional)"
            className="resize-none text-sm"
            rows={2}
            disabled={isSubmitting}
          />
          <div className="flex gap-2 justify-end">
            <Button
              onClick={() => setShowComment(false)}
              variant="outline"
              size="sm"
              disabled={isSubmitting}
            >
              Skip
            </Button>
            <Button
              onClick={handleCommentSubmit}
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-3 w-3" />
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
