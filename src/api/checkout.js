import client from './client';

import { toSnakePayload } from '../utils/apiUtils';

const checkoutMappings = {
  couponCode: 'coupon_code',
  paymentMethod: 'payment_method',
  shippingMethod: 'shipping_method',
  shippingAddress: 'shipping_address',
  billingAddress: 'billing_address',
  createAccount: 'create_account',
  discountAmount: 'discount_amount',
  discountType: 'discount_type',
  discountValue: 'discount_value',
  minOrderValue: 'min_order_value',
  maxDiscount: 'max_discount',
  isStackable: 'is_stackable',
  isNewUserOnly: 'is_new_user_only',
  isAutoApply: 'is_auto_apply',
  startDate: 'start_date',
  expiryDate: 'expiry_date',
};

export const checkoutAPI = {
  getSummary: (params) => client.get('/checkout/summary', { params }),
  calculateShipping: (data) => client.post('/checkout/shipping', data),
  applyCoupon: (data) => client.post('/checkout/coupon', toSnakePayload(data, checkoutMappings)),
  removeCoupon: () => client.delete('/checkout/coupon'),
  process: (data) => client.post('/checkout', toSnakePayload(data, checkoutMappings)),
};
