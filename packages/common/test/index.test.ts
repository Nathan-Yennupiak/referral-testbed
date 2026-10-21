import { describe, expect, it } from 'vitest';
import { API_VERSION } from '../src/index.js';

describe('common', () => {
  it('exposes the shared API version', () => {
    expect(API_VERSION).toBe('v1');
  });
});
