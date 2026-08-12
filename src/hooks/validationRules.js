/**
 * validationRules — shared registry of admin form validation rules.
 *
 * Identical constraints (code length, rate ≥ 0, URL format, email/password
 * shape, "X is required") are defined once here and reused across admin pages
 * so they can't drift out of sync. Every export is a rule factory returning a
 * validator `(value) => string | ''` compatible with useAdminFormValidation,
 * and named rules compose the primitives from useAdminFormValidation.
 *
 * ```jsx
 * import { requiredField, currencyCode, rateValue } from '../../hooks/validationRules';
 *
 * const validation = useAdminFormValidation({
 *   code: currencyCode(),
 *   name: requiredField('Currency name'),
 *   rate: rateValue('Tax rate'),
 * });
 * ```
 */

import {
  required,
  validUrl,
  validEmail,
  minLength,
  hasUppercase,
  hasNumber,
  nonNegativeNumber,
  positiveInteger,
  composeValidators,
} from './useAdminFormValidation';

/** Standard "X is required" for a labeled field. */
export const requiredField = (label) => required(`${label} is required`);

/** Coupon code — required. */
export const couponCode = () => requiredField('Coupon code');

/** ISO-style currency code — exactly 3 letters (e.g. USD). Empty also fails. */
export const currencyCode = (message = 'Currency code must be exactly 3 letters (e.g. USD)') =>
  (value) => {
    const s = value === undefined || value === null ? '' : String(value).trim();
    return s.length === 3 ? '' : message;
  };

/** Locale code — 2-5 characters (e.g. en, fr, hi). Empty also fails. */
export const languageCode = (message = 'Code must be 2-5 characters (e.g. en, fr, hi)') =>
  (value) => {
    const s = value === undefined || value === null ? '' : String(value).trim();
    return s.length >= 2 && s.length <= 5 ? '' : message;
  };

/** Rate/discount value — required and a non-negative number (0 or more). */
export const rateValue = (label = 'Value', message = 'Enter a valid number (0 or more)') =>
  composeValidators(required(`${label} is required`), nonNegativeNumber(message));

/** Stock quantity — required positive whole number (1 or more). */
export const stockQuantity = (label = 'Quantity', message = 'Enter a valid quantity greater than 0') =>
  composeValidators(required(`${label} is required`), positiveInteger(message));

/** Required webhook endpoint URL. */
export const webhookUrl = (message = 'Enter a valid URL (https://...)') =>
  composeValidators(required('Webhook URL is required'), validUrl(message));

/** Optional image/logo URL. */
export const imageUrl = (message = 'Enter a valid URL (https://...)') => validUrl(message);

/**
 * Optional field; when filled must be a full URL, a data URI, or a local
 * path (e.g. "/uploads/logo.png"). Lenient enough for upload zones that store
 * relative paths, strict enough to catch obvious garbage.
 */
export const localOrRemoteUrl = (message = 'Enter a valid URL (https://...)') =>
  (value) => {
    if (value === undefined || value === null || String(value).trim() === '') return '';
    const s = String(value).trim();
    if (s.startsWith('/') || s.startsWith('data:')) return '';
    try {
      new URL(s);
      return '';
    } catch {
      return message;
    }
  };

/** Required email address (staff invite + admin login). */
export const emailAddress = () =>
  composeValidators(required('Email is required'), validEmail('Enter a valid email address'));

/** Password policy shared by staff + admin login: 8+ chars, uppercase, number. */
export const passwordPolicy = () =>
  composeValidators(minLength(8), hasUppercase(), hasNumber());

/** Admin login password — required on top of the shared policy. */
export const loginPassword = () =>
  composeValidators(required('Password is required'), passwordPolicy());
