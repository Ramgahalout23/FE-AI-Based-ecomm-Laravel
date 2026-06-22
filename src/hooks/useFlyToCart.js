import { useCallback, useRef } from 'react';

/* ── Fly-To-Cart Animation Hook ─────────────────────────────
 * Usage:
 *   const { flyRef, flyToCart } = useFlyToCart();
 *   <div ref={flyRef}>  ← place on the product image container
 *   <button onClick={flyToCart}>Add to Cart</button>
 *
 * On flyToCart(), it captures the source element's position,
 * creates a flying clone, and animates it to the cart button.
 * ──────────────────────────────────────────────────────── */

export default function useFlyToCart() {
  const flyRef = useRef(null);
  const flyingElRef = useRef(null);

  const flyToCart = useCallback((sourceElOverride) => {
    const sourceEl = sourceElOverride || flyRef.current;
    if (!sourceEl) return;

    // Find cart button
    const cartBtn = document.querySelector('[data-cart-btn]');
    if (!cartBtn) return;

    const sourceRect = sourceEl.getBoundingClientRect();
    const targetRect = cartBtn.getBoundingClientRect();

    // Compute the target position (center of cart icon)
    const startX = sourceRect.left;
    const startY = sourceRect.top;
    const startW = sourceRect.width;
    const startH = sourceRect.height;

    const endX = targetRect.left + targetRect.width / 2 - 20;
    const endY = targetRect.top + targetRect.height / 2 - 20;

    // Get the product image source URL from the img inside the source element
    const imgEl = sourceEl.querySelector('img');
    const imgSrc = imgEl?.src || null;

    // Create the flying element
    const flyingEl = document.createElement('div');
    flyingEl.className = 'fly-to-cart-clone';
    flyingEl.style.cssText = `
      position: fixed;
      z-index: 9999;
      pointer-events: none;
      left: ${startX}px;
      top: ${startY}px;
      width: ${Math.min(startW, 120)}px;
      height: ${Math.min(startH, 160)}px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 12px 40px rgba(0,0,0,0.3);
      transition: all 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    `;

    if (imgSrc) {
      flyingEl.innerHTML = `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;display:block;" />`;
    } else {
      flyingEl.innerHTML = `<div style="width:100%;height:100%;background:#232323;display:flex;align-items:center;justify-content:center;font-size:2rem;">👕</div>`;
    }

    document.body.appendChild(flyingEl);
    flyingElRef.current = flyingEl;

    // Trigger the fly animation in the next frame
    requestAnimationFrame(() => {
      flyingEl.style.left = `${endX}px`;
      flyingEl.style.top = `${endY}px`;
      flyingEl.style.width = '40px';
      flyingEl.style.height = '40px';
      flyingEl.style.borderRadius = '50%';
      flyingEl.style.opacity = '0.8';
      flyingEl.style.transform = 'scale(0.5)';
    });

    // Add bounce to cart icon
    cartBtn.classList.add('cart-bounce');

    // Pop the count badge
    const badge = cartBtn.querySelector('[class*="rounded-full"][class*="absolute"]');
    if (badge) {
      badge.classList.add('badge-pop');
      setTimeout(() => badge.classList.remove('badge-pop'), 500);
    }

    setTimeout(() => {
      cartBtn.classList.remove('cart-bounce');
    }, 700);

    // Cleanup after animation
    const cleanup = () => {
      if (flyingElRef.current && document.body.contains(flyingElRef.current)) {
        document.body.removeChild(flyingElRef.current);
      }
      flyingElRef.current = null;
    };

    flyingEl.addEventListener('transitionend', cleanup, { once: true });

    // Fallback cleanup after 1s
    setTimeout(() => {
      if (flyingElRef.current) cleanup();
    }, 1000);
  }, []);

  return { flyRef, flyToCart };
}
