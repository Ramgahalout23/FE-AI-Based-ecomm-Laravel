/**
 * ChatPanel — admin live chat & support console.
 *
 * Layout contract
 * - The panel fills the admin canvas exactly: its height is measured against the
 *   real available space (panel top → viewport bottom − canvas gutter) instead of
 *   the old hard-coded `calc(100dvh - 170px)`, which left a dead cream strip on
 *   desktop and pushed the composer below the fold on mobile.
 * - Panes scroll internally (min-h-0 on every flex level); the page never scrolls.
 *
 * Design contract (matches the rest of the admin panel)
 * - Warm neutrals (stone) + ink primary + gold accent, cream-compatible surfaces.
 * - Semantic colours are reserved for status/unread only.
 * - The panel is intentionally light-only: every other admin surface is light, and
 *   `dark:` variants here were media-based, so the console turned into a dark slab
 *   inside the light admin canvas whenever the OS was in dark mode.
 *
 * Interaction contract
 * - Overlays are portalled to <body> so the sticky navbar (z-100) cannot sit on top
 *   of them and the panel's `overflow-hidden`/route transform cannot clip them.
 * - Destructive actions use the shared in-app confirm dialog, not window.confirm.
 * - Every icon-only control has an accessible name and a visible focus ring.
 */

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import {
  MessageCircle,
  Send,
  RefreshCw,
  Bot,
  Headphones,
  X,
  CheckCircle,
  Search,
  Trash2,
  Eraser,
  ImagePlus,
  Smile,
  ArrowLeft,
  ArrowDown,
  Zap,
  User,
  Clock,
  Tag,
  ShieldCheck,
  Info,
  ExternalLink,
  Hand,
  Package,
  Truck,
  RotateCcw,
  StickyNote,
  Bookmark,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import { chatAPI } from '../../api/tickets';
import { formatCurrency, formatTime, getImageUrl } from '../../utils/formatters';
import toast from '../../utils/toast';
import { connectSocket, onSocketEvent } from '../../services/socketService';
import { playNotificationChime } from '../../hooks/useForegroundNotifications';
import { useConfirm } from '../../contexts/ConfirmContext';
import EmojiPickerPopover from '../../components/chat/EmojiPickerPopover';
import CannedReplyMenu from '../../components/chat/CannedReplyMenu';
import MessageText from '../../components/chat/MessageText';
import ReadTicks from '../../components/chat/ReadTicks';
import ImageLightbox from '../../components/chat/ImageLightbox';

// Helper to detect if a message is only 1-3 emojis (WhatsApp style)
function isOnlyEmoji(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 12) return false;
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|\u200d|\ufe0f|\s)+$/u;
  return emojiRegex.test(trimmed);
}

// ── Shared class fragments ──
const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900';
const FOCUS_ON_DARK = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

// ── Helpers ──

/** Friendly customer label — never shows the raw "Guest 1234" seed or an empty string. */
function getDisplayName(conv) {
  if (!conv) return 'Guest customer';
  const u = conv.user || conv.customer;
  const first = u?.firstName || u?.first_name || '';
  const last = u?.lastName || u?.last_name || '';

  if (first.startsWith('Guest') && u?.email?.includes('guest-')) {
    const m = u.email.match(/guest-(?:anon-)?[\d]+-(\w+)@/);
    if (m) return `Guest #${m[1]}`;
    const suffix = first.split(' ')[1];
    if (suffix) return `Guest #${suffix}`;
  }
  const full = `${first} ${last}`.trim();
  return full || u?.email?.split('@')[0] || conv.ticketNumber || 'Guest customer';
}

function isGuestConversation(conv) {
  const u = conv?.user || conv?.customer;
  if (!u) return true;
  if (u.email?.includes('guest-')) return true;
  const name = getDisplayName(conv);
  return name.startsWith('Guest') || u.role === 'GUEST';
}

function getInitials(name) {
  if (!name) return 'G';
  const p = name.split(' ').filter(Boolean);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : (p[0]?.[0] || 'G').toUpperCase();
}

function stringToColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  // Muted, warm-leaning set so avatar chips sit inside the ink/gold admin palette.
  const palette = ['#8C6239', '#7A5C46', '#5F6B62', '#4C5B6B', '#6B5B7B', '#8A5A5A', '#4F6B6B', '#3F3F46'];
  return palette[Math.abs(h) % palette.length];
}

function isHiddenMessage(msg) {
  const c = (msg?.content || '').trim().toLowerCase();
  return (
    c.startsWith('csat:') ||
    c.startsWith('csat ') ||
    c === 'csat:good' ||
    c === 'csat:bad' ||
    c === 'csat:neutral' ||
    c.startsWith('{"type":"csat"}') ||
    c === 'system:chat_closed'
  );
}

/** Conversation-list preview: never render raw JSON payloads as the last message. */
function getPreviewText(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (s.startsWith('{')) {
    try {
      const d = JSON.parse(s);
      if (d.type === 'image') return 'Photo attachment';
      if (d.type === 'csat') return '';
      if (d.message) return String(d.message).replace(/\s+/g, ' ');
    } catch {
      /* plain text that happens to start with "{" */
    }
  }
  if (s.startsWith('csat:')) return '';
  return s.replace(/\s+/g, ' ');
}

const STATUS_PILL_STYLES = {
  OPEN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  IN_PROGRESS: 'bg-sky-50 text-sky-700 border-sky-200',
  WAITING_CUSTOMER: 'bg-amber-50 text-amber-700 border-amber-200',
  RESOLVED: 'bg-stone-100 text-stone-600 border-stone-200',
  CLOSED: 'bg-stone-100 text-stone-500 border-stone-200',
};

