import { useCallback, useState, useEffect } from 'react';
import { settingsAPI } from '../api/settings';
import { useAppInit } from '../contexts/AppInitContext';
import toast from '../utils/toast';
import { SettingsContext } from './settingsContext';

export function SettingsProvider({ children }) {
  // Read settings from app-init (already fetched, no separate API call needed)
  const { data: appInitData, loading: appInitLoading, refetch: refetchAppInit } = useAppInit();
  const [settings, setSettings] = useState(getDefaultSettings());
  const [loading, setLoading] = useState(true);

  // Sync from app-init data when it loads
  useEffect(() => {
    if (appInitData?.settings && Object.keys(appInitData.settings).length > 0) {
      setSettings(prev => ({ ...prev, ...appInitData.settings }));
    }
    if (!appInitLoading) {
      setLoading(false);
    }
  }, [appInitData, appInitLoading]);

  const refreshSettings = useCallback(async () => {
    // Refetch app-init data to get latest settings
    await refetchAppInit();
  }, [refetchAppInit]);

  const getSetting = (key, defaultValue = null) => {
    return settings[key] ?? defaultValue;
  };

  const getSettingsByModule = (module) => {
    const moduleSettings = {};
    const moduleKeyMap = {
      FOOTER: ['footerBrandTagline', 'footerNewsletterEnabled', 'footerNewsletterTitle', 'footerNewsletterSubtitle', 'footerNewsletterBtnText', 'footerShopLinks', 'footerHelpLinks', 'footerBottomLinks', 'footerTrustBadges'],
      SITE: ['storeName', 'brandTagline', 'contactEmail', 'storeEmail', 'storeAddress', 'maintenanceMode', 'maintenanceMessage', 'custom404Enabled', 'custom404Title', 'custom404Message', 'custom404ShowHeader', 'custom404ShowFooter', 'announcementEnabled', 'announcementText'],
      SHIPPING: ['shippingPickupAddress', 'shippingReturnAddress', 'shippingQueryMobile', 'shippingQueryEmail', 'shippingLabelLogo', 'shippingLabelNote', 'freeShippingThreshold', 'shippingFlatRate'],
      TAX: ['taxRate', 'taxCalculation'],
      CURRENCY: ['currency', 'timezone'],
      PAYMENT: ['razorpayEnabled', 'razorpayKeyId', 'razorpayKeySecret', 'codEnabled', 'codInstructions'],
      SMTP: ['emailEnabled', 'smtpHost', 'smtpPort', 'smtpUsername', 'smtpPassword', 'fromEmailAddress', 'emailTemplate'],
      WEBSOCKET: ['socketEnabled', 'socketPingInterval', 'socketPingTimeout', 'socketAllowedOrigins'],
      SMS: ['smsEnabled', 'twilioAccountSid', 'twilioAuthToken', 'twilioPhoneNumber'],
      ADS: [
        'metaAccessToken', 'metaAdAccountId', 'metaPageId',
        'whatsappAccessToken', 'whatsappPhoneNumberId', 'whatsappBusinessAccountId',
        'googleAdsClientId', 'googleAdsClientSecret', 'googleAdsDeveloperToken',
        'googleAdsRefreshToken', 'googleAdsCustomerAccountId',
      ],
    };

    if (moduleKeyMap[module]) {
      moduleKeyMap[module].forEach(key => {
        if (settings[key]) {
          moduleSettings[key] = settings[key];
        }
      });
    }
    return moduleSettings;
  };

  const updateSettings = async (updates) => {
    try {
      const response = await settingsAPI.updateSettings(updates);
      const serverData = response.data?.data || response.data || updates;
      setSettings(prev => ({ ...(prev || {}), ...serverData }));
      // Refetch app-init data so layout components (Navbar, etc.) get fresh
      // promotions, currencies, and other app-level data immediately
      refetchAppInit();
      toast.success('Settings updated successfully');
      return serverData;
    } catch (err) {
      console.error('Error updating settings:', err);
      toast.error(err.response?.data?.message || 'Failed to update settings');
      throw err;
    }
  };

  const updateSetting = async (key, value) => {
    try {
      const response = await settingsAPI.updateSetting(key, value);
      const serverData = response.data?.data || { [key]: value };
      setSettings(prev => ({
        ...(prev || {}),
        [serverData.key || key]: serverData.value || value
      }));
      toast.success('Setting updated successfully');
      return serverData;
    } catch (err) {
      console.error('Error updating setting:', err);
      toast.error(err.response?.data?.message || 'Failed to update setting');
      throw err;
    }
  };

  const value = {
    settings,
    loading,
    error: null,
    getSetting,
    getSettingsByModule,
    updateSettings,
    updateSetting,
    refreshSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}



 
function getDefaultSettings() {
  const DEFAULT_STORE_NAME = 'THREVOLT';
  return {
    storeName: DEFAULT_STORE_NAME,
    brandTagline: 'Premium Fashion & Lifestyle', // used in invoices — matches InvoiceService PHP fallback
    contactEmail: 'support@threvolt.com',
    storeEmail: 'support@threvolt.com',
    currency: 'INR',
    timezone: 'IST',
    storeAddress: `${DEFAULT_STORE_NAME} Headquarters, Bangalore, Karnataka, India`,
    shippingPickupAddress: `${DEFAULT_STORE_NAME} Fulfillment Center, Bangalore, Karnataka, India`,
    shippingReturnAddress: `${DEFAULT_STORE_NAME} Returns, Bangalore, Karnataka, India`,
    shippingQueryMobile: '+91 98765 43210',
    shippingQueryEmail: 'support@threvolt.com',
    shippingLabelLogo: '',
    shippingLabelNote: `Thank you for shopping at ${DEFAULT_STORE_NAME}! For returns or support, please email support@threvolt.com`,
    taxRate: '18.0',
    taxCalculation: 'inclusive',
    freeShippingThreshold: '499',
    shippingFlatRate: '50',
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUsername: 'admin@threvolt.com',
    smtpPassword: '',
    fromEmailAddress: 'support@threvolt.com',
    emailTemplate: 'default',
    // Email Notifications
    emailEnabled: 'true',
    razorpayEnabled: 'false',
    razorpayKeyId: '',
    razorpayKeySecret: '',
    codEnabled: 'false',
    codInstructions: '',
    maintenanceMode: 'false',
    maintenanceMessage: 'We are currently under maintenance. Please check back soon.',
    maintenanceAllowedIPs: '',
    custom404Enabled: 'false',
    custom404Title: 'Page Not Found',
    custom404Message: 'The page you are looking for does not exist.',
    custom404ShowHeader: 'true',
    custom404ShowFooter: 'true',
    // WebSocket
    socketEnabled: 'true',
    socketPingInterval: '25000',
    socketPingTimeout: '20000',
    socketAllowedOrigins: 'http://localhost:3000,http://localhost:5173,http://localhost:5174',
    // SMS / Twilio
    smsEnabled: 'false',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
    // Announcement Bar
    // Cookie Consent
    cookieConsentEnabled: 'true',

    // Homepage Sections (master toggles)
    reviewsEnabled: 'true',
    bestSellersEnabled: 'true',
    newArrivalsEnabled: 'true',
    curatedLooksEnabled: 'true',
    newArrivalProductId: '',
    newArrivalExpiryDate: '',
    tshirtCustomizerEnabled: 'true',
    // Social Login
    googleLoginEnabled: 'true',
    facebookLoginEnabled: 'true',
    googleClientId: '',
    googleClientSecret: '',
    facebookAppId: '',
    facebookAppSecret: '',
    announcementEnabled: 'true',
    announcementText: `${DEFAULT_STORE_NAME}  ✦  Premium Quality Guaranteed  ✦  Free Shipping on orders above ₹499`,
    // WhatsApp Button
    whatsappButtonEnabled: 'false',
    whatsappButtonNumber: '',
    whatsappButtonMessage: 'Hi, I need help with my order',
    whatsappButtonPosition: 'left',
    // WhatsApp Quick Replies (JSON stringified array of {label, message})
    whatsappQuickReplies: JSON.stringify([
      { label: '👋 Hi!', message: 'Hi, I have a question about your products.' },
      { label: '💰 Pricing', message: 'Hi, I\'d like to know more about your pricing and any ongoing discounts.' },
      { label: '📏 Sizing Help', message: 'Hi, I need help with sizing. Can you guide me on which size to pick?' },
      { label: '🕐 Store Hours', message: 'Hi, what are your store hours and when do you process orders?' },
      { label: '📦 Order Status', message: 'Hi, I want to check my order status.' },
      { label: '🔄 Returns', message: 'Hi, I need help with a return or exchange.' },
      { label: '💳 Payment', message: 'Hi, I\'m facing an issue with payment.' },
      { label: '🚚 Shipping', message: 'Hi, what are your shipping options and delivery times?' },
    ]),
    // Phone Lead Banner
    phoneLeadBannerEnabled: 'false',
    phoneLeadBannerHeading: '🎉 Get ₹100 Off Your First Order!',
    phoneLeadBannerOfferText: 'Enter your phone number to receive exclusive offers, updates, and instant ₹100 discount on your first purchase!',
    // Chatbot / Live Chat
    // Bundle Offer (Buy More, Save More)
    bundleOfferEnabled: 'true',
    // Custom Design
    customDesignEnabled: 'true',
    customDesignSectionEnabled: 'true',
    customDesignSinglePrintPrice: '699',
    customDesignBothSidesPrice: '899',
    customDesignColors: 'White, Black, Navy, Charcoal, Olive, Burgundy, Forest Green, Royal Blue',
    customDesignSizes: 'XS, S, M, L, XL, XXL, 3XL',
    customDesignPlacements: 'front,back,left-chest',
    customDesignMaxFileSize: '10',
    customDesignAcceptedFormats: 'image/png,.png,image/jpeg,.jpg,.jpeg,image/svg+xml,.svg,.ai,.eps',
    // Navbar Options
    languageSwitcherEnabled: 'true',
    currencySwitcherEnabled: 'true',
    chatbotEnabled: 'true',
    chatWelcomeMessage: '👋 Hi there! How can we help you today?',
    chatOfflineMessage: 'We are currently offline. Please leave a message and we will get back to you during business hours.',
    chatWorkingHoursEnabled: 'false',
    chatWorkingHoursStart: '09:00',
    chatWorkingHoursEnd: '18:00',
    chatWorkingDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
    chatSupportName: 'Support Team',
    chatResponseTime: 'We typically reply in minutes',
    chatAutoReplyEnabled: 'true',
    chatAutoReplyMessage: 'Thank you for your message! One of our team members will get back to you shortly.',
    // Footer settings
    footerBrandTagline: "India's favorite t-shirt brand. Premium quality, bold designs, and unbeatable comfort — all at prices that make you smile.",
    footerNewsletterEnabled: 'true',
    footerNewsletterTitle: 'Get 10% Off',
    footerNewsletterSubtitle: 'Subscribe for early access to new drops & exclusive deals!',
    footerNewsletterBtnText: 'Join',
    footerShopLinks: JSON.stringify([
      { label: 'Oversized Tees', to: '/products?category=oversized' },
      { label: 'Graphic Tees', to: '/products?category=graphic' },
      { label: 'Polo T-Shirts', to: '/products?category=polo' },
      { label: 'Plain T-Shirts', to: '/products?category=plain' },
      { label: 'Combo Packs', to: '/products?category=combo' },
    ]),
    footerHelpLinks: JSON.stringify([
      { label: 'Track Order', to: '/orders' },
      { label: 'About Us', to: '/about' },
      { label: 'Contact Us', to: '/contact' },
      { label: 'Size Guide', to: '' },
      { label: 'Shipping Info', to: '' },
      { label: 'Returns & Exchange', to: '/return-policy' },
      { label: 'Privacy Policy', to: '/privacy-policy' },
    ]),
    footerBottomLinks: JSON.stringify([
      { label: 'Privacy Policy' },
      { label: 'Terms of Service' },
      { label: 'Refund Policy' },
    ]),
    footerTrustBadges: JSON.stringify([
      { title: 'Free Shipping', desc: 'On orders over ₹499' },
      { title: 'Easy Returns', desc: '7-day return policy' },
      { title: 'Secure Payment', desc: '100% secure transactions' },
      { title: '24/7 Support', desc: 'Dedicated customer service' },
    ]),
  };
}
