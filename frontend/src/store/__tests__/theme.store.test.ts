import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from '../theme.store';

describe('theme.store', () => {
  beforeEach(() => {
    useThemeStore.setState({ isDark: false });
  });

  it('initial isDark is false', () => {
    expect(useThemeStore.getState().isDark).toBe(false);
  });

  it('toggle switches false to true', () => {
    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().isDark).toBe(true);
  });

  it('toggle switches true back to false', () => {
    useThemeStore.getState().toggle();
    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().isDark).toBe(false);
  });
});