const STATUS_LABELS = {
  OPEN: 'Active',
  IN_PROGRESS: 'In progress',
  WAITING_CUSTOMER: 'Waiting',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

function StatusPill({ status }) {
  const cls = STATUS_PILL_STYLES[status] || STATUS_PILL_STYLES.OPEN;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${cls}`}>
      {STATUS_LABELS[status] || status || 'Active'}
    </span>
  );
}

/** Icon-only control with an accessible name, a tooltip and a visible focus ring. */
function IconButton({ label, onClick, children, variant = 'default', size = 'md', className = '', ...rest }) {
  const sizes = {
    md: 'h-10 w-10 md:h-9 md:w-9',
    sm: 'h-9 w-9 md:h-8 md:w-8',
  };
  const variants = {
    default:
      'border border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900 bg-white',
    ghost: 'border border-transparent text-stone-500 hover:bg-stone-100 hover:text-stone-900',
    danger:
      'border border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300 bg-rose-50',
    solid: 'bg-stone-900 text-white hover:bg-black border border-stone-900',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-md transition-colors flex-shrink-0 ${sizes[size]} ${variants[variant]} ${FOCUS} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

const QUICK_REPLIES = [
  { icon: Hand, label: 'Greeting', text: 'Hello! How may I assist you today?' },
  { icon: Search, label: 'Look up order', text: 'Let me look up your order details right now.' },
  { icon: Package, label: 'Dispatch', text: 'Your package is confirmed and preparing for dispatch.' },
  { icon: Truck, label: 'Delivery ETA', text: 'Tracking shows delivery is scheduled in 2-3 business days.' },
  { icon: RotateCcw, label: 'Returns', text: 'We accept hassle-free returns within 7 days of delivery.' },
  { icon: CheckCircle, label: 'Resolve', text: 'I have marked this resolved for you. Have a great day!' },
];

/** "Today" / "Yesterday" / "Mon, 4 Aug" separator, derived from real message dates. */
function dayLabel(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(today) - startOfDay(d)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
}

const dayKey = (iso) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const isImageBubble = (msg) => parsePayload(msg.content)?.type === 'image';

/** Structured payloads are stored as JSON strings in message content. */
function parsePayload(raw) {
  const s = String(raw ?? '').trim();
  if (!s.startsWith('{')) return null;
  try {
    const d = JSON.parse(s);
    return d && typeof d === 'object' ? d : null;
  } catch {
    return null;
  }
}

function MessageBody({ msg, variant = 'light', onOpenImage }) {
  const d = parsePayload(msg.content);

  if (d?.type === 'image' && d.url) {
    const alt = msg.isFromAdmin ? 'Attachment sent by support' : 'Attachment sent by the customer';
    return (
      <button
        type="button"
        onClick={() => onOpenImage?.({ src: getImageUrl(d.url), alt })}
        aria-label={`Open attachment: ${alt}`}
        title="Open full size"
        className={`block rounded-lg cursor-zoom-in ${FOCUS}`}
      >
        <img
          src={getImageUrl(d.url)}
          alt={alt}
          className="max-w-full max-h-56 md:max-h-64 rounded-lg object-contain"
          loading="lazy"
        />
      </button>
    );
  }

  if (d?.message) {
    return (
      <div className="space-y-2">
        <MessageText text={d.message} variant={variant} />
        {Array.isArray(d.products) && d.products.length > 0 && (
          <div className={`flex flex-wrap gap-2 pt-2 border-t ${variant === 'dark' ? 'border-white/15' : 'border-stone-200'}`}>
            {d.products.slice(0, 4).map((p, pIdx) => (
              <div
                key={pIdx}
                className={`text-[11px] font-medium px-2 py-1 rounded-md border flex items-center gap-1.5 min-w-0 ${
                  variant === 'dark' ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-stone-200 text-stone-800'
                }`}
              >
                <Package size={12} className={variant === 'dark' ? 'text-white/60' : 'text-stone-400'} />
                <span className="truncate max-w-[9rem]">{p.name || p.title}</span>
                {p.price ? (
                  <span className={`font-bold ${variant === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    ₹{p.price}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <MessageText
      text={msg.content}
      variant={variant}
      className={isOnlyEmoji(msg.content) ? 'text-2xl leading-tight' : ''}
    />
  );
}

// ── Memoized conversation card ──
const ConversationCard = memo(function ConversationCard({
  conv,
  active,
  unread,
  typing,
  name,
  lastMsg,
  unreadCount,
  onSelect,
  onDelete,
}) {
  const avatarBg = stringToColor(name);
  const guest = isGuestConversation(conv);
  const preview = getPreviewText(lastMsg) || conv.subject || 'New conversation started';

  return (
    <div className="relative px-2 py-1">
      <div
        role="button"
        tabIndex={0}
        aria-label={`Open conversation with ${name}${unread ? ', unread' : ''}`}
        aria-current={active ? 'true' : undefined}
        onClick={() => onSelect(conv)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(conv);
          }
        }}
        className={`group relative w-full text-left p-3 pr-12 rounded-lg cursor-pointer transition-colors border select-none ${FOCUS} ${
          active
            ? 'bg-stone-900 border-stone-900 text-white'
            : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-900'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <div className="relative flex-shrink-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${active ? 'ring-1 ring-white/25' : ''}`}
              style={{ backgroundColor: avatarBg }}
            >
              {getInitials(name)}
            </div>
            {unread && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-white motion-safe:animate-pulse" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`text-sm truncate ${unread ? 'font-bold' : 'font-semibold'}`}>{name}</span>
                {guest && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                      active ? 'bg-white/15 text-white/80' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    GUEST
                  </span>
                )}
              </div>
              <span className={`text-[11px] flex-shrink-0 font-medium ${active ? 'text-white/60' : 'text-stone-500'}`}>
                {conv.updatedAt ? formatTime(conv.updatedAt) : ''}
              </span>
            </div>

            <div
              className={`text-xs truncate ${
                active ? 'text-white/70' : unread ? 'font-semibold text-stone-900' : 'text-stone-500'
              }`}
            >
              {typing ? (
                <span className={`font-semibold italic motion-safe:animate-pulse ${active ? 'text-white' : 'text-sky-700'}`}>
                  Customer is typing…
                </span>
              ) : (
                preview
              )}
            </div>

            <div
              className={`flex items-center justify-between gap-2 mt-2 pt-1.5 border-t ${
                active ? 'border-white/10' : 'border-stone-100'
              }`}
            >
              <span className={`text-[11px] font-mono truncate ${active ? 'text-white/50' : 'text-stone-500'}`}>
                #{conv.ticketNumber || conv.id?.slice(0, 8)}
              </span>

              <div className="flex items-center gap-1.5">
                {unread && unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                <StatusPill status={conv.status} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete button — clearly visible on both mobile and desktop */}
      <button
        type="button"
        onClick={(e) => onDelete(e, conv.id)}
        aria-label={`Delete conversation with ${name}`}
        title="Delete conversation permanently"
        className={`absolute top-3 right-3.5 inline-flex items-center justify-center h-8 w-8 rounded-lg transition-all shadow-xs ${FOCUS} ${
          active
            ? 'text-rose-200 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 hover:border-rose-400'
            : 'text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 border border-rose-200 hover:border-rose-300'
        }`}
      >
        <Trash2 size={15} strokeWidth={2.2} />
      </button>
    </div>
  );
});

