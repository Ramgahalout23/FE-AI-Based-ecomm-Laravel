import {
  ArrowLeft, Star, CheckCircle, XCircle, AlertCircle,
  Trash2, User, Mail, Package, Store, Calendar, Shield,
  Sparkles, Copy, Check, RefreshCw
} from 'lucide-react';
import { reviewsAPI } from '../../api/reviews';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/admin';
import { formatDate, getImageUrl } from '../../utils/formatters';
import toast from '../../utils/toast';
import AdminPageShell from '../../components/admin/AdminPageShell';

export default function ReviewDetailAdminPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [aiReply, setAiReply] = useState(null);
  const [aiReplyLoading, setAiReplyLoading] = useState(false);
  const [aiReplyCopied, setAiReplyCopied] = useState(false);

  const loadReview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await adminAPI.getReview(id);
      setReview(r.data?.data || null);
    } catch (e) {
      if (e.response?.status === 404) {
        setError('Review not found');
      } else {
        setError('Failed to load review');
      }
      console.warn('Failed to load review:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadReview();
  }, [loadReview]);

  const handleApprove = async () => {
    if (!confirm('Approve this review? It will be visible to customers.')) return;
    setActionLoading(true);
    try {
      await adminAPI.approveReview(id);
      toast.success('Review approved');
      loadReview();
    } catch {
      toast.error('Failed to approve review');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Reject this review? It will be hidden from customers.')) return;
    setActionLoading(true);
    try {
      await adminAPI.rejectReview(id);
      toast.success('Review rejected');
      loadReview();
    } catch {
      toast.error('Failed to reject review');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAiReply = async () => {
    setAiReplyLoading(true);
    setAiReply(null);
    try {
      const r = await reviewsAPI.aiGenerateReply(id);
      setAiReply(r.data?.data || null);
    } catch {
      toast.error('Failed to generate AI reply');
    } finally {
      setAiReplyLoading(false);
    }
  };

  const copyAiReply = () => {
    if (!aiReply?.reply) return;
    const done = () => {
      setAiReplyCopied(true);
      toast.success('Reply copied to clipboard');
      setTimeout(() => setAiReplyCopied(false), 2000);
    };
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = aiReply.reply;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done();
      } catch {
        toast.error('Could not copy — select the text manually');
      }
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(aiReply.reply).then(done).catch(fallback);
    } else {
      fallback();
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this review permanently? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      await adminAPI.deleteReview(id);
      toast.success('Review deleted');
      navigate('/admin/reviews');
    } catch {
      toast.error('Failed to delete review');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusInfo = () => {
    if (!review) return { label: '—', className: '', icon: AlertCircle };
    if (review.is_flagged) return { label: 'Rejected', className: 'badge badge-danger', icon: XCircle };
    if (review.is_moderated) return { label: 'Approved', className: 'badge badge-success', icon: CheckCircle };
    return { label: 'Pending', className: 'badge badge-warning', icon: AlertCircle };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div>
      <AdminPageShell title="Review Detail" subtitle={`Review #${id?.slice(0, 8) || ''}...`} loading={loading} error={error} page="reviews">
        {/* Back button */}
        <button
          onClick={() => navigate('/admin/reviews')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.4rem 0.8rem', fontSize: '0.82rem', fontWeight: 500,
            color: 'var(--muted, #888)', background: 'transparent',
            border: '1px solid var(--border)', borderRadius: '6px',
            cursor: 'pointer', marginBottom: '1rem', transition: 'all 0.2s',
          }}
          className="hover-lift"
        >
          <ArrowLeft size={14} /> Back to Reviews
        </button>

        {review && (
          <>
            {/* Status Banner */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '0.75rem',
              padding: '1rem 1.25rem', borderRadius: '10px',
              marginBottom: '1.25rem',
              background: review.is_flagged
                ? 'rgba(239,68,68,0.06)'
                : review.is_moderated
                  ? 'rgba(34,197,94,0.06)'
                  : 'rgba(245,158,11,0.06)',
              border: `1px solid ${
                review.is_flagged ? 'rgba(239,68,68,0.2)'
                : review.is_moderated ? 'rgba(34,197,94,0.2)'
                : 'rgba(245,158,11,0.2)'
              }`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <StatusIcon size={18} color={
                  review.is_flagged ? '#ef4444'
                  : review.is_moderated ? '#22c55e'
                  : '#f59e0b'
                } />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {statusInfo.label}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {(!review.is_moderated && !review.is_flagged) ? (
                  <>
                    <button
                      className="btn-dark btn-sm"
                      onClick={handleApprove}
                      disabled={actionLoading}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button
                      className="btn-del"
                      onClick={handleReject}
                      disabled={actionLoading}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </>
                ) : (
                  <>
                    {review.is_flagged && (
                      <button
                        className="btn-dark btn-sm"
                        onClick={handleApprove}
                        disabled={actionLoading}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <CheckCircle size={14} /> Restore
                      </button>
                    )}
                    {review.is_moderated && (
                      <button
                        className="btn-del"
                        onClick={handleReject}
                        disabled={actionLoading}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    )}
                  </>
                )}
                <button
                  className="btn-ghost btn-sm"
                  onClick={handleDelete}
                  disabled={actionLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#e74c3c' }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '1.25rem' }}>
              {/* Customer Info */}
              <div className="detail-card" style={{
                background: 'white', borderRadius: '10px',
                border: '1px solid var(--border)', overflow: 'hidden',
              }}>
                <div className="detail-card-header" style={{
                  padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)',
                  fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  <User size={15} /> Customer Information
                </div>
                <div className="detail-card-body" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    {review.user?.avatar ? (
                      <img
                        src={getImageUrl(review.user.avatar)}
                        alt=""
                        style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    ) : review.type === 'store' ? (
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'var(--primary-light, #eef2ff)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--primary, #6366f1)', fontSize: '0.9rem', fontWeight: 600,
                      }}>
                        <Store size={20} />
                      </div>
                    ) : (
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#999', fontSize: '1rem', fontWeight: 600,
                      }}>
                        {review.userName?.charAt(0) || '?'}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{review.userName || 'Customer'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#888' }}>{review.userEmail || '—'}</div>
                    </div>
                  </div>
                  <div className="detail-grid" style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem',
                  }}>
                    <div className="detail-item">
                      <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#888', marginBottom: '0.25rem' }}>
                        <Mail size={12} /> Email Verified
                      </span>
                      <span className="value" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        {review.user?.email_verified_at ? '✅ Yes' : '❌ No'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#888', marginBottom: '0.25rem' }}>
                        <Calendar size={12} /> Review Date
                      </span>
                      <span className="value" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        {formatDate(review.createdAt || review.created_at)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#888', marginBottom: '0.25rem' }}>
                        <Shield size={12} /> Verified Purchase
                      </span>
                      <span className="value" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        {review.is_verified ? '✅ Verified' : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div className="detail-card" style={{
                background: 'white', borderRadius: '10px',
                border: '1px solid var(--border)', overflow: 'hidden',
              }}>
                <div className="detail-card-header" style={{
                  padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)',
                  fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  <Package size={15} /> Product Information
                </div>
                <div className="detail-card-body" style={{ padding: '1.25rem' }}>
                  {review.type === 'store' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0' }}>
                      <Store size={18} style={{ color: 'var(--primary, #6366f1)' }} />
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Store Review</span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        padding: '0.15rem 0.45rem', borderRadius: '4px',
                        background: 'var(--primary-light, #eef2ff)',
                        color: 'var(--primary, #6366f1)',
                        fontSize: '0.7rem', fontWeight: 600, marginLeft: '0.5rem',
                      }}>
                        Store Review
                      </span>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{review.productName || review.product?.name || '—'}</span>
                        {review.product?.slug && (
                          <button
                            onClick={() => navigate(`/admin/products/${review.product_id}`)}
                            style={{
                              padding: '0.2rem 0.5rem', fontSize: '0.72rem',
                              background: 'transparent', border: '1px solid var(--border)',
                              borderRadius: '4px', cursor: 'pointer', color: 'var(--primary, #6366f1)',
                            }}
                          >
                            View Product
                          </button>
                        )}
                      </div>
                      {review.product && (
                        <div className="detail-grid" style={{
                          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem',
                        }}>
                          <div className="detail-item">
                            <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#888', marginBottom: '0.25rem' }}>
                              ID
                            </span>
                            <span className="value" style={{ fontSize: '0.82rem', fontWeight: 500, fontFamily: 'monospace' }}>
                              {review.product_id?.slice(0, 12)}...
                            </span>
                          </div>
                          {review.product?.slug && (
                            <div className="detail-item">
                              <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#888', marginBottom: '0.25rem' }}>
                                Slug
                              </span>
                              <span className="value" style={{ fontSize: '0.82rem', fontWeight: 500 }}>
                                {review.product.slug}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Review Content */}
              <div className="detail-card" style={{
                background: 'white', borderRadius: '10px',
                border: '1px solid var(--border)', overflow: 'hidden',
              }}>
                <div className="detail-card-header" style={{
                  padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)',
                  fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  <Star size={15} /> Review Content
                </div>
                <div className="detail-card-body" style={{ padding: '1.25rem' }}>
                  {/* Rating */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          size={20}
                          fill={star <= review.rating ? 'var(--warning, #f59e0b)' : 'transparent'}
                          color={star <= review.rating ? 'var(--warning, #f59e0b)' : '#ddd'}
                        />
                      ))}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{review.rating}/5</span>
                  </div>

                  {/* Title */}
                  {review.title && (
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      {review.title}
                    </h3>
                  )}

                  {/* Comment */}
                  {review.comment ? (
                    <div style={{
                      background: 'var(--bg-muted, #f9fafb)', borderRadius: '8px',
                      padding: '1rem', fontSize: '0.88rem', lineHeight: 1.6,
                      color: '#333', whiteSpace: 'pre-wrap',
                    }}>
                      {review.comment}
                    </div>
                  ) : (
                    <div style={{ color: '#aaa', fontStyle: 'italic', fontSize: '0.85rem' }}>
                      No comment provided
                    </div>
                  )}

                  {/* Images */}
                  {review.images && review.images.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#666', marginBottom: '0.5rem' }}>
                        Attached Images ({review.images.length})
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {review.images.map((img, i) => (
                          <a
                            key={i}
                            href={getImageUrl(img)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block' }}
                          >
                            <img
                              src={getImageUrl(img)}
                              alt={`Review image ${i + 1}`}
                              style={{
                                width: 80, height: 80, borderRadius: '8px',
                                objectFit: 'cover', border: '1px solid var(--border)',
                                transition: 'opacity 0.2s',
                              }}
                              onMouseOver={e => e.target.style.opacity = '0.8'}
                              onMouseOut={e => e.target.style.opacity = '1'}
                              onError={e => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Reply Suggestion */}
              <div className="detail-card" style={{
                background: 'white', borderRadius: '10px',
                border: '1px solid var(--border)', overflow: 'hidden',
              }}>
                <div className="detail-card-header" style={{
                  padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)',
                  fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  justifyContent: 'space-between',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={15} style={{ color: 'var(--primary, #6366f1)' }} /> AI Reply Suggestion
                  </span>
                  <button
                    className="btn-ghost btn-sm"
                    onClick={handleAiReply}
                    disabled={aiReplyLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    {aiReplyLoading ? (
                      <RefreshCw size={13} className="spin" />
                    ) : (
                      <Sparkles size={13} />
                    )}
                    {aiReplyLoading ? 'Generating...' : (aiReply ? 'Regenerate' : 'Generate Reply')}
                  </button>
                </div>
                <div className="detail-card-body" style={{ padding: '1.25rem' }}>
                  {!aiReply ? (
                    <div style={{ fontSize: '0.85rem', color: '#888' }}>
                      Draft a professional public reply to this customer review with one click.
                      {!aiReplyLoading && review && (
                        <span> Works offline too — a sample reply is generated when no AI API key is set.</span>
                      )}
                    </div>
                  ) : (
                    <div>
                      {aiReply._mock && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.6rem',
                          padding: '0.15rem 0.5rem', borderRadius: '999px',
                          background: '#f3e8ff', color: '#7c3aed', border: '1px solid #e9d5ff',
                        }}>
                          🧪 Mock
                        </span>
                      )}
                      <div style={{
                        background: 'var(--bg-muted, #f9fafb)', borderRadius: '8px',
                        padding: '1rem', fontSize: '0.88rem', lineHeight: 1.6,
                        color: '#333', whiteSpace: 'pre-wrap',
                      }}>
                        {aiReply.reply}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button
                          className="btn-dark btn-sm"
                          onClick={copyAiReply}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          {aiReplyCopied ? <Check size={13} /> : <Copy size={13} />}
                          {aiReplyCopied ? 'Copied!' : 'Copy Reply'}
                        </button>
                        <button
                          className="btn-ghost btn-sm"
                          onClick={handleAiReply}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <RefreshCw size={13} /> Regenerate
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Helpfulness Stats */}
              <div className="detail-card" style={{
                background: 'white', borderRadius: '10px',
                border: '1px solid var(--border)', overflow: 'hidden',
              }}>
                <div className="detail-card-header" style={{
                  padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)',
                  fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  <AlertCircle size={15} /> Engagement
                </div>
                <div className="detail-card-body" style={{ padding: '1.25rem' }}>
                  <div className="detail-grid" style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem',
                  }}>
                    <div className="detail-item">
                      <span className="value" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#22c55e' }}>
                        {review.helpful || 0}
                      </span>
                      <span className="label" style={{ display: 'block', fontSize: '0.78rem', color: '#888', marginTop: '0.15rem' }}>
                        Found Helpful
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="value" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ef4444' }}>
                        {review.unhelpful || 0}
                      </span>
                      <span className="label" style={{ display: 'block', fontSize: '0.78rem', color: '#888', marginTop: '0.15rem' }}>
                        Found Unhelpful
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </AdminPageShell>
    </div>
  );
}
