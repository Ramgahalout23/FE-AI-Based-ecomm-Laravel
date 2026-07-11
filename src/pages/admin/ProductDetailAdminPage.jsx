import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/admin';
import { reviewsAPI } from '../../api/reviews';
import { formatCurrency, getProductImage, getImageUrl } from '../../utils/formatters';
import { ArrowLeft, Tag, Package, DollarSign, Star, Archive } from 'lucide-react';
import toast from '../../utils/toast';

export default function ProductDetailAdminPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [variants, setVariants] = useState([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const r = await adminAPI.getProduct(id);
        setProduct(r.data?.data || r.data || r);
      } catch {
        toast.error('Failed to load product details');
        navigate('/admin/products');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, navigate]);

  useEffect(() => {
    if (!product?.id) return;
    const fetchVariants = async () => {
      setVariantsLoading(true);
      try {
        const res = await adminAPI.getVariants(product.id);
        const data = res.data?.data || res.data || [];
        setVariants(Array.isArray(data) ? data : data.variants || []);
      } catch {
        setVariants([]);
      } finally {
        setVariantsLoading(false);
      }
    };
    fetchVariants();
  }, [product?.id]);

  // Fetch real review count
  useEffect(() => {
    if (!product?.id) return;
    reviewsAPI.getStats(product.id).then(r => {
      const count = r.data?.data?.total_reviews ?? r.data?.data?.count ?? r.data?.total ?? null;
      if (count !== null) setReviewCount(count);
    }).catch(() => {
      // Fallback to product.reviewCount — already initialized as 0
    });
  }, [product?.id]);

  const handlePublish = async () => {
    try {
      await adminAPI.updateProduct(id, { status: 'PUBLISHED' });
      setProduct((prev) => ({ ...prev, status: 'PUBLISHED' }));
      toast.success('Product published');
    } catch {
      toast.error('Failed to publish');
    }
  };

  const handleArchive = async () => {
    try {
      await adminAPI.updateProduct(id, { status: 'ARCHIVED' });
      setProduct((prev) => ({ ...prev, status: 'ARCHIVED' }));
      toast.success('Product archived');
    } catch {
      toast.error('Failed to archive');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this product permanently?')) return;
    try {
      await adminAPI.deleteProduct(id);
      toast.success('Product deleted');
      navigate('/admin/products');
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="loading-page" style={{ padding: '3rem' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!product) return null;

  const imgUrl = getProductImage(product) || product.image;

  return (
    <div>
      {/* Header */}
      <div className="admin-header admin-header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/admin/products')}
            className="btn-ghost btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h2>Product Details</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
              View and manage product information
            </p>
          </div>
        </div>
      </div>

      {/* Product Card */}
      <div className="detail-panel" style={{ marginBottom: '1.5rem' }}>
        <div className="detail-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {imgUrl ? (
              <img
                loading="lazy"
                src={getImageUrl(imgUrl)}
                alt=""
                style={{
                  width: 56,
                  height: 56,
                  objectFit: 'cover',
                  borderRadius: 10,
                  background: '#f3f4f6',
                }}
              />
            ) : (
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 10,
                  background: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                }}
              >
                <Package size={24} />
              </div>
            )}
            <div>
              <h3 style={{ margin: 0 }}>{product.name}</h3>
              <span
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--muted)',
                  fontFamily: 'monospace',
                }}
              >
                {product.sku || `SKU-${product.id?.slice(0, 8)}`}
              </span>
            </div>
          </div>
          <button
            className="btn-edit btn-sm"
            onClick={() => navigate(`/admin/products`, { state: { editProductId: product.id } })}
          >
            ✏️ Edit
          </button>
        </div>

        <div className="detail-grid">
          <div className="detail-item">
            <span className="label"><Tag size={12} /> Product ID</span>
            <span className="value" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
              {product.id}
            </span>
          </div>
          <div className="detail-item">
            <span className="label"><DollarSign size={12} /> Price</span>
            <span className="value" style={{ fontWeight: 700 }}>
              {formatCurrency(product.price)}
            </span>
          </div>
          <div className="detail-item">
            <span className="label"><DollarSign size={12} /> Old Price</span>
            <span className="value">
              {product.oldPrice ? formatCurrency(product.oldPrice) : '—'}
            </span>
          </div>
          <div className="detail-item">
            <span className="label"><Tag size={12} /> Category</span>
            <span className="value">
              {product.category?.name || product.categoryName || '—'}
            </span>
          </div>
          <div className="detail-item">
            <span className="label"><Archive size={12} /> Status</span>
            <span className="value">
              <span
                className={`status-badge ${
                  product.status === 'PUBLISHED'
                    ? 'status-active'
                    : product.status === 'ARCHIVED'
                    ? 'status-archived'
                    : 'status-pending'
                }`}
              >
                {product.status || 'DRAFT'}
              </span>
            </span>
          </div>
          <div className="detail-item">
            <span className="label"><Star size={12} /> Rating</span>
            <span className="value" style={{ color: 'var(--warning)' }}>
              {'★'.repeat(Math.floor(product.rating || 0))} ({reviewCount || 0} reviews)
            </span>
          </div>
          <div className="detail-item">
            <span className="label"><Package size={12} /> Stock</span>
            <span
              className="value"
              style={{ color: (product.quantity || 0) < 5 ? 'var(--danger)' : 'inherit' }}
            >
              {product.quantity ?? product.stock ?? '—'}
            </span>
          </div>
          <div className="detail-item">
            <span className="label"><Tag size={12} /> Badge</span>
            <span className="value">{product.badge || '—'}</span>
          </div>
          {product.description && (
            <div className="detail-item" style={{ gridColumn: '1/-1' }}>
              <span className="label">Description</span>
              <span
                className="value"
                style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}
              >
                {product.description}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            marginTop: '1.25rem',
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            borderTop: '1px solid var(--border)',
            paddingTop: '1rem',
          }}
        >
          {product.status !== 'PUBLISHED' && (
            <button className="btn-dark btn-sm" onClick={handlePublish}>
              📢 Publish
            </button>
          )}
          {product.status !== 'ARCHIVED' && (
            <button className="btn-ghost btn-sm" onClick={handleArchive}>
              📦 Archive
            </button>
          )}
          <button className="btn-danger btn-sm" onClick={handleDelete}>
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Variants Section */}
      <div className="table-card">
        <div className="table-head">
          <h3>Variants ({variants.length})</h3>
        </div>
        {variantsLoading ? (
          <div className="loading-page" style={{ padding: '2rem' }}>
            <div className="spinner" />
          </div>
        ) : variants.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <div className="empty-state-icon">🎨</div>
            <h3>No variants</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
              This product has no color/size variants
            </p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Color / Size</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => {
                const firstImg = Array.isArray(v.images) && v.images.length > 0 ? v.images[0] : null;
                return (
                  <tr key={v.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {firstImg ? (
                          <img
                            loading="lazy"
                            src={getImageUrl(firstImg)}
                            alt=""
                            style={{
                              width: 36,
                              height: 36,
                              objectFit: 'cover',
                              borderRadius: 6,
                              background: '#f3f4f6',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 6,
                              background: '#f3f4f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.8rem',
                            }}
                          >
                            🎨
                          </div>
                        )}
                        <strong>
                          {v.color || ''}{v.size ? ` / ${v.size}` : ''}
                        </strong>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{v.sku || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(v.price)}</td>
                    <td>
                      <span style={{ color: (v.quantity || v.stock || 0) < 5 ? 'var(--danger)' : 'inherit' }}>
                        {v.quantity || v.stock || 0}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
