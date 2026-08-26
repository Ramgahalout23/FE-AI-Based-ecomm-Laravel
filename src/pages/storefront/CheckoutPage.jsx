import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ShieldCheck, Truck, RefreshCw, Lock, ArrowRight, User, UserPlus, ExternalLink as ExternalLinkIcon, AlertTriangle } from 'lucide-react';
import { trackCheckoutStart, trackCheckoutComplete } from '../../services/tracker';
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import PasswordInput from '../../components/common/PasswordInput';
import { motion } from 'framer-motion';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';
import { cartAPI } from '../../api/cart';
import { checkoutAPI } from '../../api/checkout';
import { couponsAPI } from '../../api/coupons';
import { promotionsAPI } from '../../api/promotions';
import { formatCurrency, getImageUrl } from '../../utils/formatters';
import { calcBundleDiscount, calcTax, parseBundleTiers, isBundleOfferEnabled, getBestStoreOffer, roundINR } from '../../utils/constants';
import { showError, showSuccess, couponApplied, couponRemoved, fillRequiredFields, invalidCoupon, orderPlaced, paymentSuccessful, accountCreated } from '../../utils/toast';
import { paymentsAPI } from '../../api/payments';
import { ordersAPI } from '../../api/orders';
import { getPaymentIcon } from '../../utils/paymentIcons';
import { useSettings } from '../../store/useSettings';

// Standard built-in methods — shown instantly on page load (respecting admin
// toggles) while the settings-driven list is fetched from the API.
const DEFAULT_PAYMENT_METHODS = [
  { id: 'RAZORPAY', name: 'Razorpay', description: 'Pay via UPI, Card, NetBanking or Wallet' },
  { id: 'COD', name: 'Cash on Delivery', description: 'Pay when you receive your package' },
];

