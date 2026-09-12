/**
 * ImageLightbox — full-screen attachment preview.
 *
 * Clicking a customer's photo used to dump them into a new browser tab, which
 * loses the conversation. This keeps the preview inside the chat: zoom, pan-free
 * fit/actual toggle, Escape to close, and the surrounding page scroll is locked
 * while it is open so the thread never shifts underneath.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

export default function ImageLightbox({ src, alt = 'Attachment', caption, onClose }) {
  const [scale, setScale] = useState(1);
  const closeRef = useRef(null);

  // Escape closes, +/- zoom, 0 resets. Bound to the document so it works no
  // matter which control inside the dialog currently holds focus.
  useEffect(() => {
    if (!src) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      } else if (e.key === '+' || e.key === '=') {
        setScale((s) => Math.min(4, +(s + 0.25).toFixed(2)));
      } else if (e.key === '-') {
        setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)));
      } else if (e.key === '0') {
        setScale(1);
      }
    };

    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [src, onClose]);

  if (!src) return null;

  const stop = (e) => e.stopPropagation();

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="fixed inset-0 z-[300] flex flex-col bg-black/90 backdrop-blur-sm animate-[fadeIn_120ms_ease-out]"
    >
      {/* Controls */}
      <div className="flex items-center justify-between gap-2 p-3 flex-shrink-0" onClick={stop}>
        <div className="text-white/80 text-xs font-medium min-w-0 truncate">{caption || alt}</div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))}
            aria-label="Zoom out"
            title="Zoom out"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors ${FOCUS}`}
          >
            <ZoomOut size={17} />
          </button>
          <button
            type="button"
            onClick={() => setScale(1)}
            aria-label="Reset zoom"
            title="Reset zoom"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors ${FOCUS}`}
          >
            <Maximize2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(4, +(s + 0.25).toFixed(2)))}
            aria-label="Zoom in"
            title="Zoom in"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors ${FOCUS}`}
          >
            <ZoomIn size={17} />
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close image preview"
            title="Close (Esc)"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors ${FOCUS}`}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Image — clicking the backdrop closes, clicking the image does not */}
      <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-4">
        <img
          src={src}
          alt={alt}
          onClick={stop}
          style={{ transform: `scale(${scale})` }}
          className="max-h-full max-w-full object-contain transition-transform duration-150 ease-out"
        />
      </div>

      <div className="pb-3 text-center text-[11px] text-white/50 flex-shrink-0">
        {Math.round(scale * 100)}% · Esc to close · 0 to reset
      </div>
    </div>,
    document.body,
  );
}
