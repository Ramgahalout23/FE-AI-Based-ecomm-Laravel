/**
 * Traffic Source Detection Utility
 * Parses document.referrer and UTM parameters to determine where visitors come from.
 *
 * Categories: facebook, instagram, google, whatsapp, twitter, linkedin,
 *             pinterest, email, direct, other
 */

const SOURCE_PATTERNS = [
  { source: 'facebook',  patterns: ['facebook.com', 'fb.com', 'm.facebook.com', 'l.facebook.com', 'fb.me'] },
  { source: 'instagram', patterns: ['instagram.com', 'l.instagram.com', 'www.instagram.com'] },
  { source: 'google',    patterns: ['google.com', 'google.co', 'youtube.com', 'youtu.be'] },
  { source: 'whatsapp',  patterns: ['wa.me', 'api.whatsapp.com', 'web.whatsapp.com', 'whatsapp.com'] },
  { source: 'twitter',   patterns: ['twitter.com', 't.co', 'x.com'] },
  { source: 'linkedin',  patterns: ['linkedin.com', 'lnkd.in'] },
  { source: 'pinterest', patterns: ['pinterest.com', 'pin.it', 'pinterest.co'] },
  { source: 'telegram',  patterns: ['t.me', 'telegram.me', 'telegram.org'] },
  { source: 'youtube',   patterns: ['youtube.com', 'youtu.be'] },
];

const EMAIL_PATTERNS = [
  'mail.yahoo.com', 'mail.google.com', 'outlook.live.com', 'outlook.com',
  'mail.aol.com', 'mail.protonmail.com', 'mail.zoho.com', 'webmail',
  'email', 'mail.',
];

const SEARCH_ENGINE_PATTERNS = [
  { source: 'bing',    patterns: ['bing.com', 'www.bing.com'] },
  { source: 'yahoo',   patterns: ['search.yahoo.com', 'yahoo.com'] },
  { source: 'duckduckgo', patterns: ['duckduckgo.com'] },
];

/**
 * Extract UTM parameters from the current URL (or a provided URL string).
 */
export function getUtmParams(urlString) {
  try {
    const url = urlString ? new URL(urlString) : new URL(window.location.href);
    const params = url.searchParams;
    return {
      utm_source: params.get('utm_source') || null,
      utm_medium: params.get('utm_medium') || null,
      utm_campaign: params.get('utm_campaign') || null,
      utm_term: params.get('utm_term') || null,
      utm_content: params.get('utm_content') || null,
    };
  } catch {
    return { utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null };
  }
}

/**
 * Categorize a referrer URL into a named source.
 * Returns 'direct' if no referrer, or the matched source name.
 */
export function categorizeReferrer(referrer) {
  if (!referrer) return 'direct';

  const lower = referrer.toLowerCase();

  // Check social media patterns
  for (const { source, patterns } of SOURCE_PATTERNS) {
    if (patterns.some(p => lower.includes(p))) return source;
  }

  // Check search engines
  for (const { source, patterns } of SEARCH_ENGINE_PATTERNS) {
    if (patterns.some(p => lower.includes(p))) return source;
  }

  // Check email clients
  if (EMAIL_PATTERNS.some(p => lower.includes(p))) return 'email';

  // If it's an internal link (same domain), check if we can still categorize
  try {
    const referrerHost = new URL(referrer).hostname;
    const currentHost = window.location.hostname;
    if (referrerHost === currentHost) return 'internal';
  } catch {
    // Invalid URL — fall through
  }

  return 'other';
}

/**
 * Get display label for a traffic source.
 */
export function getSourceLabel(source) {
  const labels = {
    facebook:   'Facebook',
    instagram:  'Instagram',
    google:     'Google',
    whatsapp:   'WhatsApp',
    twitter:    'Twitter / X',
    linkedin:   'LinkedIn',
    pinterest:  'Pinterest',
    telegram:   'Telegram',
    youtube:    'YouTube',
    bing:       'Bing',
    yahoo:      'Yahoo',
    duckduckgo: 'DuckDuckGo',
    email:      'Email',
    direct:     'Direct Visit',
    internal:   'Internal Link',
    other:      'Other',
  };
  return labels[source] || source || 'Unknown';
}

/**
 * Get a color for a traffic source (for charts).
 */
export function getSourceColor(source) {
  const colors = {
    facebook:   '#1877F2',
    instagram:  '#E4405F',
    google:     '#4285F4',
    whatsapp:   '#25D366',
    twitter:    '#1DA1F2',
    linkedin:   '#0A66C2',
    pinterest:  '#BD081C',
    telegram:   '#26A5E4',
    youtube:    '#FF0000',
    bing:       '#008373',
    yahoo:      '#6001D2',
    duckduckgo: '#DE5833',
    email:      '#EA4335',
    direct:     '#34A853',
    internal:   '#9AA0A6',
    other:      '#80868B',
  };
  return colors[source] || '#80868B';
}

/**
 * Get icon emoji for a traffic source (for UI display).
 */
export function getSourceIcon(source) {
  const icons = {
    facebook:   '📘',
    instagram:  '📷',
    google:     '🔍',
    whatsapp:   '💬',
    twitter:    '🐦',
    linkedin:   '💼',
    pinterest:  '📌',
    telegram:   '✈️',
    youtube:    '▶️',
    bing:       '🔎',
    yahoo:     '🌐',
    duckduckgo: '🦆',
    email:      '📧',
    direct:     '🔗',
    internal:   '🔄',
    other:      '🌍',
  };
  return icons[source] || '🌍';
}

/**
 * Main function: Detect the full traffic source info for the current visit.
 * Priority: UTM params > document.referrer > direct
 */
export function detectTrafficSource() {
  const utm = getUtmParams();

  // If UTM source is explicitly set, use it
  if (utm.utm_source) {
    return {
      source: utm.utm_source.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      originalSource: utm.utm_source,
      ...utm,
      isUtm: true,
    };
  }

  // Fall back to referrer categorization
  const referrer = document.referrer || null;
  const source = categorizeReferrer(referrer);

  return {
    source,
    originalSource: referrer,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_term: null,
    utm_content: null,
    isUtm: false,
  };
}

export default {
  detectTrafficSource,
  getUtmParams,
  categorizeReferrer,
  getSourceLabel,
  getSourceColor,
  getSourceIcon,
};
