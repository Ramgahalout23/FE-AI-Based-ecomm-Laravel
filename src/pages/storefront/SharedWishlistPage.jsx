import { ShoppingBag, AlertTriangle, Share2, Heart, ArrowRight, Package, User } from 'lucide-react';
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

  // Per-color thumbnail from the variant's first image (set in admin),
  // falling back to a solid color swatch when no variant image exists.
  const getColorThumb = useCallback((product, color) => {
    const { variants } = getVariantInfo(product);
    const v = variants.find(x => x.attributes?.color === color && Array.isArray(x.images) && x.images.length > 0);
    const img = v?.images?.[0];
    return typeof img === 'string' ? getImageUrl(img) : null;
  }, [getVariantInfo]);

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
        imageUrl: matchedVariant?.images?.[0] || item.imageUrl || item.image || undefined,
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
          imageUrl: matchedVariant?.images?.[0] || item.imageUrl || item.image || undefined,
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
            const { colors: productColors, sizes: productSizes, variants: productVariants } = getVariantInfo(p);
            const hasVariants = productColors.length > 0 || productSizes.length > 0;
            // Out-of-stock colors/sizes — same logic as homepage ProductCard
            const oosColors = new Set();
            const oosSizes = new Set();
            if (productVariants.length > 0) {
              productColors.forEach((c) => {
                if (!productVariants.some((v) => v.attributes?.color === c && ((v.quantity ?? v.stockQuantity) || 0) > 0)) oosColors.add(c);
              });
              productSizes.forEach((s) => {
                if (!productVariants.some((v) => v.attributes?.size === s && ((v.quantity ?? v.stockQuantity) || 0) > 0)) oosSizes.add(s);
              });
            }
            const selection = variantSelections[itemId] || {};
            const selColor = selection.selectedColor || '';
            const selSize = selection.selectedSize || '';
            const matchedVariant = hasVariants ? findMatchedVariant(p, selColor, selSize) : null;
            const hasAllSelections = (!productColors.length || selColor) && (!productSizes.length || selSize);

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

                  {/* Variant Selector — inline, same look as homepage ProductCard quick-add */}
                  {hasVariants && (
                    <div className="wishlist-variant-section space-y-2">
                      {/* Colors */}
                      {productColors.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Color{selColor ? <span className="text-gray-800 ml-1 font-bold">· {selColor}</span> : ''}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {productColors.map(c => {
                              const isOOS = oosColors.has(c);
                              const isSelected = selColor === c;
                              const thumb = getColorThumb(p, c);
                              return (
                                <button
                                  key={c}
                                  disabled={isOOS}
                                  onClick={(e) => { e.stopPropagation(); handleSelectColor(itemId, c); }}
                                  className={`relative w-6 h-6 rounded-[3px] overflow-hidden border-2 flex items-center justify-center transition-all duration-150 ${
                                    isSelected
                                      ? 'border-black scale-110 shadow-sm'
                                      : isOOS
                                      ? 'border-gray-200 opacity-30 cursor-not-allowed'
                                      : 'border-transparent hover:border-gray-300'
                                  }`}
                                  title={c}
                                >
                                  {thumb ? (
                                    <img src={thumb} alt={c} loading="lazy" className={`w-full h-full object-cover ${isOOS ? 'opacity-50' : ''}`} />
                                  ) : (
                                    <div
                                      className={`w-full h-full ${isOOS ? 'opacity-50' : ''}`}
                                      style={{ background: getColorHex(c) }}
                                    />
                                  )}
                                  {isOOS && (
                                    <span className="absolute inset-0 flex items-center justify-center">
                                      <svg viewBox="0 0 24 24" className="w-full h-full text-red-400 opacity-70" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <line x1="4" y1="4" x2="20" y2="20" />
                                      </svg>
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Sizes */}
                      {productSizes.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Size{selSize ? <span className="text-gray-800 ml-1 font-bold">· {selSize}</span> : ''}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {productSizes.map(s => {
                              const isOOS = oosSizes.has(s);
                              const isSelected = selSize === s;
                              return (
                                <button
                                  key={s}
                                  disabled={isOOS}
                                  onClick={(e) => { e.stopPropagation(); handleSelectSize(itemId, s); }}
                                  className={`px-2 py-1 text-[10px] font-bold rounded-[3px] transition-all duration-150 ${
                                    isOOS
                                      ? 'opacity-25 cursor-not-allowed text-gray-400 bg-gray-50 line-through'
                                      : isSelected
                                      ? 'bg-black text-white shadow-sm scale-[1.02]'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  {s}
                                </button>
                              );
                            })}
                          </div>
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
                        if (canAddToCart) handleAddToCart(item, e);
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
                      ) : hasVariants && !hasAllSelections ? (
                        <span>{t('product.select') || 'Select'}</span>
                      ) : hasVariants && hasAllSelections && !matchedVariant ? (
                        <span>{t('product.unavailable') || 'Unavailable'}</span>
                      ) : productUnavailable || isUnavailable ? (
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
