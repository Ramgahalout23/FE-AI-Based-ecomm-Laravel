import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Package, Truck, MapPin, Calendar,
  ChevronRight, ShoppingBag, Share2, Copy, CheckCircle,
  Clock, Heart, ArrowLeft, ExternalLink, Mail, Printer,
  ShieldCheck, RefreshCw, Tag, Info, Phone, Bell, Loader, Smartphone
} from 'lucide-react';
import SEOHead from '../../components/seo/SEOHead';
import Skeleton from '../../components/ui/Skeleton';
import { getPaymentIcon } from '../../utils/paymentIcons';
import { ordersAPI } from '../../api/orders';
import { paymentsAPI } from '../../api/payments';
import { formatCurrency, formatDate, getImageUrl } from '../../utils/formatters';
import { ORDER_STATUSES, SHIPPING_STATUSES } from '../../utils/constants';
import toast from '../../utils/toast';

/* ═══════════════ CONFETTI COMPONENT ═══════════════ */
function Confetti() {
  const particles = useRef([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const colors = ['#1a1a1a', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
    const generated = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 8,
      rotation: Math.random() * 360,
      duration: 2 + Math.random() * 3,
      delay: Math.random() * 0.8,
      shape: Math.random() > 0.5 ? 'circle' : 'rect',
      drift: (Math.random() - 0.5) * 30,
    }));
    particles.current = generated;

    const timer = setTimeout(() => setVisible(false), 4500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.current.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.shape === 'circle' ? p.size : p.size * 0.6,
            height: p.size,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            background: p.color,
            rotate: p.rotation,
          }}
          initial={{ opacity: 1, y: 0, x: 0 }}
          animate={{
            opacity: [1, 1, 0],
            y: [0, 80 + Math.random() * 120],
            x: p.drift,
            rotate: p.rotation + 360 * (Math.random() > 0.5 ? 1 : -1),
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════ ANIMATED CHECKMARK ═══════════════ */
function AnimatedCheckmark() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
      className="relative"
    >
      {/* Outer ring pulse */}
      <motion.div
        className="absolute inset-0 rounded-full bg-green-100"
        initial={{ scale: 1, opacity: 1 }}
        animate={{ scale: 2.2, opacity: 0 }}
        transition={{ duration: 1.5, delay: 0.5, repeat: Infinity, ease: 'ease-out' }}
      />
      {/* Circle */}
      <motion.div
        className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-200"
        whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="md:w-12 md:h-12">
            <motion.path
              d="M10 20l7 7 13-13"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
            />
          </svg>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════ ANIMATED PENDING (CLOCK) ═══════════════ */
function AnimatedPending() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -30 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
      className="relative"
    >
      {/* Outer ring pulse */}
      <motion.div
        className="absolute inset-0 rounded-full bg-amber-100"
        initial={{ scale: 1, opacity: 1 }}
        animate={{ scale: 2.2, opacity: 0 }}
        transition={{ duration: 1.5, delay: 0.5, repeat: Infinity, ease: 'ease-out' }}
      />
      {/* Circle */}
      <motion.div
        className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-200"
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="md:w-12 md:h-12">
          <motion.circle
            cx="20" cy="20" r="15"
            stroke="white"
            strokeWidth="3"
            fill="none"
          />
          <motion.line
            x1="20" y1="20" x2="20" y2="10"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '20px 20px' }}
          />
          <motion.line
            x1="20" y1="20" x2="28" y2="20"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '20px 20px' }}
          />
        </svg>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════ ANIMATED CANCELLED ═══════════════ */
function AnimatedCancelled() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
      className="relative"
    >
      {/* Outer ring pulse */}
      <motion.div
        className="absolute inset-0 rounded-full bg-red-100"
        initial={{ scale: 1, opacity: 1 }}
        animate={{ scale: 2.2, opacity: 0 }}
        transition={{ duration: 1.5, delay: 0.5, repeat: Infinity, ease: 'ease-out' }}
      />
      {/* Circle */}
      <motion.div
        className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg shadow-red-200"
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="md:w-12 md:h-12">
          <motion.path
            d="M12 12l16 16M28 12l-16 16"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          />
        </svg>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════ ORDER TIMELINE ═══════════════ */
