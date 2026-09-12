import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Clock, Smile, ThumbsUp, Heart, ShoppingBag, PartyPopper, Utensils } from 'lucide-react';

// Comprehensive WhatsApp-like emoji collection organized by categories
const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys & Emotion',
    icon: Smile,
    emojis: [
      { char: '😀', tags: ['grinning', 'smile', 'happy'] },
      { char: '😃', tags: ['smiley', 'smile', 'happy'] },
      { char: '😄', tags: ['smile', 'happy', 'laugh'] },
      { char: '😁', tags: ['grin', 'smile', 'happy'] },
      { char: '😆', tags: ['laughing', 'satisfied', 'haha'] },
      { char: '😅', tags: ['sweat_smile', 'relief', 'nervous'] },
      { char: '🤣', tags: ['rofl', 'rolling', 'laugh'] },
      { char: '😂', tags: ['joy', 'tears', 'laugh', 'crying'] },
      { char: '🙂', tags: ['slightly_smiling_face', 'smile'] },
      { char: '🙃', tags: ['upside_down_face', 'silly'] },
      { char: '😉', tags: ['wink', 'flirt'] },
      { char: '😊', tags: ['blush', 'warm', 'happy'] },
      { char: '😇', tags: ['innocent', 'angel'] },
      { char: '🥰', tags: ['smiling_face_with_3_hearts', 'love', 'in love'] },
      { char: '😍', tags: ['heart_eyes', 'love', 'crush'] },
      { char: '🤩', tags: ['star_struck', 'excited', 'wow'] },
      { char: '😘', tags: ['kissing_heart', 'kiss', 'love'] },
      { char: '😗', tags: ['kissing', 'kiss'] },
      { char: '😚', tags: ['kissing_closed_eyes'] },
      { char: '😋', tags: ['yum', 'delicious', 'tasty'] },
      { char: '😛', tags: ['stuck_out_tongue', 'silly'] },
      { char: '😜', tags: ['stuck_out_tongue_winking_eye', 'joke'] },
      { char: '🤪', tags: ['zany_face', 'crazy', 'wild'] },
      { char: '😝', tags: ['stuck_out_tongue_closed_eyes'] },
      { char: '🤑', tags: ['money_mouth_face', 'rich', 'cash', 'money'] },
      { char: '🤗', tags: ['hugs', 'hug'] },
      { char: '🤭', tags: ['hand_over_mouth', 'oops'] },
      { char: '🤫', tags: ['shushing_face', 'quiet', 'secret'] },
      { char: '🤔', tags: ['thinking', 'curious', 'ponder'] },
      { char: '🤐', tags: ['zipper_mouth_face', 'silent'] },
      { char: '🤨', tags: ['raised_eyebrow', 'suspicious'] },
      { char: '😐', tags: ['neutral_face', 'blank'] },
      { char: '😑', tags: ['expressionless', 'meh'] },
      { char: '😶', tags: ['no_mouth', 'silent'] },
      { char: '😏', tags: ['smirk', 'sly'] },
      { char: '😒', tags: ['unamused', 'displeased'] },
      { char: '🙄', tags: ['rolling_eyes', 'bored'] },
      { char: '😬', tags: ['grimacing', 'awkward'] },
      { char: '🤥', tags: ['lying_face', 'pinocchio'] },
      { char: '😌', tags: ['relieved', 'calm'] },
      { char: '😔', tags: ['pensive', 'sad'] },
      { char: '😪', tags: ['sleepy', 'tired'] },
      { char: '🤤', tags: ['drooling_face', 'yummy'] },
      { char: '😴', tags: ['sleeping', 'zzz', 'night'] },
      { char: '😷', tags: ['mask', 'sick'] },
      { char: '🤒', tags: ['thermometer_face', 'fever'] },
      { char: '🤕', tags: ['head_bandage', 'hurt'] },
      { char: '🤢', tags: ['nauseated_face', 'gross'] },
      { char: '🤮', tags: ['vomiting', 'puke'] },
      { char: '🤧', tags: ['sneezing_face', 'cold'] },
      { char: '🥵', tags: ['hot_face', 'heat', 'sweat'] },
      { char: '🥶', tags: ['cold_face', 'freezing', 'ice'] },
      { char: '🥴', tags: ['woozy_face', 'tipsy'] },
      { char: '😵', tags: ['dizzy_face'] },
      { char: '🤯', tags: ['exploding_head', 'mindblown', 'wow'] },
      { char: '🤠', tags: ['cowboy', 'yeehaw'] },
      { char: '🥳', tags: ['partying_face', 'celebrate', 'party', 'birthday'] },
      { char: '😎', tags: ['sunglasses', 'cool', 'chill'] },
      { char: '🤓', tags: ['nerd_face', 'geek'] },
      { char: '🧐', tags: ['monocle', 'inspect'] },
      { char: '😕', tags: ['confused'] },
      { char: '😟', tags: ['worried'] },
      { char: '🙁', tags: ['slightly_frowning_face'] },
      { char: '😮', tags: ['open_mouth', 'surprise'] },
      { char: '😯', tags: ['hushed'] },
      { char: '😲', tags: ['astonished', 'shocked'] },
      { char: '😳', tags: ['flushed', 'blushing'] },
      { char: '🥺', tags: ['pleading_face', 'puppy_eyes', 'please'] },
      { char: '😦', tags: ['frowning_with_open_mouth'] },
      { char: '😧', tags: ['anguished'] },
      { char: '😨', tags: ['fearful', 'scared'] },
      { char: '😰', tags: ['cold_sweat', 'anxious'] },
      { char: '😥', tags: ['sad_but_relieved'] },
      { char: '😢', tags: ['cry', 'tear', 'sad'] },
      { char: '😭', tags: ['sob', 'crying', 'sad', 'tears'] },
      { char: '😱', tags: ['scream', 'fear', 'scared'] },
      { char: '😖', tags: ['confounded'] },
      { char: '😣', tags: ['persevering_face'] },
      { char: '😞', tags: ['disappointed'] },
      { char: '😓', tags: ['sweat'] },
      { char: '😩', tags: ['weary'] },
      { char: '😫', tags: ['tired_face'] },
      { char: '🥱', tags: ['yawning_face', 'bored'] },
      { char: '😤', tags: ['triumph', 'frustrated'] },
      { char: '😡', tags: ['rage', 'angry', 'mad'] },
      { char: '😠', tags: ['angry', 'mad'] },
      { char: '🤬', tags: ['cursing', 'swear'] },
      { char: '💀', tags: ['skull', 'dead', 'skeleton', 'danger'] },
      { char: '💩', tags: ['poop', 'crap'] },
      { char: '🤡', tags: ['clown'] },
      { char: '👻', tags: ['ghost', 'halloween'] },
      { char: '👽', tags: ['alien'] },
      { char: '🤖', tags: ['robot', 'bot', 'ai', 'assistant'] },
    ],
  },
  {
    id: 'gestures',
    name: 'Gestures & People',
    icon: ThumbsUp,
    emojis: [
      { char: '👋', tags: ['wave', 'hello', 'hi', 'bye'] },
      { char: '🤚', tags: ['raised_back_of_hand'] },
      { char: '🖐️', tags: ['hand_splayed'] },
      { char: '✋', tags: ['raised_hand', 'stop', 'high_five'] },
      { char: '🖖', tags: ['vulcan_salute'] },
      { char: '👌', tags: ['ok_hand', 'perfect', 'agree', 'nice'] },
      { char: '🤌', tags: ['pinched_fingers', 'italian'] },
      { char: '🤏', tags: ['pinching_hand', 'little'] },
      { char: '✌️', tags: ['victory_hand', 'peace', 'two'] },
      { char: '🤞', tags: ['crossed_fingers', 'luck', 'hope'] },
      { char: '🤟', tags: ['love_you_gesture'] },
      { char: '🤘', tags: ['rock_on', 'horns'] },
      { char: '🤙', tags: ['call_me_hand', 'call', 'phone'] },
      { char: '👈', tags: ['point_left'] },
      { char: '👉', tags: ['point_right'] },
      { char: '👆', tags: ['point_up'] },
      { char: '👇', tags: ['point_down'] },
      { char: '☝️', tags: ['index_pointing_up', 'one'] },
      { char: '👍', tags: ['thumbsup', 'like', 'agree', 'yes', 'good', 'approved'] },
      { char: '👎', tags: ['thumbsdown', 'dislike', 'no', 'bad'] },
      { char: '✊', tags: ['fist', 'power'] },
      { char: '👊', tags: ['punch', 'fist_bump'] },
      { char: '🤛', tags: ['left_facing_fist'] },
      { char: '🤜', tags: ['right_facing_fist'] },
      { char: '👏', tags: ['clap', 'applause', 'praise', 'bravo'] },
      { char: '🙌', tags: ['raising_hands', 'hooray', 'celebrate'] },
      { char: '👐', tags: ['open_hands'] },
      { char: '🤲', tags: ['palms_up_together', 'prayer'] },
      { char: '🤝', tags: ['handshake', 'deal', 'agreement', 'partner'] },
      { char: '🙏', tags: ['pray', 'namaste', 'thank_you', 'thanks', 'please'] },
      { char: '✍️', tags: ['writing_hand', 'write', 'note'] },
      { char: '💅', tags: ['nail_polish', 'beauty'] },
      { char: '🤳', tags: ['selfie', 'camera', 'photo'] },
      { char: '💪', tags: ['muscle', 'strong', 'power', 'bicep'] },
      { char: '👀', tags: ['eyes', 'look', 'see'] },
      { char: '👁️', tags: ['eye'] },
      { char: '🗣️', tags: ['speaking_head', 'talk'] },
      { char: '👤', tags: ['bust_in_silhouette', 'user', 'profile', 'person', 'human'] },
      { char: '👥', tags: ['busts_in_silhouette', 'users', 'group', 'team'] },
      { char: '🎧', tags: ['headphones', 'support', 'listen', 'audio', 'music'] },
    ],
  },
  {
    id: 'hearts',
    name: 'Hearts & Symbols',
    icon: Heart,
    emojis: [
      { char: '❤️', tags: ['heart', 'love', 'red_heart'] },
      { char: '🧡', tags: ['orange_heart'] },
      { char: '💛', tags: ['yellow_heart'] },
      { char: '💚', tags: ['green_heart'] },
      { char: '💙', tags: ['blue_heart'] },
      { char: '💜', tags: ['purple_heart'] },
      { char: '🖤', tags: ['black_heart'] },
      { char: '🤍', tags: ['white_heart'] },
      { char: '🤎', tags: ['brown_heart'] },
      { char: '💔', tags: ['broken_heart', 'heartbreak'] },
      { char: '❣️', tags: ['heart_exclamation'] },
      { char: '💕', tags: ['two_hearts'] },
      { char: '💞', tags: ['revolving_hearts'] },
      { char: '💓', tags: ['beating_heart'] },
      { char: '💗', tags: ['growing_heart'] },
      { char: '💖', tags: ['sparkling_heart', 'special'] },
      { char: '💘', tags: ['heart_with_arrow', 'cupid'] },
      { char: '💝', tags: ['heart_with_ribbon', 'gift'] },
      { char: '🔥', tags: ['fire', 'hot', 'flame', 'trending', 'lit'] },
      { char: '✨', tags: ['sparkles', 'stars', 'magic', 'clean', 'new'] },
      { char: '⭐', tags: ['star', 'favorite', 'rating'] },
      { char: '🌟', tags: ['glowing_star'] },
      { char: '💫', tags: ['dizzy', 'sparkle'] },
      { char: '💥', tags: ['collision', 'boom'] },
      { char: '💯', tags: ['100', 'hundred', 'perfect', 'full'] },
      { char: '✅', tags: ['check', 'done', 'yes', 'success', 'verified', 'approved'] },
      { char: '❌', tags: ['x', 'cross', 'no', 'cancel', 'failed'] },
      { char: '⚠️', tags: ['warning', 'alert', 'caution'] },
      { char: '⚡', tags: ['zap', 'lightning', 'fast', 'quick', 'electric'] },
      { char: '💡', tags: ['bulb', 'idea', 'tip'] },
      { char: '🔒', tags: ['lock', 'secure', 'private'] },
      { char: '🔓', tags: ['unlock', 'open'] },
      { char: '🔑', tags: ['key'] },
      { char: '🔔', tags: ['bell', 'notification', 'alert'] },
      { char: '🔕', tags: ['no_bell', 'mute'] },
      { char: '💬', tags: ['chat', 'message', 'bubble'] },
      { char: '🗨️', tags: ['speech_bubble'] },
      { char: '💭', tags: ['thought_bubble'] },
      { char: '♨️', tags: ['hot_springs'] },
      { char: '💎', tags: ['gem', 'diamond', 'luxury', 'premium'] },
    ],
  },
  {
    id: 'shopping',
    name: 'Shopping & E-commerce',
    icon: ShoppingBag,
    emojis: [
      { char: '🛍️', tags: ['shopping_bags', 'shop', 'buy', 'store', 'cart'] },
      { char: '🛒', tags: ['shopping_cart', 'cart', 'buy', 'order'] },
      { char: '📦', tags: ['package', 'box', 'delivery', 'shipment', 'order', 'parcel'] },
      { char: '🏷️', tags: ['label', 'tag', 'price', 'discount', 'sale', 'offer'] },
      { char: '🚚', tags: ['truck', 'delivery', 'shipping', 'fast'] },
      { char: '⚡', tags: ['express', 'instant', 'fast'] },
      { char: '🔄', tags: ['repeat', 'exchange', 'return', 'refresh'] },
      { char: '👕', tags: ['tshirt', 'shirt', 'clothes', 'fashion', 'tee'] },
      { char: '👔', tags: ['necktie', 'formal', 'shirt'] },
      { char: '👗', tags: ['dress', 'fashion', 'outfit'] },
      { char: '👘', tags: ['kimono'] },
      { char: '🥻', tags: ['sari', 'traditional', 'indian'] },
      { char: '🩳', tags: ['shorts'] },
      { char: '👖', tags: ['jeans', 'pants', 'denim'] },
      { char: '🧥', tags: ['coat', 'jacket', 'winter'] },
      { char: '🧦', tags: ['socks'] },
      { char: '👟', tags: ['sneaker', 'shoes', 'running', 'kicks', 'footwear'] },
      { char: '👞', tags: ['shoe', 'formal'] },
      { char: '🥾', tags: ['hiking_boot'] },
      { char: '👠', tags: ['high_heel', 'heels'] },
      { char: '👡', tags: ['sandal'] },
      { char: '👢', tags: ['boot'] },
      { char: '🧢', tags: ['cap', 'hat'] },
      { char: '👒', tags: ['hat', 'sun_hat'] },
      { char: '🎒', tags: ['backpack', 'bag'] },
      { char: '👜', tags: ['handbag', 'purse'] },
      { char: '👛', tags: ['purse', 'wallet'] },
      { char: '💼', tags: ['briefcase'] },
      { char: '🕶️', tags: ['sunglasses', 'shades', 'eyewear'] },
      { char: '💍', tags: ['ring', 'jewelry'] },
      { char: '👑', tags: ['crown', 'king', 'queen', 'vip'] },
      { char: '💳', tags: ['credit_card', 'payment', 'pay', 'card', 'debit'] },
      { char: '💵', tags: ['cash', 'money', 'dollar', 'rupee', 'cod'] },
      { char: '🧾', tags: ['receipt', 'bill', 'invoice'] },
      { char: '🎁', tags: ['gift', 'present', 'surprise', 'offer'] },
      { char: '📍', tags: ['pin', 'location', 'address'] },
      { char: '📞', tags: ['telephone', 'phone', 'call', 'contact'] },
      { char: '📱', tags: ['iphone', 'mobile', 'cell', 'smartphone'] },
      { char: '💻', tags: ['laptop', 'computer'] },
    ],
  },
  {
    id: 'celebration',
    name: 'Celebration & Fun',
    icon: PartyPopper,
    emojis: [
      { char: '🎉', tags: ['tada', 'party', 'celebrate', 'congrats', 'cheers'] },
      { char: '🎊', tags: ['confetti', 'celebration'] },
      { char: '🎈', tags: ['balloon', 'party'] },
      { char: '🎂', tags: ['birthday', 'cake'] },
      { char: '🍰', tags: ['cake', 'slice'] },
      { char: '🧁', tags: ['cupcake'] },
      { char: '🥂', tags: ['cheers', 'champagne', 'toast'] },
      { char: '🍻', tags: ['beers', 'cheers'] },
      { char: '🏆', tags: ['trophy', 'winner', 'award'] },
      { char: '🥇', tags: ['first_place', 'gold'] },
      { char: '🎯', tags: ['target', 'bullseye'] },
      { char: '🚀', tags: ['rocket', 'launch', 'fast'] },
      { char: '🌈', tags: ['rainbow'] },
      { char: '☀️', tags: ['sun', 'sunny'] },
      { char: '🌙', tags: ['moon', 'night'] },
      { char: '⭐', tags: ['star'] },
      { char: '🌸', tags: ['flower', 'cherry_blossom'] },
      { char: '🌹', tags: ['rose'] },
    ],
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: Utensils,
    emojis: [
      { char: '☕', tags: ['coffee', 'tea', 'cafe'] },
      { char: '🍵', tags: ['tea'] },
      { char: '🥤', tags: ['drink', 'soda'] },
      { char: '🍕', tags: ['pizza'] },
      { char: '🍔', tags: ['burger'] },
      { char: '🍟', tags: ['fries'] },
      { char: '🥪', tags: ['sandwich'] },
      { char: '🌮', tags: ['taco'] },
      { char: '🍿', tags: ['popcorn'] },
      { char: '🍫', tags: ['chocolate'] },
      { char: '🍬', tags: ['candy'] },
      { char: '🍩', tags: ['donut'] },
      { char: '🍪', tags: ['cookie'] },
      { char: '🍦', tags: ['ice_cream'] },
    ],
  },
];

