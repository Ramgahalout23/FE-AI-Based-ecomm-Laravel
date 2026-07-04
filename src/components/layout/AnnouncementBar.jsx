import { memo } from 'react';
import { useSettings } from '../../store/useSettings';

export default memo(function AnnouncementBar() {
  const { getSetting } = useSettings();

  const enabled = getSetting('announcementEnabled', 'true') !== 'false';
  const text = getSetting(
    'announcementText',
    'THREVOLT  ✦  Premium Quality Guaranteed  ✦  Free Shipping on orders above ₹499'
  );

  if (!enabled) return null;

  // Build an array of repeated items for seamless scrolling
  const items = text.split('✦').map((s) => s.trim()).filter(Boolean);
  const repeatCount = 6;

  return (
    <div className="announcement-bar">
      <div className="announcement-track">
        {Array.from({ length: repeatCount }).map((_, i) => (
          <span key={i} className="announcement-item">
            {items.map((item, j) => (
              <span key={j}>
                <span className="announcement-dot">✦</span>
                <span>{item}</span>
              </span>
            ))}
          </span>
        ))}
      </div>

      <style>{`
        .announcement-bar {
          position: relative;
          z-index: var(--z-sticky, 100);
          width: 100%;
          overflow: hidden;
          background: #1A1A1A;
          border-bottom: 1px solid rgba(201, 169, 110, 0.15);
          height: 36px;
          display: flex;
          align-items: center;
        }

        .announcement-track {
          display: flex;
          animation: announcement-scroll 50s linear infinite;
          white-space: nowrap;
        }

        .announcement-item {
          display: flex;
          align-items: center;
          padding: 0 0.5rem;
        }

        .announcement-item > span {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 0.25rem;
        }

        .announcement-dot {
          font-size: 0.35rem;
          color: #C9A96E;
          opacity: 0.6;
          margin: 0 0.75rem;
        }

        .announcement-item span:last-child {
          font-family: 'Jost', sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.85);
        }

        @keyframes announcement-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .announcement-bar:hover .announcement-track {
          animation-play-state: paused;
        }

        @media (max-width: 640px) {
          .announcement-bar { height: 34px; }
          .announcement-item span:last-child {
            font-size: 0.7rem;
            letter-spacing: 0.08em;
          }
        }
      `}</style>
    </div>
  );
});

