/**
 * OffersSection Mobile Sizing Tests
 *
 * Regression guard for "Offers for you card showing bigger in mobile view":
 * the offer cards must be compact on phones (142px base width, tighter
 * padding + text) and only grow to the 184px desktop size at the `sm`
 * breakpoint (640px+), via Tailwind responsive classes.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OffersSection from '../../components/storefront/OffersSection';

const OFFERS = [
  {
    id: 'smart',
    title: 'Smart Deal',
    offerBadge: 'BUY 2',
    offerHighlight: 'GET 10% OFF',
    offerTagline: 'Auto-applied at checkout',
    discount: '10',
    status: 'ACTIVE',
    isActive: true,
  },
  {
    id: 'prepaid',
    title: 'Prepaid Offer',
    offerHighlight: 'EXTRA 10% OFF',
    offerTagline: 'On prepaid orders',
    discount: '10',
    status: 'ACTIVE',
    isActive: true,
  },
];

describe('OffersSection card sizing', () => {
  it('renders a card for every offer', () => {
    render(<OffersSection promotions={OFFERS} />);
    expect(screen.getByText('GET 10% OFF')).toBeTruthy();
    expect(screen.getByText('EXTRA 10% OFF')).toBeTruthy();
  });

  it('uses the compact mobile width and the sm+ desktop width via responsive classes', () => {
    render(<OffersSection promotions={OFFERS} />);
    const card = document.querySelector('.w-\\[142px\\]');
    expect(card).toBeTruthy();
    expect(card.className).toContain('w-[142px]');
    expect(card.className).toContain('sm:w-[184px]');
    expect(card.className).toContain('p-2.5');
    expect(card.className).toContain('sm:p-3.5');
  });

  it('sizes the highlight line responsively (13px mobile → 15px desktop)', () => {
    render(<OffersSection promotions={OFFERS} />);
    const highlights = document.querySelectorAll('.font-black');
    expect(highlights.length).toBe(2);
    highlights.forEach((el) => {
      expect(el.className).toContain('text-[13px]');
      expect(el.className).toContain('sm:text-[15px]');
    });
  });

  it('keeps the icon chip compact on mobile', () => {
    render(<OffersSection promotions={OFFERS} />);
    const card = document.querySelector('.w-\\[142px\\]');
    const chip = card.querySelector('.rounded-lg');
    expect(chip).toBeTruthy();
    expect(chip.className).toContain('w-7');
    expect(chip.className).toContain('h-7');
    expect(chip.className).toContain('sm:w-8');
    expect(chip.className).toContain('sm:h-8');
  });
});
