/**
 * ReadTicks — WhatsApp-style delivery state for an outgoing message.
 *
 * One tick means the server stored the message; two ticks mean the other side
 * opened the thread. The state is also exposed as text (aria-label + title) so it
 * is not colour-only, and it renders nothing for inbound messages.
 */

import { Check, CheckCheck } from 'lucide-react';

export default function ReadTicks({ read, className = '', variant = 'light' }) {
  const label = read ? 'Read' : 'Sent';

  // On a dark bubble the "read" accent has to brighten or it disappears.
  const tone = read
    ? variant === 'dark'
      ? 'text-sky-300'
      : 'text-sky-600'
    : variant === 'dark'
      ? 'text-white/55'
      : 'text-stone-400';

  return (
    <span
      className={`inline-flex items-center flex-shrink-0 ${tone} ${className}`}
      title={label}
      aria-label={label}
      role="img"
    >
      {read ? <CheckCheck size={13} strokeWidth={2.6} /> : <Check size={13} strokeWidth={2.6} />}
    </span>
  );
}
