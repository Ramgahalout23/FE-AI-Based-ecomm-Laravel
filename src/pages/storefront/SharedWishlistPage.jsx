import { ShoppingBag, AlertTriangle, Share2, Heart, ArrowRight, Package, User, ChevronDown } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

;
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import { wishlistAPI } from '../../api/wishlist';
import { cartAPI } from '../../api/cart';
import useCartStore from '../../store/cartStore';
import { formatCurrency, slugify, getProductImage, getImageUrl } from '../../utils/formatters';
import { getColorHex } from '../../utils/constants';
import { showSuccess, showError } from '../../utils/toast';
import { useSettings } from '../../store/useSettings';
import WishlistSkeleton from '../../components/ui/WishlistSkeleton';

export default function SharedWishlistPage() {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();
  const { addItem, openCart } = useCartStore();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sharedData, setSharedData] = useState(null);
  const [items, setItems] = useState([]);
  const [addingIds, setAddingIds] = useState(new Set());
  const [variantSelections, setVariantSelections] = useState({});
  const [expandedIds, setExpandedIds] = useState(new Set());

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const fetch = async () => {
      try {
        const res = await wishlistAPI.getSharedWishlist(token);
        const data = res.data?.data;
        if (!data) {
          setNotFound(true);
          return;
        }
        setSharedData(data);
        setItems(data.items || []);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [token]);

  // ── Variant helpers ──
  const getVariantInfo = useCallback((product) => {
    if (!product) return { colors: [], sizes: [], variants: [] };
    const p = product.product || product;
    const variants = p.variants || p.productvariant || [];
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

  const handleAddToCart = async (item, e) => {
    const id = item.productId || item.id || item.product_id;
    if (addingIds.has(id)) return;

    const selection = variantSelections[id] || {};
    const matchedVariant = findMatchedVariant(item, selection.selectedColor || '', selection.selectedSize || '');

    setAddingIds(prev => new Set(prev).add(id));
    try {
      const p = item.product || item;
      // Add to cart via server API with variant info
      await cartAPI.add({
        productId: id,
        quantity: 1,
        size: selection.selectedSize || undefined,
        color: selection.selectedColor || undefined,
        variantId: matchedVariant?.id || undefined,
      });
      // Then update local store
      addItem({
        ...item,
        productId: id,
        product: p,
        quantity: 1,
        size: selection.selectedSize || undefined,
        color: selection.selectedColor || undefined,
        variantId: matchedVariant?.id || undefined,
        variantStock: matchedVariant?.quantity ?? undefined,
      });
      showSuccess(
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShoppingBag size={14} /> {t('product.add_to_cart')}
        </span>,
        { duration: 2500 }
      );
      openCart();
    } catch (err) {
      // Handle case where product may not be on server — add locally as fallback
      const isNotFound = err?.response?.status === 404;
      if (isNotFound) {
        addItem({
          ...item,
          productId: id,
          product: item.product || item,
          quantity: 1,
          size: selection.selectedSize || undefined,
          color: selection.selectedColor || undefined,
          variantId: matchedVariant?.id || undefined,
          variantStock: matchedVariant?.quantity ?? undefined,
        });
        showSuccess(
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={14} /> {t('product.add_to_cart')}
          </span>,
          { duration: 2500 }
        );
        openCart();
      } else {
        showError(t('wishlist.not_found_desc'));
      }
    } finally {
      setAddingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const getStockInfo = (item, matchedVariant = null) => {
    if (matchedVariant) {
      const vQty = matchedVariant.quantity ?? matchedVariant.stockQuantity;
      if (vQty !== undefined && vQty !== null && vQty <= 0) return { status: 'unavailable', label: t('wishlist.unavailable'), qty: vQty };
      if (vQty !== undefined && vQty !== null && vQty <= 5) return { status: 'low', label: t('wishlist.low_stock', { count: vQty }), qty: vQty };
      return { status: 'in', label: t('wishlist.in_stock') };
    }
    const p = item.product || item;
    const qty = p.quantity ?? p.stockQuantity ?? item.quantity ?? item.stockQuantity;
    if (qty !== undefined && qty !== null && qty <= 0) return { status: 'out', label: t('wishlist.out_of_stock'), qty };
    if (qty !== undefined && qty !== null && qty <= 5) return { status: 'low', label: t('wishlist.low_stock', { count: qty }), qty };
    return { status: 'in', label: t('wishlist.in_stock') };
  };

  if (loading) {
    return (
      <div className="shared-wishlist-page">
        <div className="max-w-7xl mx-auto px-4 pt-6 sm:pt-8">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Shared Wishlist' }]} variant="light" />
        </div>
        <WishlistSkeleton />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="shared-wishlist-page">
        <SEOHead title={`Wishlist Not Found | ${storeName}`} noIndex />
        <div className="max-w-7xl mx-auto px-4 pt-6 sm:pt-8">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Shared Wishlist' }]} variant="light" />
        </div>
        <div className="wishlist-empty">
          <div className="wishlist-empty-icon">
            <Heart size={40} style={{ color: '#ccc' }} />
          </div>
          <h3>{t('wishlist.not_found')}</h3>
          <p>{t('wishlist.not_found_desc')}</p>
          <button className="btn-primary" onClick={() => navigate('/products')}>
            <Package size={16} />
            {t('wishlist.browse_products')}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shared-wishlist-page">
      <SEOHead
        title={`${sharedData?.user_name}'s Wishlist | ${storeName}`}
        description={`Check out ${sharedData?.user_name}'s curated wishlist on ${storeName}.`}
        noIndex
      />
      <div className="max-w-7xl mx-auto px-4 pt-6 sm:pt-8">
        <Breadcrumb
          items={[
            { label: t('nav.home'), href: '/' },
            { label: `${sharedData?.user_name}'s ${t('wishlist.item')}` },
          ]}
          variant="light"
        />
      </div>

      {/* ── Header ── */}
      <div className="wishlist-header">
        <div className="wishlist-header-left">
          <div className="wishlist-header-icon">
            <User size={22} />
          </div>
          <div className="wishlist-header-text">
            <h2>{sharedData?.user_name}'s {t('wishlist.item')}</h2>
            <p>{t('wishlist.saved_for_later')}</p>
          </div>
        </div>
        <div className="wishlist-header-right">
          <div className="wishlist-count-badge">
            <span>{items.length}</span>
            {items.length === 1 ? t('wishlist.item') : t('wishlist.items')}
          </div>
        </div>
      </div>

      {/* ── Items Grid ── */}
      {items.length === 0 ? (
        <div className="wishlist-empty">
          <div className="wishlist-empty-icon">
            <Heart size={40} style={{ color: '#ccc' }} />
          </div>
          <h3>{t('wishlist.empty_shared')}</h3>
          <p>{t('wishlist.empty_shared_desc')}</p>
        </div>
      ) : (
        <div className="wishlist-grid">
          {items.map((item) => {
            const itemId = item.productId || item.id || item.product_id;
            const isAdding = addingIds.has(itemId);
            const p = item.product || item;
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

            // Stock info is variant-aware
            const stock = getStockInfo(item, matchedVariant);
            const isOutOfStock = stock.status === 'out';
            const isUnavailable = stock.status === 'unavailable';
            const productUnavailable = isOutOfStock || (hasVariants && hasAllSelections && (!matchedVariant || isUnavailable));

            const canAddToCart = !productUnavailable && (!hasVariants || hasAllSelections);
            const displayPrice = matchedVariant?.price ?? itemPrice;

            return (
              <div
                key={itemId}
                className={`wishlist-item ${(isOutOfStock && !hasVariants) ? 'out-of-stock' : ''}`}
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
                  {stock.status !== 'in' && (
                    <span className={`wishlist-stock-badge ${stock.status === 'out' ? 'out-of-stock' : stock.status === 'unavailable' ? 'unavailable' : 'low-stock'}`}>
                      {stock.status === 'out' ? t('wishlist.out_of_stock') : stock.status === 'unavailable' ? t('wishlist.unavailable') : stock.status === 'low' ? t('wishlist.low_stock', { count: stock.qty }) : 'Low Stock'}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="wishlist-item-info">
                  <h3
                    className="wishlist-item-name"
                    onClick={() => navigate(`/products/${itemSlug}`)}
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

                  <div className={`wishlist-item-stock ${stock.status === 'in' ? 'in-stock' : stock.status === 'low' ? 'low' : stock.status === 'unavailable' ? 'unavailable' : 'out'}`}>
                    {stock.status === 'in' ? (
                      <>✓ {t('wishlist.in_stock')}</>
                    ) : stock.status === 'low' ? (
                      <><AlertTriangle size={11} /> {stock.label}</>
                    ) : stock.status === 'unavailable' ? (
                      <><AlertTriangle size={11} /> {t('wishlist.unavailable')}</>
                    ) : (
                      <><AlertTriangle size={11} /> {t('wishlist.out_of_stock')}</>
                    )}
                  </div>

                  {/* Variant Selector (toggleable) */}
                  {hasVariants && (
                    <div className="wishlist-variant-section">
                      <button
                        className="wishlist-variant-toggle"
                        onClick={(e) => { e.stopPropagation(); toggleExpanded(itemId); }}
                      >
                        <ShoppingBag size={12} />
                        {isExpanded ? t('wishlist.hide_options', 'Hide Options') : t('wishlist.select_options', 'Select Options')}
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

                  {/* Action */}
                  <div className="wishlist-item-actions">
                    <button
                      className={`wishlist-add-cart-btn ${productUnavailable || (hasVariants && !hasAllSelections) || isAdding ? 'disabled' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isAdding) return;
                        if (hasVariants && !hasAllSelections) {
                          toggleExpanded(itemId);
                        } else if (canAddToCart) {
                          handleAddToCart(item, e);
                        }
                      }}
                      disabled={isAdding || productUnavailable || (hasVariants && !hasAllSelections)}
                    >
                      {isAdding ? (
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : isOutOfStock ? (
                        <span className="flex items-center gap-1.5">
                          <ShoppingBag size={14} />
                          {t('wishlist.out_of_stock')}
                        </span>
                      ) : hasVariants && !hasAllSelections && !isExpanded ? (
                        <span className="flex items-center gap-1.5">
                          <ShoppingBag size={14} />
                          {t('wishlist.select_options', 'Select Options')}
                        </span>
                      ) : hasVariants && !hasAllSelections && isExpanded ? (
                        <span className="flex items-center gap-1.5">
                          <ChevronDown size={14} />
                          {t('wishlist.select_variant', 'Select Variant')}
                        </span>
                      ) : hasVariants && hasAllSelections && !matchedVariant ? (
                        <span className="flex items-center gap-1.5">
                          <ShoppingBag size={14} />
                          {t('wishlist.unavailable')}
                        </span>
                      ) : hasVariants && hasAllSelections && isUnavailable ? (
                        <span className="flex items-center gap-1.5">
                          <ShoppingBag size={14} />
                          {t('wishlist.out_of_stock')}
                        </span>
                      ) : (
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            key={displayPrice}
                            initial={{ y: 6, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -6, opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="inline-flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <ShoppingBag size={14} />
                            <span>{t('product.add_price', { price: formatCurrency(displayPrice) })}</span>
                          </motion.span>
                        </AnimatePresence>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer note ── */}
      <div className="shared-wishlist-footer">
        <Share2 size={14} />
        <span>{t('wishlist.owner_shared_via', { store: storeName })}</span>
      </div>
    </div>
  );
}
