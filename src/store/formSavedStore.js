import { create } from 'zustand';

/**
 * formSavedStore — a tiny shared "a save just completed" signal.
 *
 * SaveButton calls `markFormSaved()` when it enters its success state, and
 * AdminFormField subscribes to show a lingering green "Saved" check on the
 * form's fields. A module-level store (instead of per-page props) keeps the
 * two components coupled only through the save lifecycle, so any form using
 * SaveButton + AdminFormField gets the feedback automatically.
 *
 * `savedUntil` is computed here (an event handler, not a render) so fields can
 * check freshness without calling Date.now() during render.
 */
const SAVED_VISIBLE_MS = 2600;

const useFormSavedStore = create(() => ({
  savedAt: 0, // epoch ms when the most recent successful save completed
  savedUntil: 0, // epoch ms until which the saved check stays visible
}));

export const markFormSaved = () => {
  const now = Date.now();
  useFormSavedStore.setState({ savedAt: now, savedUntil: now + SAVED_VISIBLE_MS });
};

export default useFormSavedStore;
