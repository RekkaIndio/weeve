import { useEffect, useState } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

export function useKeyboard() {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Universal fallback: Visual Viewport and Focus detection
    // This runs on both Native (if plugin fails) and Web.
    
    // 1. Focus detection
    const handleFocus = () => {
      const activeElement = document.activeElement;
      const isInput =
        activeElement &&
        (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || (activeElement as HTMLElement).isContentEditable);
      
      if (isInput) {
        setKeyboardVisible(true);
      }
    };

    const handleBlur = () => {
        // Delay slightly to allow focus to move to another input
        setTimeout(() => {
             const activeElement = document.activeElement;
             const isInput = activeElement && 
                 (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || (activeElement as HTMLElement).isContentEditable);
             if (!isInput) {
                 // Only hide if we aren't detecting a viewport shrink (keyboard open)
                 // But for now, let's just trust blur if strictly focus-based.
                 // We will combine with viewport logic below.
                 setKeyboardVisible(false);
             }
        }, 100);
    };

    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleBlur);

    // 2. Visual Viewport detection (most reliable for "is space taken?")
    const handleResize = () => {
        if (window.visualViewport) {
             // If visual viewport is significantly smaller than the window innerHeight (browser window),
             // something is taking up space (keyboard).
             // Threshold: 20% reduction.
             const isShrunk = window.visualViewport.height < window.innerHeight * 0.85;
             if (isShrunk) {
                 setKeyboardVisible(true);
             } else if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                 // Only set false if we are also not focused on an input (double check)
                 setKeyboardVisible(false);
             }
        }
    };
    
    if (window.visualViewport) {
       window.visualViewport.addEventListener('resize', handleResize);
    }
    
    // 3. Capacitor Native Listeners (Best for real native apps if plugin works)
    if (Capacitor.isNativePlatform()) {
        Keyboard.addListener('keyboardWillShow', () => {
            setKeyboardVisible(true);
        }).catch(() => {
            console.warn('Keyboard plugin listener failed, relying on web fallbacks');
        });

        Keyboard.addListener('keyboardWillHide', () => {
            setKeyboardVisible(false);
        }).catch((e) => console.error(e));
    }

    return () => {
        window.removeEventListener('focusin', handleFocus);
        window.removeEventListener('focusout', handleBlur);
        if (window.visualViewport) {
           window.visualViewport.removeEventListener('resize', handleResize);
        }
        if (Capacitor.isNativePlatform()) {
             Keyboard.removeAllListeners();
        }
    };


  }, []);

  return isKeyboardVisible;
}
