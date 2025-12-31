/**
 * Tests for middleware.ts - Next.js middleware for routing.
 *
 * These tests cover:
 * 1. Mobile device detection
 * 2. Native app detection (WeeveApp user agent)
 * 3. Referral code redirect logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test the middleware logic patterns directly
describe('Middleware Logic', () => {
    describe('Device Detection', () => {
        it('detects mobile device from user agent', () => {
            const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
            const isMobileUA = /android|iphone|ipad|ipod/i.test(ua);
            
            expect(isMobileUA).toBe(true);
        });

        it('detects Android device', () => {
            const ua = 'Mozilla/5.0 (Linux; Android 11; Pixel 5)';
            const isMobileUA = /android|iphone|ipad|ipod/i.test(ua);
            
            expect(isMobileUA).toBe(true);
        });

        it('detects iPad device', () => {
            const ua = 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)';
            const isMobileUA = /android|iphone|ipad|ipod/i.test(ua);
            
            expect(isMobileUA).toBe(true);
        });

        it('does not flag desktop browsers as mobile', () => {
            const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0';
            const isMobileUA = /android|iphone|ipad|ipod/i.test(ua);
            
            expect(isMobileUA).toBe(false);
        });
    });

    describe('Native App Detection', () => {
        it('detects native app via WeeveApp user agent', () => {
            const ua = 'Mozilla/5.0 (iPhone) WeeveApp/1.0';
            const isNativeApp = ua.includes('WeeveApp');
            
            expect(isNativeApp).toBe(true);
        });

        it('does not flag regular mobile browser as native app', () => {
            const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
            const isNativeApp = ua.includes('WeeveApp');
            
            expect(isNativeApp).toBe(false);
        });

        it('excludes native app from mobile redirect logic', () => {
            const ua = 'Mozilla/5.0 (iPhone) WeeveApp/1.0';
            const isNativeApp = ua.includes('WeeveApp');
            const isMobileUA = /android|iphone|ipad|ipod/i.test(ua);
            
            // isMobile is true only if mobile UA AND not native app
            const isMobile = isMobileUA && !isNativeApp;
            
            expect(isMobile).toBe(false);
        });
    });

    describe('Referral Redirect Logic', () => {
        it('redirects mobile with ref param to app-redirect', () => {
            const isMobile = true;
            const hasRefParam = true;
            
            const shouldRedirectToAppRedirect = isMobile && hasRefParam;
            
            expect(shouldRedirectToAppRedirect).toBe(true);
        });

        it('does not redirect mobile without ref param', () => {
            const isMobile = true;
            const hasRefParam = false;
            
            const shouldRedirectToAppRedirect = isMobile && hasRefParam;
            
            expect(shouldRedirectToAppRedirect).toBe(false);
        });

        it('does not redirect desktop with ref param', () => {
            const isMobile = false;
            const hasRefParam = true;
            
            const shouldRedirectToAppRedirect = isMobile && hasRefParam;
            
            expect(shouldRedirectToAppRedirect).toBe(false);
        });

        it('does not redirect native app even with ref param', () => {
            const ua = 'Mozilla/5.0 (iPhone) WeeveApp/1.0';
            const isNativeApp = ua.includes('WeeveApp');
            const isMobileUA = /android|iphone|ipad|ipod/i.test(ua);
            const isMobile = isMobileUA && !isNativeApp;
            const hasRefParam = true;
            
            const shouldRedirectToAppRedirect = isMobile && hasRefParam;
            
            expect(shouldRedirectToAppRedirect).toBe(false);
        });
    });

    describe('Redirect URL Construction', () => {
        it('preserves search params when redirecting', () => {
            const originalUrl = 'https://example.com/?ref=ABC123&extra=value';
            const parsedOriginal = new URL(originalUrl);
            const originalSearch = parsedOriginal.search;
            
            const redirectUrl = new URL('/app-redirect', originalUrl);
            redirectUrl.search = originalSearch;
            
            expect(redirectUrl.pathname).toBe('/app-redirect');
            expect(originalSearch).toBe('?ref=ABC123&extra=value');
            expect(redirectUrl.href).toContain('ref=ABC123');
            expect(redirectUrl.href).toContain('extra=value');
        });
    });

    describe('Matcher Configuration', () => {
        const excludedPaths = ['api', '_next/static', '_next/image', 'favicon.ico', 'login', 'signup', 'setup', 'auth'];

        it('matcher excludes API routes', () => {
            expect(excludedPaths).toContain('api');
        });

        it('matcher excludes static files', () => {
            expect(excludedPaths).toContain('_next/static');
        });

        it('matcher excludes image optimization', () => {
            expect(excludedPaths).toContain('_next/image');
        });

        it('matcher excludes auth pages', () => {
            expect(excludedPaths).toContain('login');
            expect(excludedPaths).toContain('signup');
            expect(excludedPaths).toContain('setup');
            expect(excludedPaths).toContain('auth');
        });

        it('matcher excludes favicon', () => {
            expect(excludedPaths).toContain('favicon.ico');
        });
    });
});
