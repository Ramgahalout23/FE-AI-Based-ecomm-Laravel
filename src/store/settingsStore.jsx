import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsAPI } from '../api/settings';
import toast from '../utils/toast';
import { SettingsContext } from './settingsContext';

/**
 * Parse raw API settings response into a clean flat object,
 * stripping any envelope keys that don't belong in the settings map.
 */
function parseSettings(response) {
  const body = response?.data;
  const raw = (body && typeof body === 'object' && body.data && typeof body.data === 'object')
    ? body.data
    : (body || {});

  const POISON_KEYS = new Set([
    'success', 'statusCode', 'message', 'timestamp', 'data', 'settings',
  ]);
  const clean = {};
  Object.keys(raw).forEach((k) => {
    if (!POISON_KEYS.has(k)) clean[k] = raw[k];
  });
  return clean;
}

export function SettingsProvider({ children }) {
  const queryClient = useQueryClient();

  const { data: settings = {}, isLoading: loading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await settingsAPI.getAll({ timeout: 60000 });
      const parsed = parseSettings(response);
      // If we got back an empty object, fall back to defaults
      if (Object.keys(parsed).length === 0) {
        return getDefaultSettings();
      }
      return parsed;
    },
    staleTime: 300000, // 5 minutes — settings rarely change
    retry: 2,
    // On error, use defaults (don't crash the app)
    placeholderData: getDefaultSettings(),
  });

  const refreshSettings = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['settings'] });
  }, [queryClient]);

  const getSetting = (key, defaultValue = null) => {
    return settings[key] ?? defaultValue;
  };

  const getSettingsByModule = (module) => {
    // Since API returns flat object, we'll filter based on known keys per module
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
      // API returns { success, message, data: {...updated settings} }
      const serverData = response.data?.data || response.data || updates;
      // Update React Query cache directly (useQuery manages the state)
      queryClient.setQueryData(['settings'], prev => ({ ...(prev || {}), ...serverData }));
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
      // API returns { success, message, data: { key, value } }
      const serverData = response.data?.data || { [key]: value };
      queryClient.setQueryData(['settings'], prev => ({
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
    error,
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
    // Homepage Sections (master toggles)
    reviewsEnabled: 'true',
    bestSellersEnabled: 'true',
    newArrivalsEnabled: 'true',
    curatedLooksEnabled: 'true',
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
    // Chatbot / Live Chat
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