const DEFAULT_RECENT = ['😀', '❤️', '👍', '🔥', '✨', '🎉', '🛍️', '📦', '👕', '🙏', '😊', '😍', '😂', '👌', '⚡', '💯'];

export default function EmojiPickerPopover({ onSelect, onClose, align = 'left' }) {
  const [activeTab, setActiveTab] = useState('smileys');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentEmojis, setRecentEmojis] = useState(() => {
    try {
      const stored = localStorage.getItem('chat_recent_emojis');
      return stored ? JSON.parse(stored) : DEFAULT_RECENT;
    } catch {
      return DEFAULT_RECENT;
    }
  });

  const popoverRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  // Handle emoji click
  const handleEmojiClick = (emojiChar) => {
    // 1. Call onSelect callback
    if (onSelect) onSelect(emojiChar);

    // 2. Add to recents
    setRecentEmojis((prev) => {
      const filtered = prev.filter((e) => e !== emojiChar);
      const updated = [emojiChar, ...filtered].slice(0, 24);
      try {
        localStorage.setItem('chat_recent_emojis', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Filtered emojis based on search query
  const filteredEmojis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const matched = [];
    const seen = new Set();
    EMOJI_CATEGORIES.forEach((cat) => {
      cat.emojis.forEach((item) => {
        if (seen.has(item.char)) return;
        const matches = item.tags.some((tag) => tag.includes(q)) || item.char === q;
        if (matches) {
          seen.add(item.char);
          matched.push(item.char);
        }
      });
    });
    return matched;
  }, [searchQuery]);

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Emoji Picker"
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 8px)',
        [align === 'right' ? 'right' : 'left']: 0,
        zIndex: 9999,
        width: '320px',
        maxWidth: 'calc(100vw - 32px)',
        height: '350px',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 12px 36px rgba(0,0,0,0.18), 0 2px 10px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'emojiPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <style>{`
        @keyframes emojiPopIn {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .emoji-grid-btn {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          border-radius: 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          transition: transform 0.12s ease, background-color 0.12s ease;
          user-select: none;
        }
        .emoji-grid-btn:hover {
          background-color: #f3f4f6;
          transform: scale(1.18);
        }
        .emoji-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 36px;
          border: none;
          background: transparent;
          cursor: pointer;
          color: #6b7280;
          border-bottom: 2px solid transparent;
          transition: all 0.15s ease;
        }
        .emoji-tab-btn:hover {
          color: #111827;
          background: #f9fafb;
        }
        .emoji-tab-btn.active {
          color: #111827;
          border-bottom-color: #111827;
        }
      `}</style>

      {/* ── Search Bar ── */}
      <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#f3f4f6',
          borderRadius: '10px',
          padding: '6px 10px',
        }}>
          <Search size={15} color="#9ca3af" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emoji (smile, heart, order...)"
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13px',
              width: '100%',
              color: '#111827',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', color: '#9ca3af' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close emoji picker"
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            color: '#6b7280',
            display: 'flex',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Category Tabs (hidden during active search) ── */}
      {!searchQuery && (
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#fafafa', padding: '0 4px' }}>
          <button
            type="button"
            className={`emoji-tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
            title="Recent"
            aria-label="Recent emojis"
          >
            <Clock size={16} />
          </button>
          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                className={`emoji-tab-btn ${activeTab === cat.id ? 'active' : ''}`}
                onClick={() => setActiveTab(cat.id)}
                title={cat.name}
                aria-label={cat.name}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      )}

      {/* ── Emoji Grid ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 10px',
        }}
      >
        {searchQuery ? (
          filteredEmojis.length > 0 ? (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Search Results ({filteredEmojis.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {filteredEmojis.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="emoji-grid-btn"
                    onClick={() => handleEmojiClick(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
              No emojis found for "{searchQuery}"
            </div>
          )
        ) : activeTab === 'recent' ? (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Frequently Used
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {recentEmojis.map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="emoji-grid-btn"
                  onClick={() => handleEmojiClick(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ) : (
          (() => {
            const currentCategory = EMOJI_CATEGORIES.find((c) => c.id === activeTab) || EMOJI_CATEGORIES[0];
            return (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {currentCategory.name}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                  {currentCategory.emojis.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="emoji-grid-btn"
                      onClick={() => handleEmojiClick(item.char)}
                    >
                      {item.char}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* ── WhatsApp-style Footer Tip ── */}
      <div style={{
        padding: '6px 12px',
        borderTop: '1px solid #f3f4f6',
        fontSize: '11px',
        color: '#9ca3af',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#fafafa',
      }}>
        <span>WhatsApp Style Emojis</span>
        <span>Tap to insert</span>
      </div>
    </div>
  );
}