export default function CheckoutPage() {
  const { items, clearCart, setItems } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { getSetting } = useSettings();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Set to true once an order is successfully placed — the cart is then cleared
  // exactly once, on unmount (below), instead of before navigate(). Clearing
  // before navigating would re-render this page as an empty cart in the brief
  // window while the thank-you route mounts; deferring to unmount keeps the
  // cart untouched until this page is actually gone.
  const orderPlacedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (orderPlacedRef.current) {
        clearCart();
      }
    };
  }, [clearCart]);

  // Available (in-stock) items — the cart drawer, cart page and checkout all
  // compute their totals from this same set so every screen shows the same total.
  const availableItems = items.filter((item) => {
    const stock = item.variantStock ?? item.productStock;
    return stock === null || stock === undefined || stock > 0;
  });
  const availableSubtotal = availableItems.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0
  );
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [coupon, setCoupon] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [address, setAddress] = useState({
    firstName: '', lastName: '', addressLine1: '', addressLine2: '',
    city: '', state: '', zipCode: '', country: 'India', phone: '', email: ''
  });
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [gatewayRedirect, setGatewayRedirect] = useState(null);
  const [autoDiscount, setAutoDiscount] = useState(0);
  const [autoDiscountPromos, setAutoDiscountPromos] = useState([]);
  const [storeOffers, setStoreOffers] = useState([]);

  // COD restriction, OTP, and partial payment state
  const [codAvailable, setCodAvailable] = useState(true);
  const [codReason, setCodReason] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState(null);
  const [wantPartialPayment, setWantPartialPayment] = useState(false);

  // Check COD availability when pincode changes
  useEffect(() => {
    if (!address.zipCode || address.zipCode.length < 6) return;
    const checkCod = async () => {
      try {
        const res = await paymentsAPI.checkCodAvailability({ pincode: address.zipCode });
        const data = res.data?.data || res.data;
        setCodAvailable(data?.available !== false);
        setCodReason(data?.reason || '');
        if (data?.available === false && paymentMethod === 'COD') {
          // Auto-switch to Razorpay if COD is blocked
          setPaymentMethod('RAZORPAY');
          showError(data?.reason || 'COD is not available for this pincode');
        }
      } catch {
        setCodAvailable(true);
        setCodReason('');
      }
    };
    const timer = setTimeout(checkCod, 500); // debounce
    return () => clearTimeout(timer);
  }, [address.zipCode, paymentMethod]);

  // Payment methods render instantly on page load: derive them from the admin
  // settings already available via app-init, so disabled methods are hidden right
  // away. Falls back to the standard defaults if settings aren't loaded yet. The
  // API response (which also includes enabled custom gateways) takes precedence
  // once it arrives below.
  const seededMethods = useMemo(() => {
    const m = [];
    if (getSetting('razorpayEnabled', 'true') !== 'false') m.push(DEFAULT_PAYMENT_METHODS[0]);
    if (getSetting('codEnabled', 'true') !== 'false') m.push(DEFAULT_PAYMENT_METHODS[1]);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const displayMethods = paymentMethods.length > 0 ? paymentMethods : (seededMethods.length > 0 ? seededMethods : DEFAULT_PAYMENT_METHODS);

  // ── Client-side store offer calculation (works for ALL users, guest or authenticated) ──
  // Mirrors backend FlashSaleService logic: picks the BEST single offer, does NOT stack.
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const res = await promotionsAPI.getStoreOffers();
        const data = res.data?.data || res.data || [];
        setStoreOffers(Array.isArray(data) ? data : []);
      } catch {
        // Offers are optional
      }
    };
    fetchOffers();
  }, []);

  // Calculate auto-discount from store offers based on cart items (per-item caps
  // mirrored from backend FlashSaleService so the shown amount == the charged
  // amount). Picks the BEST single offer, does NOT stack. For authenticated
  // users the server summary may carry flash-sale discounts, so this effect
  // never zeroes that value out when no store offer qualifies. Setters compare
  // the previous value so an unstable availableItems reference never loops.
  useEffect(() => {
    const bestOffer = getBestStoreOffer(availableItems, storeOffers);
    const roundedDiscount = bestOffer?.amount || 0;
    if (!isAuthenticated && roundedDiscount <= 0) {
      // Guest users have no server summary — clear when no offer qualifies.
      // Functional updates that bail out keep this idempotent: availableItems
      // is a fresh array reference every render, and setAutoDiscountPromos([])
      // would otherwise schedule a state change each render → infinite loop
      // (frozen guest checkout / vitest worker crash).
      setAutoDiscount((prev) => (prev === 0 ? prev : 0));
      setAutoDiscountPromos((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    if (roundedDiscount > 0) {
      setAutoDiscount((prev) => (prev === roundedDiscount ? prev : roundedDiscount));
      const promo = [{
        id: bestOffer.id,
        title: bestOffer.highlight,
        discountLabel: `-${formatCurrency(roundedDiscount)}`,
        offerBadge: bestOffer.badge,
        offerHighlight: bestOffer.highlight,
        offerTagline: bestOffer.tagline,
      }];
      setAutoDiscountPromos((prev) => {
        const same = (prev[0]?.id ?? null) === (promo[0]?.id ?? null) &&
          (prev[0]?.discountLabel ?? null) === (promo[0]?.discountLabel ?? null);
        return same ? prev : promo;
      });
    }
  }, [storeOffers, availableItems, isAuthenticated]);

  // ── Server summary fetch (authenticated users only — includes flash sales + exact server calc) ──
  // Sync cart from server on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    const syncCart = async () => {
      try {
        const res = await cartAPI.get();
        const data = res.data?.data || res.data;
        if (data?.items?.length > 0) {
          setItems(data.items);
        }
      } catch {
        // Keep local state if server fetch fails
      }
    };
    syncCart();
  }, [setItems, isAuthenticated]);

  // Fetch checkout summary to get auto-applied discounts (flash sales, store offers)
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchSummary = async () => {
      try {
        const res = await checkoutAPI.getSummary();
        const data = res.data?.data || res.data || {};
        if (data.flashSaleDiscount > 0) {
          setAutoDiscount(data.flashSaleDiscount);
        }
        if (data.flashSalePromotions?.length > 0) {
          setAutoDiscountPromos(data.flashSalePromotions);
        }
      } catch {
        // Summary is optional — silently ignore
      }
    };
    fetchSummary();
  }, [isAuthenticated]);

  // Fetch available coupons for user to pick from
  useEffect(() => {
    const fetchCoupons = async () => {
      setCouponsLoading(true);
      try {
        const res = await couponsAPI.getPublic();
        const data = res.data?.data || res.data || [];
        setAvailableCoupons(Array.isArray(data) ? data : []);
      } catch {
        // Coupons are optional — silently ignore
      } finally { setCouponsLoading(false); }
    };
    fetchCoupons();
  }, []);

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const res = await paymentsAPI.getMethods();
        const data = res.data?.data || res.data;
        if (Array.isArray(data) && data.length > 0) {
          setPaymentMethods(data);
          setPaymentMethod(data[0].id);
        } else {
          setPaymentMethods([
            { id: 'COD', name: 'Cash on Delivery', description: 'Pay when you receive package' }
          ]);
          setPaymentMethod('COD');
        }
      } catch (err) {
        console.error('Failed to load payment methods', err);
        setPaymentMethods([
          { id: 'COD', name: 'Cash on Delivery', description: 'Pay when you receive package' }
        ]);
        setPaymentMethod('COD');
      }
    };
    fetchMethods();
  }, []);

  // Buy More, Save More — per-line volume discount based on each line's quantity.
  // Only applies when activated in Admin → Settings; tiers are admin-configurable.
  // Excludes OOS lines (consistent with CartPage/CartDrawer which compute from availableItems).
  const bundleOfferEnabled = isBundleOfferEnabled(getSetting);
  const bundleTiers = parseBundleTiers(getSetting('bundleTiers'));
  const bundleDiscount = bundleOfferEnabled
    ? calcBundleDiscount(availableItems, bundleTiers)
    : 0;

  // Tax — honors the admin's taxCalculation setting (mirrors backend CheckoutService::calculateTax):
  // 'inclusive' → prices already include tax → 0 added; 'exclusive' → tax added on top of subtotal.
  const taxCalculation = getSetting('taxCalculation', 'inclusive');
  const taxRate = Number(getSetting('taxRate', '18.0')) || 0;
  const tax = calcTax(availableSubtotal, taxCalculation, taxRate);

  // Shipping — same settings as the cart page (mirrors backend CheckoutService::getSummary)
  const freeShippingThreshold = Number(getSetting('freeShippingThreshold', '499'));
  const shippingFlatRate = Number(getSetting('shippingFlatRate', '50'));
  const shippingCost = availableSubtotal >= freeShippingThreshold ? 0 : shippingFlatRate;
  const totalDiscount = discount + autoDiscount + bundleDiscount;
  // Whole-rupee total — discounts/tax are rounded to whole rupees at the source,
  // so this equals the sum of the displayed line items (and is what the payment
  // gateway charges, keeping display and charge in sync).
  const total = roundINR(availableSubtotal - totalDiscount + tax + shippingCost);

  const handleApplyCoupon = async (code) => {
    const codeToApply = code || coupon.trim();
    if (!codeToApply) {
      showError('Please enter a coupon code');
      return;
    }
    setCouponLoading(true);
    try {
      const res = await checkoutAPI.applyCoupon({ code: codeToApply, subtotal: availableSubtotal });
      const payload = res.data?.data || res.data || {};
      // Round to whole rupees so the displayed coupon line matches the value used in the total
      const discountAmount = roundINR(payload.discountAmount || payload.discount || 0);
      if (discountAmount > 0) {
        setDiscount(discountAmount);
        setAppliedCoupon(codeToApply);
        if (code) setCoupon(code);
        couponApplied(formatCurrency(discountAmount));
      } else {
        invalidCoupon();
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Invalid coupon code';
      showError(msg);
    } finally { setCouponLoading(false); }
  };

  const handleRemoveCoupon = async () => {
    try {
      await checkoutAPI.removeCoupon();
    } catch { /* ignore server error */ }
    setCoupon('');
    setAppliedCoupon('');
    setDiscount(0);
    couponRemoved();
  };

  // Load Razorpay checkout script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Handle authentication tokens from checkout response
  // Guest users always receive a token so the thank-you page can authenticate.
  // Account creation is separate — only fire the toast if opted in.
  const handleCheckoutAuth = (data) => {
    // Save token for ALL guest users (regardless of createAccount)
    if (data?.tokens?.accessToken) {
      localStorage.setItem('authToken', data.tokens.accessToken);
      if (data.tokens.refreshToken) {
        localStorage.setItem('refreshToken', data.tokens.refreshToken);
      }
      // Sync the auth store immediately — otherwise ProtectedRoute pages
      // (e.g. /orders/:id opened from a notification) redirect to /login right
      // after a guest checkout, even though the token is valid.
      if (data?.user) {
        useAuthStore.getState().setUser(data.user);
      } else {
        useAuthStore.getState().init();
      }
    }
    // Only fire the "account created" toast if the user explicitly opted in
    // (the session itself was already established above via setUser/init).
    if (data?.accountCreated) {
      accountCreated();
    }
  };

  const sendOtp = async () => {
    setOtpLoading(true);
    try {
      const res = await paymentsAPI.generateOtp();
      const data = res.data?.data || res.data;
      setOtpSent(true);
      if (data?.expiresAt) setOtpExpiry(new Date(data.expiresAt));
      if (data?.otp) {
        // Dev mode: auto-fill OTP
        setOtpCode(data.otp);
        showSuccess(`OTP sent! (Dev: ${data.otp})`);
      } else {
        showSuccess('OTP sent to your phone number');
      }
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!address.firstName || !address.lastName || !address.addressLine1 || !address.city || !address.phone) {
      fillRequiredFields();
      return;
    }
    if (!isAuthenticated && createAccount) {
      if (!address.email) {
        showError('Please enter your email to create an account');
        return;
      }
      if (!password || password.length < 8) {
        showError('Password must be at least 8 characters');
        return;
      }
    }
    // Validate COD OTP if enabled
    if (paymentMethod === 'COD' && getSetting('orderOtpEnabled', 'false') === 'true') {
      if (!otpCode || otpCode.length !== 6) {
        showError('Please enter the 6-digit OTP to verify your COD order');
        return;
      }
    }
    // Validate COD is available
    if (paymentMethod === 'COD' && !codAvailable) {
      showError(codReason || 'COD is not available for this pincode');
      return;
    }
    // Validate we have items before proceeding
    if (!items || items.length === 0) {
      showError('Your cart is empty. Please add items before checking out.');
      return;
    }
    // Only send in-stock items — out-of-stock ones are shown for reference and
    // excluded from the total (consistent with the cart page), so they must not
    // be charged. This makes the displayed total match what is actually ordered.
    const availableCheckoutItems = items.filter((item) => {
      const stock = item.variantStock ?? item.productStock;
      return stock === null || stock === undefined || stock > 0;
    });
    if (availableCheckoutItems.length === 0) {
      showError('All items in your cart are out of stock. Please remove them or save them for later.');
      return;
    }
    setProcessing(true);
    try {
      // Build item payload with price and name for better validation
      const checkoutItems = availableCheckoutItems.map((i) => ({
        productId: i.productId || i.id,
        quantity: i.quantity,
        name: i.name || '',
        size: i.size,
        color: i.color,
        variantId: i.variantId,
        price: i.price,
        isCustom: i.isCustom || false,
        customDesign: i.customDesign || null,
      }));
      // Debug: log items being sent
      console.log('[Checkout] Sending items:', JSON.stringify(checkoutItems));

      // Track checkout start
      trackCheckoutStart(total, items.length);

      // Step 1: Create the order (this creates order + PENDING payment)
      const res = await checkoutAPI.process({
        items: checkoutItems,
        shippingAddress: address,
        paymentMethod,
        couponCode: coupon || undefined,
        notes: notes || undefined,
        shippingMethod: 'STANDARD',
        createAccount,
        password: createAccount ? password : undefined,
        // COD restrictions & OTP
        codPincode: address.zipCode || undefined,
        otpCode: paymentMethod === 'COD' && otpCode ? otpCode : undefined,
        partialPayment: paymentMethod === 'COD' && wantPartialPayment ? true : undefined,
      });

      const data = res.data?.data || res.data;
      const orderId = data?.order?.id || data?.id;

      if (!orderId) {
        throw new Error('No order ID returned');
      }

      // Warn the user if some items were skipped (products no longer in database)
      const skippedItems = data?.skippedItems || [];
      if (skippedItems.length > 0) {
        showSuccess(
          `Some items were skipped because they are no longer available. ` +
          `Your order has been placed with the remaining items.`
        );
      }

      handleCheckoutAuth(data);

      // Step 2: Handle payment flow based on payment method
      if (paymentMethod === 'RAZORPAY') {
        await handleRazorpayPayment(orderId);
      } else if (['COD', 'CASH'].includes(paymentMethod)) {
        // COD — order placed, just redirect (cart clears on page unmount)
        orderPlacedRef.current = true;
        queryClient.invalidateQueries({ queryKey: ['product'] });
        queryClient.invalidateQueries({ queryKey: ['cart'] });
        trackCheckoutComplete(orderId, total);
        orderPlaced(orderId);
        navigate(`/order/thank-you/${orderId}`);
      } else {
        // Custom gateway — initiate and redirect user to the gateway's payment page
        try {
          const returnUrl = `${window.location.origin}/order/thank-you`;
          const gwRes = await paymentsAPI.initiateCustomGateway({
            gatewayId: paymentMethod,
            orderId,
            amount: total,
            returnUrl,
          });

          const gwData = gwRes.data?.data || gwRes.data || {};
          const redirectTo = gwData.redirectUrl;

          if (redirectTo) {
            // Show overlay then redirect to gateway
            setGatewayRedirect({
              url: redirectTo,
              orderId,
              gatewayName: gwData.gatewayName || paymentMethod,
            });
          } else {
            // No redirect URL — just go to thank-you page
            orderPlacedRef.current = true;
            queryClient.invalidateQueries({ queryKey: ['product'] });
            queryClient.invalidateQueries({ queryKey: ['cart'] });
            trackCheckoutComplete(orderId, total);
            orderPlaced(orderId);
            navigate(`/order/thank-you/${orderId}`);
          }
        } catch (gwErr) {
          const msg = gwErr?.response?.data?.message || 'Custom gateway initiation failed';
          console.warn('[Checkout] Custom gateway error:', msg);
          // Order was already created — redirect to thank-you page anyway
          orderPlacedRef.current = true;
          queryClient.invalidateQueries({ queryKey: ['product'] });
          queryClient.invalidateQueries({ queryKey: ['cart'] });
          orderPlaced(orderId);
          navigate(`/order/thank-you/${orderId}`);
        }
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Checkout failed';
      console.error('[Checkout] Error:', JSON.stringify(err?.response?.data || { message: err?.message }, null, 2));
      showError(msg);
    } finally { setProcessing(false); }
  };

  /**
   * Handle Razorpay payment flow:
   * 1. Create Razorpay order on backend
   * 2. Open Razorpay checkout modal
   * 3. On success, verify payment on backend
   * 4. Redirect to order page
   */
  const handleRazorpayPayment = async (orderId) => {
    try {
      // Create Razorpay order via backend
      const rzpRes = await paymentsAPI.createRazorpayOrder({
        orderId,
        amount: total,
      });

      const rzpData = rzpRes.data?.data || rzpRes.data;
      const { razorpayOrderId, keyId } = rzpData;

      if (!razorpayOrderId || !keyId) {
        throw new Error('Failed to create Razorpay order');
      }

      // Load Razorpay checkout script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay checkout. Please try again.');
      }

      // Open Razorpay modal
      const options = {
        key: keyId,
        amount: Math.round(total * 100), // paise
        currency: 'INR',
        name: 'LUXE',
        description: `Order #${orderId.slice(-8).toUpperCase()}`,
        order_id: razorpayOrderId,
        prefill: {
          name: `${address.firstName} ${address.lastName}`,
          email: address.email,
          contact: address.phone,
        },
        theme: { color: '#000000' },
        handler: async (response) => {
          // Payment successful — verify on backend
          try {
            await paymentsAPI.verifyRazorpayPayment({
              orderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
            });

            orderPlacedRef.current = true;
            queryClient.invalidateQueries({ queryKey: ['product'] });
            queryClient.invalidateQueries({ queryKey: ['cart'] });
            trackCheckoutComplete(orderId, total);
            paymentSuccessful(orderId);
            navigate(`/order/thank-you/${orderId}`);
          } catch {
            showError('Payment received but verification failed. Contact support.');
            navigate(`/order/thank-you/${orderId}`);
          }
        },
        modal: {
          ondismiss: () => {
            showError('Payment cancelled. Your order is saved in pending state.');
            setProcessing(false);
            navigate(`/order/thank-you/${orderId}`);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        showError('Payment failed: ' + (response.error?.description || 'Unknown error'));
        setProcessing(false);
        navigate(`/order/thank-you/${orderId}`);
      });
      rzp.open();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Razorpay payment failed';
      showError(msg);
      setProcessing(false);
      // Still navigate so user can see their order and retry payment
      navigate(`/order/thank-you/${orderId}`);
    }
  };

  // Gateway redirect overlay with polling
  const [pollingStatus, setPollingStatus] = useState('waiting'); // waiting | checking | paid | failed

  const checkPaymentStatus = useCallback(async () => {
    if (!gatewayRedirect) return;
    setPollingStatus('checking');
    try {
      const res = await ordersAPI.getById(gatewayRedirect.orderId);
      const orderData = res.data?.data || res.data || {};
      const paymentStatus = orderData.payment?.[0]?.status || orderData.paymentStatus;
      const orderStatus = orderData.status;

      if (paymentStatus === 'COMPLETED' || orderStatus === 'CONFIRMED' || orderStatus === 'PROCESSING') {        setPollingStatus('paid');
                orderPlacedRef.current = true;
        queryClient.invalidateQueries({ queryKey: ['product'] });
        queryClient.invalidateQueries({ queryKey: ['cart'] });
        trackCheckoutComplete(gatewayRedirect.orderId, total);
                setTimeout(() => {
          navigate(`/order/thank-you/${gatewayRedirect.orderId}`);
                }, 1500);
        return true;
      } else if (paymentStatus === 'FAILED') {
        setPollingStatus('failed');
        return true;
      }
    } catch {
      // Silently retry
    }
    setPollingStatus('waiting');
    return false;
  }, [gatewayRedirect, navigate, queryClient, total]);

  // Auto-poll every 5 seconds while on this page
  useEffect(() => {
    if (!gatewayRedirect) return;
    checkPaymentStatus();
    const interval = setInterval(checkPaymentStatus, 5000);
    return () => clearInterval(interval);
  }, [gatewayRedirect, checkPaymentStatus]);

  if (gatewayRedirect) {
    const isPaid = pollingStatus === 'paid';
    const isFailed = pollingStatus === 'failed';
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-white to-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          {isPaid ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <motion.path
                  d="M10 20l7 7 13-13"
                  stroke="#16a34a"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5 }}
                />
              </svg>
            </motion.div>
          ) : isFailed ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <motion.path
                  d="M12 12l16 16M28 12l-16 16"
                  stroke="#dc2626"
                  strokeWidth="4"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5 }}
                />
              </svg>
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <ExternalLinkIcon size={36} className="text-indigo-600" />
            </motion.div>
          )}

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display text-2xl font-bold text-gray-900 mb-2"
          >
            {isPaid ? 'Payment Confirmed! 🎉' : isFailed ? 'Payment Failed' : `Pay with ${gatewayRedirect.gatewayName}`}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-gray-500 text-sm mb-8"
          >
            {isPaid
              ? "Your payment was successful! We're redirecting you to your order."
              : isFailed
              ? 'Your payment could not be processed. You can retry or choose a different method.'
              : 'Complete your payment on the gateway site. We\'ll check for confirmation automatically.'}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            {!isPaid && !isFailed && (
              <>
                <motion.button
                  onClick={() => {
                    window.open(gatewayRedirect.url, '_blank');
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-black text-white py-4 px-6 rounded-xl font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-3 shadow-lg"
                >
                  <ExternalLinkIcon size={20} />
                  Open {gatewayRedirect.gatewayName}
                </motion.button>

                <button
                  onClick={checkPaymentStatus}
                  disabled={pollingStatus === 'checking'}
                  className="w-full py-3 px-6 rounded-xl font-medium text-gray-600 hover:text-black border border-gray-200 hover:border-gray-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {pollingStatus === 'checking' ? (
                    <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full" /> Checking...</>
                  ) : (
                    <>Already paid? Check Status</>
                  )}
                </button>
              </>
            )}

            {isFailed && (
              <>
                <motion.button
                  onClick={() => {
                    window.open(gatewayRedirect.url, '_blank');
                  }}
                  whileHover={{ scale: 1.02 }}
                  className="w-full bg-black text-white py-4 px-6 rounded-xl font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-3 shadow-lg"
                >
                  <ExternalLinkIcon size={20} />
                  Retry Payment
                </motion.button>
                <Link
                  to={`/order/thank-you/${gatewayRedirect.orderId}`}
                  className="block w-full py-3 px-6 rounded-xl font-medium text-gray-500 hover:text-black border border-gray-200 hover:border-gray-400 transition-all text-center"
                >
                  View Order & Try Again Later
                </Link>
              </>
            )}

            {!isFailed && !isPaid && (
              <Link
                to={`/order/thank-you/${gatewayRedirect.orderId}`}
                className="block text-sm text-gray-400 hover:text-gray-700 transition-colors underline underline-offset-2"
              >
                Skip — go to order page
              </Link>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="page-content bg-white flex-1">
        <SEOHead
          title="Secure Checkout | Threvolt"
          description="Complete your purchase securely at Threvolt."
          noIndex={true}
        />
        <div className="max-w-lg mx-auto px-4 pt-6 sm:pt-8">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Checkout' },
            ]}
            variant="light"
            className="mb-8"
          />
        </div>
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-6">🛒</div>
          <h2 className="font-display text-2xl font-bold text-black mb-3">Your cart is empty</h2>
          <p className="text-gray-500 mb-8">Add some products to get started!</p>
          <Link to="/products" className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors">
            Shop Now <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content bg-white flex-1">
      <SEOHead
        title="Secure Checkout | Threvolt"
        description="Complete your purchase securely at Luxe. Multiple payment options available with easy returns and free shipping on orders above ₹499."
        noIndex={true}
      />
      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 pt-6 sm:pt-8">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Checkout' },
          ]}
          variant="light"
        />
      </div>

      {/* Progress Steps Bar - Clickable */}
      <div className="border-b bg-gray-50 mt-4 sm:mt-6">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm overflow-x-auto">
            <button
              onClick={() => navigate('/cart')}
              className="flex items-center gap-1 px-2 py-1 rounded transition-colors text-gray-500 hover:text-black"
            >
              <span className="font-medium">Cart</span>
            </button>
            <ChevronLeft size={12} className="rotate-180 text-gray-300 shrink-0" />
            <button
              onClick={() => document.querySelector('.shipping-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="flex items-center gap-1 px-2 py-1 rounded transition-colors text-black font-medium hover:bg-black/5"
            >
              <span className="font-medium">Information</span>
            </button>
            <ChevronLeft size={12} className="rotate-180 text-gray-300 shrink-0" />
            <button
              onClick={() => document.querySelector('.payment-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="flex items-center gap-1 px-2 py-1 rounded transition-colors text-black font-medium hover:bg-black/5"
            >
              <span className="font-medium">Payment</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Back to Cart Link */}
          <button onClick={() => navigate('/cart')} className="flex items-center gap-2 text-gray-500 hover:text-black mb-0 transition-colors md:hidden -ml-1">
            <ChevronLeft size={18} /> Back to cart
          </button>

          {/* ── Shipping Address (1st on mobile, left col on desktop) ── */}
          <div className="shipping-section order-1 md:col-start-1 md:row-start-1">
            {/* Back to Cart Link - desktop only */}
            <button onClick={() => navigate('/cart')} className="hidden md:flex items-center gap-2 text-gray-500 hover:text-black mb-6 transition-colors">
              <ChevronLeft size={18} /> Back to cart
            </button>

            {/* Login Prompt for guest checkout */}
            {!isAuthenticated && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-black">Already have an account?</p>
                    <Link to="/login?redirect=/checkout" className="text-sm text-black underline">Sign in for faster checkout</Link>
                  </div>
                </div>
              </div>
            )}

            <h2 className="font-display text-xl font-bold text-black mb-4">Shipping Address</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkout-firstname" className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    id="checkout-firstname"
                    value={address.firstName}
                    onChange={(e) => setAddress({ ...address, firstName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors"
                    placeholder="First name"
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-lastname" className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    id="checkout-lastname"
                    value={address.lastName}
                    onChange={(e) => setAddress({ ...address, lastName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors"
                    placeholder="Last name"
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="checkout-email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  id="checkout-email"
                  type="email"
                  value={address.email}
                  onChange={(e) => setAddress({ ...address, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors"
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="checkout-address1" className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <input
                  id="checkout-address1"
                  value={address.addressLine1}
                  onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors"
                  placeholder="House No., Street, Area"
                  autoComplete="address-line1"
                />
              </div>
              <div>
                <label htmlFor="checkout-address2" className="block text-sm font-medium text-gray-700 mb-1">Apartment, suite, etc. (optional)</label>
                <input
                  id="checkout-address2"
                  value={address.addressLine2}
                  onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors"
                  placeholder="Apartment, suite, etc."
                  autoComplete="address-line2"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkout-city" className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    id="checkout-city"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors"
                    placeholder="City"
                    autoComplete="address-level2"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-state" className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <input
                    id="checkout-state"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors"
                    placeholder="State"
                    autoComplete="address-level1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkout-pincode" className="block text-sm font-medium text-gray-700 mb-1">PIN Code *</label>
                  <input
                    id="checkout-pincode"
                    value={address.zipCode}
                    onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors"
                    placeholder="6-digit PIN"
                    autoComplete="postal-code"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    id="checkout-phone"
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors"
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                  />
                </div>
              </div>
              {/* Additional Comments / Order Notes */}
              <div>
                <label htmlFor="checkout-notes" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Additional Comments <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="checkout-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors resize-none text-sm"
                  placeholder="Special instructions, delivery preferences, etc."
                />
              </div>

              {/* Create Account Option — Prominent Card */}
              {!isAuthenticated && (
                <div className={`mt-6 rounded-xl border-2 transition-all duration-200 ${
                  createAccount
                    ? 'border-black bg-black/[0.03]'
                    : 'border-gray-200 bg-gray-50'
                }`}>
                  <label className="flex items-start gap-4 p-4 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={createAccount}
                      onChange={(e) => setCreateAccount(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200 ${
                      createAccount
                        ? 'bg-black border-black'
                        : 'border-gray-300 bg-white'
                    }`}>
                      {createAccount && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <UserPlus size={18} className="text-black shrink-0" />
                        <span className="font-semibold text-black">Create an account</span>
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          UNLOCK PERKS
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Save your details for one-click checkout next time</p>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
                        <span className="text-xs text-gray-500 flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Faster checkout
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Track orders
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Exclusive offers
                        </span>
                      </div>
                    </div>
                  </label>

                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    createAccount ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="px-4 pb-4 border-t border-gray-200/50 mt-1 pt-3">
                      <label htmlFor="checkout-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Set a password <span className="text-gray-400 font-normal">(min. 8 chars)</span>
                      </label>
                      <div className="relative">
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <PasswordInput
                          id="checkout-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all bg-white"
                          placeholder="Create a secure password"
                          autoComplete="new-password"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5">
                        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        You'll be automatically logged in after checkout
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Order Summary (2nd on mobile, right col on desktop) ── */}
          <div className="order-summary order-2 md:col-start-2 md:row-start-1 lg:sticky lg:top-8 h-fit">
            <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6">
              <h3 className="font-display text-lg font-bold text-black mb-4">Order Summary</h3>

              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {items.map((item) => {
                  const itemStock = item.variantStock ?? item.productStock;
                  const isOOS = itemStock !== null && itemStock !== undefined && itemStock <= 0;
                  return (
                  <div key={item.id} className={`flex gap-4 ${isOOS ? 'opacity-60' : ''}`}>
                    <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        <img loading="lazy" src={getImageUrl(item.imageUrl)} alt={item.name} className={`w-full h-full object-cover ${isOOS ? 'grayscale' : ''}`} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">{item.image || '👕'}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm line-clamp-1 ${isOOS ? 'text-gray-400' : 'text-black'}`}>{item.name}</p>
                      {(item.size || item.color) && (
                        <p className="text-gray-500 text-xs mt-0.5">
                          {[item.size, item.color].filter(Boolean).join(' / ')}
                        </p>
                      )}
                      <p className={`text-sm ${isOOS ? 'text-gray-400' : 'text-gray-500'}`}>Qty: {item.quantity}</p>
                      {isOOS && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full mt-1 border border-red-200">
                          <AlertTriangle size={10} />
                          Out of Stock
                        </span>
                      )}
                      {!isOOS && itemStock !== null && itemStock !== undefined && itemStock <= 5 && itemStock > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Only {itemStock} left
                        </span>
                      )}
                    </div>
                    <p className={`font-semibold ${isOOS ? 'text-gray-400 line-through' : 'text-black'}`}>{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                );})}
              </div>

              {/* Coupon */}                {/* Auto-applied store offers / flash sales */}
                {autoDiscountPromos.length > 0 && (
                  <div className="mb-3 flex flex-col gap-2">
                    {autoDiscountPromos.map((promo) => (
                      <div
                        key={promo.id}
                        className="flex items-center justify-between px-3 py-2.5 bg-gray-900 border border-gray-700/50 rounded-lg shadow-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold text-white bg-white/15 px-1.5 py-0.5 rounded shrink-0">
                            {promo.offerBadge || 'OFFER'}
                          </span>
                          <span className="text-xs font-semibold text-white/90 truncate">
                            {promo.offerHighlight || promo.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-white/70 font-medium shrink-0 ml-2">
                          {promo.discountLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {discount > 0 && appliedCoupon ? (
                <div className="flex items-center justify-between mb-6 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-green-700 font-semibold text-sm uppercase">{appliedCoupon}</span>
                    <span className="text-green-600 text-xs">-{formatCurrency(discount)}</span>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-green-600 hover:text-red-600 transition-colors p-1"
                    title="Remove coupon"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-3">
                    <input
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm"
                      placeholder="Coupon code"
                      value={coupon}
                      onChange={(e) => {
                        setCoupon(e.target.value);
                        if (appliedCoupon) { setAppliedCoupon(''); setDiscount(0); }
                      }}
                    />
                    <button
                      onClick={() => handleApplyCoupon()}
                      disabled={couponLoading}
                      className="px-4 py-2 text-sm font-medium text-black border border-gray-200 rounded-xl hover:border-black transition-colors disabled:opacity-50"
                    >
                      {couponLoading ? 'Applying...' : 'Apply'}
                    </button>
                  </div>
                  {!couponsLoading && availableCoupons.length > 0 && (
                    <div className="mb-6">
                      <p className="text-xs text-gray-500 mb-2 font-medium">Available coupons</p>
                      <div className="flex flex-wrap gap-2">
                        {availableCoupons.map((c) => {
                          const isUsed = appliedCoupon === c.code;
                          const desc = c.discountType === 'PERCENTAGE'
                            ? `${c.discountValue}% OFF`
                            : formatCurrency(c.discountValue) + ' OFF';
                          return (
                            <button
                              key={c.code}
                              onClick={() => {
                                if (!isUsed) {
                                  setCoupon(c.code);
                                  handleApplyCoupon(c.code);
                                }
                              }}
                              disabled={isUsed}
                              className={`group relative px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                                isUsed
                                  ? 'border-green-300 bg-green-50 text-green-700 cursor-default'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-black hover:bg-gray-50 cursor-pointer'
                              }`}
                              title={c.description || desc}
                            >
                              <span className="uppercase tracking-wide">{c.code}</span>
                              <span className={`ml-1.5 ${isUsed ? 'text-green-600' : 'text-gray-400 group-hover:text-black'}`}>
                                {desc}
                              </span>
                              {c.minOrderValue > 0 && (
                                <span className="block text-[10px] text-gray-400 font-normal mt-0.5">
                                  Min. {formatCurrency(c.minOrderValue)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Price Breakdown */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-black">{formatCurrency(availableSubtotal)}</span>
                </div>
                {autoDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Store Offer Discount</span>
                    <span className="text-gray-700">-{formatCurrency(autoDiscount)}</span>
                  </div>
                )}
                {bundleDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Bundle Discount</span>
                    <span className="text-emerald-600">-{formatCurrency(bundleDiscount)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Coupon Discount</span>
                    <span className="text-green-600">-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-black">{shippingCost === 0 ? 'Free' : formatCurrency(shippingCost)}</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax ({taxRate}%)</span>
                    <span className="text-black">{formatCurrency(tax)}</span>
                  </div>
                )}
                {items.some(item => {
                  const s = item.variantStock ?? item.productStock;
                  return s !== null && s !== undefined && s <= 0;
                }) && (
                  <div className="flex items-start gap-1.5 pt-1">
                    <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-amber-700 leading-relaxed">
                      Out-of-stock items are shown for reference and excluded from your total. They are skipped when your order is placed.
                    </p>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-3 border-t">
                  <span className="text-black">Total</span>
                  <span className="text-black">{formatCurrency(total)}</span>
                </div>
                {taxCalculation === 'inclusive' && (
                  <p className="text-[10px] text-gray-400 text-right">Inclusive of all taxes</p>
                )}
              </div>

              {/* Trust Badges */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 pt-4 border-t"
              >
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    { icon: ShieldCheck, label: 'Secure', sub: 'Payment' },
                    { icon: Truck, label: 'Free', sub: 'Shipping' },
                    { icon: RefreshCw, label: 'Easy', sub: 'Returns' },
                  ].map((badge, i) => {
                    const IconComponent = badge.icon;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                        className="group"
                      >
                        <div className="relative w-10 h-10 rounded-full bg-gray-50 border border-gray-100/80 flex items-center justify-center mx-auto mb-1.5 md:group-hover:bg-white md:group-hover:border-gray-200 md:group-hover:shadow-md md:group-hover:shadow-gray-200/50 md:group-hover:scale-110 transition-all duration-500 ease-out overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-100/0 to-gray-100/0 md:group-hover:from-gray-100/30 md:group-hover:to-transparent transition-all duration-500" />
                          <IconComponent className="relative w-[17px] h-[17px] text-black md:group-hover:scale-110 transition-all duration-500 ease-out" />
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium md:group-hover:text-gray-600 transition-colors duration-300">
                          {badge.label}<br/>{badge.sub}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </div>

          {/* ── Payment Methods (3rd on mobile, left col 2nd row on desktop) ── */}
          <div className="payment-section order-3 md:col-start-1 md:row-start-2">
            <h2 className="font-display text-xl font-bold text-black mb-4">Payment Method</h2>
            <div className="space-y-3">
              {displayMethods.map((m) => {
                const { icon: IconComponent, bg: iconBg, color: iconColor } = getPaymentIcon(m.id);
                const isSelected = paymentMethod === m.id;
                return (
                  <label
                    key={m.id}
                    className={`group flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      isSelected ? 'border-black bg-black/5' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={isSelected}
                      onChange={() => setPaymentMethod(m.id)}
                      className="w-4 h-4 text-black shrink-0"
                    />
                    <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105 ${
                      isSelected ? 'scale-110 shadow-md' : ''
                    }`}>
                      <IconComponent size={22} className={`${iconColor} transition-all duration-300 ${
                        isSelected ? 'scale-110' : ''
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-black text-sm">{m.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* ── COD OTP Verification ── */}
            {paymentMethod === 'COD' && getSetting('orderOtpEnabled', 'false') === 'true' && (
              <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={16} className="text-green-600" />
                  <p className="text-sm font-semibold text-black">Verify with OTP</p>
                </div>
                <p className="text-xs text-gray-500 mb-3">A 6-digit code will be sent to your phone to confirm this COD order.</p>
                {!otpSent ? (
                  <button onClick={sendOtp} disabled={otpLoading}
                    className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-black transition-colors disabled:opacity-50">
                    {otpLoading ? 'Sending...' : 'Send OTP to my phone'}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input type="text" inputMode="numeric" maxLength={6} value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit OTP"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent outline-none" />
                    <button onClick={sendOtp} disabled={otpLoading}
                      className="text-xs text-gray-500 hover:text-black underline whitespace-nowrap">
                      {otpLoading ? 'Resending...' : 'Resend'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── COD Unavailable Warning ── */}
            {paymentMethod === 'COD' && !codAvailable && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-600" />
                  <p className="text-sm text-red-700 font-medium">{codReason || 'COD is not available for this pincode'}</p>
                </div>
              </div>
            )}

            {/* ── Partial Payment Option ── */}
            {paymentMethod === 'COD' && getSetting('partialPaymentEnabled', 'false') === 'true' && total >= parseFloat(getSetting('partialPaymentMinAmount', '999')) && (
              <div className="mt-4 p-4 border border-gray-200 rounded-xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={wantPartialPayment}
                    onChange={e => setWantPartialPayment(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-black rounded" />
                  <div>
                    <p className="text-sm font-semibold text-black">Pay now, rest on delivery</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Pay {getSetting('partialPaymentPercentage', '50')}% advance ({formatCurrency(total * parseFloat(getSetting('partialPaymentPercentage', '50')) / 100)}) now, rest on delivery.
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Place Order Button */}
            <div className="border-t pt-6 mt-6">
              <button
                onClick={handleCheckout}
                disabled={processing}
                className="w-full bg-black text-white py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                {processing ? (
                  'Processing...'
                ) : (
                  <>
                    <Lock size={18} /> Place Order - {formatCurrency(total)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
