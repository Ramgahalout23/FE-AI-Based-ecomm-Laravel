import { create } from 'zustand';

/**
 * DisplayCurrencyStore — drives re-renders across the app when the user
 * switches display currency. Components read `code` to format prices.
 *
 * The `_tick` counter increments on every change so React components that
 * subscribe to the store will re-render (and pick up the updated
 * `_defaultCurrency` from formatters.js).
 */
export const useDisplayCurrencyStore = create((set) => ({
  code: (() => {
    try {
      return localStorage.getItem('luxe_display_currency') || 'INR';
    } catch {
      return 'INR';
    }
  })(),
  _tick: 0,
  setCode: (code) => {
    try {
      localStorage.setItem('luxe_display_currency', code);
    } catch {
      // Silently fail
    }
    set({ code, _tick: Date.now() });
  },
}));
