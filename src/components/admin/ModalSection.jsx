/**
 * ModalSection — a titled section inside an admin modal form.
 *
 * Breaks long forms into organized groups. Each section renders a header
 * (icon + title + optional hint) and its fields in a two-column grid.
 *
 * Props:
 * - title    — section heading
 * - hint     — small helper text under the heading
 * - icon     — a lucide icon element (e.g. <Tag size={16} />)
 * - layout   — 'grid' (default, two-column) | 'stack' (single column)
 *
 * Usage:
 * ```jsx
 * <ModalSection title="Pricing & Stock" hint="Prices and inventory" icon={<IndianRupee size={16} />}>
 *   <AdminFormField label="Price" required ...>...</AdminFormField>
 *   ...
 * </ModalSection>
 * ```
 *
 * Rendered as a motion element with `modalItemVariants`, so when placed inside
 * AdminModal's staggered body it cascades in with the other sections/fields.
 * Outside a modal it renders statically (no animation).
 */

import { motion } from 'framer-motion';
import { modalBodyVariants, modalItemVariants } from '../../utils/motionPresets';

export default function ModalSection({ title, hint, icon, layout = 'grid', children }) {
  return (
    <motion.section className="modal-section" variants={modalItemVariants}>
      <div className="modal-section-header">
        {icon && <div className="modal-section-icon">{icon}</div>}
        <div>
          <h4 className="modal-section-title">{title}</h4>
          {hint && <p className="modal-section-hint">{hint}</p>}
        </div>
      </div>
      {/* Inner stagger container — the section's fields cascade in one after another */}
      {layout === 'grid' ? (
        <motion.div className="form-grid" variants={modalBodyVariants}>{children}</motion.div>
      ) : (
        <motion.div className="modal-section-stack" variants={modalBodyVariants}>{children}</motion.div>
      )}
    </motion.section>
  );
}
