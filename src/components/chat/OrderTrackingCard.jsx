/**
 * OrderTrackingCard — the visual tracker the bot posts when a customer asks
 * "where is my order?".
 *
 * Before this, `POST /chat/track-order` returned a wall of text with emoji. The
 * data was already structured (status, carrier, tracking number, ETA, line
 * items), so it is rendered as a real timeline instead: the customer sees how
 * far along the parcel is at a glance, and the state is written out in words as
 * well as colour so it survives a colour-blind or screen-reader pass.
 */

import { CheckCircle2, Package, ClipboardCheck, Truck, Home, XCircle, RotateCcw, ExternalLink } from 'lucide-react';

const STEPS = [
  { key: 'PENDING', label: 'Placed', icon: ClipboardCheck },
  { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'SHIPPED', label: 'Shipped', icon: Package },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: Home },
];

const TERMINAL = {
  CANCELLED: { label: 'Cancelled', icon: XCircle, tone: 'rose' },
  RETURNED: { label: 'Returned', icon: RotateCcw, tone: 'amber' },
};

/** Carrier tracking pages, so the customer can follow the last mile themselves. */
const CARRIER_TRACKING = {
  delhivery: (n) => `https://www.delhivery.com/track/package/${n}`,
  bluedart: (n) => `https://www.bluedart.com/tracking/${n}`,
  dtdc: (n) => `https://www.dtdc.in/tracking/tracking_results.asp?strCnno=${n}`,
  ekart: (n) => `https://ekartlogistics.com/track/${n}`,
  shiprocket: (n) => `https://shiprocket.co/tracking/${n}`,
  // India Post has no per-consignment URL — the customer enters it on their page.
  indiapost: () => 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx',
};

function trackingUrl(carrier, number) {
  if (!carrier || !number) return null;
  const slug = String(carrier).toLowerCase().replace(/[^a-z]/g, '');
  const build = CARRIER_TRACKING[slug];
  return build ? build(number) : null;
}

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function OrderTrackingCard({ order, className = '' }) {
  if (!order) return null;

  const status = String(order.status || 'PENDING').toUpperCase();
  const terminal = TERMINAL[status];
  const activeIndex = STEPS.findIndex((s) => s.key === status);
  const ship = order.shipping || {};
  const items = Array.isArray(order.orderitem) ? order.orderitem : [];
  const trackUrl = trackingUrl(ship.carrier, ship.trackingNumber);
  const eta = ship.estimatedDelivery ? new Date(ship.estimatedDelivery) : null;

  return (
    <div
      className={`rounded-xl border border-stone-200 bg-white overflow-hidden ${className}`}
    >
      {/* Header — order number and total */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-stone-50 border-b border-stone-200">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Order</div>
          <div className="text-[13px] font-bold text-stone-900 truncate font-mono">#{order.orderNumber}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Total</div>
          <div className="text-[13px] font-bold text-stone-900">{currency(order.total)}</div>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {terminal ? (
          <div
            className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${
              terminal.tone === 'rose' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-800'
            }`}
          >
            <terminal.icon size={15} className="flex-shrink-0" />
            <span className="text-[12px] font-semibold">
              {terminal.label} — this order is no longer in transit.
            </span>
          </div>
        ) : (
          <ol className="space-y-0">
            {STEPS.map((step, idx) => {
              const done = activeIndex >= 0 && idx <= activeIndex;
              const current = idx === activeIndex;
              const last = idx === STEPS.length - 1;
              const Icon = step.icon;
              return (
                <li key={step.key} className="flex gap-2.5">
                  {/* Rail */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                        done
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-stone-300 text-stone-400'
                      }`}
                    >
                      <Icon size={12} strokeWidth={2.5} />
                    </span>
                    {!last && (
                      <span
                        className={`w-0.5 flex-1 min-h-3 ${done && idx < activeIndex ? 'bg-emerald-600' : 'bg-stone-200'}`}
                      />
                    )}
                  </div>

                  {/* Label — the state is in the words, not just the colour */}
                  <div className={`min-w-0 ${last ? 'pb-0' : 'pb-2.5'} pt-0.5`}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[12px] font-semibold ${
                          current ? 'text-stone-900' : done ? 'text-stone-700' : 'text-stone-400'
                        }`}
                      >
                        {step.label}
                      </span>
                      {current && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-px">
                          Now
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {/* Tracking number + ETA + courier link */}
        {(ship.trackingNumber || eta) && (
          <div className="rounded-lg bg-stone-50 border border-stone-200 px-2.5 py-2 space-y-1">
            {ship.trackingNumber && (
              <div className="text-[11px] text-stone-600">
                <span className="font-semibold text-stone-700">{ship.carrier || 'Courier'}</span>
                {' · '}
                <span className="font-mono">{ship.trackingNumber}</span>
              </div>
            )}
            {eta && !isNaN(eta.getTime()) && (
              <div className="text-[11px] text-stone-600">
                Expected{' '}
                <span className="font-semibold text-stone-700">
                  {eta.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            )}
            {trackUrl && (
              <a
                href={trackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-900 underline underline-offset-2"
              >
                Track on {ship.carrier}
                <ExternalLink size={11} />
              </a>
            )}
          </div>
        )}

        {/* Line items */}
        {items.length > 0 && (
          <ul className="space-y-1.5 border-t border-stone-100 pt-2">
            {items.slice(0, 4).map((item, idx) => (
              <li key={idx} className="flex items-start justify-between gap-2 text-[11px]">
                <span className="min-w-0 text-stone-700 truncate">
                  {item.product?.name || 'Item'}
                  <span className="text-stone-400"> × {item.quantity}</span>
                </span>
                <span className="flex-shrink-0 font-medium text-stone-600">{currency(item.price)}</span>
              </li>
            ))}
            {items.length > 4 && (
              <li className="text-[11px] text-stone-500">+{items.length - 4} more item{items.length - 4 > 1 ? 's' : ''}</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
