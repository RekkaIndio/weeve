import { useEffect, useState, useRef } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

export function useKeyboard() {
  // Ref to track visibility for the polling interval without triggering re-renders of the effect
  const isKeyboardVisibleRef = useState(false)[1]; // Just need a stable setter, actually we need the value
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);

  // Sync ref with state
  useEffect(() => {
      visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Capture initial window height (assuming keyboard is closed on mount)
    // We update this on resize if it gets strict LARGER (e.g. rotating, or browser bar hiding)
    let initialHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;

    const updateVisibility = (isVisible: boolean) => {
        setVisible(isVisible);
        visibleRef.current = isVisible;
    };

    // 1. Focus detection
    const handleFocus = () => {
      const activeElement = document.activeElement;
      const isInput =
        activeElement &&
        (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || (activeElement as HTMLElement).isContentEditable);
      
      if (isInput) {
        updateVisibility(true);
      }
    };

    const handleBlur = () => {
        // Delay slightly to allow focus to move to another input
        setTimeout(() => {
             const activeElement = document.activeElement;
             const isInput = activeElement && 
                 (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || (activeElement as HTMLElement).isContentEditable);
             if (!isInput) {
                 updateVisibility(false);
             }
        }, 100);
    };

    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleBlur);

    // 2. Visual Viewport / Resize detection
    const checkDimensions = () => {
        const currentHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        
        // Update initial height if we found a larger one (max height seen)
        if (currentHeight > initialHeight) {
            initialHeight = currentHeight;
        }

        // If significantly smaller, keyboard is open
        const isShrunk = currentHeight < initialHeight * 0.85;
        
        if (isShrunk) {
             // Only consider it a keyboard if an input is focused (prevents desktop resize false positives)
             const activeElement = document.activeElement;
             const isInput = activeElement && 
                 (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || (activeElement as HTMLElement).isContentEditable);
             
             if (isInput) {
                updateVisibility(true);
             }
        } else {
             // If restored to full height, keyboard is closed (trust this over focus)
             updateVisibility(false);
        }
    };
    
    // Listen to both resize events
    if (window.visualViewport) {
       window.visualViewport.addEventListener('resize', checkDimensions);
    }
    window.addEventListener('resize', checkDimensions);
    
    // Polling fallback - purely to catch cases where events missed or race conditions
    // Only poll if we think keyboard is open, to save resources
    const pollInterval = setInterval(() => {
        if (visibleRef.current) {
            checkDimensions();
        }
    }, 500);

    // 3. Capacitor Native Listeners (Best for real native apps if plugin works)
    if (Capacitor.isNativePlatform()) {
        Keyboard.addListener('keyboardWillShow', () => {
            updateVisibility(true);
        }).catch(() => {
            console.warn('Keyboard plugin listener failed, relying on web fallbacks');
        });

        Keyboard.addListener('keyboardWillHide', () => {
            updateVisibility(false);
        }).catch((e) => console.error(e));
    }

    return () => {
        window.removeEventListener('focusin', handleFocus);
        window.removeEventListener('focusout', handleBlur);
        window.removeEventListener('resize', checkDimensions);
        if (window.visualViewport) {
           window.visualViewport.removeEventListener('resize', checkDimensions);
        }
        clearInterval(pollInterval);
        if (Capacitor.isNativePlatform()) {
             Keyboard.removeAllListeners();
        }
    };
  }, []); // Empty dependency array again - performant and fixes HMR error

  return visible;
}
