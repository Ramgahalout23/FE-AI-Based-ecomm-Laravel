import { ShoppingBag, AlertTriangle, Share2, Heart, ArrowRight, Package, User } from 'lucide-react';
import { useState, useEffect } from 'react';
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

  const handleAddToCart = async (item, e) => {
    const id = item.productId || item.id || item.product_id;
    if (addingIds.has(id)) return;

    setAddingIds(prev => new Set(prev).add(id));
    try {
      const p = item.product || item;
      // First add to cart via server API
      await cartAPI.add({ productId: id, quantity: 1 });
      // Then update local store
      addItem({
        ...item,
        productId: id,
        product: p,
        quantity: 1,
      });
      showSuccess(
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShoppingBag size={14} /> {t('product.add_to_cart')}
        </span>,
        { duration: 2500 }
      );
      openCart();
    } catch {
      showError(t('wishlist.not_found_desc'));
    } finally {
      setAddingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const getStockInfo = (item) => {
    const p = item.product || item;
    const qty = p.quantity ?? p.stockQuantity ?? item.quantity ?? item.stockQuantity;
    if (qty !== undefined && qty !== null && qty <= 0) return { status: 'out', label: t('wishlist.out_of_stock') };
    if (qty !== undefined && qty !== null && qty <= 5) return { status: 'low', label: t('wishlist.low_stock', { count: qty }) };
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
            const p = item.product || item;
            const stock = getStockInfo(item);
            const isOutOfStock = stock.status === 'out';
            const isAdding = addingIds.has(itemId);
            const imgUrl = item.image || getProductImage(p);
            const itemPrice = p.price ?? item.price;
            const itemOldPrice = p.oldPrice ?? item.oldPrice;
            const itemName = p.name || item.name;
            const itemSlug = p.slug || item.slug || slugify(itemName);
            const discount = itemOldPrice
              ? Math.round(((itemOldPrice - itemPrice) / itemOldPrice) * 100)
              : null;
            const displayPrice = itemPrice;

            return (
              <div
                key={itemId}
                className={`wishlist-item ${isOutOfStock ? 'out-of-stock' : ''}`}
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
                    <span className={`wishlist-stock-badge ${stock.status === 'out' ? 'out-of-stock' : 'low-stock'}`}>
                      {stock.status === 'out' ? 'Out of Stock' : 'Low Stock'}
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

                  <div className={`wishlist-item-stock ${stock.status === 'in' ? 'in-stock' : stock.status === 'low' ? 'low' : 'out'}`}>
                    {stock.status === 'in' ? (
                      <>✓ {t('wishlist.in_stock')}</>
                    ) : stock.status === 'low' ? (
                      <><AlertTriangle size={11} /> {stock.label}</>
                    ) : (
                      <><AlertTriangle size={11} /> {t('wishlist.out_of_stock')}</>
                    )}
                  </div>

                  {/* Action */}
                  <div className="wishlist-item-actions">
                    <button
                      className={`wishlist-add-cart-btn ${isOutOfStock || isAdding ? 'disabled' : ''}`}
                      onClick={(e) => !isOutOfStock && handleAddToCart(item, e)}
                      disabled={isOutOfStock || isAdding}
                    >
                      {isAdding ? (
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : isOutOfStock ? (
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
