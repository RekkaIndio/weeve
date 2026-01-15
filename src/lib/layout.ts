/**
 * Layout constants for consistent spacing across the app.
 * These mirror the CSS custom properties in globals.css.
 * Use CSS variables directly when possible; use these for JS-side logic.
 */

export const HEADER = {
  /** CSS variable for safe area top inset */
  safeAreaVar: 'var(--header-safe-area)',
  
  /** Base header padding (1rem) - most pages */
  paddingBase: 'var(--header-padding-base)',
  
  /** Large header padding (1.5rem) - onboarding */
  paddingLarge: 'var(--header-padding-large)',
  
  /** Small header padding (0.5rem) - feed tab switcher */
  paddingSmall: 'var(--header-padding-small)',
  
  /** Total header height (safe-area + padding + text + bottom-padding) */
  height: 'var(--header-height)',
  
  /** Computed: safe-area + base padding */
  ptBase: 'var(--header-pt-base)',
  
  /** Computed: safe-area + large padding */
  ptLarge: 'var(--header-pt-large)',
  
  /** Computed: safe-area + small padding */
  ptSmall: 'var(--header-pt-small)',
  
  /** Computed: header-height + gap (for elements below header) */
  ptOverlay: 'var(--header-pt-overlay)',
} as const;
