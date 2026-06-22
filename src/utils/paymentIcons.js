import { CreditCard, Banknote, Globe } from 'lucide-react';

/**
 * Payment method icon mapping.
 * Keys are uppercase payment method IDs returned by the API.
 */
export const PAYMENT_ICONS = {
  'RAZORPAY': { icon: CreditCard, bg: 'bg-indigo-50', color: 'text-indigo-600' },
  'COD': { icon: Banknote, bg: 'bg-emerald-50', color: 'text-emerald-600' },
  'CASH': { icon: Banknote, bg: 'bg-emerald-50', color: 'text-emerald-600' },
};

/**
 * Get the icon, background, and color for a payment method.
 * Falls back to a generic Globe icon for custom/unrecognized gateways.
 *
 * @param {string} methodId - The payment method ID (case-insensitive)
 * @returns {{ icon: React.ComponentType<{size?: number}>, bg: string, color: string }}
 */
export const getPaymentIcon = (methodId) => {
  return PAYMENT_ICONS[(methodId || '').toUpperCase()] || { icon: Globe, bg: 'bg-gray-50', color: 'text-gray-600' };
};
