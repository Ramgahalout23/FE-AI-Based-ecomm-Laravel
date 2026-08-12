/**
 * AdminModal — framer-motion modal primitive for the admin panel.
 *
 * Replaces the CSS-only entrance with a full AnimatePresence lifecycle:
 * the overlay fades in, the card slides/scales/un-blurs in on open, and the
 * whole thing animates back OUT on close (AnimatePresence keeps it mounted
 * until the exit finishes). The body is a stagger container, so form
 * sections/fields (ModalSection, AdminFormField) cascade in one after another.
 *
 * Props:
 * - open        — controls the modal (render <AdminModal> unconditionally,
 *                 even when closed, so the exit animation can play)
 * - onClose     — called on backdrop click, Escape, or the close button
 * - title       — modal heading
 * - icon        — optional lucide icon ELEMENT shown next to the title
 *                 (pass the rendered element, e.g. icon={<Plus size={18} />})
 * - description — optional helper line under the title
 * - actions     — optional extra header controls (e.g. AI auto-generate)
 * - footer      — optional footer node (Cancel / Save buttons)
 * - wide        — renders the wider `modal-wide` card
 * - children    — modal body content
 *
 * Usage:
 * ```jsx
 * <AdminModal open={showModal} onClose={() => setShowModal(false)}
 *   title="New Category" icon={<Plus size={18} />} footer={<>
 *     <button className="btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
 *     <button className="btn-dark btn-sm" onClick={handleSave}>Create</button>
 *   </>}>
 *   <ModalSection title="Basics" icon={<Tag size={16} />}>...</ModalSection>
 * </AdminModal>
 * ```
 */

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { MODAL_EASE, modalBodyVariants } from '../../utils/motionPresets';

export default function AdminModal({
  open,
  onClose,
  title,
  icon,
  description,
  actions,
  footer,
  wide = false,
  children,
}) {
  // Close on Escape while the modal is open
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay admin-modal"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className={`modal ${wide ? 'modal-wide' : ''}`}
            initial={{ opacity: 0, y: 26, scale: 0.95, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 16, scale: 0.97, filter: 'blur(6px)' }}
            transition={{ duration: 0.32, ease: MODAL_EASE }}
          >
            <div className="modal-header">
              <div className="modal-header-title">
                {icon && <span className="modal-header-icon">{icon}</span>}
                <div>
                  <h3>{title}</h3>
                  {description && <p className="modal-header-desc">{description}</p>}
                </div>
              </div>
              <div className="modal-header-actions">
                {actions}
                <button className="modal-close" onClick={onClose} aria-label="Close modal">
                  <X size={16} />
                </button>
              </div>
            </div>

            <motion.div
              className="modal-body"
              variants={modalBodyVariants}
              initial="hidden"
              animate="show"
            >
              {children}
            </motion.div>

            {footer && <div className="modal-footer">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
