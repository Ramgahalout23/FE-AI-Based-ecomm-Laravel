import { describe, it, expect } from 'vitest';
import {
  requiredField,
  couponCode,
  currencyCode,
  languageCode,
  rateValue,
  stockQuantity,
  webhookUrl,
  imageUrl,
  localOrRemoteUrl,
  emailAddress,
  passwordPolicy,
  loginPassword,
} from './validationRules';

/** Expect `rule(value)` to return a non-empty error message. */
const expectError = (rule, value) => {
  expect(rule(value), `expected error for ${JSON.stringify(value)}`).toBeTruthy();
};

/** Expect `rule(value)` to pass (empty string). */
const expectPass = (rule, value) => {
  expect(rule(value), `expected pass for ${JSON.stringify(value)}`).toBe('');
};

describe('validationRules registry', () => {
  describe('requiredField', () => {
    it('labels the message with the field name', () => {
      expect(requiredField('Brand name')('')).toBe('Brand name is required');
      expect(requiredField('Brand name')('   ')).toBe('Brand name is required');
    });
    it('passes when a value is present', () => {
      expectPass(requiredField('Brand name'), 'NeoPrint');
    });
  });

  describe('couponCode', () => {
    it('rejects empty', () => expectError(couponCode(), ''));
    it('accepts any non-empty code', () => expectPass(couponCode(), 'SAVE20'));
  });

  describe('currencyCode', () => {
    it('rejects empty, 2-letter, and 4-letter codes', () => {
      expectError(currencyCode(), '');
      expectError(currencyCode(), 'EU');
      expectError(currencyCode(), 'USDE');
    });
    it('accepts exactly 3 letters (case-insensitive)', () => {
      expectPass(currencyCode(), 'USD');
      expectPass(currencyCode(), 'inr');
      expectPass(currencyCode(), 'AUD');
    });
    it('keeps the pre-refactor message', () => {
      expect(currencyCode()('EU')).toBe('Currency code must be exactly 3 letters (e.g. USD)');
    });
  });

  describe('languageCode', () => {
    it('rejects too-short and too-long codes', () => {
      expectError(languageCode(), '');
      expectError(languageCode(), 'e');
      expectError(languageCode(), 'english');
    });
    it('accepts 2-5 character codes', () => {
      expectPass(languageCode(), 'en');
      expectPass(languageCode(), 'fr');
      expectPass(languageCode(), 'zh-CN');
    });
  });

  describe('rateValue', () => {
    const rule = () => rateValue('Tax rate', 'Valid tax rate is required');
    it('rejects empty and negative values', () => {
      expectError(rule(), '');
      expectError(rule(), '-5');
    });
    it('accepts zero and positive numbers', () => {
      expectPass(rule(), '0');
      expectPass(rule(), '18');
      expectPass(rule(), '18.5');
    });
    it('rejects non-numeric input (tighter than the old parseFloat(v) < 0 check)', () => {
      expectError(rule(), 'abc');
    });
  });

  describe('webhookUrl', () => {
    it('requires a value and a valid URL', () => {
      expectError(webhookUrl(), '');
      expectError(webhookUrl(), 'not-a-url');
      expectPass(webhookUrl(), 'https://hooks.example.com/order-created');
    });
  });

  describe('imageUrl', () => {
    it('is optional but must be a valid URL when filled', () => {
      expectPass(imageUrl(), '');
      expectError(imageUrl(), 'nope');
      expectPass(imageUrl(), 'https://img.example.com/a.png');
    });
  });

  describe('localOrRemoteUrl', () => {
    it('is optional and accepts local paths, data URIs, and full URLs', () => {
      expectPass(localOrRemoteUrl(), '');
      expectPass(localOrRemoteUrl(), '/uploads/logo.png');
      expectPass(localOrRemoteUrl(), 'data:image/png;base64,AAAA');
      expectPass(localOrRemoteUrl(), 'https://img.example.com/logo.png');
    });
    it('rejects obvious garbage', () => {
      expectError(localOrRemoteUrl(), 'not a url at all');
      expectError(localOrRemoteUrl(), '://missing-scheme');
    });
  });

  describe('emailAddress', () => {
    it('requires a value and a valid email', () => {
      expectError(emailAddress(), '');
      expectError(emailAddress(), 'not-an-email');
      expectPass(emailAddress(), 'admin@threvolt.com');
    });
  });

  describe('stockQuantity', () => {
    it('requires a value', () => {
      expectError(stockQuantity(), '');
      expectError(stockQuantity(), '   ');
      expect(stockQuantity()('')).toBe('Quantity is required');
    });
    it('rejects zero, negatives, decimals, and garbage', () => {
      expectError(stockQuantity(), '0');
      expectError(stockQuantity(), '-3');
      expectError(stockQuantity(), '2.5');
      expectError(stockQuantity(), 'abc');
      expectError(stockQuantity(), '5abc'); // parseInt would have accepted this
    });
    it('accepts any positive whole number', () => {
      expectPass(stockQuantity(), '1');
      expectPass(stockQuantity(), '50');
      expectPass(stockQuantity(), '1000');
    });
    it('uses the stock-specific message for invalid values', () => {
      expect(stockQuantity()('0')).toBe('Enter a valid quantity greater than 0');
    });
  });

  describe('passwordPolicy / loginPassword', () => {
    it('enforces 8+ chars, uppercase, and a number; empty passes (optional)', () => {
      expectPass(passwordPolicy(), '');
      expectError(passwordPolicy(), 'Ab1');
      expectError(passwordPolicy(), 'abcdefgh'); // no uppercase
      expectError(passwordPolicy(), 'abcdefgh1'); // no uppercase
      expectError(passwordPolicy(), 'ABCDEFGH'); // no number
      expectPass(passwordPolicy(), 'Abcdef1!');
      expectPass(passwordPolicy(), 'ABCDEFGH1'); // lowercase not required
    });
    it('loginPassword additionally requires a value', () => {
      expectError(loginPassword(), '');
      expectPass(loginPassword(), 'Abcdef1!');
    });
  });
});
