/**
 * WhatsAppChatWidget
 * Floating WhatsApp button that opens a chat-like popup.
 * User types a message, clicks send, and gets redirected to wa.me
 * with the owner's number and their message pre-filled.
 * Premium glass-morphism UI with animated entrance.
 *
 * Props:
 *   phoneNumber   — WhatsApp number with country code (required)
 *   message       — Default pre-filled message
 *   position      — 'left' (default) or 'right'
 *   buttonColor   — Main floating button color (default: WhatsApp green #25D366)
 *   headerColor   — Chat popup header color (default: WhatsApp teal #075E54)
 *   accentColor   — Accent color for quick replies & send button (default: WhatsApp green #25D366)
 *   quickReplies  — Array of {label, message} objects for quick reply chips (optional)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { trackWhatsAppClick } from '../../services/tracker';

// ─── Color Helpers ────────────────────────────────────────
function hexToRgb(hex) {
  const cleaned = hex.replace('#', '');
  const num = parseInt(cleaned.length === 3 ? cleaned.split('').map(c => c + c).join('') : cleaned, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgba(color, alpha) {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─── Default Quick Replies (fallback if no prop provided) ──
const DEFAULT_QUICK_REPLIES = [
  { label: '👋 Hi!', message: 'Hi, I have a question about your products.' },
  { label: '💰 Pricing', message: 'Hi, I\'d like to know more about your pricing and any ongoing discounts.' },
  { label: '📏 Sizing Help', message: 'Hi, I need help with sizing. Can you guide me on which size to pick?' },
  { label: '🕐 Store Hours', message: 'Hi, what are your store hours and when do you process orders?' },
  { label: '📦 Order Status', message: 'Hi, I want to check my order status.' },
  { label: '🔄 Returns', message: 'Hi, I need help with a return or exchange.' },
  { label: '💳 Payment', message: 'Hi, I\'m facing an issue with payment.' },
  { label: '🚚 Shipping', message: 'Hi, what are your shipping options and delivery times?' },
];

// ─── Main Component ───────────────────────────────────────
export default function WhatsAppChatWidget({
  phoneNumber,
  message = 'Hi, I need help with your store',
  position = 'left',
  buttonColor = '#25D366',
  headerColor = '#075E54',
  accentColor = '#25D366',
  quickReplies,
}) {
  // Use provided quickReplies or fall back to defaults
  const replyChips = Array.isArray(quickReplies) && quickReplies.length > 0
    ? quickReplies
    : DEFAULT_QUICK_REPLIES;
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const inputRef = useRef(null);

  // Watch body overflow & reel-player data attr — modals/sheets set overflow: hidden when open
  useEffect(() => {
    const checkOverlay = () => {
      setIsOverlayOpen(
        document.body.style.overflow === 'hidden' ||
        document.body.getAttribute('data-reel-player') === 'active'
      );
    };
    checkOverlay();
    const observer = new MutationObserver(checkOverlay);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'data-reel-player'] });
    return () => observer.disconnect();
  }, []);

  // Focus input when popup opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Redirect to WhatsApp
  const redirectToWhatsApp = useCallback(
    (customMessage) => {
      if (!phoneNumber) return;
      const cleaned = phoneNumber.replace(/[^\d+]/g, '');
      const msg = customMessage || inputValue.trim() || message;
      const encodedMessage = encodeURIComponent(msg.trim());
      const url = `https://wa.me/${cleaned}?text=${encodedMessage}`;
      trackWhatsAppClick(cleaned);
      window.open(url, '_blank', 'noopener,noreferrer');
      setIsOpen(false);
      setInputValue('');
    },
    [phoneNumber, inputValue, message],
  );

  // Handle send
  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;
    redirectToWhatsApp(inputValue.trim());
  }, [inputValue, redirectToWhatsApp]);

  // Handle quick reply click
  const handleQuickReply = useCallback(
    (replyMessage) => {
      redirectToWhatsApp(replyMessage);
    },
    [redirectToWhatsApp],
  );

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Toggle widget open/close
  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  if (!phoneNumber || !phoneNumber.trim()) return null;

  const isRight = position === 'right';
  const side = isRight ? 'right' : 'left';

  // Derive gradient colors from the header color (lighter variant for gradient end)
  const headerGradient = `linear-gradient(135deg, ${headerColor}, ${buttonColor || accentColor})`;
  const buttonShadow = `0 4px 24px ${rgba(buttonColor, 0.35)}, 0 2px 8px rgba(0,0,0,0.15)`;
  const buttonGradient = `linear-gradient(135deg, ${buttonColor}, ${headerColor})`;

  return (
    <>
      {/* ─── Floating WhatsApp Button ─── */}
      <button
        onClick={toggleOpen}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="whatsapp-chat-float-btn"
        style={{
          position: 'fixed',
          [side]: '20px',
          zIndex: 9990,
          width: '58px',
          height: '58px',
          borderRadius: '50%',
          background: buttonGradient,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: buttonShadow,
          transition:
            'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, opacity 0.25s ease, scale 0.25s ease',
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          opacity: isOverlayOpen ? 0 : 1,
          scale: isOverlayOpen ? 0.75 : 1,
          pointerEvents: isOverlayOpen ? 'none' : 'auto',
        }}
        aria-label={isOpen ? 'Close WhatsApp chat' : 'Open WhatsApp chat'}
      >
        {/* Glass overlay */}
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 50%)',
            pointerEvents: 'none',
          }}
        />

        {/* WhatsApp icon */}
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="white"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: 'relative',
            zIndex: 1,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
            transition: 'transform 0.3s ease',
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        >
          {isOpen ? (
            // X icon when open
            <>
              <line x1="18" y1="6" x2="6" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : (
            // WhatsApp icon
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          )}
        </svg>

        {/* Inner glass ring */}
        <span
          style={{
            position: 'absolute',
            inset: '2px',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.15)',
            pointerEvents: 'none',
          }}
        />

        {/* Pulse ring */}
        <span
          style={{
            position: 'absolute',
            inset: isHovered ? '-8px' : '-4px',
            borderRadius: '50%',
            border: `2px solid ${
              isHovered ? rgba(accentColor, 0.5) : rgba(accentColor, 0.25)
            }`,
            animation: isHovered
              ? 'whatsappChatPulseHover 1.5s ease-in-out infinite'
              : 'whatsappChatPulse 2.5s ease-in-out infinite',
            transition: 'inset 0.3s ease, border-color 0.3s ease',
            pointerEvents: 'none',
          }}
        />
      </button>

      {/* ─── Chat Popup ─── */}
      {isOpen && (
        <div
          className="whatsapp-chat-window"
          style={{
            position: 'fixed',
            [side]: '20px',
            zIndex: 10002,
            width: '360px',
            maxWidth: 'calc(100vw - 48px)',
            height: '480px',
            maxHeight: 'calc(100vh - 140px)',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 12px rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'whatsappChatSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              background: headerGradient,
              color: 'white',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                💬
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>Chat with us</div>
                <div style={{ fontSize: '11px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#22c55e',
                      display: 'inline-block',
                      animation: 'whatsappChatStatusPulse 2s ease-in-out infinite',
                    }}
                  />
                  Online — Typically replies instantly
                </div>
              </div>
            </div>
            <button
              onClick={toggleOpen}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                borderRadius: '8px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
              }}
              aria-label="Close chat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* ── Messages Area ── */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              background: '#e5ddd5',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4c9b8\' fill-opacity=\'0.3\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {/* Welcome message from bot */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                animation: 'whatsappChatFadeIn 0.4s ease-out 0.1s both',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: '4px 16px 16px 16px',
                  background: 'white',
                  color: '#1a1a1a',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  wordBreak: 'break-word',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px', color: headerColor }}>
                  👋 Hey there!
                </div>
                <div>
                  Welcome to our store! Send us a message and we&apos;ll connect with you on WhatsApp to help you out.
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: '#999',
                    marginTop: '6px',
                    textAlign: 'right',
                  }}
                >
                  Just now
                </div>
              </div>
            </div>

            {/* Quick reply chips */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginTop: '4px',
                animation: 'whatsappChatFadeIn 0.4s ease-out 0.3s both',
              }}
            >
              {replyChips.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickReply(reply.message)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '20px',
                    border: `1px solid ${rgba(accentColor, 0.3)}`,
                    background: rgba(accentColor, 0.08),
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: headerColor,
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = rgba(accentColor, 0.18);
                    e.currentTarget.style.borderColor = rgba(accentColor, 0.6);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = rgba(accentColor, 0.08);
                    e.currentTarget.style.borderColor = rgba(accentColor, 0.3);
                  }}
                >
                  {reply.label}
                </button>
              ))}
            </div>

            {/* Or type your own message hint */}
            <div
              style={{
                textAlign: 'center',
                fontSize: '11px',
                color: '#999',
                marginTop: '8px',
                animation: 'whatsappChatFadeIn 0.4s ease-out 0.5s both',
              }}
            >
              ⚡ Or type your message below
            </div>
          </div>

          {/* ── Input Area ── */}
          <div
            style={{
              borderTop: '1px solid #e8e8e8',
              padding: '10px 12px',
              background: '#f0f0f0',
              flexShrink: 0,
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              style={{
                flex: 1,
                border: 'none',
                borderRadius: '24px',
                padding: '10px 16px',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
                lineHeight: 1.4,
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
                background: 'white',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                border: 'none',
                background: inputValue.trim()
                  ? `linear-gradient(135deg, ${accentColor}, ${headerColor})`
                  : '#ccc',
                color: 'white',
                cursor: inputValue.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s',
                boxShadow: inputValue.trim()
                  ? `0 2px 8px ${rgba(accentColor, 0.3)}`
                  : 'none',
              }}
              onMouseEnter={(e) => {
                if (inputValue.trim()) {
                  e.currentTarget.style.transform = 'scale(1.08)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              aria-label="Send message"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>

          {/* Footer note */}
          <div
            style={{
              padding: '6px 12px',
              background: '#f0f0f0',
              textAlign: 'center',
              fontSize: '10px',
              color: '#999',
              borderTop: '1px solid #e0e0e0',
            }}
          >
            🔒 Secure · Powered by WhatsApp
          </div>
        </div>
      )}

      {/* ─── Tooltip (shown when button is hovered and widget is closed) ─── */}
      {isHovered && !isOpen && !isOverlayOpen && (
        <div
          className="whatsapp-chat-tooltip"
          style={{
            position: 'fixed',
            [side]: '28px',
            zIndex: 9990,
            background: '#1a1a1a',
            color: 'white',
            padding: '10px 18px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.1)',
            pointerEvents: 'none',
            animation: 'whatsappChatTooltipSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <span
            style={{
              position: 'absolute',
              bottom: '-6px',
              left: '50%',
              marginLeft: '-6px',
              width: '12px',
              height: '12px',
              background: '#1a1a1a',
              transform: 'rotate(45deg)',
              borderRadius: '2px',
            }}
          />
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={buttonColor}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Chat with us
          </span>
        </div>
      )}

      <style>{`
        .whatsapp-chat-float-btn {
          bottom: 20px;
          animation: whatsappChatEntry 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
        }

        @keyframes whatsappChatEntry {
          from { opacity: 0; transform: scale(0.6) translateY(16px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        @keyframes whatsappChatSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes whatsappChatFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes whatsappChatTooltipSlide {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes whatsappChatPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.08); }
        }

        @keyframes whatsappChatPulseHover {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }

        @keyframes whatsappChatStatusPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }

        .whatsapp-chat-window {
          bottom: 82px;
        }

        .whatsapp-chat-tooltip {
          bottom: 86px;
        }

        /* On mobile (below lg breakpoint), move button above the 80px MobileNav bar */
        @media (max-width: 1023px) {
          .whatsapp-chat-float-btn {
            bottom: 100px;
          }
          .whatsapp-chat-window {
            bottom: 162px;
          }
          .whatsapp-chat-tooltip {
            bottom: 166px;
          }
        }
      `}</style>
    </>
  );
}
