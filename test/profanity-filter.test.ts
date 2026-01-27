/**
 * Unit tests for the profanity filter utility
 */

import { describe, it, expect } from 'vitest';
import {
  containsProfanity,
  getProfanityMatches,
  filterProfanity,
  validateStoryContent,
} from '@/lib/profanity-filter';

describe('containsProfanity', () => {
  it('detects obvious profanity', () => {
    expect(containsProfanity('this is a fuck test')).toBe(true);
    expect(containsProfanity('what the shit')).toBe(true);
  });

  it('detects profanity regardless of case', () => {
    expect(containsProfanity('FUCK')).toBe(true);
    expect(containsProfanity('Shit')).toBe(true);
  });

  it('detects leetspeak variations', () => {
    expect(containsProfanity('f*ck')).toBe(true);
    expect(containsProfanity('sh1t')).toBe(true);
    expect(containsProfanity('a$$')).toBe(true);
  });

  it('detects repeated characters', () => {
    expect(containsProfanity('fuuuuuck')).toBe(true);
    expect(containsProfanity('shiiiit')).toBe(true);
  });

  it('returns false for clean text', () => {
    expect(containsProfanity('This is a nice story')).toBe(false);
    expect(containsProfanity('Hello world')).toBe(false);
    expect(containsProfanity('My awesome adventure')).toBe(false);
  });

  it('does not flag common false positives', () => {
    // Words that contain profanity substrings but are not profane
    expect(containsProfanity('class')).toBe(false);
    expect(containsProfanity('assume')).toBe(false);
    expect(containsProfanity('assassin')).toBe(false);
    expect(containsProfanity('basement')).toBe(false);
  });

  it('handles empty and null inputs gracefully', () => {
    expect(containsProfanity('')).toBe(false);
    expect(containsProfanity('   ')).toBe(false);
    // @ts-expect-error testing null input
    expect(containsProfanity(null)).toBe(false);
    // @ts-expect-error testing undefined input
    expect(containsProfanity(undefined)).toBe(false);
  });
});

describe('getProfanityMatches', () => {
  it('returns array of matched profanity', () => {
    const matches = getProfanityMatches('this is shit and fuck');
    expect(matches.length).toBeGreaterThan(0);
  });

  it('returns empty array for clean text', () => {
    const matches = getProfanityMatches('Hello world');
    expect(matches).toEqual([]);
  });

  it('handles empty input', () => {
    expect(getProfanityMatches('')).toEqual([]);
  });
});

describe('filterProfanity', () => {
  it('replaces profanity with asterisks', () => {
    const result = filterProfanity('this is shit');
    expect(result).not.toContain('shit');
    // Check that asterisks are present (obscenity may match partial patterns)
    expect(result).toMatch(/\*+/);
  });

  it('preserves clean text', () => {
    const text = 'Hello world';
    expect(filterProfanity(text)).toBe(text);
  });

  it('handles custom replacement character', () => {
    const result = filterProfanity('this is shit', '#');
    expect(result).not.toContain('shit');
    expect(result).toMatch(/#+/);
  });

  it('handles empty input', () => {
    expect(filterProfanity('')).toBe('');
  });
});

describe('validateStoryContent', () => {
  it('returns valid for clean content', () => {
    const result = validateStoryContent('My Great Story', 'An adventure awaits');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns invalid for profanity in title', () => {
    const result = validateStoryContent('What the fuck', 'Clean description');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns invalid for profanity in description', () => {
    const result = validateStoryContent('Clean Title', 'This is some shit content');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns invalid when both have profanity', () => {
    const result = validateStoryContent('Fuck this', 'Shit story');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('handles empty content gracefully', () => {
    const result = validateStoryContent('', '');
    expect(result.isValid).toBe(true);
  });
});
