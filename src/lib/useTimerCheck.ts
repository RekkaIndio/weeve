import { useEffect, useCallback } from 'react';
import { skipTurn } from './stories';
import { toast } from 'sonner';

/**
 * Client-side timer expiration check hook
 * Checks if the current user's turn has expired and automatically skips if needed
 * This provides immediate feedback without waiting for the edge function
 */
export function useTimerCheck(
  storyId: string | undefined,
  currentTurnUserId: string | undefined,
  currentUserId: string | undefined,
  turnTimerHours: number | undefined,
  lastContributionTimestamp: number | undefined,
  storyUpdatedAt: string | undefined,
  isMyTurn: boolean
) {
  const checkAndHandleExpiration = useCallback(async () => {
    // Only check if it's the current user's turn and there's a timer
    if (!storyId || !isMyTurn || !turnTimerHours || !currentTurnUserId || !currentUserId) {
      return;
    }

    if (currentTurnUserId !== currentUserId) {
      return;
    }

    // Calculate expiration
    const turnStartTime = lastContributionTimestamp || (storyUpdatedAt ? new Date(storyUpdatedAt).getTime() : Date.now());
    const timerDurationMs = turnTimerHours * 60 * 60 * 1000;
    const expiryTime = turnStartTime + timerDurationMs;
    const now = Date.now();

    // Check if expired
    if (now >= expiryTime) {
      console.log('[Timer Check] Turn has expired, automatically skipping...');
      
      try {
        const result = await skipTurn(storyId, currentUserId, 'timer_expired');
        
        if (result.success) {
          toast.info('Your turn has expired and was passed to the next person', {
            duration: 5000,
          });
        } else {
          console.error('[Timer Check] Failed to skip turn:', result.error);
        }
      } catch (error) {
        console.error('[Timer Check] Error skipping turn:', error);
      }
    }
  }, [storyId, isMyTurn, turnTimerHours, currentTurnUserId, currentUserId, lastContributionTimestamp, storyUpdatedAt]);

  // Check on mount and when dependencies change
  useEffect(() => {
    checkAndHandleExpiration();
  }, [checkAndHandleExpiration]);

  // Also check periodically (every 30 seconds) while on the page
  useEffect(() => {
    if (!isMyTurn || !turnTimerHours) {
      return;
    }

    const interval = setInterval(() => {
      checkAndHandleExpiration();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isMyTurn, turnTimerHours, checkAndHandleExpiration]);

  return { checkExpiration: checkAndHandleExpiration };
}
