/**
 * ConfirmDialog — animated in-app confirmation replacing native window.confirm
 * for admin destructive actions (delete, revoke, send, seed, etc.).
 *
 * Rendered once by ConfirmProvider; driven by useConfirm():
 *
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: 'Delete coupon?',
 *     message: 'This cannot be undone.',
 *     confirmLabel: 'Delete',
 *     danger: true,
 *   });
 *
 * Returns true/false. Matches the admin black-on-white theme; danger actions
 * get a red accent button and icon.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1];

export default function ConfirmDialog({
  open = false,
  title = 'Confirm action',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  onConfirm,
  onCancel,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="confirm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && onCancel && onCancel()}
        >
          <motion.div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <button
              type="button"
              className="confirm-close"
              aria-label="Close"
              onClick={onCancel}
            >
              <X size={16} />
            </button>

            <div className={`confirm-icon ${danger ? 'confirm-icon-danger' : ''}`}>
              {danger ? <Trash2 size={22} strokeWidth={2.2} /> : <AlertTriangle size={22} strokeWidth={2.2} />}
            </div>

            <h3 id="confirm-dialog-title">{title}</h3>
            <p className="confirm-message">{message}</p>

            <div className="confirm-actions">
              <button type="button" className="btn-ghost btn-sm confirm-cancel" onClick={onCancel} autoFocus>
                {cancelLabel}
              </button>
              <motion.button
                type="button"
                className={`btn-sm confirm-confirm ${danger ? 'btn-danger' : 'btn-dark'}`}
                onClick={onConfirm}
                whileTap={{ scale: 0.96 }}
              >
                {confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
