/**
 * Shared framer-motion variants for admin modals.
 *
 * `modalBodyVariants` is a stagger container: when the modal opens, its direct
 * children (ModalSection / AdminFormField) cascade in one after another.
 * Children only need to declare the matching `modalItemVariants` — the body's
 * `initial`/`animate` propagation drives them, so they stay static (no
 * animation) when rendered outside a modal.
 */

export const MODAL_EASE = [0.16, 1, 0.3, 1];

export const modalBodyVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

export const modalItemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: MODAL_EASE },
  },
};
