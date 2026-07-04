import { ShoppingBag, AlertTriangle, X, ChevronDown, Share2, Check, Link, Trash2, Heart, ArrowRight, Package } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

;
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import { wishlistAPI } from '../../api/wishlist';
import useWishlistStore from '../../store/wishlistStore';
import useCartStore from '../../store/cartStore';
import { useSettings } from '../../store/useSettings';
import useFlyToCart from '../../hooks/useFlyToCart';
import { formatCurrency, slugify, getProductImage, getImageUrl } from '../../utils/formatters';
import { getColorHex } from '../../utils/constants';
import { showSuccess, showError, removedFromWishlist, wishlistCleared, linkCopied } from '../../utils/toast';
import '../../styles/wishlist.css';
import WishlistSkeleton from '../../components/ui/WishlistSkeleton';

export default function WishlistPage() {
  const { t } = useTranslation();
  const { items, removeItem, clear } = useWishlistStore();
  const { addItem, openCart } = useCartStore();
  const { flyToCart } = useFlyToCart();
  const navigate = useNavigate();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState(new Set());
  const [movingIds, setMovingIds] = useState(new Set());
  const [variantSelections, setVariantSelections] = useState({}); // { [itemId]: { selectedColor, selectedSize } }
  const [expandedIds, setExpandedIds] = useState(new Set()); // itemIds that have their variant selector open

  // ── Share state ──
  const [shareLink, setShareLink] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await wishlistAPI.get();
        useWishlistStore.getState().setItems(res.data?.data?.items || res.data?.data || []);
      } catch {
        console.warn('Failed to load wishlist');
      } finally {
        setLoading(false);
      }
    };
    fetch();

    // Fetch share status on mount
    wishlistAPI.getShareStatus().then(res => {
      const url = res.data?.data?.url;
      if (url) setShareLink(url);
    }).catch(() => {});
  }, []);

  // ── Variant helpers ──────────────────────────────
  const getVariantInfo = useCallback((product) => {
    if (!product) return { colors: [], sizes: [], variants: [] };
    const p = product.product || product;
    const variants = p.productvariant || [];
    const colorsFromVariants = [...new Set(
      variants.map(v => v.attributes?.color).filter(Boolean)
    )];
    const sizesFromVariants = [...new Set(
      variants.map(v => v.attributes?.size).filter(Boolean)
    )];
    const colors = (p.colors?.length ? p.colors : colorsFromVariants);
    const sizes = (p.sizes?.length ? p.sizes : sizesFromVariants);
    return { colors, sizes, variants };
  }, []);

  const findMatchedVariant = useCallback((product, selectedColor, selectedSize) => {
    const { colors, sizes, variants } = getVariantInfo(product);
    if (!variants.length) return null;
    if (colors.length && !selectedColor) return null;
    if (sizes.length && !selectedSize) return null;
    return variants.find(v => {
      const attrs = v.attributes || {};
      const colorMatch = !colors.length || attrs.color === selectedColor;
      const sizeMatch = !sizes.length || attrs.size === selectedSize;
      return colorMatch && sizeMatch;
    }) || null;
  }, [getVariantInfo]);

  const handleSelectColor = useCallback((itemId, color) => {
    setVariantSelections(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], selectedColor: color }
    }));
  }, []);

  const handleSelectSize = useCallback((itemId, size) => {
    setVariantSelections(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], selectedSize: size }
    }));
  }, []);

  const toggleExpanded = useCallback((itemId) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
        // Also clear selections when collapsing
        setVariantSelections(s => {
          const updated = { ...s };
          delete updated[itemId];
          return updated;
        });
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const handleMoveToCart = async (item, e) => {
    const id = item.productId || item.id;
    if (movingIds.has(id) || removingIds.has(id)) return;

    // Trigger fly-to-cart animation from the item's image
    const sourceEl = e?.currentTarget?.closest('.wishlist-item')?.querySelector('.wishlist-item-img');
    if (sourceEl) flyToCart(sourceEl);

    const selection = variantSelections[id] || {};
    const matchedVariant = findMatchedVariant(item, selection.selectedColor || '', selection.selectedSize || '');

    setMovingIds(prev => new Set(prev).add(id));
    try {
      await wishlistAPI.moveToCart(id);
      addItem({
        ...item,
        productId: id,
        quantity: 1,
        size: selection.selectedSize || undefined,
        color: selection.selectedColor || undefined,
        variantId: matchedVariant?.id || undefined,
      });
      // Animate removal after brief delay
      setTimeout(() => {
        removeItem(id);
        setMovingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setExpandedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 300);
      showSuccess(
        <span className="wishlist-toast-moved">
          <ShoppingBag size={14} /> Moved {item.name || 'item'} to cart
        </span>,
        { duration: 2500 }
      );
      openCart();
    } catch {
      showError('Failed to move item to cart');
      setMovingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleRemove = async (productId) => {
    if (removingIds.has(productId) || movingIds.has(productId)) return;

    setRemovingIds(prev => new Set(prev).add(productId));
    // Animate removal
    setTimeout(async () => {
      try {
        await wishlistAPI.remove(productId);
      } catch (e) {
        console.warn('Failed to remove item:', e);
      }
      removeItem(productId);
      setRemovingIds(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
      removedFromWishlist();
    }, 350);
  };

  const handleClearAll = async () => {
    if (items.length === 0) return;
    try {
      await wishlistAPI.clear();
    } catch (e) {
      console.warn('Failed to clear wishlist:', e);
    }
    clear();
    wishlistCleared();
  };

  // ── Share handlers ──
  const handleShare = async () => {
    if (shareLink) {
      handleCopyLink();
      return;
    }
    setShareLoading(true);
    try {
      const res = await wishlistAPI.share();
      const url = res.data?.data?.url;
      if (url) {
        setShareLink(url);
        // Auto-copy to clipboard
        try {
          await navigator.clipboard.writeText(url);
          setShareCopied(true);
          linkCopied();
          setTimeout(() => setShareCopied(false), 2000);
        } catch {
          // Clipboard API may not be available
        }
      }
    } catch {
      showError('Failed to create share link');
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setShareCopied(true);
      linkCopied();
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      showError('Failed to copy link');
    }
  };

  const handleRevokeShare = async () => {
    try {
      await wishlistAPI.unshare();
      setShareLink(null);
      setShareCopied(false);
      showSuccess('Share link revoked');
    } catch {
      showError('Failed to revoke share link');
    }
  };

  const handleNavigate = useCallback((slug) => {
    navigate(`/products/${slug}`);
  }, [navigate]);

  const getStockInfo = (item) => {
    const p = item.product || item;
    const qty = p.quantity ?? p.stockQuantity ?? item.quantity ?? item.stockQuantity;
    if (qty !== undefined && qty !== null && qty <= 0) return { status: 'out', label: 'Out of Stock' };
    if (qty !== undefined && qty !== null && qty <= 5) return { status: 'low', label: `Only ${qty} left` };
    return { status: 'in', label: 'In Stock' };
  };

  return (
    <div className="wishlist-page">
      <SEOHead
        title={`My Wishlist | ${storeName}`}
        description={`View and manage your saved items at ${storeName}. Add your favorite products to your wishlist and shop them anytime.`}
        noIndex={true}
      />
      {/* ── Breadcrumb ──────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 pt-6 sm:pt-8">
        <Breadcrumb
          items={[    {label: t('nav.home'), href: '/' },
    { label: t('wishlist.title') },
          ]}
          variant="light"
        />
      </div>

      {/* ── Header ──────────────────────────────────── */}
      <div className="wishlist-header">
        <div className="wishlist-header-left">
          <div className="wishlist-header-icon">
            <Heart size={22} />
          </div>
          <div className="wishlist-header-text">
            <h2>{t('wishlist.title')}</h2>
            <p>{t('wishlist.items_saved')}</p>
          </div>
        </div>
        <div className="wishlist-header-right">
          <div className="wishlist-count-badge">
            <span>{items.length}</span>
            {items.length === 1 ? t('wishlist.item') : t('wishlist.items')}
          </div>
          {items.length > 0 && (
            <>
              <button className="wishlist-share-btn" onClick={handleShare} disabled={shareLoading}>
                {shareLoading ? (
                  <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
                ) : shareCopied ? (
                  <Check size={13} />
                ) : (
                  <Share2 size={13} />
                )}
                {shareCopied ? t('wishlist.copied') : t('wishlist.share')}
              </button>
              <button className="wishlist-clear-btn" onClick={handleClearAll}>
                <Trash2 size={13} />
                {t('wishlist.clear_all')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Share Link Banner ───────────────────────── */}
      {shareLink && (
        <div className="wishlist-share-banner">
          <div className="wishlist-share-banner-content">
            <Link size={16} Icon />
            <span className="wishlist-share-banner-text">{shareLink}</span>
          </div>
          <div className="wishlist-share-banner-actions">
            <button
              className="wishlist-share-copy-btn"
              onClick={handleCopyLink}
            >
              {shareCopied ? <Check size={14} /> : <Share2 size={14} />}
              {shareCopied ? t('wishlist.copied') : t('wishlist.copy')}
            </button>
            <button
              className="wishlist-share-revoke-btn"
              onClick={handleRevokeShare}
            >
              {t('wishlist.revoke')}
            </button>
          </div>
        </div>
      )}

      {/* ── Loading State ───────────────────────────── */}
      {loading ? (
        <WishlistSkeleton />
      ) : items.length === 0 ? (
        /* ── Empty State ─────────────────────────────── */
        <div className="wishlist-empty">
          <div className="wishlist-empty-icon">
            <Heart size={40} style={{ color: '#ccc' }} />
          </div>
          <h3>{t('wishlist.empty')}</h3>
          <p>{t('wishlist.empty_desc')}</p>
          <button className="btn-primary" onClick={() => navigate('/products')}>
            <Package size={16} />
            {t('wishlist.browse_products')}
            <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        /* ── Items Grid ──────────────────────────────── */
        <div className="wishlist-grid">
          {items.map((item) => {
            const itemId = item.productId || item.id;
            const isRemoving = removingIds.has(itemId);
            const isMoving = movingIds.has(itemId);
            const p = item.product || item;
            const stock = getStockInfo(item);
            const isOutOfStock = stock.status === 'out';
            const imgUrl = item.image || getProductImage(p);
            const itemPrice = p.price ?? item.price;
            const itemOldPrice = p.oldPrice ?? item.oldPrice;
            const itemName = p.name || item.name;
            const itemSlug = p.slug || item.slug || slugify(itemName);
            const discount = itemOldPrice
              ? Math.round(((itemOldPrice - itemPrice) / itemOldPrice) * 100)
              : null;

            // ── Variant info ──
            const { colors: productColors, sizes: productSizes } = getVariantInfo(p);
            const hasVariants = productColors.length > 0 || productSizes.length > 0;
            const selection = variantSelections[itemId] || {};
            const selColor = selection.selectedColor || '';
            const selSize = selection.selectedSize || '';
            const matchedVariant = hasVariants ? findMatchedVariant(p, selColor, selSize) : null;
            const hasAllSelections = (!productColors.length || selColor) && (!productSizes.length || selSize);
            const isExpanded = expandedIds.has(itemId);
            const variantReady = !hasVariants || (hasAllSelections && matchedVariant && (matchedVariant.quantity || 0) > 0);
            const canAddToCart = !isOutOfStock && variantReady;

            return (
              <div
                key={itemId}
                className={`wishlist-item ${isOutOfStock ? 'out-of-stock' : ''} ${isRemoving ? 'removing' : ''}`}
              >
                {/* Image */}
                <div className="wishlist-item-img">
                  {imgUrl ? (
                    <img
                      src={getImageUrl(imgUrl)}
                      alt={itemName}
                      loading="lazy"
                    />
                  ) : (
                    <span className="wishlist-img-fallback">💝</span>
                  )}

                  {/* Stock Badge */}
                  {stock.status !== 'in' && (
                    <span className={`wishlist-stock-badge ${stock.status === 'out' ? 'out-of-stock' : 'low-stock'}`}>
                      {stock.status === 'out' ? 'Out of Stock' : 'Low Stock'}
                    </span>
                  )}

                  {/* Remove Button */}
                  <button
                    className="wishlist-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(itemId);
                    }}
                    disabled={isMoving}
                    title="Remove from wishlist"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Info */}
                <div className="wishlist-item-info">
                  <h3
                    className="wishlist-item-name"
                    onClick={() => handleNavigate(itemSlug)}
                  >
                    {itemName}
                  </h3>

                  <div className="wishlist-item-price">
                    {formatCurrency(itemPrice)}
                    {itemOldPrice && (
                      <span className="wishlist-item-old-price">{formatCurrency(itemOldPrice)}</span>
                    )}
                    {discount && (
                      <span className="wishlist-item-discount">-{discount}%</span>
                    )}
                  </div>

                  {/* Stock indicator */}
                  <div className={`wishlist-item-stock ${stock.status === 'in' ? 'in-stock' : stock.status === 'low' ? 'low' : 'out'}`}>
                    {stock.status === 'in' ? (
                      <>✓ In Stock</>
                    ) : stock.status === 'low' ? (
                      <><AlertTriangle size={11} /> {stock.label}</>
                    ) : (
                      <><AlertTriangle size={11} /> Out of Stock</>
                    )}
                  </div>

                  {/* Variant Selector (toggleable) */}
                  {hasVariants && !isOutOfStock && (
                    <div className="wishlist-variant-section">
                      <button
                        className="wishlist-variant-toggle"
                        onClick={(e) => { e.stopPropagation(); toggleExpanded(itemId); }}
                      >
                        <ShoppingBag size={12} />
                        {isExpanded ? 'Hide Options' : 'Select Options'}
                        <ChevronDown size={12} className={`wishlist-chevron ${isExpanded ? 'open' : ''}`} />
                      </button>

                      {isExpanded && (
                        <div className="wishlist-variant-picker">
                          {/* Colors */}
                          {productColors.length > 0 && (
                            <div className="wishlist-variant-row">
                              <span className="wishlist-variant-label">
                                Color: <strong>{selColor || '—'}</strong>
                              </span>
                              <div className="wishlist-color-options">
                                {productColors.map(color => (
                                  <button
                                    key={color}
                                    onClick={(e) => { e.stopPropagation(); handleSelectColor(itemId, color); }}
                                    className={`wishlist-color-swatch ${selColor === color ? 'active' : ''}`}
                                    title={color}
                                  >
                                    <div
                                      className="wishlist-swatch-inner"
                                      style={{ background: getColorHex(color) }}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Sizes */}
                          {productSizes.length > 0 && (
                            <div className="wishlist-variant-row">
                              <span className="wishlist-variant-label">
                                Size: <strong>{selSize || '—'}</strong>
                              </span>
                              <div className="wishlist-size-options">
                                {productSizes.map(size => (
                                  <button
                                    key={size}
                                    onClick={(e) => { e.stopPropagation(); handleSelectSize(itemId, size); }}
                                    className={`wishlist-size-btn ${selSize === size ? 'active' : ''}`}
                                  >
                                    {size}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="wishlist-item-actions">
                    <button
                      className={`wishlist-add-cart-btn ${!canAddToCart ? 'disabled' : ''}`}
                      onClick={(e) => canAddToCart && handleMoveToCart(item, e)}
                      disabled={!canAddToCart || isMoving}
                    >
                      {isMoving ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                          Moving...
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <ShoppingBag size={14} />
                          {isOutOfStock
                            ? 'Out of Stock'
                            : hasVariants && hasAllSelections && matchedVariant && (matchedVariant.quantity || 0) <= 0
                            ? 'Unavailable'
                            : hasVariants && !hasAllSelections
                            ? 'Select Options'
                            : 'Add to Cart'}
                        </span>
                      )}
                    </button>
                    <button
                      className="wishlist-remove-icon-btn"
                      onClick={() => handleRemove(itemId)}
                      disabled={isMoving}
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
