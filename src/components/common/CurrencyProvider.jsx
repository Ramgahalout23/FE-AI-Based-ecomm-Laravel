import { useDisplayCurrencyStore } from '../../store/displayCurrencyStore';

/**
 * CurrencyProvider — subscribes to the display currency Zustand store and
 * re-renders its children whenever the currency changes. This ensures all
 * `formatCurrency()` calls throughout the tree pick up the updated
 * `_defaultCurrency` from formatters.js.
 *
 * Placed high in the component tree (wrapping AppContent).
 */
export default function CurrencyProvider({ children }) {
  // Subscribe to _tick so React re-renders this component on currency change
  useDisplayCurrencyStore((s) => s._tick);
  return <>{children}</>;
}
