/**
 * CannedReplyMenu — the `/` command palette for the agent composer.
 *
 * Typing `/` in an empty composer opens saved replies; continuing to type filters
 * them by shortcut, label or body. Purely presentational: the composer owns the
 * query, the highlighted index and the keyboard handling, so ArrowUp/ArrowDown/
 * Enter/Escape behave exactly as they would inside a normal text field.
 */

import { Bookmark, Save } from 'lucide-react';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900';

export default function CannedReplyMenu({
  items = [],
  activeIndex = 0,
  onPick,
  onSaveCurrent,
  canSave = false,
  query = '',
}) {
  const hasItems = items.length > 0;

  return (
    <div
      role="listbox"
      aria-label="Saved replies"
      className="absolute bottom-[calc(100%+8px)] left-2 right-2 md:left-3 md:right-auto md:w-[26rem] z-30 rounded-xl border border-stone-200 bg-white shadow-lift overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-stone-100 bg-stone-50">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-500">
          <Bookmark size={12} className="text-gold-dark" /> Saved replies
        </span>
        <span className="text-[11px] text-stone-400 hidden md:inline">↑↓ to move · Enter to insert · Esc to dismiss</span>
      </div>

      {hasItems ? (
        <ul className="max-h-64 overflow-y-auto py-1">
          {items.map((item, idx) => {
            const active = idx === activeIndex;
            return (
              <li key={`${item.shortcut}-${idx}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-canned-index={idx}
                  // onMouseDown (not onClick) so the textarea never loses focus first
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onPick?.(item);
                  }}
                  onMouseEnter={() => onPick?.(item, { hover: true })}
                  className={`w-full text-left px-3 py-2 flex gap-2.5 items-start transition-colors ${FOCUS} ${
                    active ? 'bg-stone-900 text-white' : 'hover:bg-stone-50 text-stone-800'
                  }`}
                >
                  <span
                    className={`mt-px flex-shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${
                      active ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    /{item.shortcut || 'reply'}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-xs font-semibold ${active ? 'text-white' : 'text-stone-900'}`}>
                      {item.label}
                    </span>
                    <span className={`block text-[11px] truncate ${active ? 'text-white/70' : 'text-stone-500'}`}>
                      {item.text}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-3 py-3 text-[12px] text-stone-500">
          No saved reply matches “{query}”. Pick one from the list or save this reply.
        </p>
      )}

      {canSave && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onSaveCurrent?.();
          }}
          className={`w-full text-left px-3 py-2 flex items-center gap-2 border-t border-stone-100 text-[12px] font-semibold text-stone-700 hover:bg-stone-50 ${FOCUS}`}
        >
          <Save size={13} className="text-stone-500" />
          Save the message you are typing as a saved reply
        </button>
      )}
    </div>
  );
}