function OrderTimeline({ order }) {
  const steps = SHIPPING_STATUSES;
  const currentStepIdx = steps.indexOf(order.shippingStatus || 'PENDING');
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    const timer = setTimeout(() => setActiveStep(0), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (activeStep < 0 || activeStep > currentStepIdx) return;
    if (activeStep === currentStepIdx) return;
    const timer = setTimeout(() => setActiveStep((s) => s + 1), 400);
    return () => clearTimeout(timer);
  }, [activeStep, currentStepIdx]);

  // If cancelled, show simplified view
  if (order.status === 'CANCELLED') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <p className="text-red-600 font-semibold text-lg">Order Cancelled</p>
        <p className="text-red-500 text-sm mt-1">This order has been cancelled.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100" />
      <div
        className="absolute left-5 top-0 w-0.5 bg-green-500 transition-all duration-1000 ease-out"
        style={{ height: `${((currentStepIdx + 1) / steps.length) * 100}%` }}
      />

      <div className="space-y-0">
        {steps.map((step, idx) => {
          const isCompleted = idx <= currentStepIdx;
          const isCurrent = idx === currentStepIdx;
          const isActive = idx <= activeStep;
          const stepLabels = {
            PENDING: { icon: Clock, label: 'Order Placed', desc: 'Your order has been placed successfully' },
            PICKED_UP: { icon: Package, label: 'Picked Up', desc: 'Your package has been picked from store' },
            IN_TRANSIT: { icon: Truck, label: 'In Transit', desc: 'Your package is on its way' },
            OUT_FOR_DELIVERY: { icon: MapPin, label: 'Out for Delivery', desc: 'Your package is out for delivery' },
            DELIVERED: { icon: CheckCircle, label: 'Delivered', desc: 'Your package has been delivered' },
          };
          const stepInfo = stepLabels[step] || { icon: Package, label: step.replace(/_/g, ' '), desc: '' };

          return (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -20 }}
              animate={isActive ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className="relative flex items-start gap-5 pb-8 last:pb-0"
            >
              {/* Dot */}
              <div className="relative z-10">
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isCompleted
                      ? 'bg-green-500 text-white shadow-md shadow-green-200'
                      : 'bg-gray-100 text-gray-400'
                  } ${isCurrent && isCompleted ? 'ring-4 ring-green-100' : ''}`}
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {isCompleted ? (
                    <Check size={18} strokeWidth={3} />
                  ) : (
                    <stepInfo.icon size={16} />
                  )}
                </motion.div>
              </div>

              {/* Content */}
              <div className="flex-1 pt-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-bold text-sm ${
                    isCompleted ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {stepInfo.label}
                  </span>
                  {isCurrent && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full uppercase tracking-wider"
                    >
                      Current
                    </motion.span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${
                  isCompleted ? 'text-gray-600' : 'text-gray-300'
                }`}>
                  {stepInfo.desc}
                </p>
                {isCurrent && order.estimatedDelivery && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5 }}
                    className="mt-2 flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 w-fit"
                  >
                    <Calendar size={12} />
                    Est. delivery by {formatDate(order.estimatedDelivery)}
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════ ORDER ITEM CARD ═══════════════ */
function OrderItemCard({ item, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 + index * 0.08 }}
      className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-300 group"
    >
      {/* Product Image */}
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-gray-50 overflow-hidden shrink-0 border border-gray-100">
        {item.imageUrl ? (
          <img loading="lazy" src={getImageUrl(item.imageUrl)}
            alt={item.name || item.productName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">
            👕
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">
          {item.name || item.productName || `Product #${item.productId}`}
        </h4>
        {(item.size || item.color) && (
          <p className="text-xs text-gray-500 mt-0.5">
            {[item.size, item.color].filter(Boolean).join(' / ')}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-xs text-gray-400">Qty: {item.quantity}</span>
            <span className="mx-2 text-gray-200">|</span>
            <span className="font-semibold text-gray-900 text-sm">
              {formatCurrency(item.price)}
            </span>
          </div>
          <span className="font-bold text-gray-900 text-sm">
            {formatCurrency(item.price * item.quantity)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════ SHARE BUTTONS ═══════════════ */
function ShareSection({ orderId }) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(() => {
    const link = `${window.location.origin}/orders/${orderId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast.success('Order link copied!');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  }, [orderId]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 font-medium uppercase tracking-wider mr-1">Share</span>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleCopyLink}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 transition-all"
      >
        {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
        {copied ? 'Copied!' : 'Copy Link'}
      </motion.button>
    </div>
  );
}

/* ═══════════════ PRICING BREAKDOWN ═══════════════ */
function PricingBreakdown({ subtotal, discount, shippingCost, total }) {
  return (
    <div className="space-y-2.5">
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Subtotal</span>
        <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
      </div>
      {(discount || 0) > 0 && (
        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-1.5 text-green-600">
            <Tag size={14} />
            Discount
          </span>
          <span className="font-medium text-green-600">-{formatCurrency(discount)}</span>
        </div>
      )}
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Shipping</span>
        <span className={`font-medium ${shippingCost === 0 ? 'text-green-600' : 'text-gray-900'}`}>
          {shippingCost === 0 ? (
            <span className="flex items-center gap-1">
              <Truck size={14} />
              Free
            </span>
          ) : formatCurrency(shippingCost)}
        </span>
      </div>
      <div className="border-t border-gray-100 pt-3 mt-3">
        <div className="flex justify-between">
          <span className="font-bold text-gray-900">Total</span>
          <span className="font-bold text-gray-900 text-lg">{formatCurrency(total)}</span>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-right">Inclusive of all taxes</p>
      </div>
    </div>
  );
}

/* ═══════════════ ORDER UPDATE SUBSCRIPTION ═══════════════ */
function OrderUpdateSubscription({ orderId, order }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Pre-fill from order if available
  useEffect(() => {
    const addr = order?.shippingAddress || order?.address || {};
    const addrObj = typeof addr === 'string' ? (() => { try { return JSON.parse(addr); } catch { return {}; } })() : addr;
    if (addrObj.email) setEmail(addrObj.email);
    if (addrObj.phone) setPhone(addrObj.phone);
  }, [order]);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email && !phone) return toast.error('Please provide at least an email or phone number');
    setSubmitting(true);
    try {
      await ordersAPI.subscribeUpdates(orderId, {
        email: emailEnabled ? email : undefined,
        phone: smsEnabled ? phone : undefined,
        emailUpdates: emailEnabled,
        smsUpdates: smsEnabled,
      });
      setSubscribed(true);
      toast.success('You\'re now subscribed to order updates!');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to subscribe. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (subscribed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-5 md:p-7 shadow-sm text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3"
        >
          <Bell size={22} className="text-white" />
        </motion.div>
        <h4 className="font-bold text-gray-900 text-sm mb-1">You're All Set! ✅</h4>
        <p className="text-xs text-gray-600">
          {emailEnabled && smsEnabled
            ? 'You\'ll receive updates via email & SMS'
            : emailEnabled
            ? 'You\'ll receive updates via email'
            : 'You\'ll receive updates via SMS'}
        </p>
        <p className="text-[10px] text-gray-400 mt-2">
          We'll notify you when your order status changes.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 1.45 }}
      className="bg-white rounded-2xl border border-gray-100 p-5 md:p-7 shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="font-display text-base font-bold text-gray-900 flex items-center gap-2">
          <Bell size={18} className="text-indigo-600" />
          Get Order Updates
        </h3>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight size={18} className="text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="text-xs text-gray-500 mt-3 mb-4">
              Get real-time updates on your order status via email or SMS.
            </p>

            <form onSubmit={handleSubscribe} className="space-y-3">
              {/* Email Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${emailEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Mail size={16} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 cursor-pointer" onClick={() => setEmailEnabled(!emailEnabled)}>
                      Email Updates
                    </label>
                    <p className="text-[10px] text-gray-400">Order status & delivery alerts</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailEnabled(!emailEnabled)}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${
                    emailEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <motion.div
                    animate={{ x: emailEnabled ? 20 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>

              {/* Email Input */}
              <AnimatePresence>
                {emailEnabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-gray-300"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* SMS Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${smsEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Smartphone size={16} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 cursor-pointer" onClick={() => setSmsEnabled(!smsEnabled)}>
                      SMS Updates
                    </label>
                    <p className="text-[10px] text-gray-400">Real-time text alerts on your phone</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSmsEnabled(!smsEnabled)}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${
                    smsEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <motion.div
                    animate={{ x: smsEnabled ? 20 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>

              {/* SMS Input */}
              <AnimatePresence>
                {smsEnabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="relative">
                      <Smartphone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-gray-300"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={submitting || (!emailEnabled && !smsEnabled)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${
                  submitting || (!emailEnabled && !smsEnabled)
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300'
                }`}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader size={16} className="animate-spin" />
                    Subscribing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Bell size={16} />
                    Subscribe to Updates
                  </span>
                )}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed hint */}
      {!expanded && (
        <p className="text-[10px] text-gray-400 mt-2 text-left">
          Get notified when your order status changes
        </p>
      )}
    </motion.div>
  );
}

/* ═══════════════ MAIN THANK YOU PAGE ═══════════════ */
export default function OrderThankYouPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState(null);
  const pageRef = useRef(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await ordersAPI.getById(id);
        setOrder(res.data?.data || res.data || null);
      } catch {
        toast.error('Could not load order details');
      } finally {
        setLoading(false);
        setTimeout(() => setPageLoaded(true), 100);
      }
    };
    fetchOrder();
  }, [id]);

  // Animate page elements sequentially
  useEffect(() => {
    if (!pageLoaded) return;
    const elements = pageRef.current?.querySelectorAll('.animate-on-mount');
    elements?.forEach((el, i) => {
      setTimeout(() => {
        el.classList.add('animate-enter');
      }, 100 + i * 120);
    });
  }, [pageLoaded]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-start justify-center pt-24 md:pt-32 px-4">
        <div className="w-full max-w-3xl">
          {/* Hero skeleton */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <Skeleton className="!w-24 !h-24 !rounded-full" />
            </div>
            <Skeleton className="!w-72 !h-10 !rounded-lg mx-auto mb-3" />
            <Skeleton className="!w-56 !h-4 !rounded-md mx-auto mb-4" />
            <Skeleton className="!w-40 !h-8 !rounded-full mx-auto" />
          </div>
          {/* Content grid */}
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-7">
                <Skeleton className="!w-40 !h-6 !rounded-md mb-6" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-5 pb-8">
                    <Skeleton className="!w-10 !h-10 !rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="!w-32 !h-4 !rounded-md" />
                      <Skeleton className="!w-56 !h-3 !rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-7">
                <Skeleton className="!w-36 !h-6 !rounded-md mb-4" />
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex gap-4 p-4 mb-3">
                    <Skeleton className="!w-24 !h-24 !rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="!w-48 !h-4 !rounded-md" />
                      <Skeleton className="!w-20 !h-3 !rounded-md" />
                      <Skeleton className="!w-32 !h-4 !rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-7">
                <Skeleton className="!w-36 !h-6 !rounded-md mb-4" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="!w-full !h-4 !rounded-md mb-3" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Package size={36} className="text-red-400" />
          </motion.div>
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-500 mb-8">We couldn't find this order. It may have been removed or the link is invalid.</p>
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to My Orders
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = order.subtotal || order.totalAmount || 0;
  const discount = order.discount || 0;
  const shippingCost = order.shippingCost || 0;
  const total = order.total || order.totalAmount || 0;
  const orderIdShort = typeof id === 'string' ? id.slice(-8).toUpperCase() : id;
  const statusInfo = ORDER_STATUSES[order.status] || { label: order.status || 'Confirmed' };
  const paymentStatus = order.payment?.[0]?.status || null;
  const paymentMethod = order.payment?.[0]?.method || order.paymentMethod || null;
  const isConfirmed = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status);
  const isPending = order.status === 'PENDING';
  const isCancelled = order.status === 'CANCELLED';
  const isFailed = order.status === 'FAILED';
  const isPaymentFailed = paymentStatus === 'FAILED';
  const isRazorpay = paymentMethod === 'RAZORPAY';
  const canRetry = (isPending || isPaymentFailed) && isRazorpay;

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

  // Retry Razorpay payment
  const handleRetryPayment = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      const res = await paymentsAPI.createRazorpayOrder({
        orderId: id,
        amount: total,
      });

      const data = res.data?.data || res.data;
      const { razorpayOrderId, keyId } = data;

      if (!razorpayOrderId || !keyId) {
        throw new Error('Failed to create Razorpay order');
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay. Please try again.');
      }

      const options = {
        key: keyId,
        amount: Math.round(total * 100),
        currency: 'INR',
        name: 'LUXE',
        description: `Order #${orderIdShort}`,
        order_id: razorpayOrderId,
        prefill: {
          email: order.user?.email || '',
          contact: '',
        },
        theme: { color: '#000000' },
        handler: async (response) => {
          try {
            await paymentsAPI.verifyRazorpayPayment({
              orderId: id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
            });
            toast.success('Payment successful! Refreshing order...');
            // Re-fetch order data to update status
            const refreshed = await ordersAPI.getById(id);
            setOrder(refreshed.data?.data || refreshed.data || null);
          } catch (verifyErr) {
            const msg = verifyErr?.response?.data?.message || 'Verification failed. Please contact support.';
            setRetryError(msg);
            toast.error(msg);
          }
        },
        modal: {
          ondismiss: () => {
            setRetrying(false);
            toast.error('Payment cancelled. Your order remains pending.');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setRetrying(false);
        const errMsg = response.error?.description || 'Payment failed';
        setRetryError(errMsg);
        toast.error('Payment failed: ' + errMsg);
      });
      rzp.open();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to retry payment';
      setRetryError(msg);
      toast.error(msg);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <>
      {isConfirmed && <Confetti />}

      <div ref={pageRef} className="min-h-screen bg-gradient-to-b from-white via-gray-50/30 to-white">
        <SEOHead
          title={order ? `Order Confirmed #${orderIdShort} | Threvolt` : 'Order | Threvolt'}
          description={order ? `Your order #${orderIdShort} has been placed successfully. Track your order and view details.` : 'View your order confirmation at Threvolt.'}
          noIndex={true}
        />
        {/* ─── Hero Section ─── */}
        {isConfirmed && (
        <section className="relative pt-12 pb-8 md:pt-20 md:pb-12 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-50 rounded-full opacity-60" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-50/30 rounded-full" />
          </div>

          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <AnimatedCheckmark />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-6 md:mt-8"
            >
              <h1 className="font-display text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
                Order Confirmed! 🎉
              </h1>
              <p className="text-gray-500 mt-3 md:mt-4 text-base md:text-lg max-w-lg mx-auto">
                Thank you for your purchase! We're getting your order ready.
              </p>
            </motion.div>

            {/* Order ID Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.7 }}
            >
              <div className="mt-6 inline-flex items-center gap-2.5 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-md">
                <Package size={16} />
                Order #{orderIdShort}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(orderIdShort);
                    toast.success('Order ID copied!');
                  }}
                  className="ml-1 hover:text-gray-300 transition-colors"
                  title="Copy order ID"
                >
                  <Copy size={14} />
                </button>
              </div>
            </motion.div>

            {/* Status & Date */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 1 }}
              className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500"
            >
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {formatDate(order.createdAt)}
              </span>
              <span className="text-gray-200">|</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isConfirmed
                  ? 'bg-blue-50 text-blue-600'
                  : isCancelled || isFailed
                  ? 'bg-red-50 text-red-600'
                  : isPending
                  ? 'bg-yellow-50 text-yellow-600'
                  : 'bg-gray-50 text-gray-600'
              }`}>
                {statusInfo.label}
              </span>
            </motion.div>

            {/* Email Notice */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 1.3 }}
              className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-100 py-2.5 px-4 rounded-xl mx-auto max-w-md"
            >
              <Mail size={14} className="shrink-0" />
              <span>A confirmation email will be sent to your registered email address.</span>
            </motion.div>
          </div>
        </section>
        )}

        {isPending && (
        <section className="relative pt-12 pb-8 md:pt-20 md:pb-12 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-50 rounded-full opacity-60" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-50/30 rounded-full" />
          </div>

          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <AnimatedPending />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-6 md:mt-8"
            >
              <h1 className="font-display text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
                Payment Pending ⏳
              </h1>
              <p className="text-gray-500 mt-3 md:mt-4 text-base md:text-lg max-w-lg mx-auto">
                Your order has been placed but we're awaiting payment confirmation.
              </p>
            </motion.div>

            {/* Order ID Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.7 }}
            >
              <div className="mt-6 inline-flex items-center gap-2.5 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-md">
                <Package size={16} />
                Order #{orderIdShort}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(orderIdShort);
                    toast.success('Order ID copied!');
                  }}
                  className="ml-1 hover:text-gray-300 transition-colors"
                  title="Copy order ID"
                >
                  <Copy size={14} />
                </button>
              </div>
            </motion.div>

            {/* Status & Date */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 1 }}
              className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500"
            >
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {formatDate(order.createdAt)}
              </span>
              <span className="text-gray-200">|</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isConfirmed
                  ? 'bg-blue-50 text-blue-600'
                  : isCancelled || isFailed
                  ? 'bg-red-50 text-red-600'
                  : isPending
                  ? 'bg-yellow-50 text-yellow-600'
                  : 'bg-gray-50 text-gray-600'
              }`}>
                {statusInfo.label}
              </span>
            </motion.div>

            {/* Retry Payment Button */}
            {canRetry && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 1.3 }}
                className="mt-6"
              >
                <button
                  onClick={handleRetryPayment}
                  disabled={retrying}
                  className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {retrying ? (
                    <><Loader size={18} className="animate-spin" /> Processing...</>
                  ) : (
                    <><ShieldCheck size={18} /> Retry Payment</>
                  )}
                </button>
                {retryError && (
                  <p className="text-xs text-red-500 mt-2">{retryError}</p>
                )}
              </motion.div>
            )}

            {/* Email Notice */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 1.5 }}
              className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-100 py-2.5 px-4 rounded-xl mx-auto max-w-md"
            >
              <Mail size={14} className="shrink-0" />
              <span>No payment was taken yet. Complete payment to confirm your order.</span>
            </motion.div>
          </div>
        </section>
        )}

        {isCancelled && (
        <section className="relative pt-12 pb-8 md:pt-20 md:pb-12 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-50 rounded-full opacity-60" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-50/30 rounded-full" />
          </div>

          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <AnimatedCancelled />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-6 md:mt-8"
            >
              <h1 className="font-display text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
                Order Cancelled
              </h1>
              <p className="text-gray-500 mt-3 md:mt-4 text-base md:text-lg max-w-lg mx-auto">
                This order has been cancelled. If you made a payment, a refund will be processed.
              </p>
            </motion.div>

            {/* Order ID Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.7 }}
            >
              <div className="mt-6 inline-flex items-center gap-2.5 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-md">
                <Package size={16} />
                Order #{orderIdShort}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(orderIdShort);
                    toast.success('Order ID copied!');
                  }}
                  className="ml-1 hover:text-gray-300 transition-colors"
                  title="Copy order ID"
                >
                  <Copy size={14} />
                </button>
              </div>
            </motion.div>

            {/* Status & Date */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 1 }}
              className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500"
            >
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {formatDate(order.createdAt)}
              </span>
              <span className="text-gray-200">|</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isConfirmed
                  ? 'bg-blue-50 text-blue-600'
                  : isCancelled || isFailed
                  ? 'bg-red-50 text-red-600'
                  : isPending
                  ? 'bg-yellow-50 text-yellow-600'
                  : 'bg-gray-50 text-gray-600'
              }`}>
                {statusInfo.label}
              </span>
            </motion.div>
          </div>
        </section>
        )}

        {isFailed && (
        <section className="relative pt-12 pb-8 md:pt-20 md:pb-12 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-50 rounded-full opacity-60" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-50/30 rounded-full" />
          </div>

          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <AnimatedCancelled />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-6 md:mt-8"
            >
              <h1 className="font-display text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
                Payment Failed
              </h1>
              <p className="text-gray-500 mt-3 md:mt-4 text-base md:text-lg max-w-lg mx-auto">
                Your payment could not be processed. Please try again or choose a different payment method.
              </p>
            </motion.div>

            {/* Order ID Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.7 }}
            >
              <div className="mt-6 inline-flex items-center gap-2.5 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-md">
                <Package size={16} />
                Order #{orderIdShort}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(orderIdShort);
                    toast.success('Order ID copied!');
                  }}
                  className="ml-1 hover:text-gray-300 transition-colors"
                  title="Copy order ID"
                >
                  <Copy size={14} />
                </button>
              </div>
            </motion.div>

            {/* Status & Date */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 1 }}
              className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500"
            >
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {formatDate(order.createdAt)}
              </span>
              <span className="text-gray-200">|</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isFailed
                  ? 'bg-red-50 text-red-600'
                  : 'bg-gray-50 text-gray-600'
              }`}>
                {statusInfo.label}
              </span>
            </motion.div>

            {/* Retry Payment Button */}
            {canRetry && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 1.3 }}
                className="mt-6"
              >
                <button
                  onClick={handleRetryPayment}
                  disabled={retrying}
                  className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {retrying ? (
                    <><Loader size={18} className="animate-spin" /> Processing...</>
                  ) : (
                    <><ShieldCheck size={18} /> Retry Payment</>
                  )}
                </button>
                {retryError && (
                  <p className="text-xs text-red-500 mt-2">{retryError}</p>
                )}
              </motion.div>
            )}
          </div>
        </section>
        )}

        {/* ─── Main Content Grid ─── */}
        <section className="pb-16 md:pb-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-5 gap-6 md:gap-8">
              {/* Left Column — Timeline + Items (spans 3 cols) */}
              <div className="lg:col-span-3 space-y-6">
                {/* Order Timeline Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className="bg-white rounded-2xl border border-gray-100 p-5 md:p-7 shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="font-display text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Truck size={20} className="text-green-600" />
                      Order Timeline
                    </h2>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full font-medium">
                      Est. delivery {order.estimatedDelivery ? formatDate(order.estimatedDelivery) : '3-5 business days'}
                    </span>
                  </div>
                  <OrderTimeline order={order} />
                </motion.div>

                {/* Items Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                  className="bg-white rounded-2xl border border-gray-100 p-5 md:p-7 shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-lg font-bold text-gray-900 flex items-center gap-2">
                      <ShoppingBag size={20} className="text-gray-700" />
                      Items Ordered
                      <span className="text-sm font-medium text-gray-400 ml-1">({order.items?.length || 0})</span>
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {(order.items || []).map((item, idx) => (
                      <OrderItemCard key={item.id || idx} item={item} index={idx} />
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Right Column — Sidebar (spans 2 cols) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Shipping Address */}
                {(order.shippingAddress || order.address) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 1 }}
                    className="bg-white rounded-2xl border border-gray-100 p-5 md:p-7 shadow-sm hover:shadow-md transition-shadow duration-300"
                  >
                    <h3 className="font-display text-base font-bold text-gray-900 flex items-center gap-2 mb-3">
                      <MapPin size={18} className="text-gray-700" />
                      Shipping Address
                    </h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      {(() => {
                        const addr = order.shippingAddress || order.address || {};
                        const addrObj = typeof addr === 'string' ? JSON.parse(addr) : addr;
                        return (
                          <>
                            <p className="font-medium text-gray-900">{addrObj.firstName || ''} {addrObj.lastName || ''}</p>
                            <p>{addrObj.addressLine1 || ''}</p>
                            {addrObj.addressLine2 && <p>{addrObj.addressLine2}</p>}
                            <p>
                              {[addrObj.city, addrObj.state].filter(Boolean).join(', ')}
                              {addrObj.zipCode ? ` - ${addrObj.zipCode}` : ''}
                            </p>
                            <p className="text-gray-400">{addrObj.phone || ''}</p>
                            {addrObj.email && (
                              <a href={`mailto:${addrObj.email}`} className="text-gray-500 hover:text-black transition-colors flex items-center gap-1 mt-1">
                                <Mail size={12} />
                                {addrObj.email}
                              </a>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}

                {/* Price Breakdown */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.1 }}
                  className="bg-white rounded-2xl border border-gray-100 p-5 md:p-7 shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <h3 className="font-display text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Info size={18} className="text-gray-700" />
                    Payment Summary
                  </h3>
                  <PricingBreakdown
                    subtotal={subtotal}
                    discount={discount}
                    shippingCost={shippingCost}
                    total={total}
                  />

                  {/* Payment Method & Status */}
                  {paymentMethod && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Payment Method</span>
                        <span className="font-medium text-gray-900 flex items-center gap-2">
                          {(() => {
                            const { icon: PmtIcon, bg: iconBg, color: iconColor } = getPaymentIcon(paymentMethod);
                            return (
                              <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
                                <PmtIcon size={14} className={iconColor} />
                              </div>
                            );
                          })()}
                          {paymentMethod === 'COD' ? 'Cash on Delivery' : paymentMethod}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Payment Status</span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          paymentStatus === 'COMPLETED'
                            ? 'bg-green-50 text-green-700'
                            : paymentStatus === 'FAILED'
                            ? 'bg-red-50 text-red-700'
                            : paymentStatus === 'REFUNDED'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-yellow-50 text-yellow-700'
                        }`}>
                          {paymentStatus === 'COMPLETED' && <><CheckCircle size={12} /> Paid</>}
                          {paymentStatus === 'FAILED' && 'Failed'}
                          {paymentStatus === 'REFUNDED' && 'Refunded'}
                          {(!paymentStatus || paymentStatus === 'PENDING') && <><Clock size={12} /> Pending</>}
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Order Update Subscription */}
                <OrderUpdateSubscription orderId={id} order={order} />

                {/* Quick Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.4 }}
                  className="bg-white rounded-2xl border border-gray-100 p-5 md:p-7 shadow-sm"
                >
                  <h3 className="font-display text-base font-bold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    {canRetry && (
                      <button
                        onClick={handleRetryPayment}
                        disabled={retrying}
                        className="flex items-center justify-between w-full px-4 py-3 bg-amber-50 hover:bg-amber-100 rounded-xl text-sm font-semibold text-amber-700 hover:text-amber-800 transition-all group disabled:opacity-50"
                      >
                        <span className="flex items-center gap-2.5">
                          <ShieldCheck size={16} />
                          {retrying ? 'Processing...' : 'Retry Payment'}
                        </span>
                        <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}
                    <Link
                      to={`/orders/${id}`}
                      className={`flex items-center justify-between w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:text-gray-900 transition-all group ${canRetry ? '' : ''}`}
                    >
                      <span className="flex items-center gap-2.5">
                        <ExternalLink size={16} className="text-gray-400 group-hover:text-gray-700" />
                        View Full Order Details
                      </span>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                    <Link
                      to="/products"
                      className="flex items-center justify-between w-full px-4 py-3 bg-black hover:bg-gray-800 rounded-xl text-sm font-semibold text-white transition-all group"
                    >
                      <span className="flex items-center gap-2.5">
                        <ShoppingBag size={16} />
                        Continue Shopping
                      </span>
                      <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </motion.div>

                {/* Trust Badges */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.6 }}
                  className="flex items-center justify-around py-4 px-2"
                >
                  {[
                    { icon: ShieldCheck, label: 'Secure Payment' },
                    { icon: RefreshCw, label: 'Easy Returns' },
                    { icon: Heart, label: 'Quality Assured' },
                  ].map((item, i) => (
                    <div key={i} className="text-center">
                      <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-1.5">
                        <item.icon size={18} className="text-gray-600" />
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{item.label}</p>
                    </div>
                  ))}
                </motion.div>

                {/* Share */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.7 }}
                  className="flex justify-center"
                >
                  <ShareSection orderId={id} />
                </motion.div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ─── Inline Animation Styles ─── */}
      <style>{`
        .animate-on-mount {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .animate-on-mount.animate-enter {
          opacity: 1;
          transform: translateY(0);
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .float-animation {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