// ── Customer details body (shared by the docked desktop pane and the mobile slide-over) ──
/** Compact metric tile used by the customer-value summary. */
function StatTile({ icon: Icon, label, value, tone = 'default' }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 min-w-0">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
        <Icon size={10} className="flex-shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div
        className={`text-[13px] font-bold truncate ${
          tone === 'positive' ? 'text-emerald-700' : tone === 'accent' ? 'text-gold-dark' : 'text-stone-900'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function CustomerDetailsBody({ selectedChat, customerName, insight, insightLoading, onResolve, onDelete, onClose }) {
  const u = selectedChat.user || selectedChat.customer;
  const guest = isGuestConversation(selectedChat);
  const lastOrder = insight?.orders?.last;
  const cartItems = insight?.cart?.items || [];

  return (
    <>
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-200">
        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
          <Info size={14} className="text-gold-dark" /> Customer details
        </h3>
        <IconButton label="Close customer details" variant="ghost" size="sm" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </div>

      <div className="space-y-5 mt-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: stringToColor(customerName) }}
          >
            {getInitials(customerName)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-stone-900 truncate">{customerName}</div>
            <div className="text-xs text-stone-500 truncate">{u?.email || 'No email attached'}</div>
          </div>
        </div>

        {/* Customer value — aggregated server-side so an agent knows who they are
            talking to (repeat buyer? live cart?) before they reply. */}
        <section aria-label="Customer value" className="rounded-xl border border-stone-200 bg-stone-50/70 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Customer value</h4>
            {insightLoading && (
              <RefreshCw size={12} className="motion-safe:animate-spin text-stone-400" aria-label="Loading customer history" />
            )}
          </div>

          {insightLoading && !insight ? (
            <div className="grid grid-cols-3 gap-2" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[3.25rem] rounded-lg bg-stone-200/70 motion-safe:animate-pulse" />
              ))}
            </div>
          ) : insight ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <StatTile icon={Package} label="Orders" value={insight.orders.count} />
                <StatTile icon={Wallet} label="Spent" value={formatCurrency(insight.orders.totalSpent)} tone="positive" />
                <StatTile icon={ShoppingBag} label="In cart" value={insight.cart.itemCount} tone="accent" />
              </div>

              {lastOrder ? (
                <div className="rounded-lg border border-stone-200 bg-white px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Last order</span>
                    <StatusPill
                      status={
                        lastOrder.status === 'DELIVERED'
                          ? 'RESOLVED'
                          : lastOrder.status === 'CANCELLED'
                          ? 'CLOSED'
                          : 'IN_PROGRESS'
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="font-mono font-semibold text-stone-800 truncate">#{lastOrder.orderNumber}</span>
                    <span className="font-bold text-stone-900 flex-shrink-0">{formatCurrency(lastOrder.total)}</span>
                  </div>
                  <div className="text-[10px] text-stone-500 mt-0.5">
                    {formatTime(lastOrder.createdAt)} · {String(lastOrder.status).replace(/_/g, ' ').toLowerCase()}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-stone-500">No orders yet — first-time visitor.</p>
              )}

              {cartItems.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                      <ShoppingBag size={10} /> Live cart
                    </span>
                    <span className="text-[11px] font-bold text-amber-900">{formatCurrency(insight.cart.value)}</span>
                  </div>
                  <ul className="space-y-1">
                    {cartItems.slice(0, 3).map((item, idx) => (
                      <li key={idx} className="flex items-start justify-between gap-2 text-[11px] text-amber-900">
                        <span className="truncate min-w-0">
                          {item.product?.name || 'Item'}
                          {item.size ? <span className="text-amber-700/80"> · {item.size}</span> : null}
                        </span>
                        <span className="flex-shrink-0 font-semibold">×{item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-[11px] text-stone-500">History unavailable for this conversation.</p>
          )}
        </section>

        <dl className="space-y-3.5">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1 flex items-center gap-1">
              <Tag size={11} /> Ticket reference
            </dt>
            <dd className="text-xs font-mono font-semibold text-stone-800 break-all">
              #{selectedChat.ticketNumber || selectedChat.id}
            </dd>
            <dd className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1">
              <Clock size={11} /> Started {formatTime(selectedChat.createdAt)}
            </dd>
          </div>

          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1 flex items-center gap-1">
              <User size={11} /> Account
            </dt>
            <dd className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-xs font-semibold text-stone-700">
              <ShieldCheck size={12} className="text-emerald-600" />
              {guest ? 'GUEST' : u?.role || 'CUSTOMER'}
            </dd>
          </div>

          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1">Status</dt>
            <dd>
              <StatusPill status={selectedChat.status} />
            </dd>
          </div>
        </dl>

        <div className="pt-4 border-t border-stone-200 space-y-2">
          {!guest && u?.id && (
            <Link
              to={`/admin/users/${u.id}`}
              className={`w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors ${FOCUS}`}
            >
              <ExternalLink size={14} /> Open customer profile
            </Link>
          )}
          <button
            type="button"
            onClick={onResolve}
            className={`w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors ${FOCUS_ON_DARK}`}
          >
            <CheckCircle size={14} /> Close &amp; resolve ticket
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={(e) => onDelete(e, selectedChat.id)}
              className={`w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 hover:text-rose-800 transition-colors shadow-xs ${FOCUS}`}
            >
              <Trash2 size={15} strokeWidth={2.2} className="text-rose-600" /> Delete conversation permanently
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default function ChatPanel() {
  const confirm = useConfirm();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatMode, setChatMode] = useState('ai');
  const [modeLoading, setModeLoading] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'UNREAD' | 'ACTIVE' | 'RESOLVED'
  const [showCustomerDrawer, setShowCustomerDrawer] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [autoReply, setAutoReply] = useState({ enabled: true, timeout: 120, message: '' });
  const [showAutoReplyModal, setShowAutoReplyModal] = useState(false);
  const [savingAutoReply, setSavingAutoReply] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'
  const [panelHeight, setPanelHeight] = useState(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // ── Agent accelerator state ──
  // `/` saved replies, private notes, the attachment lightbox and the customer
  // value summary. Kept separate from the thread state so a composer keystroke
  // never re-renders the message list more than it already does.
  const [savedReplies, setSavedReplies] = useState([]);
  const [cannedOpen, setCannedOpen] = useState(false);
  const [cannedIndex, setCannedIndex] = useState(0);
  const [cannedQuery, setCannedQuery] = useState('');
  const [savingReply, setSavingReply] = useState(false);
  const [internalNote, setInternalNote] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [insight, setInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const panelRef = useRef(null);
  const threadRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedChatRef = useRef(null);
  const conversationsRef = useRef([]);
  const hasAutoSelectedRef = useRef(false);

  const location = useLocation();
  const queryTicketId = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search);
      return params.get('ticketId') || params.get('ticket') || params.get('id');
    } catch {
      return null;
    }
  }, [location.search]);

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // ── Fit the panel to the real admin canvas ──
  // Calculate dynamic height to fill available viewport space with proper minimums:
  // On desktop, support console requires generous height (minimum 780px) so the message thread
  // and conversation list are fully visible and readable without being cramped.
  // On mobile, keep it fitted to the viewport so the composer is never pushed below the fold.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    let timer = 0;
    let frame = 0;

    const measure = () => {
      const isDesktop = window.innerWidth >= 768;
      const rect = el.getBoundingClientRect();
      // Calculate document-relative top position independent of current scroll
      const scrollY = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
      const docTop = rect.top + scrollY;

      // Read the real canvas gutter from admin-panel-main (p-4 md:p-8)
      const mainEl = el.closest('.admin-panel-main') || el.parentElement;
      const gutter = mainEl
        ? parseFloat(window.getComputedStyle(mainEl).paddingBottom) || (isDesktop ? 32 : 16)
        : (isDesktop ? 32 : 16);

      // Remaining viewport room from panel top to viewport bottom when scrolled to top
      const room = Math.round(window.innerHeight - docTop - gutter);

      // Support agents on desktop want a generous console (~780px), but the panel must
      // NEVER be taller than the space it actually has: on short laptop viewports
      // (e.g. 1366×640) a hard 780px floor pushes the page into scroll and drags the
      // composer below the fold. So the comfortable height is bounded by `room`, and
      // only collapses to a 360px floor when the viewport is genuinely tiny.
      const comfortHeight = isDesktop ? 780 : 480;
      const floor = Math.min(comfortHeight, Math.max(360, room));
      const maxHeight = isDesktop ? 960 : undefined;
      let next = Math.max(floor, room);
      if (maxHeight && next > maxHeight) {
        next = maxHeight;
      }

      setPanelHeight((prev) => (prev !== null && Math.abs(prev - next) < 2 ? prev : next));
    };
    // Both an animation frame (earliest correct layout) and a debounced timeout —
    // rAF is throttled in background tabs and some embedded/offscreen contexts,
    // and the panel must never keep a stale height (it would push the composer
    // below the fold). `measure` is idempotent, so running it twice is free.
    const schedule = () => {
      clearTimeout(timer);
      timer = window.setTimeout(measure, 30);
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    schedule();
    // Re-measure after the route transition settles, fonts swap in, and any
    // banner above the panel mounts — all of which move the panel's top edge.
    const timers = [120, 420, 1000].map((ms) => setTimeout(schedule, ms));
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    document.fonts?.ready?.then(schedule).catch(() => {});

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
    };
  }, []);

  const loadConversations = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await chatAPI.getAdminConversations({ page: 1, limit: 50 });
      const items = res.data?.data?.items || res.data?.data || [];
      if (Array.isArray(items)) {
        setConversations(items);
        const lm = {};
        items.forEach((c) => {
          const vis = (c.ticketmessage || []).filter((m) => !isHiddenMessage(m));
          if (vis.length > 0) lm[c.id] = vis[vis.length - 1].content;
        });
        setLastMessages((prev) => ({ ...prev, ...lm }));
      }
    } catch (err) {
      console.warn('[ChatPanel] loadConversations failed:', err?.message);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  const loadChatMode = useCallback(async () => {
    try {
      const res = await chatAPI.getChatStats();
      setChatMode(res.data?.data?.chatMode || 'ai');
    } catch {
      /* non-critical */
    }
  }, []);

  const handleModeChange = async (mode) => {
    if (modeLoading || mode === chatMode) return;
    setModeLoading(true);
    try {
      await chatAPI.setChatMode(mode);
      setChatMode(mode);
      toast.success(`Chat mode set to ${mode === 'ai' ? 'AI assistant' : 'live agent'}`);
    } catch {
      toast.error('Could not change the chat mode');
    } finally {
      setModeLoading(false);
    }
  };

  const loadAutoReplySettings = useCallback(async () => {
    try {
      const res = await chatAPI.getAutoReplySettings();
      if (res.data?.data) setAutoReply(res.data.data);
    } catch {
      /* non-critical */
    }
  }, []);

  const saveAutoReplySettings = async () => {
    setSavingAutoReply(true);
    try {
      await chatAPI.updateAutoReplySettings(autoReply);
      toast.success('Auto-reply settings saved');
      setShowAutoReplyModal(false);
    } catch {
      toast.error('Could not save auto-reply settings');
    } finally {
      setSavingAutoReply(false);
    }
  };

  const loadMessages = useCallback(async (id) => {
    setMessagesLoading(true);
    try {
      const res = await chatAPI.adminGetMessages(id);
      const data = res.data?.data;
      const msgs = data?.messages || (Array.isArray(data) ? data : []);
      setMessages(msgs);
      if (data?.user && selectedChatRef.current?.id === id) {
        setSelectedChat((prev) => (prev ? { ...prev, user: { ...prev.user, ...data.user } } : prev));
      }
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const handleSelectChat = useCallback(
    async (conv) => {
      const socket = connectSocket();
      if (socket && selectedChatRef.current?.id && selectedChatRef.current.id !== conv.id) {
        socket.emit('chat:leave', selectedChatRef.current.id);
      }

      setSelectedChat(conv);
      setMobileView('chat');
      setIsAtBottom(true);
      setUnreadCounts((p) => {
        const n = { ...p };
        delete n[conv.id];
        return n;
      });

      if (socket && conv.id) socket.emit('chat:join', conv.id);
      await loadMessages(conv.id);

      // Split-pane layouts: focus straight away. Single-pane: don't pop the
      // keyboard with the pane transition still running.
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    },
    [loadMessages]
  );

  const handleDeleteChat = useCallback(
    async (e, convId) => {
      e.stopPropagation();
      const target = conversationsRef.current.find((c) => c.id === convId);
      const label = target ? getDisplayName(target) : 'this conversation';
      const ok = confirm
        ? await confirm({
            title: 'Delete conversation?',
            message: `The full message history with ${label} will be permanently removed. This cannot be undone.`,
            confirmLabel: 'Delete',
            danger: true,
          })
        : window.confirm('Permanently delete this conversation?');
      if (!ok) return;

      try {
        await chatAPI.adminDeleteChat(convId);
        toast.success('Conversation deleted');
        if (selectedChatRef.current?.id === convId) {
          setSelectedChat(null);
          setMessages([]);
          setMobileView('list');
        }
        loadConversations(false);
      } catch {
        toast.error('Could not delete the conversation');
      }
    },
    [confirm, loadConversations]
  );

  const handleStatusChange = async (newStatus) => {
    const conv = selectedChatRef.current;
    if (!conv) return;
    try {
      await chatAPI.updateChatStatus(conv.id, newStatus);
      setSelectedChat((prev) => (prev ? { ...prev, status: newStatus } : null));
      setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, status: newStatus } : c)));
      toast.success(`Ticket marked ${(STATUS_LABELS[newStatus] || newStatus).toLowerCase()}`);
    } catch {
      toast.error('Could not update the ticket status');
    }
  };

  const handleResolve = useCallback(async () => {
    const conv = selectedChatRef.current;
    if (!conv) return;
    try {
      await chatAPI.updateChatStatus(conv.id, 'RESOLVED');
      toast.success('Conversation resolved');
      loadConversations(false);
      setSelectedChat(null);
      setShowCustomerDrawer(false);
      setMobileView('list');
    } catch {
      toast.error('Could not resolve the conversation');
    }
  }, [loadConversations]);

  const handleInsertEmoji = useCallback((emoji) => {
    const textarea = inputRef.current;
    if (!textarea) {
      setInputValue((prev) => prev + emoji);
      return;
    }
    const start = textarea.selectionStart ?? inputValue.length;
    const end = textarea.selectionEnd ?? inputValue.length;
    const updated = inputValue.substring(0, start) + emoji + inputValue.substring(end);
    setInputValue(updated);
    setTimeout(() => {
      textarea.focus();
      const newPos = start + emoji.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [inputValue]);

  // ── Saved replies (`/` palette) ──

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await chatAPI.getCannedResponses();
        const data = res.data?.data;
        if (alive && Array.isArray(data)) setSavedReplies(data);
      } catch {
        /* the palette simply stays empty if the endpoint is unreachable */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** Replies matching what the agent has typed after `/`. */
  const filteredReplies = useMemo(() => {
    const q = cannedQuery.trim().toLowerCase();
    if (!q) return savedReplies;
    return savedReplies.filter(
      (r) =>
        r.shortcut?.toLowerCase().includes(q) ||
        r.label?.toLowerCase().includes(q) ||
        r.text?.toLowerCase().includes(q),
    );
  }, [savedReplies, cannedQuery]);

  /** Reset the highlight whenever the result set changes so Enter is never ambiguous. */
  useEffect(() => {
    setCannedIndex(0);
  }, [cannedQuery, savedReplies.length]);

  /** Keep the highlighted row visible while arrowing through a long list. */
  useEffect(() => {
    if (!cannedOpen) return;
    const el = document.querySelector(`[data-canned-index="${cannedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [cannedIndex, cannedOpen]);

  const closeCannedMenu = useCallback(() => {
    setCannedOpen(false);
    setCannedQuery('');
    setCannedIndex(0);
  }, []);

  const insertSavedReply = useCallback((item) => {
    if (!item) return;
    setInputValue(item.text);
    closeCannedMenu();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [closeCannedMenu]);

  /** Store whatever is in the composer as a reusable reply, keyed by its first word. */
  const saveCurrentAsReply = useCallback(async () => {
    const text = inputValue.trim();
    if (!text) return;
    const shortcut = (text.split(/\s+/)[0] || 'reply').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'reply';
    const label = text.length > 40 ? `${text.slice(0, 40)}…` : text;
    const next = [...savedReplies.filter((r) => r.shortcut !== shortcut), { shortcut, label, text }];
    setSavingReply(true);
    try {
      const res = await chatAPI.updateCannedResponses(next);
      const data = res.data?.data;
      setSavedReplies(Array.isArray(data) ? data : next);
      closeCannedMenu();
      toast.success(`Saved as /${shortcut}`);
    } catch {
      toast.error('Could not save that reply');
    } finally {
      setSavingReply(false);
    }
  }, [inputValue, savedReplies, closeCannedMenu]);

  // ── Customer value summary (one request per conversation) ──

  useEffect(() => {
    const id = selectedChat?.id;
    if (!id || !showCustomerDrawer) {
      setInsight(null);
      return undefined;
    }
    let alive = true;
    setInsightLoading(true);
    (async () => {
      try {
        const res = await chatAPI.getCustomerInsight(id);
        if (alive) setInsight(res.data?.data || null);
      } catch {
        if (alive) setInsight(null);
      } finally {
        if (alive) setInsightLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedChat?.id, showCustomerDrawer]);

  const handleSend = async (customText = null) => {
    const textToSend = typeof customText === 'string' ? customText : inputValue;
    if (!textToSend.trim() || !selectedChat) return;
    const content = textToSend.trim();
    const isNote = internalNote;
    setInputValue('');
    setShowEmojiPicker(false);
    closeCannedMenu();
    setSending(true);

    const tempId = `admin-temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setMessages((p) => [
      ...p,
      {
        id: tempId,
        content,
        isFromAdmin: true,
        isInternal: isNote,
        senderId: 'admin',
        senderName: 'You',
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const res = await chatAPI.adminSendMessage(selectedChat.id, content, { internal: isNote });
      const d = res.data?.data;
      if (d) {
        setMessages((p) => p.map((m) => (m.id === tempId ? { ...d, isFromAdmin: true, isInternal: isNote } : m)));
        // A private note is not part of the customer-visible conversation, so it must
        // not become the list preview or move the ticket to "in progress".
        if (!isNote) {
          setLastMessages((prev) => ({ ...prev, [selectedChat.id]: content }));
          setConversations((prev) =>
            prev.map((c) =>
              c.id === selectedChat.id ? { ...c, status: 'IN_PROGRESS', updatedAt: new Date().toISOString() } : c
            )
          );
        }
      } else {
        setMessages((p) => p.filter((m) => m.id !== tempId));
        setInputValue(content);
        toast.error('Message was not delivered — try again');
      }
    } catch {
      setMessages((p) => p.filter((m) => m.id !== tempId));
      setInputValue(content);
      toast.error('Could not send the message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    // The saved-reply palette owns the keyboard while it is open, so Enter inserts
    // a reply instead of sending half a command to the customer.
    if (cannedOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCannedIndex((i) => (filteredReplies.length ? (i + 1) % filteredReplies.length : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCannedIndex((i) => (filteredReplies.length ? (i - 1 + filteredReplies.length) % filteredReplies.length : 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (filteredReplies.length > 0) {
          e.preventDefault();
          insertSavedReply(filteredReplies[cannedIndex]);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeCannedMenu();
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /** `/` at the start of the composer opens the palette; typing after it filters. */
  const handleComposerChange = (value) => {
    setInputValue(value);
    const slash = /^\/([^\s/]*)$/.exec(value);
    if (slash) {
      setCannedQuery(slash[1]);
      setCannedOpen(true);
    } else if (cannedOpen) {
      closeCannedMenu();
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setImagePreview({ file, url: URL.createObjectURL(file), name: file.name });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendImage = async () => {
    if (!imagePreview || !selectedChat) return;
    setUploading(true);
    try {
      await chatAPI.adminSendChatImage(selectedChat.id, imagePreview.file);
      setImagePreview(null);
      loadMessages(selectedChat.id);
    } catch {
      toast.error('Could not upload the image');
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleCancelPreview = () => {
    if (imagePreview?.url) URL.revokeObjectURL(imagePreview.url);
    setImagePreview(null);
  };

  const visibleMessages = useMemo(() => messages.filter((m) => !isHiddenMessage(m)), [messages]);

  // ── Socket listener ──
  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return;

    const onConnect = () => {
      setSocketConnected(true);
      if (selectedChatRef.current?.id) socket.emit('chat:join', selectedChatRef.current.id);
    };
    const onDisconnect = () => setSocketConnected(false);

    const onChatMessage = (data) => {
      const cur = selectedChatRef.current;
      const incoming = data?.message;
      if (!incoming) return;

      if (!incoming.isFromAdmin) {
        playNotificationChime();
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }

      if (cur && data.ticketId === cur.id) {
        setMessages((p) => {
          if (p.some((m) => m.id === incoming.id)) return p;
          if (incoming.isFromAdmin && p.some((m) => m.isFromAdmin && m.content === incoming.content)) return p;
          if (
            !incoming.isFromAdmin &&
            p.some(
              (m) =>
                !m.isFromAdmin &&
                m.senderId === incoming.senderId &&
                m.content === incoming.content &&
                Math.abs(new Date(m.createdAt).getTime() - new Date(incoming.createdAt).getTime()) < 2000
            )
          )
            return p;
          return [...p, incoming];
        });
      }

      if (!incoming.isFromAdmin && (!cur || data.ticketId !== cur.id)) {
        setUnreadCounts((p) => ({ ...p, [data.ticketId]: (p[data.ticketId] || 0) + 1 }));
      }

      // The agent is looking at this exact thread, so the customer's message is
      // already read — say so, otherwise their widget stays on "sent" forever
      // until someone reopens the conversation.
      if (!incoming.isFromAdmin && cur && data.ticketId === cur.id && !document.hidden) {
        chatAPI.adminMarkRead(cur.id).catch(() => {});
      }

      setLastMessages((prev) => ({
        ...prev,
        [data.ticketId]: incoming.isInternal ? `Note: ${incoming.content}` : incoming.content,
      }));

      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === data.ticketId);
        if (index !== -1) {
          const updated = [...prev];
          const existing = updated[index];
          updated.splice(index, 1);
          return [
            {
              ...existing,
              status: existing.status === 'RESOLVED' ? 'OPEN' : existing.status,
              updatedAt: incoming.createdAt || new Date().toISOString(),
            },
            ...updated,
          ];
        }

        const newConv = {
          id: data.ticketId,
          ticketNumber: data.ticketNumber || `#${data.ticketId.slice(0, 8)}`,
          status: 'OPEN',
          subject: 'Live chat support',
          user: data.customer || {
            id: data.userId,
            firstName: incoming.senderName || 'Customer',
            lastName: '',
            email: '',
          },
          ticketmessage: [incoming],
          createdAt: incoming.createdAt || new Date().toISOString(),
          updatedAt: incoming.createdAt || new Date().toISOString(),
        };
        return [newConv, ...prev];
      });
    };

    // Delivery/read receipt from the other side — flip our ticks in place
    // instead of refetching the whole thread.
    const onChatRead = (data) => {
      const cur = selectedChatRef.current;
      if (!data?.ticketId || !cur || data.ticketId !== cur.id) return;

      if (data.reader === 'customer') {
        setMessages((p) =>
          p.some((m) => m.isFromAdmin && !m.isInternal && !m.isRead)
            ? p.map((m) => (m.isFromAdmin && !m.isInternal ? { ...m, isRead: true } : m))
            : p
        );
      } else {
        setMessages((p) =>
          p.some((m) => !m.isFromAdmin && !m.isRead)
            ? p.map((m) => (!m.isFromAdmin ? { ...m, isRead: true } : m))
            : p
        );
      }
    };

    const onTyping = (d) => {
      if (d.isAdmin) return;
      setTypingUsers((p) => {
        const n = { ...p };
        if (d.isTyping) n[d.ticketId] = { name: d.senderName, t: Date.now() };
        else delete n[d.ticketId];
        return n;
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    const unsubChatMessage = onSocketEvent('chat:message', onChatMessage);
    const unsubTyping = onSocketEvent('chat:typing', onTyping);
    const unsubChatMode = onSocketEvent('chat:mode', (d) => {
      const mode = d?.mode || d?.chatMode;
      if (mode) setChatMode(mode);
    });
    const unsubChatRead = onSocketEvent('chat:read', onChatRead);
    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      unsubChatMessage();
      unsubTyping();
      unsubChatMode();
      unsubChatRead();
    };
  }, []);

  useEffect(() => {
    loadConversations();
    loadChatMode();
    loadAutoReplySettings();
  }, [loadConversations, loadChatMode, loadAutoReplySettings]);

  // Auto-select conversation based on URL param (?ticketId=...) or desktop default
  useEffect(() => {
    if (loading || conversations.length === 0) return;

    if (queryTicketId) {
      if (selectedChatRef.current?.id === queryTicketId) return;

      const found = conversations.find((c) => c.id === queryTicketId);
      if (found) {
        handleSelectChat(found);
      } else {
        chatAPI.adminGetMessages(queryTicketId).then((res) => {
          const d = res.data?.data;
          if (d) {
            const conv = { id: queryTicketId, ...(d.user ? { user: d.user } : {}) };
            handleSelectChat(conv);
          }
        }).catch(() => {});
      }
    } else if (!hasAutoSelectedRef.current && !selectedChatRef.current) {
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        hasAutoSelectedRef.current = true;
        handleSelectChat(conversations[0]);
      }
    }
  }, [loading, conversations, queryTicketId, handleSelectChat]);

  // Auto-scroll only while the operator is already reading the newest messages —
  // otherwise an incoming reply yanks them out of the history they're reading.
  // Instant, not smooth: a smooth scroll fires intermediate onScroll events that
  // recompute `isAtBottom` mid-flight and can strand the view above the newest
  // message (with the "Latest" pill permanently visible).
  useEffect(() => {
    const el = threadRef.current;
    if (!el || !isAtBottom) return;
    el.scrollTop = el.scrollHeight;
  }, [visibleMessages.length, isAtBottom, selectedChat?.id]);

  useEffect(() => {
    const i = setInterval(() => {
      setTypingUsers((p) => {
        const now = Date.now();
        let changed = false;
        const n = { ...p };
        Object.entries(n).forEach(([k, v]) => {
          if (now - v.t > 3000) {
            delete n[k];
            changed = true;
          }
        });
        return changed ? n : p;
      });
    }, 1000);
    return () => clearInterval(i);
  }, []);

  // Auto-grow the composer instead of scrolling inside a one-line textarea.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 152)}px`;
  }, [inputValue, selectedChat?.id]);

  // Esc closes whichever overlay is open.
  const anyOverlayOpen = showCustomerDrawer || showAutoReplyModal;
  useEffect(() => {
    if (!anyOverlayOpen) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setShowCustomerDrawer(false);
      setShowAutoReplyModal(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [anyOverlayOpen]);

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (filterTab === 'UNREAD' && !(unreadCounts[c.id] > 0)) return false;
      if (filterTab === 'ACTIVE' && (c.status === 'RESOLVED' || c.status === 'CLOSED')) return false;
      if (filterTab === 'RESOLVED' && c.status !== 'RESOLVED' && c.status !== 'CLOSED') return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        getDisplayName(c).toLowerCase().includes(q) ||
        (c.user?.email || '').toLowerCase().includes(q) ||
        (lastMessages[c.id] || '').toLowerCase().includes(q) ||
        (c.ticketNumber || '').toLowerCase().includes(q)
      );
    });
  }, [conversations, filterTab, searchQuery, unreadCounts, lastMessages]);

  const totalUnreadCount = useMemo(
    () => Object.values(unreadCounts).reduce((a, b) => a + b, 0),
    [unreadCounts]
  );

  const tabCounts = useMemo(
    () => ({
      ALL: conversations.length,
      ACTIVE: conversations.filter((c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length,
      UNREAD: conversations.filter((c) => unreadCounts[c.id] > 0).length,
      RESOLVED: conversations.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length,
    }),
    [conversations, unreadCounts]
  );

  const activeCustomerName = selectedChat ? getDisplayName(selectedChat) : '';
  const activeCustomerBg = selectedChat ? stringToColor(activeCustomerName) : '#1c1917';
  const listVisible = mobileView !== 'chat';
  const threadVisible = mobileView !== 'list';

  const panelStyle = panelHeight ? { height: `${panelHeight}px` } : undefined;

  return (
    <div
      ref={panelRef}
      style={panelStyle}
      className="flex flex-col w-full min-h-0 min-h-[480px] md:min-h-[780px] md:max-h-[960px] h-[calc(100dvh-6.5rem)] md:h-[calc(100dvh-9rem)] bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden font-sans"
    >
      {/* ── Console bar (hidden on mobile while a conversation is open) ── */}
      <header
        className={`${listVisible ? 'flex' : 'hidden lg:flex'} flex-wrap items-center gap-x-3 gap-y-2 px-3 md:px-5 py-2.5 md:py-3 border-b border-stone-200 bg-white flex-shrink-0`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="hidden xs:flex w-9 h-9 rounded-xl bg-stone-900 text-white items-center justify-center flex-shrink-0">
            <MessageCircle size={17} />
          </span>
          <div className="min-w-0">
            <h1 className="text-sm md:text-[15px] font-bold text-stone-900 tracking-tight flex items-center gap-2 min-w-0">
              <span className="truncate">Support console</span>
              {totalUnreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex-shrink-0">
                  {totalUnreadCount} new
                </span>
              )}
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium min-w-0">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${socketConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}
                aria-hidden="true"
              />
              <span className="truncate">{socketConnected ? 'Realtime' : 'Reconnecting…'}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">
                {conversations.length} chat{conversations.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 ml-auto">
          {/* Chat mode — a real segmented control: clicking the active segment is a no-op. */}
          <div
            role="group"
            aria-label="Chat mode"
            className="bg-stone-100 p-0.5 rounded-md flex items-center gap-0.5"
          >
            <button
              type="button"
              onClick={() => handleModeChange('ai')}
              disabled={modeLoading}
              aria-pressed={chatMode === 'ai'}
              className={`inline-flex items-center gap-1.5 h-9 px-2.5 md:px-3 rounded text-xs font-bold transition-colors disabled:opacity-60 ${FOCUS} ${
                chatMode === 'ai' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Bot size={14} />
              <span className="hidden xs:inline">AI</span>
              <span className="hidden lg:inline">assistant</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('live')}
              disabled={modeLoading}
              aria-pressed={chatMode === 'live'}
              className={`inline-flex items-center gap-1.5 h-9 px-2.5 md:px-3 rounded text-xs font-bold transition-colors disabled:opacity-60 ${FOCUS} ${
                chatMode === 'live' ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Headphones size={14} />
              <span className="hidden xs:inline">Live</span>
              <span className="hidden lg:inline">agent</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAutoReplyModal(true)}
            aria-label={`Auto-reply settings — currently ${autoReply.enabled ? 'on' : 'off'}`}
            title="Auto-reply settings"
            className={`inline-flex items-center gap-1.5 h-10 md:h-9 px-2.5 rounded-md border text-xs font-semibold transition-colors ${FOCUS} ${
              autoReply.enabled
                ? 'border-gold/40 bg-gold/10 text-stone-800 hover:bg-gold/20'
                : 'border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            <Zap size={14} className={autoReply.enabled ? 'text-gold-dark' : 'text-stone-400'} />
            <span className="hidden lg:inline">Auto-reply {autoReply.enabled ? 'on' : 'off'}</span>
          </button>

          <IconButton label="Refresh conversations" onClick={() => loadConversations(true)}>
            <RefreshCw size={16} className={loading ? 'motion-safe:animate-spin' : ''} />
          </IconButton>
        </div>
      </header>

      {/* ── Workspace ── */}
      <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
        {/* ── Conversation list ── */}
        <aside
          aria-label="Conversations"
          className={`${listVisible ? 'flex' : 'hidden lg:flex'} w-full lg:w-80 xl:w-96 flex-col border-r border-stone-200 bg-white overflow-hidden flex-shrink-0 min-h-0`}
        >
          <div className="p-3 border-b border-stone-200 flex-shrink-0">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden="true" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="text"
                role="searchbox"
                aria-label="Search conversations"
                placeholder="Search customer, ticket, email…"
                className="w-full h-10 pl-9 pr-9 rounded-md bg-stone-50 border border-stone-200 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-stone-500 focus:bg-white focus:ring-4 focus:ring-stone-900/5"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className={`absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-8 w-8 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 ${FOCUS}`}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex gap-1 mt-2.5" role="tablist" aria-label="Filter conversations">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'ACTIVE', label: 'Active' },
                { id: 'UNREAD', label: 'Unread' },
                { id: 'RESOLVED', label: 'Resolved' },
              ].map((tab) => {
                const selected = filterTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setFilterTab(tab.id)}
                    className={`flex-1 inline-flex items-center justify-center gap-1 h-8 rounded text-[11px] font-bold transition-colors ${FOCUS} ${
                      selected
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
                    }`}
                  >
                    {tab.label}
                    {tabCounts[tab.id] > 0 && (
                      <span
                        className={`text-[10px] font-extrabold ${selected ? 'text-white/70' : 'text-stone-400'}`}
                      >
                        {tabCounts[tab.id]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="p-10 text-center text-stone-400">
                <RefreshCw size={22} className="motion-safe:animate-spin mx-auto mb-2 text-stone-400" />
                <span className="text-xs font-medium">Syncing live conversations…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle size={30} className="mx-auto mb-2 text-stone-300" />
                <p className="text-sm font-bold text-stone-700">
                  {searchQuery ? 'No matching conversations' : 'No conversations here yet'}
                </p>
                <p className="text-xs mt-1 text-stone-500 max-w-[15rem] mx-auto">
                  {searchQuery
                    ? 'Try a different name, ticket number or email.'
                    : 'Incoming customer messages appear here the moment they arrive.'}
                </p>
              </div>
            ) : (
              filtered.map((conv) => (
                <ConversationCard
                  key={conv.id}
                  conv={conv}
                  active={selectedChat?.id === conv.id}
                  unread={unreadCounts[conv.id] > 0 && selectedChat?.id !== conv.id}
                  typing={Boolean(typingUsers[conv.id])}
                  name={getDisplayName(conv)}
                  lastMsg={lastMessages[conv.id]}
                  unreadCount={unreadCounts[conv.id] || 0}
                  onSelect={handleSelectChat}
                  onDelete={handleDeleteChat}
                />
              ))
            )}
          </div>
        </aside>

        {/* ── Thread ── */}
        <section
          aria-label="Conversation"
          className={`${threadVisible ? 'flex' : 'hidden lg:flex'} flex-1 min-w-0 min-h-0 flex-col bg-white overflow-hidden`}
        >
          {!selectedChat ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-center mb-4">
                <MessageCircle size={26} className="text-stone-400" />
              </div>
              <h2 className="text-base md:text-lg font-bold text-stone-900">Select a conversation</h2>
              <p className="text-sm text-stone-500 max-w-sm mt-1">
                Pick a customer from the list to reply, share order updates, or close their ticket.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-5 text-xs text-stone-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" /> {tabCounts.ACTIVE} active
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" aria-hidden="true" /> {totalUnreadCount} unread
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-stone-300" aria-hidden="true" /> {tabCounts.RESOLVED} resolved
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-2.5 md:px-5 py-2 md:py-3 border-b border-stone-200 bg-white flex items-center justify-between gap-2 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <IconButton
                    label="Back to conversations"
                    variant="ghost"
                    onClick={() => setMobileView('list')}
                    className="lg:hidden"
                  >
                    <ArrowLeft size={20} />
                  </IconButton>

                  {/* Hidden on the narrowest phones so the customer name keeps its room. */}
                  <div
                    className="hidden sm:flex w-10 h-10 rounded-xl items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: activeCustomerBg }}
                    aria-hidden="true"
                  >
                    {getInitials(activeCustomerName)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-bold text-stone-900 truncate">{activeCustomerName}</span>
                      <span className="hidden sm:inline-flex">
                        <StatusPill status={selectedChat.status} />
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium min-w-0">
                      <span className="font-mono flex-shrink-0">
                        #{selectedChat.ticketNumber || selectedChat.id?.slice(0, 8)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{selectedChat.user?.email || 'Anonymous visitor'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <label className="sr-only" htmlFor="ticket-status">
                    Ticket status
                  </label>
                  <select
                    id="ticket-status"
                    value={selectedChat.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="h-10 md:h-9 max-w-[7.5rem] md:max-w-none rounded-md border border-stone-200 bg-white px-2 text-xs font-semibold text-stone-800 outline-none cursor-pointer transition focus:border-stone-500 focus:ring-4 focus:ring-stone-900/5"
                  >
                    <option value="OPEN">Active</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="WAITING_CUSTOMER">Waiting</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>

                  <IconButton
                    label="Customer details"
                    variant={showCustomerDrawer ? 'solid' : 'default'}
                    aria-pressed={showCustomerDrawer}
                    onClick={() => setShowCustomerDrawer((v) => !v)}
                  >
                    <Info size={16} />
                  </IconButton>

                  <IconButton
                    label="Clear messages from thread"
                    variant="danger"
                    className="hidden sm:inline-flex bg-amber-50/80 border-amber-200 text-amber-700 hover:bg-amber-100 hover:text-amber-800 hover:border-amber-300"
                    title="Clear all messages in thread (keep ticket open)"
                    onClick={async () => {
                      const ok = confirm
                        ? await confirm({
                            title: 'Clear this thread?',
                            message: 'Every message in this conversation will be deleted. The ticket itself stays open.',
                            confirmLabel: 'Clear messages',
                            danger: true,
                          })
                        : window.confirm('Clear all messages from this ticket?');
                      if (!ok) return;
                      try {
                        await chatAPI.adminClearMessages(selectedChat.id);
                        setMessages([]);
                        toast.success('Messages cleared');
                      } catch {
                        toast.error('Could not clear the messages');
                      }
                    }}
                  >
                    <Eraser size={16} />
                  </IconButton>

                  {/* Prominent, clearly visible Delete conversation button */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteChat(e, selectedChat.id)}
                    title="Delete conversation permanently"
                    aria-label="Delete conversation permanently"
                    className={`inline-flex items-center justify-center gap-1.5 h-10 md:h-9 px-2.5 sm:px-3 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 hover:border-rose-300 text-xs font-bold transition-all shadow-xs flex-shrink-0 ${FOCUS}`}
                  >
                    <Trash2 size={16} className="text-rose-600 flex-shrink-0" strokeWidth={2.2} />
                    <span className="hidden sm:inline">Delete Chat</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResolve}
                    className={`hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors ${FOCUS_ON_DARK}`}
                  >
                    <CheckCircle size={14} /> Resolve
                  </button>

                  <IconButton
                    label="Close conversation"
                    variant="ghost"
                    className="hidden sm:inline-flex"
                    onClick={() => {
                      setSelectedChat(null);
                      setMobileView('list');
                    }}
                  >
                    <X size={16} />
                  </IconButton>
                </div>
              </div>

              {/* Thread + details */}
              <div className="flex flex-1 min-h-0 overflow-hidden relative">
                <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-stone-50/70">
                  <div
                    ref={threadRef}
                    onScroll={() => {
                      const el = threadRef.current;
                      if (!el) return;
                      setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 96);
                    }}
                    aria-live="polite"
                    aria-relevant="additions"
                    className="flex-1 min-h-0 overflow-y-auto px-3 md:px-6 py-4 space-y-1"
                  >
                    {messagesLoading ? (
                      <div className="h-full flex items-center justify-center">
                        <RefreshCw size={22} className="motion-safe:animate-spin text-stone-400" />
                      </div>
                    ) : (
                      <>
                        {visibleMessages.map((msg, idx) => {
                          const isAI = msg.senderId === 'ai-chatbot' || msg.senderName === 'AI Assistant';
                          const isNote = !!msg.isInternal;
                          const isMe = msg.isFromAdmin && !isAI && !isNote;
                          const prev = visibleMessages[idx - 1];
                          const showDay = !prev || dayKey(prev.createdAt) !== dayKey(msg.createdAt);

                          // Consecutive messages from the same author share a welded corner
                          // (WhatsApp grouping), so a burst of replies reads as one block.
                          const next = visibleMessages[idx + 1];
                          const sameAuthorBefore =
                            !!prev &&
                            !showDay &&
                            !!prev.isFromAdmin === !!msg.isFromAdmin &&
                            !!prev.isInternal === isNote &&
                            (prev.senderId === 'ai-chatbot') === isAI;
                          const sameAuthorAfter =
                            !!next &&
                            dayKey(next.createdAt) === dayKey(msg.createdAt) &&
                            !!next.isFromAdmin === !!msg.isFromAdmin &&
                            !!next.isInternal === isNote &&
                            (next.senderId === 'ai-chatbot') === isAI;

                          const tail = isMe ? 'rounded-br-md' : 'rounded-bl-md';
                          const grouped = sameAuthorAfter ? 'rounded-br-md' : '';

                          return (
                            <div key={msg.id || idx}>
                              {showDay && (
                                <div className="text-center py-3">
                                  <span className="px-3 py-0.5 rounded-full bg-white text-[11px] font-semibold text-stone-500 border border-stone-200">
                                    {dayLabel(msg.createdAt)}
                                  </span>
                                </div>
                              )}

                              <div
                                className={`flex items-end gap-2 ${
                                  isNote ? 'justify-end' : isMe ? 'justify-end' : 'justify-start'
                                } ${sameAuthorBefore ? 'mt-0.5' : 'mt-2.5'}`}
                              >
                                {!isMe && !isNote && (
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ${
                                      isAI ? 'bg-gold' : ''
                                    } ${sameAuthorAfter ? 'opacity-0' : ''}`}
                                    style={isAI ? undefined : { backgroundColor: activeCustomerBg }}
                                    aria-hidden="true"
                                  >
                                    {isAI ? <Bot size={15} /> : getInitials(activeCustomerName)}
                                  </div>
                                )}

                                <div className={`max-w-[85%] md:max-w-[70%] ${isNote ? 'w-full md:w-auto md:min-w-[16rem]' : ''}`}>
                                  {isAI && !sameAuthorBefore && (
                                    <div className="text-[11px] font-bold text-gold-dark mb-1 pl-1 flex items-center gap-1">
                                      <Bot size={13} /> AI assistant
                                    </div>
                                  )}

                                  {/* `overflow-wrap: anywhere` (not just break-words) so a pasted
                                      URL cannot inflate the panel's intrinsic width and push the
                                      whole admin page into horizontal scroll. */}
                                  <div
                                    className={`text-sm leading-relaxed [overflow-wrap:anywhere] rounded-2xl border ${
                                      isImageBubble(msg)
                                        ? `p-1 bg-white border-stone-200 ${tail} ${grouped}`
                                        : isNote
                                        ? `px-3.5 py-2.5 bg-amber-50 border-amber-300 border-dashed text-amber-950 ${tail} ${grouped}`
                                        : `px-3.5 py-2.5 ${
                                            isMe
                                              ? `bg-stone-900 text-white border-stone-900 ${tail} ${grouped}`
                                              : isAI
                                              ? `bg-gold/10 text-stone-900 border-gold/30 ${tail} ${grouped}`
                                              : `bg-white text-stone-900 border-stone-200 ${tail} ${grouped}`
                                          }`
                                    }`}
                                  >
                                    {isNote && (
                                      <div className="flex items-center gap-1 mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                                        <StickyNote size={11} /> Private note · team only
                                      </div>
                                    )}
                                    <MessageBody
                                      msg={msg}
                                      variant={isMe ? 'dark' : 'light'}
                                      onOpenImage={setLightbox}
                                    />
                                  </div>

                                  <div
                                    className={`flex items-center gap-1 mt-1 text-[11px] font-medium text-stone-500 ${
                                      isMe ? 'justify-end pr-1' : 'justify-start pl-1'
                                    } ${sameAuthorBefore && !isNote ? 'opacity-70' : ''}`}
                                  >
                                    <span>{formatTime(msg.createdAt)}</span>
                                    {/* Only a real outbound message can be read by the
                                        customer — notes and AI replies get no ticks. */}
                                    {isMe && <ReadTicks read={!!msg.isRead} variant="dark" />}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {typingUsers[selectedChat.id] && (
                          <div className="flex items-end gap-2 pt-2">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                              style={{ backgroundColor: activeCustomerBg }}
                              aria-hidden="true"
                            >
                              {getInitials(activeCustomerName)}
                            </div>
                            <div className="bg-white px-3 py-2.5 rounded-2xl rounded-bl-md border border-stone-200 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 motion-safe:animate-bounce" />
                              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 motion-safe:animate-bounce [animation-delay:0.2s]" />
                              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 motion-safe:animate-bounce [animation-delay:0.4s]" />
                              <span className="text-xs font-semibold text-stone-500 ml-1">
                                {activeCustomerName} is typing…
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Jump-to-latest affordance when new messages land while reading history */}
                  {!isAtBottom && visibleMessages.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          const el = threadRef.current;
                          setIsAtBottom(true);
                          if (el) el.scrollTop = el.scrollHeight;
                        }}
                        className={`absolute -top-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-stone-900 text-white text-xs font-semibold shadow-lift hover:bg-black ${FOCUS_ON_DARK}`}
                      >
                        <ArrowDown size={14} /> Latest
                      </button>
                    </div>
                  )}

                  {/* Attachment preview */}
                  {imagePreview && (
                    <div className="px-3 md:px-4 py-3 bg-white border-t border-stone-200 flex-shrink-0">
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <img
                            src={imagePreview.url}
                            alt="Attachment preview"
                            className="max-h-24 rounded-lg border border-stone-200"
                          />
                          {!uploading && (
                            <button
                              type="button"
                              onClick={handleCancelPreview}
                              aria-label="Remove attachment"
                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-sm hover:bg-rose-700"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-stone-800 truncate">{imagePreview.name}</p>
                          <p className="text-[11px] text-stone-500 mb-2">Ready to send</p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleCancelPreview}
                              disabled={uploading}
                              className={`px-3 h-9 rounded-md border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50 ${FOCUS}`}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleSendImage}
                              disabled={uploading}
                              className={`inline-flex items-center gap-1.5 px-3.5 h-9 rounded-md bg-stone-900 hover:bg-black text-white text-xs font-bold disabled:opacity-60 ${FOCUS_ON_DARK}`}
                            >
                              {uploading ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                              {uploading ? 'Uploading…' : 'Send'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick replies */}
                  {!imagePreview && (
                    <div className="px-3 md:px-4 py-2 bg-white border-t border-stone-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
                      <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1 flex-shrink-0 mr-0.5">
                        <Zap size={12} className="text-gold-dark" /> Quick
                      </span>
                      {QUICK_REPLIES.map((reply) => (
                        <button
                          key={reply.label}
                          type="button"
                          title={reply.text}
                          onClick={() => {
                            setInputValue(reply.text);
                            if (window.innerWidth >= 768) inputRef.current?.focus();
                          }}
                          className={`inline-flex items-center gap-1.5 h-9 px-2.5 rounded-full border border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50 text-xs font-medium text-stone-700 whitespace-nowrap flex-shrink-0 transition-colors ${FOCUS}`}
                        >
                          <reply.icon size={13} className="text-stone-500" />
                          {reply.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Composer */}
                  {!imagePreview && (
                    <div className="px-2.5 md:px-3 py-2.5 bg-white border-t border-stone-200 flex-shrink-0 relative">
                      {showEmojiPicker && (
                        <EmojiPickerPopover
                          onSelect={handleInsertEmoji}
                          onClose={() => setShowEmojiPicker(false)}
                          align="left"
                        />
                      )}

                      {cannedOpen && (
                        <CannedReplyMenu
                          items={filteredReplies}
                          activeIndex={cannedIndex}
                          onPick={(item, opts) => (opts?.hover ? setCannedIndex(filteredReplies.indexOf(item)) : insertSavedReply(item))}
                          onSaveCurrent={saveCurrentAsReply}
                          canSave={!!inputValue.trim() && !savingReply}
                          query={cannedQuery}
                        />
                      )}

                      {internalNote && (
                        <div className="flex items-center gap-1.5 mb-1.5 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200">
                          <StickyNote size={12} className="text-amber-700 flex-shrink-0" />
                          <p className="text-[11px] font-semibold text-amber-800 min-w-0 truncate">
                            Private note — saved to the ticket, never sent to {activeCustomerName}
                          </p>
                        </div>
                      )}

                      <div
                        className={`flex items-end gap-1 rounded-xl border p-1 transition ${
                          internalNote
                            ? 'border-amber-300 bg-amber-50/70 focus-within:border-amber-500'
                            : 'border-stone-200 bg-stone-50 focus-within:border-stone-400 focus-within:bg-white'
                        }`}
                      >
                        <IconButton
                          label={internalNote ? 'Private note mode on — switch back to replying' : 'Leave a private note for your team'}
                          variant="ghost"
                          aria-pressed={internalNote}
                          onClick={() => {
                            setInternalNote((v) => !v);
                            inputRef.current?.focus();
                          }}
                          className={`h-11 w-11 md:h-9 md:w-9 ${internalNote ? 'text-amber-700 bg-amber-100/80' : ''}`}
                        >
                          <StickyNote size={18} />
                        </IconButton>

                        <IconButton
                          label="Saved replies (type / in the message box)"
                          variant="ghost"
                          aria-pressed={cannedOpen}
                          aria-haspopup="listbox"
                          onClick={() => {
                            setCannedOpen((v) => !v);
                            setCannedQuery('');
                            inputRef.current?.focus();
                          }}
                          className={`hidden md:inline-flex h-11 w-11 md:h-9 md:w-9 ${cannedOpen ? 'text-stone-900 bg-stone-200/70' : ''}`}
                        >
                          <Bookmark size={17} />
                        </IconButton>
                        {/* WhatsApp-style Emoji button */}
                        <IconButton
                          label="Insert emoji"
                          variant="ghost"
                          onClick={() => setShowEmojiPicker((prev) => !prev)}
                          className={`h-11 w-11 md:h-9 md:w-9 ${showEmojiPicker ? 'text-stone-900 bg-stone-200/70' : ''}`}
                        >
                          <Smile size={18} />
                        </IconButton>
                        <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                        <IconButton
                          label="Attach an image"
                          variant="ghost"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="h-11 w-11 md:h-9 md:w-9"
                        >
                          <ImagePlus size={18} />
                        </IconButton>

                        <label htmlFor="chat-composer" className="sr-only">
                          Reply to {activeCustomerName}
                        </label>
                        <textarea
                          id="chat-composer"
                          ref={inputRef}
                          value={inputValue}
                          onChange={(e) => handleComposerChange(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={internalNote ? 'Write a note only your team can see…' : `Reply to ${activeCustomerName}…  (/ for saved replies)`}
                          rows={1}
                          aria-describedby="chat-composer-hint"
                          className="flex-1 bg-transparent text-sm text-stone-900 placeholder-stone-400 resize-none outline-none py-2.5 px-1 max-h-40 leading-relaxed"
                        />

                        <button
                          type="button"
                          onClick={() => handleSend()}
                          disabled={!inputValue.trim() || sending}
                          aria-label="Send reply"
                          title="Send reply"
                          className={`inline-flex items-center justify-center h-11 w-11 md:h-9 md:w-9 rounded-lg flex-shrink-0 transition-colors ${FOCUS} ${
                            inputValue.trim() && !sending
                              ? 'bg-stone-900 text-white hover:bg-black'
                              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                          }`}
                        >
                          {sending ? <RefreshCw size={17} className="animate-spin" /> : <Send size={17} />}
                        </button>
                      </div>
                      <p id="chat-composer-hint" className="hidden md:block text-[11px] text-stone-400 mt-1.5 pl-1">
                        Enter sends · Shift + Enter adds a line break · <span className="font-semibold text-stone-500">/</span>{' '}
                        opens saved replies
                      </p>
                    </div>
                  )}
                </div>

                {/* Customer details — docked pane on desktop */}
                {showCustomerDrawer && (
                  <aside className="hidden xl:block w-72 2xl:w-80 border-l border-stone-200 bg-white p-5 overflow-y-auto flex-shrink-0">
                    <CustomerDetailsBody
                      selectedChat={selectedChat}
                      customerName={activeCustomerName}
                      insight={insight}
                      insightLoading={insightLoading}
                      onResolve={handleResolve}
                      onDelete={handleDeleteChat}
                      onClose={() => setShowCustomerDrawer(false)}
                    />
                  </aside>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* ── Attachment preview — portalled so the panel's overflow-hidden and
             the sticky navbar can never clip or cover it ── */}
      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          caption={`${activeCustomerName} · ${formatTime(selectedChat?.createdAt)}`}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* ── Customer details — mobile slide-over (portalled so the panel's
             overflow-hidden and the route transition cannot clip it) ── */}
      {showCustomerDrawer &&
        selectedChat &&
        createPortal(
          <div className="xl:hidden fixed inset-0 z-overlay flex justify-end">
            <div
              className="absolute inset-0 bg-stone-900/50 motion-safe:animate-fade-in"
              onClick={() => setShowCustomerDrawer(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Customer details"
              className="relative w-[86vw] max-w-sm h-full bg-white border-l border-stone-200 p-4 overflow-y-auto shadow-2xl pb-[max(1rem,env(safe-area-inset-bottom))] motion-safe:animate-slide-in-right"
            >
              <CustomerDetailsBody
                selectedChat={selectedChat}
                customerName={activeCustomerName}
                insight={insight}
                insightLoading={insightLoading}
                onResolve={handleResolve}
                onDelete={handleDeleteChat}
                onClose={() => setShowCustomerDrawer(false)}
              />
            </div>
          </div>,
          document.body
        )}

      {/* ── Auto-reply settings modal ── */}
      {showAutoReplyModal &&
        createPortal(
          <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-stone-900/50 motion-safe:animate-fade-in"
              onClick={() => setShowAutoReplyModal(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="auto-reply-title"
              className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-2xl p-5 md:p-6 motion-safe:animate-slide-up"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 id="auto-reply-title" className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Zap size={18} className="text-gold-dark" /> Live chat auto-reply
                </h3>
                <IconButton label="Close auto-reply settings" variant="ghost" size="sm" onClick={() => setShowAutoReplyModal(false)}>
                  <X size={18} />
                </IconButton>
              </div>

              <p className="text-xs text-stone-500 mb-5">
                In live mode, a reassurance message goes out if no agent replies within the timeout below.
              </p>

              <div className="space-y-5">
                <label className="flex items-start gap-2.5 cursor-pointer text-sm font-semibold text-stone-800">
                  <input
                    type="checkbox"
                    checked={autoReply.enabled}
                    onChange={(e) => setAutoReply((p) => ({ ...p, enabled: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 rounded accent-stone-900"
                  />
                  Enable the fallback reply
                </label>

                <fieldset>
                  <legend className="text-xs font-bold text-stone-600 mb-2">Send it after</legend>
                  <div className="grid grid-cols-4 gap-2">
                    {[60, 120, 180, 300].map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={autoReply.timeout === s}
                        onClick={() => setAutoReply((p) => ({ ...p, timeout: s }))}
                        className={`h-10 text-xs font-bold rounded-md border transition-colors ${FOCUS} ${
                          autoReply.timeout === s
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        {s < 60 ? `${s}s` : `${s / 60} min`}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <label htmlFor="auto-reply-message" className="text-xs font-bold text-stone-600 block mb-1.5">
                    Message
                  </label>
                  <textarea
                    id="auto-reply-message"
                    value={autoReply.message}
                    onChange={(e) => setAutoReply((p) => ({ ...p, message: e.target.value }))}
                    rows={3}
                    className="w-full text-sm p-3 rounded-md border border-stone-200 bg-stone-50 text-stone-900 placeholder-stone-400 outline-none resize-y transition focus:border-stone-500 focus:bg-white focus:ring-4 focus:ring-stone-900/5"
                    placeholder="Thanks for your patience! Our team is with another customer and will reply in a moment."
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAutoReplyModal(false)}
                    className={`flex-1 h-11 rounded-md border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 ${FOCUS}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveAutoReplySettings}
                    disabled={savingAutoReply}
                    className={`flex-1 h-11 rounded-md bg-stone-900 hover:bg-black text-white text-xs font-bold disabled:opacity-60 ${FOCUS_ON_DARK}`}
                  >
                    {savingAutoReply ? 'Saving…' : 'Save settings'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
