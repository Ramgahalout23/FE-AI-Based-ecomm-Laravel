import { memo } from 'react';
import { motion } from 'framer-motion';
import ProductCard from './ProductCard';

export default memo(function ProductGrid({ products = [], loading = false }) {
  if (loading) {
    return (
      <div className="product-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="product-card" style={{ pointerEvents: 'none' }}>
            <div className="skeleton" style={{ aspectRatio: '4/3' }} />
            <div style={{ padding: '1rem' }}>
              <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 16, width: '80%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 16, width: '30%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <h3>No products found</h3>
        <p>Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map((p, idx) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
        >
          <ProductCard product={p} />
        </motion.div>
      ))}
    </div>
  );
});
