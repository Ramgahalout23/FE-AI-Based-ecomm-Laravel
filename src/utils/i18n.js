import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import client from '../api/client';

const STORAGE_KEY = 'luxe_language';
const TRANSLATIONS_CACHE_PREFIX = 'luxe_translations_';
const TRANSLATIONS_CACHE_VERSION = 1;
const TRANSLATIONS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Read cached translations from localStorage for a given language.
 * Returns null if no cache, expired, or version mismatch.
 */
function getCachedTranslations(lang) {
  try {
    const raw = localStorage.getItem(`${{TRANSLATIONS_CACHE_PREFIX}}${{lang}}`);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (cached.version !== TRANSLATIONS_CACHE_VERSION) {
      localStorage.removeItem(`${{TRANSLATIONS_CACHE_PREFIX}}${{lang}}`);
      return null;
    }
    if (Date.now() - cached.timestamp > TRANSLATIONS_CACHE_TTL) {
      localStorage.removeItem(`${{TRANSLATIONS_CACHE_PREFIX}}${{lang}}`);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

/**
 * Store translations in localStorage cache for a given language.
 */
function setCachedTranslations(lang, data) {
  try {
    localStorage.setItem(`${{TRANSLATIONS_CACHE_PREFIX}}${{lang}}`, JSON.stringify({
      version: TRANSLATIONS_CACHE_VERSION,
      timestamp: Date.now(),
      data,
    }));
  } catch {
    // localStorage may be full or unavailable — silently ignore
  }
}

/**
 * Load translations for a given language code.
 * Checks localStorage cache first; falls back to the backend API.
 * Returns a flat { key: value } map.
 */
async function loadTranslations(lang) {
  // Check localStorage cache first (eliminates flash on return visits)
  const cached = getCachedTranslations(lang);
  if (cached) return cached;

  try {
    const res = await client.get('/translations', {
      params: { lang, group: 'frontend' },
      timeout: 10000,
    });
    const data = res?.data?.data || [];
    let map = {};
    if (Array.isArray(data)) {
      data.forEach((t) => {
        if (t.key && t.value) map[t.key] = t.value;
      });
    } else if (typeof data === 'object' && !Array.isArray(data)) {
      // If data is already a key-value object
      map = data;
    }

    // Cache the result so subsequent page loads skip the API call
    if (Object.keys(map).length > 0) {
      setCachedTranslations(lang, map);
    }

    return map;
  } catch {
    // Fall back to empty translations
  }
  return {};
}

/**
 * Language detection — reads from localStorage or defaults to 'en'.
 */
function detectLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'en';
  } catch {
    return 'en';
  }
}

/**
 * Default English translations — critical keys only (nav, auth, checkout, cart, footer, product basics).
 * Ensures the app shows readable text even when the backend API has no translations seeded yet.
 * Keys for less-frequently-used pages (orders.detail, reviews, reels, sales, etc.)
 * rely on the backend API and the parseMissingKeyHandler fallback.
 */
const DEFAULT_EN_TRANSLATIONS = {
  // ── Navigation ──
  'nav.home': 'Home',
  'nav.products': 'All T-Shirts',
  'nav.sales': 'Sales',
  'nav.wishlist': 'Wishlist',
  'nav.cart': 'Cart',
  'nav.sign_in': 'Sign In',
  'nav.sign_out': 'Sign Out',
  'nav.account': 'Account',
  'nav.admin': 'Admin',
  'nav.dashboard': 'Dashboard',
  'nav.my_profile': 'My Profile',
  'nav.my_orders': 'My Orders',
  'nav.addresses': 'Addresses',

  // ── Mobile tabs ──
  'mobile.home': 'Home',
  'mobile.category': 'Category',
  'mobile.wishlist': 'Wishlist',
  'mobile.account': 'Account',
  'mobile.cart': 'Cart',

  // ── Footer ──
  'footer.rights': 'All rights reserved',
  'footer.free_shipping': 'Free Shipping',
  'footer.above_amount': 'On orders over {{amount}}',
  'footer.easy_returns': 'Easy Returns',
  'footer.returns_days': '7-day return policy',
  'footer.secure_payment': 'Secure Payment',
  'footer.secure_transactions': '100% secure transactions',
  'footer.support_247': '24/7 Support',
  'footer.dedicated_support': 'Dedicated customer service',
  'footer.shop': 'Shop',
  'footer.help': 'Help',
  'footer.shop.oversized': 'Oversized Tees',
  'footer.shop.graphic': 'Graphic Tees',
  'footer.shop.polo': 'Polo T-Shirts',
  'footer.shop.plain': 'Plain T-Shirts',
  'footer.shop.combo': 'Combo Packs',
  'footer.help.track': 'Track Order',
  'footer.help.about': 'About Us',
  'footer.help.contact': 'Contact Us',
  'footer.help.size_guide': 'Size Guide',
  'footer.help.shipping_info': 'Shipping Info',
  'footer.help.returns': 'Returns & Exchange',
  'footer.help.privacy': 'Privacy Policy',
  'footer.newsletter.title': 'Get 10% Off',
  'footer.newsletter.subtitle': 'Subscribe for early access to new drops & exclusive deals!',
  'footer.newsletter.desktop_subtitle': 'Subscribe & get 10% off your first order + early access to new drops!',
  'footer.newsletter.placeholder': 'Your email',
  'footer.newsletter.placeholder_desktop': 'Your email address',
  'footer.newsletter.join': 'Join',
  'footer.bottom.privacy': 'Privacy Policy',
  'footer.bottom.terms': 'Terms of Service',
  'footer.bottom.return_policy': 'Return Policy',
  'footer.bottom.made_with': 'Made with 🧡 in India',

  // ── Search ──
  'search.placeholder': 'Search t-shirts...',
  'search.placeholder_modal': 'Search products...',
  'search.for_query': 'Search for "{{query}}"',
  'search.press_enter': 'Press Enter to see all results',
  'search.products_button': 'Search Products',
  'search.trending': 'Trending Searches',
  'search.popular': 'Popular Products',
  'search.view_all': 'View All',
  'search.no_popular': 'No popular products available',
  'search.navigate': 'Navigate',
  'search.select': 'Select',
  'search.close': 'Close',
  'search.aria_label': 'Search products',

  // ── Cookie Consent ──
  'cookies.title': 'We use cookies',
  'cookies.description': 'We use cookies to improve your experience. By continuing, you agree to our use of cookies.',
  'cookies.analytics': 'Analytics',
  'cookies.marketing': 'Marketing',
  'cookies.settings': 'Settings',
  'cookies.reject': 'Reject',
  'cookies.accept_all': 'Accept',
  'cookies.settings_title': 'Cookie Settings',
  'cookies.necessary': 'Necessary',
  'cookies.necessary_desc': 'Required for cart & checkout',
  'cookies.required': 'Required',
  'cookies.save': 'Save Preferences',

  // ── Auth ──
  'auth.sign_in': 'Sign In',
  'auth.signing_in': 'Signing in...',
  'auth.welcome_back': 'Welcome Back',
  'auth.sign_in_account': 'Sign in to your {{store}} account',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.forgot_password': 'Forgot password?',
  'auth.no_account': "Don't have an account?",
  'auth.sign_up': 'Sign up',
  'auth.create_account': 'Create Account',
  'auth.join_store': 'Join {{store}} today',
  'auth.first_name': 'First Name',
  'auth.last_name': 'Last Name',
  'auth.phone': 'Phone',
  'auth.already_account': 'Already have an account?',
  'auth.reset_password': 'Reset Password',
  'auth.enter_new_password': 'Enter your new password',
  'auth.new_password': 'New Password',
  'auth.send_reset_link': 'Send Reset Link',
  'auth.check_email': 'Check your email for the reset link',
  'auth.enter_email_reset': 'Enter your email to reset password',
  'auth.back_to_login': 'Back to login',
  'auth.forgot_password_title': 'Forgot Password',
  'auth.continue_google': 'Continue with Google',
  'auth.continue_facebook': 'Continue with Facebook',
  'auth.sign_up_google': 'Sign up with Google',
  'auth.sign_up_facebook': 'Sign up with Facebook',
  'auth.or_sign_in_email': 'or sign in with email',
  'auth.or_register_email': 'or register with email',
  'auth.creating': 'Creating...',

  // ── Home ──
  'home.collections': 'Collections',
  'home.shop_by_category': 'Shop by Category',
  'home.browse_all': 'Browse All',
  'home.fresh_drops': 'Fresh Drops',
  'home.seasonal': 'Seasonal',
  'home.new_arrivals': 'New Arrivals',
  'home.shop_now': 'Shop Now',
  'home.flash_sale': 'Flash Sale',
  'home.shop_sale': 'Shop Sale',
  'home.testimonials': 'Testimonials',
  'home.what_customers_say': 'What Our Customers Say',
  'home.browse_all_categories': 'Browse All Categories',
  'home.style_inspiration': 'Style Inspiration',
  'home.curated_looks': 'Curated Looks',
  'home.featured_collection': 'Featured Collection',
  'home.pull_to_refresh': 'Pull to refresh',
  'home.release_to_refresh': 'Release to refresh',
  'home.refreshing': 'Refreshing...',
  'home.trending_now': 'Trending Now',
  'home.featured': 'Featured',
  'home.view_all': 'View All',
  'home.view_details': 'View Details',
  'home.new_arrival_week': 'New Arrival of the Week',

  // ── Product (essentials) ──
  'product.add_to_bag': 'Add to Bag',
  'product.buy_now': 'Buy it Now',
  'product.select_options': 'Select Options',
  'product.out_of_stock': 'Out of Stock',
  'product.unavailable': 'Unavailable',
  'product.checking': 'Checking',
  'product.adding': 'Adding',
  'product.add_to_cart': 'Add to Cart',
  'product.size_guide': 'Size Guide',
  'product.color': 'Color',
  'product.size': 'Size',
  'product.select': 'Select',
  'product.clear': 'Clear',
  'product.details': 'Product Details',
  'product.material_care': 'Material & Care',
  'product.shipping_returns': 'Shipping & Returns',
  'product.complete_look': 'Complete The Look',
  'product.recently_viewed': 'Recently Viewed',
  'product.customer_reviews': 'Customer Reviews',
  'product.write_review': 'Write a Review',
  'product.write': 'Write',
  'product.share_thoughts': 'Share your thoughts',
  'product.help_others': 'Help others with your experience.',
  'product.view_all_reviews': 'View All {{count}} Reviews',
  'product.in_stock': 'In Stock & Ready to Ship',
  'product.low_stock': 'Only {{count}} left — Order soon',
  'product.only_left': 'Only {{count}} left',
  'product.flash_sale': 'Flash Sale',
  'product.percent_off': '{{percent}}% OFF',
  'product.not_found': 'Product Not Found',
  'product.not_found_desc': 'This product may have been removed or the link is incorrect. Browse our collection to find what you are looking for.',
  'product.browse': 'Browse Products',
  'product.currently_unavailable': 'Currently Unavailable',
  'product.checking_availability': 'Checking availability...',
  'product.combination_unavailable': 'This combination is currently unavailable',
  'product.share_title': 'Share this product',
  'product.free_shipping': 'Free Shipping',
  'product.easy_returns': 'Easy Returns',
  'product.secure': 'Secure',
  'product.above_amount': 'Above {{amount}}',
  'product.days': '{{count}} Days',
  'product.checkout': 'Checkout',
  'product.reviews': '{{count}} Reviews',
  'product.sold': '{{count}}+ Sold',
  'product.verified': 'Verified',
  'product.verified_purchase': 'Verified Purchase',
  'product.verified_customer': 'Verified Customer',
  'product.photo': 'photo',
  'product.photos': 'photos',
  'product.oos': 'OOS',
  'product.quick_add': 'Quick Add',
  'product.add_price': 'Add · {{price}}',
  'product.sold_out': 'Sold Out',
  'product.sale_badge': 'Sale',
  'product.new_badge': 'New',
  'product.bestseller': 'Bestseller',
  'product.hot': 'Hot',
  'product.trending': 'Trending',
  'product.limited': 'Limited',
  'product.details_label': 'Details',
  'product.fresh_drops_subtitle': 'Fresh drops. Bold statements.',
  'product.removed_wishlist': 'Removed from wishlist',
  'product.added_wishlist': 'Added to wishlist ❤️',
  'product.add': 'Add',
  'product.save_amount': 'Save {{amount}}',
  'product.max_qty_reached': 'Maximum quantity reached',
  'product.increase_qty': 'Increase quantity',
  'product.no_reviews_yet': 'No reviews yet',
  'product.no_reviews_desc': 'Be the first to share your thoughts about this product.',
  'product.be_first_review': 'Be the First to Review',
  'product.swipe_scroll': 'Swipe or scroll',
  'product.scroll_left': 'Scroll left',
  'product.scroll_right': 'Scroll right',

  // ── Checkout ──
  'checkout.title': 'Secure Checkout',
  'checkout.breadcrumb': 'Checkout',
  'checkout.shipping_address': 'Shipping Address',
  'checkout.payment_method': 'Payment Method',
  'checkout.order_summary': 'Order Summary',
  'checkout.first_name': 'First Name',
  'checkout.last_name': 'Last Name',
  'checkout.email': 'Email',
  'checkout.address': 'Address',
  'checkout.address2': 'Apartment, suite, etc. (optional)',
  'checkout.city': 'City',
  'checkout.state': 'State',
  'checkout.zip': 'PIN Code',
  'checkout.phone': 'Phone',
  'checkout.place_order': 'Place Order',
  'checkout.back_to_cart': 'Back to cart',
  'checkout.already_account': 'Already have an account?',
  'checkout.sign_in_faster': 'Sign in for faster checkout',
  'checkout.create_account': 'Create an account',
  'checkout.unlock_perks': 'UNLOCK PERKS',
  'checkout.save_details': 'Save your details for one-click checkout next time',
  'checkout.faster_checkout': 'Faster checkout',
  'checkout.track_orders': 'Track orders',
  'checkout.exclusive_offers': 'Exclusive offers',
  'checkout.coupon_code': 'Coupon code',
  'checkout.apply': 'Apply',
  'checkout.applying': 'Applying...',
  'checkout.available_coupons': 'Available coupons',
  'checkout.subtotal': 'Subtotal',
  'checkout.discount': 'Discount',
  'checkout.shipping': 'Shipping',
  'checkout.free': 'Free',
  'checkout.total': 'Total',
  'checkout.empty_title': 'Your cart is empty',
  'checkout.empty_desc': 'Add some products to get started!',
  'checkout.shop_now': 'Shop Now',
  'checkout.processing': 'Processing...',
  'checkout.cart': 'Cart',
  'checkout.information': 'Information',
  'checkout.payment': 'Payment',
  'checkout.first_name_placeholder': 'First name',
  'checkout.last_name_placeholder': 'Last name',
  'checkout.email_placeholder': 'your@email.com',
  'checkout.address_placeholder': 'House No., Street, Area',
  'checkout.address2_placeholder': 'Apartment, suite, etc.',
  'checkout.city_placeholder': 'City',
  'checkout.state_placeholder': 'State',
  'checkout.zip_placeholder': '6-digit PIN',
  'checkout.phone_placeholder': '+91 98765 43210',
  'checkout.set_password': 'Set a password',
  'checkout.password_placeholder': 'Create a secure password',
  'checkout.min_chars': '(min. 8 chars)',
  'checkout.auto_logged_in': 'You will be automatically logged in after checkout',
  'checkout.applied_coupon': 'Remove coupon',
  'checkout.no_payment_methods': 'No payment methods are currently available.',
  'checkout.contact_support': 'Please contact support to complete your purchase.',
  'checkout.secure_payment': 'Secure',
  'checkout.free_shipping': 'Free',
  'checkout.easy_returns': 'Easy',
  'checkout.qty': 'Qty: {{qty}}',
  'checkout.oos_badge': 'Out of Stock',
  'checkout.oos_item': 'Out of Stock',
  'checkout.low_stock': 'Only {{count}} left',
  'checkout.payment_confirmed': 'Payment Confirmed!',
  'checkout.payment_failed': 'Payment Failed',
  'checkout.pay_with': 'Pay with',
  'checkout.payment_success_desc': 'Your payment was successful! We are redirecting you to your order.',
  'checkout.payment_failed_desc': 'Your payment could not be processed. You can retry or choose a different method.',
  'checkout.retry_payment': 'Retry Payment',
  'checkout.view_order_later': 'View Order & Try Again Later',
  'checkout.open_gateway': 'Open {{name}}',
  'checkout.checking_status': 'Checking...',
  'checkout.already_paid': 'Already paid? Check Status',
  'checkout.payment_label': 'Payment',
  'checkout.shipping_label': 'Shipping',
  'checkout.returns_label': 'Returns',
  'checkout.flash_sale_discount': 'Flash Sale Discount',
  'checkout.total_savings': 'Total savings',
  'checkout.more_items': '+{{count}} more items',
  'checkout.applied_from': 'Applied from: {{names}}',

  // ── Cart Drawer ──
  'cart.drawer.title': 'Your Bag',
  'cart.drawer.items': '{{count}} items',
  'cart.drawer.item': '{{count}} item',
  'cart.drawer.empty_title': 'Your bag is empty',
  'cart.drawer.empty_desc': 'Looks like you have not added any tees yet!',
  'cart.drawer.start_shopping': 'Start Shopping 🛍️',
  'cart.drawer.out_of_stock': 'Out of Stock',
  'cart.drawer.in_stock': 'In Stock',
  'cart.drawer.subtotal': 'Subtotal',
  'cart.drawer.delivery': 'Delivery',
  'cart.drawer.free': 'FREE ✓',
  'cart.drawer.total': 'Total',
  'cart.drawer.checkout': 'Checkout Securely',
  'cart.drawer.all_unavailable': 'All Items Unavailable',
  'cart.drawer.remove_oos': 'Remove unavailable items to proceed',
  'cart.drawer.free_delivery': 'Free delivery • Easy 7-day returns',
  'cart.drawer.oos_single': '1 item is out of stock and not included in the total.',
  'cart.drawer.oos_multiple': '{{count}} items are out of stock and not included in the total.',
  'cart.drawer.aria_label': 'Shopping cart',
  'cart.drawer.close': 'Close cart',
  'cart.drawer.remove_item': 'Remove {{name}}',
  'cart.drawer.decrease_qty': 'Decrease quantity',
  'cart.drawer.increase_qty': 'Increase quantity',
  'cart.drawer.category': 'T-Shirt',

  // ── Cart Page ──
  'cart.title': 'Shopping Cart',
  'cart.empty': 'Your cart is empty',
  'cart.empty_desc': "Looks like you haven't added anything to your cart yet.",
  'cart.start_shopping': 'Start Shopping',
  'cart.continue_shopping': 'Continue Shopping',
  'cart.order_summary': 'Order Summary',
  'cart.subtotal': 'Subtotal ({{count}} items)',
  'cart.shipping': 'Shipping',
  'cart.free': 'Free',
  'cart.total': 'Total',
  'cart.item': 'item',
  'cart.items': 'items',
  'cart.available': 'Available',
  'cart.unavailable': 'Unavailable',
  'cart.save': 'Save',
  'cart.proceed_checkout': 'Proceed to Checkout',
  'cart.all_unavailable': 'All Items Unavailable',
  'cart.add_free_shipping': 'Add {{amount}} more for free shipping!',
  'cart.oos_single': '1 item is out of stock and not included in the total.',
  'cart.oos_multiple': '{{count}} items are out of stock and not included in the total.',
  'cart.save_wishlist_check': 'Save them to your wishlist and check back later.',
  'cart.flash_sale': 'Flash Sale',
  'cart.in_stock': 'In Stock',
  'cart.out_of_stock': 'Out of Stock',
  'cart.secure_checkout_text': 'Secure checkout',
  'cart.free_delivery_text': 'Free delivery',
  'cart.easy_returns_text': 'Easy 7-day returns',

  // ── Wishlist ──
  'wishlist.title': 'My Wishlist',
  'wishlist.items_saved': "Items you've saved for later",
  'wishlist.item': 'Item',
  'wishlist.items': 'Items',
  'wishlist.empty': 'Your wishlist is empty',
  'wishlist.empty_desc': 'Save your favorite items here and come back to them anytime.',
  'wishlist.browse_products': 'Browse Products',
  'wishlist.share': 'Share',
  'wishlist.clear_all': 'Clear All',
  'wishlist.add_to_cart': 'Add to Cart',
  'wishlist.copied': 'Copied!',
  'wishlist.copy': 'Copy',
  'wishlist.revoke': 'Revoke',
  'wishlist.not_found': 'Wishlist not found',
  'wishlist.not_found_desc': 'This wishlist link may have expired or been removed by the owner.',
  'wishlist.owner_shared_via': 'Shared via {{store}} Wishlist',
  'wishlist.saved_for_later': "Items they've saved for later",
  'wishlist.empty_shared': 'This wishlist is empty',
  'wishlist.empty_shared_desc': 'There are no items saved in this wishlist yet.',
  'wishlist.moving': 'Moving...',
  'wishlist.unavailable': 'Unavailable',
  'wishlist.select_options': 'Select Options',
  'wishlist.select_variant': 'Select Variant',
  'wishlist.hide_options': 'Hide Options',
  'wishlist.low_stock': 'Only {{count}} left',
  'wishlist.in_stock': 'In Stock',
  'wishlist.out_of_stock': 'Out of Stock',

  // ── Profile ──
  'profile.title': 'My Profile',
  'profile.welcome': 'Welcome',
  'profile.access_account': 'To access account and manage orders',
  'profile.login': 'Login',
  'profile.signup': 'Signup',
  'profile.orders': 'Orders',
  'profile.wishlist': 'Wishlist',
  'profile.contact_us': 'Contact Us',
  'profile.returns': 'Returns',
  'profile.saved_addresses': 'Saved Addresses',
  'profile.edit_profile': 'Edit Profile',
  'profile.account_section': 'Account',
  'profile.saved_section': 'Saved',
  'profile.settings_section': 'Settings',
  'profile.hello_user': 'Hello, {{name}}!',
  'profile.sign_out': 'Sign out',
  'profile.profile': 'Profile',

  // ── Orders ──
  'orders.title': 'Orders',
  'orders.order_id': 'Order ID',
  'orders.no_orders': 'No orders yet',
  'orders.no_orders_desc': 'Start shopping to see your orders here',
  'orders.shop_now': 'Shop Now',
  'orders.date': 'Date',
  'orders.items': 'Items',
  'orders.total': 'Total',
  'orders.status': 'Status',
  'orders.review': 'Review',
  'orders.action': 'Action',
  'orders.view': 'View',
  'orders.write_review': 'Write Review',
  'orders.your': 'Your',

  'orders.detail.order_timeline': 'Order Timeline',
  'orders.detail.items': 'Items',
  'orders.detail.product': 'Product',
  'orders.detail.price': 'Price',
  'orders.detail.qty': 'Qty',
  'orders.detail.cancel_order': 'Cancel Order',
  'orders.detail.failed_cancel': 'Failed to cancel',
  'orders.detail.order_cancelled': 'Order cancelled',
  'orders.detail.cancelled_desc': 'This order has been cancelled.',
  'orders.detail.return_completed': 'Return Completed',
  'orders.detail.return_requested': 'Return Requested',
  'orders.detail.review_submitted': 'Review submitted! It will appear after moderation.',
  'orders.detail.estimated': 'Est. delivery',
  'orders.detail.est_delivery_fallback': '3-5 business days',
  'orders.detail.order_confirmed': 'Order Confirmed! 🎉',
  'orders.detail.order_confirmed_desc': 'Thank you for your purchase! We\'re getting your order ready.',
  'orders.detail.return_requested_title': 'Return Requested 🔄',
  'orders.detail.return_requested_hero_desc': 'Your return request has been submitted. We\'ll review it and notify you once processed.',
  'orders.detail.return_completed_title': 'Return Completed ✅',
  'orders.detail.return_completed_hero_desc': 'Your return has been processed and the refund has been issued to your original payment method.',
  'orders.detail.payment_pending_title': 'Payment Pending ⏳',
  'orders.detail.payment_pending_desc': 'Your order has been placed but we\'re awaiting payment confirmation.',
  'orders.detail.order_cancelled_title': 'Order Cancelled',
  'orders.detail.order_cancelled_hero_desc': 'This order has been cancelled. If you made a payment, a refund will be processed.',
  'orders.detail.payment_failed_title': 'Payment Failed',
  'orders.detail.copy_order_id': 'Copy order ID',
  'orders.detail.order_id_copied': 'Order ID copied!',
  'orders.detail.email_confirmation_notice': 'A confirmation email will be sent to your registered email address.',
  'orders.detail.return_notice': 'We typically process returns within 5-7 business days after review.',
  'orders.detail.refund_notice': 'Refund will be credited to your original payment method within 5-7 business days.',
  'orders.detail.no_payment_taken': 'No payment was taken yet. Complete payment to confirm your order.',
  'orders.detail.order_placed': 'Order Placed',
  'orders.detail.order_placed_desc': 'Your order has been placed successfully',
  'orders.detail.picked_up': 'Picked Up',
  'orders.detail.picked_up_desc': 'Your package has been picked from store',
  'orders.detail.in_transit': 'In Transit',
  'orders.detail.in_transit_desc': 'Your package is on its way',
  'orders.detail.out_for_delivery': 'Out for Delivery',
  'orders.detail.out_for_delivery_desc': 'Your package is out for delivery',
  'orders.detail.delivered': 'Delivered',
  'orders.detail.delivered_desc': 'Your package has been delivered',
  'orders.detail.current': 'Current',
  'orders.detail.items_ordered': 'Items Ordered',
  'orders.detail.share': 'Share',
  'orders.detail.copy_link': 'Copy Link',
  'orders.detail.link_copied': 'Copied!',
  'orders.detail.order_link_copied': 'Order link copied!',
  'orders.detail.failed_copy_link': 'Failed to copy link',
  'orders.detail.payment_summary': 'Payment Summary',
  'orders.detail.payment_method': 'Payment Method',
  'orders.detail.payment_status': 'Payment Status',
  'orders.detail.cash_on_delivery': 'Cash on Delivery',
  'orders.detail.paid': 'Paid',
  'orders.detail.failed': 'Failed',
  'orders.detail.refunded': 'Refunded',
  'orders.detail.pending_label': 'Pending',
  'orders.detail.refund_completed': 'Refund Completed',
  'orders.detail.refund_timing_note': 'Refunds typically appear within 5-7 business days depending on your bank.',
  'orders.detail.quick_actions': 'Quick Actions',
  'orders.detail.view_return_status': 'View Return Status',
  'orders.detail.view_full_details': 'View Full Order Details',
  'orders.detail.view_all_orders': 'View All Orders',
  'orders.detail.continue_shopping': 'Continue Shopping',
  'orders.detail.retry_payment': 'Retry Payment',
  'orders.detail.processing': 'Processing...',
  'orders.detail.secure_payment': 'Secure Payment',
  'orders.detail.easy_returns': 'Easy Returns',
  'orders.detail.quality_assured': 'Quality Assured',
  'orders.detail.order_not_found': 'Order Not Found',
  'orders.detail.order_not_found_desc': 'We couldn\'t find this order. It may have been removed or the link is invalid.',
  'orders.detail.back_to_my_orders': 'Back to My Orders',
  'orders.detail.subscription_title': 'Get Order Updates',
  'orders.detail.subscribed_title': 'You\'re All Set! ✅',
  'orders.detail.subscribed_email_sms': 'You\'ll receive updates via email & SMS',
  'orders.detail.subscribed_email_only': 'You\'ll receive updates via email',
  'orders.detail.subscribed_sms_only': 'You\'ll receive updates via SMS',
  'orders.detail.subscribed_desc': 'We\'ll notify you when your order status changes.',
  'orders.detail.subscription_desc': 'Get real-time updates on your order status via email or SMS.',
  'orders.detail.email_updates': 'Email Updates',
  'orders.detail.sms_updates': 'SMS Updates',
  'orders.detail.order_alerts': 'Order status & delivery alerts',
  'orders.detail.sms_alerts': 'Real-time text alerts on your phone',
  'orders.detail.subscribe_btn': 'Subscribe to Updates',
  'orders.detail.subscribing_btn': 'Subscribing...',
  'orders.detail.collapsed_hint': 'Get notified when your order status changes',
  'orders.detail.payment_successful': 'Payment successful! Refreshing order...',
  'orders.detail.verification_failed': 'Verification failed. Please contact support.',
  'orders.detail.payment_cancelled': 'Payment cancelled. Your order remains pending.',
  'orders.detail.payment_failed_desc': 'Your payment could not be processed. Please try again or choose a different payment method.',
  'orders.detail.failed_retry_payment': 'Failed to retry payment',
  'orders.detail.failed_load_order': 'Could not load order details',
  'orders.detail.inclusive_tax': 'Inclusive of all taxes',
  'orders.detail.subscribed_failed': 'Failed to subscribe',
  'orders.detail.subscribed_success': 'Successfully subscribed!',
  'orders.detail.subscription_active': 'Subscription is active',
  'orders.detail.subscription_required': 'Subscription required',
  'orders.detail.not_found': 'Order not found',
  // ── Track Order ──
  'track.title': 'Track Your Order',
  'track.hero_desc': 'Enter your order number to see the latest status, shipping details, and estimated delivery.',
  'track.search_placeholder': 'Enter order number (e.g. ORD-12345678-ABCD)',
  'track.track_btn': 'Track',
  'track.searching': 'Searching...',
  'track.order_not_found': 'Order not found. Please check your order number and try again.',
  'track.error_lookup': 'Failed to look up order. Please try again later.',
  'track.need_help': 'Need help with your order?',
  'track.contact_support': 'Contact Support',
  'track.enter_order_number': 'Enter your order number above to track your package',
  'track.order_number_hint': 'Your order number can be found in your order confirmation email',
  'track.order_number': 'Order Number',

  // ── Returns ──
  'returns.title': 'Returns',
  'returns.support': 'Support',
  'returns.my_requests': 'My Requests',
  'returns.new_request': 'New Request',
  'returns.no_requests': 'No requests yet',
  'returns.no_requests_desc': "You haven't submitted any return requests",
  'returns.submitting': 'Submitting...',

  // ── Contact ──
  'contact.title': 'Contact Us',
  'contact.hero_title': 'Contact Us',
  'contact.hero_desc': "We'd love to hear from you. Drop us a message!",
  'contact.get_in_touch': 'Get in Touch',
  'contact.email': 'Email',
  'contact.phone': 'Phone',
  'contact.address': 'Address',
  'contact.hours': 'Hours',
  'contact.send_message': 'Send us a Message',
  'contact.send': 'Send Message',
  'contact.sending': 'Sending...',

  'contact.name_label': 'Name *',
  'contact.name_placeholder': 'Your name',
  'contact.email_label': 'Email *',
  'contact.email_placeholder': 'your@email.com',
  'contact.phone_label': 'Phone',
  'contact.phone_placeholder': '+91 98765 43210',
  'contact.message_label': 'Message *',
  'contact.message_placeholder': 'How can we help you?',
  'contact.hours_value': 'Mon - Sat: 9AM - 7PM',
  'contact.required_fields': 'Please fill all required fields',
  'contact.success_message': 'Message sent! We\'ll get back to you soon.',
  'contact.faq': 'FAQ',
  'contact.shipping_info': 'Shipping Info',
  'contact.returns_exchange': 'Returns & Exchange',
  'contact.size_guide': 'Size Guide',
  'contact.need_quick_help': 'Need Quick Help?',
  'contact.questions_desc': 'Have questions about our products, orders, or anything else? We\'re here to help!',
  // ── Notifications ──
  'notifications.title': 'Notifications',
  'notifications.your': 'Your',
  'notifications.marked_read': 'All marked as read',
  'notifications.failed_mark_read': 'Failed to mark all as read',
  'notifications.no_notifications': 'No notifications',
  'notifications.all_caught_up': "You're all caught up!",
  'notifications.mark_all_read': 'Mark All Read',

  // ── Not Found ──
  'not_found.title': 'Page Not Found',
  'not_found.desc': "Oops! The page you're looking for doesn't exist or has been moved.",
  'not_found.back_home': 'Back to Home',
  'not_found.go_back': 'Go Back',


  // ── Size Guide ──
  'size_guide.find_perfect_fit': 'Find your perfect fit',
  'size_guide.measurement': 'Measurement',
  'size_guide.centimeters': 'Centimeters',
  'size_guide.inches': 'Inches',
  'size_guide.chest_desc': 'Measure around the fullest part of your chest',
  'size_guide.waist_desc': 'Measure around your natural waistline',
  'size_guide.length_desc': 'Measure from shoulder seam to hem',
  'size_guide.sleeve_desc': 'Measure from shoulder point to cuff',
  // ── Error Boundary ──
  'error_boundary.something_wrong': 'Something went wrong',
  'error_boundary.description': 'An unexpected error occurred while rendering this section. Please try again.',
  'error_boundary.try_again': 'Try Again',
  'error_boundary.go_back': 'Go Back',
  'error_boundary.refresh_prompt': 'If the problem persists, try refreshing the page.',
  'error_boundary.error_details': 'Error Details',

  // ── PWA ──
  'pwa.update_available': 'Update available',
  'pwa.new_version_ready': 'A new version is ready',
  'pwa.refresh': 'Refresh',
  'pwa.dismiss': 'Dismiss',

  // ── Session Timeout ──
  'session.expiring_title': 'Session Expiring Soon',
  'session.expiring_desc': 'For your security, your admin session will expire due to inactivity.',
  'session.stay_logged_in': 'Stay Logged In',
  'session.click_to_stay': 'Click anywhere or press any key to stay logged in',
  'session.time_remaining': 'remaining',

  // ── Maintenance ──
  'maintenance.scheduled': 'Scheduled Maintenance',
  'maintenance.in_progress': 'in Progress',
  'maintenance.progress': 'Progress',
  'maintenance.optimizing': 'Optimizing your experience',
  'maintenance.urgent_assistance': 'Need Urgent Assistance?',
  'maintenance.thank_you': 'Thank you for your patience',
  'maintenance.enhancing': 'Enhancing Your',
  'maintenance.shopping_experience': 'Shopping Experience',

  // ── Products page ──
  'products.all': 'All Products',
  'products.filters': 'Filters',
  'products.sort_relevance': 'Sort: Relevance',
  'products.sort_newest': 'Sort: Newest',
  'products.sort_price_low': 'Sort: Price ↑',
  'products.sort_price_high': 'Sort: Price ↓',
  'products.sort_top_rated': 'Sort: Top Rated',
  'products.min': 'Min',
  'products.max': 'Max',
  'products.size': 'Size',
  'products.clear_all': 'Clear all',
  'products.apply_filters': 'Apply Filters',
  'products.category': 'Category',
  'products.search_placeholder': 'Search by product name, style, or keyword...',
  'products.search': 'Search',
  'products.results': 'results',
  'products.found': 'found',
  'products.no_products': 'No products yet',
  'products.no_products_desc': 'Products will appear here once they are added.',
  'products.load_more': 'Load More',
  'products.loading': 'Loading...',
  'products.showing': 'Showing',
  'products.of': 'of',
  'products.product': 'product',
  'products.products': 'products',
  'products.no_products_found': 'No products found',
  'products.try_adjusting_filters': 'Try adjusting your search or filters',
  'products.sort_by': 'Sort By',
  'products.price_range': 'Price Range',
  'products.clear_filters': 'Clear All Filters',
  'products.categories': 'categories',
  'products.show_results': 'Show Results',
  'products.retry': 'Retry',
  'products.failed_to_load': 'Failed to load products',
  'products.something_wrong': 'Something went wrong. Please try again.',
  'products.all_products': 'All Products',
  'products.in_category': 'in',
  'products.section_not_found': 'Section not found',
  'products.section_not_found_desc': "The product section you're looking for doesn't exist.",
  'products.youve_seen_all': "You've seen all {{count}} products",
  'products.newest': 'Newest',
  'products.price_low_high': 'Price: Low to High',
  'products.price_high_low': 'Price: High to Low',
  'products.name_az': 'Name: A to Z',
  'products.name_za': 'Name: Z to A',
  'products.loading_more': 'Loading more...',
  'products.section_new_subtitle': 'The latest drops — fresh styles, premium quality.',
  'products.section_bestseller_subtitle': 'Our most popular styles — loved by everyone.',


  // ── Returns ──
  'returns.my_requests': 'My Requests',
  'returns.new_request': 'New Request',
  'returns.no_requests': 'No requests yet',
  'returns.no_requests_desc': 'You haven\'t submitted any return requests',
  'returns.submitting': 'Submitting...',
  'returns.support': 'Support',
  'returns.order': 'Order',
  'returns.reason': 'Reason',
  'returns.what_would_you_like': 'What would you like?',
  'returns.select_order': 'Select an order...',
  'returns.select_reason': 'Select a reason...',
  'returns.submit': 'Submit Return Request',
  'returns.request_submitted': 'Return request submitted successfully!',
  'returns.failed_submit': 'Failed to submit return request',
  'returns.no_eligible_orders': 'No eligible orders found. Only delivered or shipped orders can be returned.',
  // ── Sales ──
  'sales.title': 'Sales & Promotions',
  'sales.deals_promotions': 'Deals & Promotions',
  'sales.loading': 'Loading...',
  'sales.active_promotions': '{{count}} active promotion{{plural}}',
  'sales.no_active': 'No active promotions',
  'sales.no_active_desc': 'There are no active sales or promotions right now.',
  'sales.browse_products': 'Browse Products',
  'sales.all_sales': 'All Sales',
  'sales.clear_filter': 'Clear filter',
  'sales.flash_sale': 'Flash Sale',
  'sales.shop_sale': 'Shop the Sale',
  'sales.view_all_products': 'View all {{count}} products',
  'sales.up_to_off': 'Up to {{percent}}% OFF',
  'sales.percent_off': '{{percent}}% OFF',


  // ── Common ──
  'common.edit': 'Edit',
  // ── Addresses ──
  'addresses.title': 'Addresses',
  'addresses.manage': 'Manage',
  'addresses.add': 'Add',
  'addresses.first_name': 'First Name',
  'addresses.last_name': 'Last Name',
  'addresses.address': 'Address',
  'addresses.city': 'City',
  'addresses.state': 'State',
  'addresses.added': 'Address added',
  'addresses.deleted': 'Address deleted',
  'addresses.default_updated': 'Default address updated',
  'addresses.failed_to_load': 'Failed to load addresses',
  'addresses.failed_add': 'Failed to add',
  'addresses.failed_delete': 'Failed to delete',
  'addresses.failed_default': 'Failed to set default address',
  'addresses.zip_code': 'Zip Code',
  'addresses.country': 'Country',
  'addresses.cancel': 'Cancel',
  'addresses.save': 'Save Address',
  'addresses.set_default': 'Set Default',
  'addresses.default': 'Default',

  // ── Notification Bell ──
  'notifications.bell.new': '{{count}} new',
  'notifications.bell.mark_all_read': 'Mark all read',
  'notifications.bell.view_all': 'View all',
  'notifications.bell.no_notifications': 'No notifications yet',
  'notifications.bell.title': 'Notifications',

  // ── Flash Sale Countdown ──
  'flash_sale.sale_ends_in': 'Sale ends in',
  'flash_sale.days': 'Days',
  'flash_sale.hrs': 'Hrs',
  'flash_sale.min': 'Min',
  'flash_sale.sec': 'Sec',

  // ── About ──
  'about.page_not_available': 'Page Not Available',
  'about.content_not_found': 'Content not found',
  'about.go_home': 'Go to Home',
  'about.ready_make_statement': 'Ready to Make a Statement?',
  'about.explore_collection': 'Explore our latest collection and find your perfect tee.',
  'about.shop_now': 'Shop Now',

  // ── Privacy & Return Policy ──
  'privacy.page_not_available': 'Page Not Available',
  'privacy.go_home': 'Go to Home',
  'return_policy.page_not_available': 'Page Not Available',
  'return_policy.go_home': 'Go to Home',

  // ── Unsubscribe ──
  'unsubscribe.title': 'Unsubscribe',
  'unsubscribe.confirm_title': 'Unsubscribe from Emails?',
  'unsubscribe.yes_unsubscribe': 'Yes, Unsubscribe Me',
  'unsubscribe.no_keep': 'No, Keep Me Subscribed',
  'unsubscribe.success_title': 'Successfully Unsubscribed',
  'unsubscribe.already_title': 'Already Unsubscribed',
  'unsubscribe.error_title': 'Something Went Wrong',

  // ── Reviews (minimal) ──
  'reviews.write_title': 'Write a Review',
  'reviews.submit_review': 'Submit Review',
  'reviews.submitted_success': 'Review submitted! It will appear after moderation.',

  // ── Size Guide (minimal) ──
  'size_guide.title': 'Size Guide',
  'size_guide.measurements': 'Measurements',
  'size_guide.got_it': 'Got it',
  'size_guide.chest': 'Chest',
  'size_guide.waist': 'Waist',
  'size_guide.length': 'Length',
  'size_guide.sleeve': 'Sleeve',

  // ── Page View ──
  'page_view.not_found': 'Page Not Found',
  'page_view.back_home': 'Back to Home',
  'page_view.not_found_desc': 'This page does not exist or has been unpublished.',

  // ── Custom Page ──
  'page_view.last_updated': 'Last updated: {{date}}',


  // ── Reviews ──
  'reviews.write_title': 'Write a Review',
  'reviews.your_rating': 'Your Rating',
  'reviews.your_review': 'Your Review',
  'reviews.review_title': 'Review Title',
  'reviews.title_placeholder': 'Summarize your experience',
  'reviews.comment_placeholder': 'Tell others about your experience with this product...',
  'reviews.add_photos': 'Add Photos',
  'reviews.submitting': 'Submitting...',
  'reviews.uploading_photos': 'Uploading photos...',
  'reviews.select_rating_error': 'Please select a star rating',
  'reviews.write_comment_error': 'Please write a review comment',
  'reviews.review_moderated': 'Your review will be moderated before appearing on the site.',
  'reviews.share_details': 'Share details — the more specific, the better!',
  'reviews.max_photos': 'Maximum photos added',
  'reviews.drag_drop_or_click': 'Drag & drop photos or click to browse',
  'reviews.drop_images_here': 'Drop images here',
  'reviews.photo_formats': 'JPEG, PNG, WebP · Max 10MB each',
  'reviews.submitted_success': 'Review submitted! It will appear after moderation.',
  'reviews.submit_failed': 'Failed to submit review. Please try again.',
  'reviews.optional': '(optional)',
  'reviews.poor': 'Poor',
  'reviews.fair': 'Fair',
  'reviews.good': 'Good',
  'reviews.very_good': 'Very Good',
  'reviews.excellent': 'Excellent',
  // ── Reels ──
  'reels.watch_and_buy': 'Watch and Buy',
  'reels.shop_the_look': 'Shop the look — tap any reel to explore',
  'reels.like': 'Like',
  'reels.cart': 'Cart',
  'reels.add_to_cart': 'Add to Cart',
  'reels.share': 'Share',
  'reels.video_unavailable': 'Video unavailable',
  'reels.refresh': 'Refresh reels',
  'reels.liked': 'Liked',
  'reels.added': 'Added',
  'reels.in_cart': 'In Cart',
  'reels.show_product': 'Show Product',
  'reels.swipe': 'Swipe',
  'reels.watch_youtube': 'Watch on YouTube',
  'reels.youtube': 'YouTube',
  'reels.retry_video': 'Retry Video',
};

/**
 * Critical Hindi translations for instant first-render — covers navigation,
 * mobile tabs, and common UI so Hindi users see Hindi immediately without
 * waiting for the API. Full translations are loaded from the backend API.
 */
const DEFAULT_HI_TRANSLATIONS = {
  'nav.home': 'होम',
  'nav.products': 'सभी टी-शर्ट',
  'nav.sales': 'सेल',
  'nav.wishlist': 'पसंदीदा',
  'nav.cart': 'कार्ट',
  'nav.sign_in': 'साइन इन',
  'nav.sign_out': 'साइन आउट',
  'nav.account': 'खाता',
  'nav.admin': 'एडमिन',
  'nav.dashboard': 'डैशबोर्ड',
  'nav.my_profile': 'मेरी प्रोफ़ाइल',
  'nav.my_orders': 'मेरे ऑर्डर',
  'nav.addresses': 'पते',
  'mobile.home': 'होम',
  'mobile.category': 'श्रेणी',
  'mobile.wishlist': 'पसंदीदा',
  'mobile.account': 'खाता',
  'mobile.cart': 'कार्ट',
  'search.placeholder': 'टी-शर्ट खोजें...',
  'search.placeholder_modal': 'उत्पाद खोजें...',
  'announcement.shipping': 'मुफ़्त शिपिंग ऑर्डर पर',
  'footer.rights': 'सर्वाधिकार सुरक्षित',
  'footer.free_shipping': 'मुफ़्त शिपिंग',
  'footer.above_amount': '{{amount}} से अधिक के ऑर्डर पर',
  'footer.easy_returns': 'आसान रिटर्न',
  'footer.secure_payment': 'सुरक्षित भुगतान',
  'footer.support_247': '24/7 सहायता',
  'product.add_to_cart': 'कार्ट में डालें',
  'product.buy_now': 'अभी खरीदें',
  'product.out_of_stock': 'स्टॉक खत्म',
  'product.size_guide': 'साइज़ गाइड',
  'product.customer_reviews': 'ग्राहक समीक्षाएँ',
  'product.write_review': 'समीक्षा लिखें',
  'checkout.title': 'सुरक्षित चेकआउट',
  'checkout.place_order': 'ऑर्डर करें',
  'checkout.subtotal': 'उप-योग',
  'checkout.total': 'कुल',
  'checkout.free': 'मुफ़्त',
  'cart.drawer.title': 'आपका बैग',
  'cookies.title': 'हम कुकीज़ का उपयोग करते हैं',
  'cookies.accept_all': 'स्वीकार करें',
  'auth.sign_in': 'साइन इन',
  'auth.welcome_back': 'वापसी पर स्वागत है',
  'auth.email': 'ईमेल',
  'auth.password': 'पासवर्ड',
  'auth.forgot_password': 'पासवर्ड भूल गए?',
  'auth.no_account': 'खाता नहीं है?',
  'auth.sign_up': 'साइन अप',
  'auth.create_account': 'खाता बनाएँ',
  'auth.first_name': 'पहला नाम',
  'auth.last_name': 'अंतिम नाम',
  'auth.phone': 'फ़ोन',
  'auth.already_account': 'पहले से खाता है?',
  'auth.signing_in': 'साइन इन हो रहा है...',
  'auth.creating': 'बनाया जा रहा है...',
  'home.collections': 'कलेक्शन',
  'home.shop_by_category': 'श्रेणी के अनुसार खरीदें',
  'home.browse_all': 'सभी ब्राउज़ करें',
  'home.fresh_drops': 'नए ड्रॉप्स',
  'home.seasonal': 'सीज़नल',
  'home.new_arrivals': 'नए आइटम',
  'home.shop_now': 'अभी खरीदें',
  'home.flash_sale': 'फ़्लैश सेल',
  'home.shop_sale': 'सेल की खरीदारी करें',
  'home.testimonials': 'प्रशंसापत्र',
  'home.what_customers_say': 'हमारे ग्राहक क्या कहते हैं',
  'home.best_sellers': 'बेस्ट सेलर्स',
  'home.trending_now': 'ट्रेंडिंग',
  'products.all': 'सभी उत्पाद',
  'products.filters': 'फ़िल्टर',
  'products.min': 'न्यूनतम',
  'products.max': 'अधिकतम',
  'products.size': 'साइज़',
  'products.clear_all': 'सभी साफ़ करें',
  'products.apply_filters': 'फ़िल्टर लागू करें',
  'products.category': 'श्रेणी',
  'products.categories': 'श्रेणियाँ',
  'products.search': 'खोजें',
  'products.no_products': 'अभी कोई उत्पाद नहीं',
  'products.load_more': 'और लोड करें',
  'products.loading': 'लोड हो रहा है...',
  'products.showing': 'दिखाया जा रहा है',
  'products.of': 'का',
  'products.product': 'उत्पाद',
  'products.products': 'उत्पाद',
  'products.no_products_found': 'कोई उत्पाद नहीं मिला',
  'cart.title': 'शॉपिंग कार्ट',
  'cart.empty': 'आपकी कार्ट खाली है',
  'cart.start_shopping': 'खरीदारी शुरू करें',
  'cart.order_summary': 'ऑर्डर सारांश',
  'cart.subtotal': 'उप-योग ({{count}} आइटम)',
  'cart.shipping': 'शिपिंग',
  'cart.free': 'मुफ़्त',
  'cart.total': 'कुल',
  'cart.proceed_checkout': 'चेकआउट के लिए आगे बढ़ें',
  'wishlist.title': 'मेरी पसंदीदा',
  'wishlist.empty': 'आपकी पसंदीदा सूची खाली है',
  'wishlist.browse_products': 'उत्पाद ब्राउज़ करें',
  'wishlist.share': 'शेयर करें',
  'wishlist.add_to_cart': 'कार्ट में डालें',
  'wishlist.unavailable': 'अनुपलब्ध',
  'wishlist.select_options': 'विकल्प चुनें',
  'wishlist.select_variant': 'वेरिएंट चुनें',
  'wishlist.hide_options': 'विकल्प छिपाएँ',
  'orders.title': 'ऑर्डर',
  'orders.no_orders': 'अभी कोई ऑर्डर नहीं',
  'profile.title': 'मेरी प्रोफ़ाइल',
  'profile.welcome': 'स्वागत है',
  'profile.orders': 'ऑर्डर',
  'profile.wishlist': 'पसंदीदा',
  'profile.contact_us': 'संपर्क करें',
  'profile.sign_out': 'साइन आउट',
  'profile.hello_user': 'नमस्ते, {{name}}!',
  'not_found.title': 'पेज नहीं मिला',
  'not_found.back_home': 'होम पर वापस जाएँ',
  'reviews.write_title': 'समीक्षा लिखें',
  'reviews.submit_review': 'समीक्षा सबमिट करें',
  'size_guide.title': 'साइज़ गाइड',
  'size_guide.got_it': 'समझ गया',
  'product.quick_add': 'त्वरित जोड़ें',
  'product.sold_out': 'बिक चुका',
  'session.stay_logged_in': 'लॉग इन रहें',
  'pwa.update_available': 'अपडेट उपलब्ध',
  'pwa.refresh': 'रीफ्रेश करें',
  'error_boundary.try_again': 'पुनः प्रयास करें',
  'error_boundary.go_back': 'वापस जाएँ',
};

/**
 * Phase 1 — Synchronous initialization with defaults.
 * Called at module level (before the React tree mounts) so that components
 * that call `useTranslation()` on first render get readable text
 * instead of raw translation keys.
 *
 * Safe to call multiple times — i18next ignores duplicate `init` calls.
 */
export function initI18nSync() {
  if (i18n.isInitialized) return i18n;

  const lng = detectLanguage();

  // Use Hindi defaults if the detected language is Hindi, else use English
  const defaultTranslations = lng === 'hi' ? DEFAULT_HI_TRANSLATIONS : DEFAULT_EN_TRANSLATIONS;

  i18n.use(initReactI18next).init({
    resources: {
      en: { frontend: DEFAULT_EN_TRANSLATIONS },
      [lng]: { frontend: defaultTranslations },
    },
    lng,
    fallbackLng: 'en',
    ns: ['frontend'],
    defaultNS: 'frontend',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    returnObjects: false,
    keySeparator: '.',
    parseMissingKeyHandler: (key) => {
      // If a translation key is missing, return the last segment as readable text
      const parts = key.split('.');
      return parts[parts.length - 1]?.replace(/_/g, ' ') || key;
    },
  });

  return i18n;
}

/**
 * Phase 2 — Async loading of backend translations.
 * Call this in a `useEffect` after the first render. It fetches translations
 * from the API and merges them into the existing i18n resource bundles.
 */
export async function loadApiTranslations() {
  const lng = detectLanguage();
  const translations = await loadTranslations(lng);

  // Merge API translations on top of the default English ones
  i18n.addResourceBundle(lng, 'frontend', translations, true, true);

  // Force a language change to trigger React re-renders with the new strings
  await i18n.changeLanguage(lng);

  return i18n;
}

/**
 * Full initialization (sync + async) — convenience wrapper used during app init.
 */
export async function initI18n() {
  initI18nSync();
  await loadApiTranslations();
  return i18n;
}

/**
 * Switch the active language, loading translations from the backend if needed.
 */
export async function switchLanguage(code) {
  if (i18n.language === code) return;

  // Check if resources are already loaded
  if (i18n.hasResourceBundle(code, 'frontend')) {
    await i18n.changeLanguage(code);
    return;
  }

  // Load translations from backend
  const translations = await loadTranslations(code);
  i18n.addResourceBundle(code, 'frontend', translations, true, true);
  await i18n.changeLanguage(code);

  // Persist to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Silently fail
  }
}

export default i18n;
