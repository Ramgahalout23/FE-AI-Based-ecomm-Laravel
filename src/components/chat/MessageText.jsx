/**
 * MessageText — safe, dependency-free rich text for chat messages.
 *
 * Chat is where customers paste tracking links, and where the AI bot answers with
 * **bold** headlines, bullet lists and URLs. Rendering that as raw text made both
 * consoles look unfinished, so this renders a deliberately small markdown subset
 * as React elements — no `dangerouslySetInnerHTML`, so a customer can never inject
 * markup into the agent's console:
 *
 *   **bold**   *italic*   `code`   [label](url)   bare https://links
 *   - bullet list         1. numbered list        blank line = new block
 *
 * Links become compact chips that show the destination host rather than a
 * 200-character tracking URL, which is what keeps a bubble readable.
 */

import { Link2 } from 'lucide-react';

// Order matters: bold before italic, and the explicit [label](url) form before a
// bare URL so `[size chart](https://…)` is not parsed as a plain link.
const INLINE_PATTERN =
  /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`|\[[^\]\n]+\]\(\s*(?:https?:\/\/|\/)[^\s)]+\s*\)|https?:\/\/[^\s<>"')\]]+)/g;

/** `https://api.threvolt.com/x?a=1` → `api.threvolt.com` — a label a human can read. */
function hostLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const LINK_BASE =
  'inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[12px] font-medium no-underline transition-colors align-baseline';

function linkClasses(variant) {
  return variant === 'dark'
    ? `${LINK_BASE} border-white/25 bg-white/10 text-sky-200 hover:bg-white/20 hover:text-white`
    : `${LINK_BASE} border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 hover:text-sky-900`;
}

function codeClasses(variant) {
  return variant === 'dark'
    ? 'rounded bg-white/15 px-1 py-0.5 font-mono text-[12px] text-amber-100'
    : 'rounded bg-stone-100 px-1 py-0.5 font-mono text-[12px] text-stone-800';
}

/**
 * Render one line of inline markdown. Text with no markup returns as a plain
 * string, so the common case stays allocation-free.
 */
function renderInline(text, variant, keyPrefix) {
  if (!text) return text;
  if (!INLINE_PATTERN.test(text)) return text;
  INLINE_PATTERN.lastIndex = 0;

  const nodes = [];
  let last = 0;
  let match;
  let i = 0;

  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-i${i++}`;

    if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(
        <strong key={key} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('`')) {
      nodes.push(
        <code key={key} className={codeClasses(variant)}>
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('[')) {
      const parts = /^\[([^\]]+)\]\(\s*([^\s)]+)\s*\)$/.exec(token);
      if (parts) {
        nodes.push(
          <a
            key={key}
            href={parts[2]}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClasses(variant)}
            title={parts[2]}
          >
            <Link2 size={12} className="flex-shrink-0" />
            <span className="truncate">{parts[1]}</span>
          </a>,
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith('http')) {
      nodes.push(
        <a
          key={key}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClasses(variant)}
          title={token}
        >
          <Link2 size={12} className="flex-shrink-0" />
          <span className="truncate">{hostLabel(token)}</span>
        </a>,
      );
    } else {
      nodes.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }

    last = match.index + token.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const BULLET = /^\s{0,3}[-*•]\s+(.*)$/;
const ORDERED = /^\s{0,3}\d{1,2}[.)]\s+(.*)$/;
const HEADING = /^\s{0,3}(#{1,3})\s+(.*)$/;

/**
 * @param {string} text      raw message content
 * @param {'light'|'dark'} variant  bubble tone — controls link/code contrast
 */
export default function MessageText({ text, variant = 'light', className = '' }) {
  const source = String(text ?? '');
  if (!source) return null;

  const lines = source.split(/\r?\n/);
  const blocks = [];
  let list = null; // { type: 'ul' | 'ol', items: [] }

  const flushList = () => {
    if (!list) return;
    const Tag = list.type;
    blocks.push(
      <Tag
        key={`list-${blocks.length}`}
        className={`my-1 space-y-1 pl-4 ${list.type === 'ul' ? 'list-disc' : 'list-decimal'}`}
      >
        {list.items.map((item, idx) => (
          <li key={idx} className="leading-relaxed marker:opacity-60">
            {renderInline(item, variant, `l${blocks.length}-${idx}`)}
          </li>
        ))}
      </Tag>,
    );
    list = null;
  };

  lines.forEach((line, lineIdx) => {
    const bullet = BULLET.exec(line);
    const ordered = ORDERED.exec(line);
    const heading = HEADING.exec(line);

    if (bullet) {
      if (list?.type !== 'ul') {
        flushList();
        list = { type: 'ul', items: [] };
      }
      list.items.push(bullet[1]);
      return;
    }

    if (ordered) {
      // `1.` sequences restart the visual list but text is preserved verbatim, so a
      // stray "2." in prose never becomes a list item without its marker line.
      if (list?.type !== 'ol') {
        flushList();
        list = { type: 'ol', items: [] };
      }
      list.items.push(ordered[1]);
      return;
    }

    flushList();

    if (!line.trim()) return; // blank line = block separator, handled by spacing below

    if (heading) {
      const size = heading[1].length === 1 ? 'text-[15px]' : 'text-[13px]';
      blocks.push(
        <p key={`h-${lineIdx}`} className={`mt-2 mb-1 font-bold ${size}`}>
          {renderInline(heading[2], variant, `h${lineIdx}`)}
        </p>,
      );
      return;
    }

    blocks.push(
      <p key={`p-${lineIdx}`} className="leading-relaxed">
        {renderInline(line, variant, `p${lineIdx}`)}
      </p>,
    );
  });

  flushList();

  if (blocks.length === 0) return null;

  // Single-block messages (the overwhelming majority) need no wrapper spacing.
  if (blocks.length === 1 && !list) {
    return <div className={className}>{blocks[0]}</div>;
  }

  return <div className={`space-y-1.5 ${className}`}>{blocks}</div>;
}
