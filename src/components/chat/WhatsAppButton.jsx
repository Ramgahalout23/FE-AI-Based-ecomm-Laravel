/**
 * WhatsAppButton
 * Floating WhatsApp button that appears at the bottom-left of the storefront.
 * Opens a direct WhatsApp chat via wa.me link using the admin-configured number.
 * Coexists with the chatbot (bottom-right) — no overlap.
 */

import { useState, useCallback, useEffect } from 'react';
import { trackWhatsAppClick } from '../../services/tracker';

export default function WhatsAppButton({ phoneNumber, message = 'Hi, I need help with my order', position = 'left' }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  // Watch body overflow — all modals/sheets set overflow: hidden when open
  useEffect(() => {
    const checkOverflow = () => {
      setIsOverlayOpen(document.body.style.overflow === 'hidden');
    };

    // Check on mount
    checkOverflow();

    // Observe style attribute changes on body
    const observer = new MutationObserver(checkOverflow);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });

    return () => observer.disconnect();
  }, []);

  const handleClick = useCallback(() => {
    if (!phoneNumber) return;
    // Strip any non-digit characters (keep + for country code)
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    const encodedMessage = encodeURIComponent(message.trim());
    const url = `https://wa.me/${cleaned}?text=${encodedMessage}`;
    // Track the click in analytics
    trackWhatsAppClick(cleaned);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [phoneNumber, message]);

  if (!phoneNumber || !phoneNumber.trim()) return null;

  return (
    <>
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="whatsapp-float-btn"
        style={{
          position: 'fixed',
          [position === 'right' ? 'right' : 'left']: '24px',
          zIndex: 9998,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #25D366, #128C7E)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(37, 211, 102, 0.35), 0 2px 8px rgba(0,0,0,0.15)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.25s ease, scale 0.25s ease',
          transform: isHovered ? 'scale(1.08)' : 'scale(1)',
          opacity: isOverlayOpen ? 0 : 1,
          scale: isOverlayOpen ? 0.75 : 1,
          pointerEvents: isOverlayOpen ? 'none' : 'auto',
        }}
        aria-label="Chat on WhatsApp"
      >
        {/* WhatsApp SVG icon */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>

        {/* Subtle pulse ring */}
        <span
          style={{
            position: 'absolute',
            inset: '-4px',
            borderRadius: '50%',
            border: '2px solid rgba(37, 211, 102, 0.3)',
            animation: 'whatsappPulse 2s ease-in-out infinite',
          }}
        />
      </button>

      {/* Tooltip label that appears on hover — hidden when overlay is open */}
      {isHovered && !isOverlayOpen && (
        <div
          className="whatsapp-tooltip"
          style={{
            position: 'fixed',
            bottom: '152px',
            [position === 'right' ? 'right' : 'left']: '24px',
            zIndex: 9998,
            background: '#1a1a1a',
            color: 'white',
            padding: '8px 14px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
            animation: 'chatSlideUp 0.2s ease-out',
          }}
        >
          Chat on WhatsApp
        </div>
      )}

      <style>{`
        .whatsapp-float-btn {
          bottom: 88px;
        }
        .whatsapp-tooltip {
          bottom: 152px !important;
        }

        @keyframes whatsappPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.12); }
        }
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (min-width: 1024px) {
          .whatsapp-float-btn {
            bottom: 24px;
          }
          .whatsapp-tooltip {
            bottom: 88px !important;
          }
        }
      `}</style>
    </>
  );
}
