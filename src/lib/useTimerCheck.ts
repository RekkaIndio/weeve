import { useEffect, useCallback } from 'react';
import { skipTurn } from './stories';
import { notifyTimerWarning } from './notifications';


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
      // Clear warning flag if it's no longer my turn
      if (!isMyTurn && storyId && currentUserId) {
         // We can't easily clear specific keys without knowing the previous start time, 
         // but we can rely on unique keys including timestamps/IDs.
      }
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
    const timeRemaining = expiryTime - now;

    // Check for warning
    const ONE_HOUR = 60 * 60 * 1000;
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    const FOUR_HOURS = 4 * 60 * 60 * 1000;
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    let warningThresholds: number[] = [];

    // Define thresholds based on total duration
    if (turnTimerHours >= 24) {
        // Long timer: Warn at 24h, 4h, 1h
        warningThresholds = [TWENTY_FOUR_HOURS, FOUR_HOURS, ONE_HOUR];
    } else {
        // Short timer: Warn at 1h, 15m
        warningThresholds = [ONE_HOUR, FIFTEEN_MINUTES];
    }

    if (timeRemaining > 0) {
        for (const threshold of warningThresholds) {
            // Check if we are within the threshold window (e.g. passed the mark but not yet expired)
            // AND close enough to it (e.g. within the last 15 mins of passing it) so we don't spam old warnings
            // Actually, simpler: if timeRemaining <= threshold AND we haven't warned for THIS threshold yet.
            if (timeRemaining <= threshold) {
                const thresholdLabel = threshold === FIFTEEN_MINUTES ? '15m' : 
                                       threshold === ONE_HOUR ? '1h' :
                                       threshold === FOUR_HOURS ? '4h' : '24h';
                                       
                const warningKey = `timer_warning_${storyId}_${currentUserId}_${turnStartTime}_${thresholdLabel}`;
                const hasWarned = localStorage.getItem(warningKey);
        
                if (!hasWarned) {
                     // Check if we are significantly past the threshold (e.g. we just opened the app and it's 1 min left, 
                     // we should probably just show the most urgent one, not all of them stack up).
                     // However, tracking "hasWarned" handles the "don't show again" part. 
                     // To avoid showing "24h warning" when there is only 1h left, we could rely on the order?
                     // Or just show it. It's fine to say "Less than 24h left" and then "Less than 1h left" immediately if they log in late.
                     // But better: simplify the message.
        
                     const minutesLeft = Math.ceil(timeRemaining / 60000);
                     let timeString = '';
                     if (minutesLeft >= 60) {
                         const hoursLeft = Math.ceil(minutesLeft / 60);
                         timeString = `${hoursLeft} hours`;
                         if (hoursLeft === 1) timeString = '1 hour';
                     } else {
                         timeString = `${minutesLeft} minutes`;
                     }

                     try {
                        await notifyTimerWarning(storyId, 'your story', currentUserId, timeString);
                        localStorage.setItem(warningKey, 'true');
                     } catch (err) {
                         console.error('Failed to send timer warning:', err);
                     }
                }
            }
        }
    }

    // Check if expired
    if (now >= expiryTime) {
      try {
        const result = await skipTurn(storyId, currentUserId, 'timer_expired');
        
        if (result.success) {
          console.log('Your turn has expired and you have been removed from the story.');
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
