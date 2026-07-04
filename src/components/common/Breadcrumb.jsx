import { ChevronRight } from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router-dom';
;

const Breadcrumb = memo(function Breadcrumb({ items = [], variant = 'light', className = '' }) {
  if (!items.length) return null;

  const isDark = variant === 'dark';

  return (
    <nav
      className={`flex items-center gap-1.5 text-xs md:text-sm ${className}`}
      aria-label="Breadcrumb"
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;

        return (
          <span key={idx} className="flex items-center gap-1.5">
            {/* Separator (skip for first item) */}
            {idx > 0 && (
              <ChevronRight size={12} className={`flex-shrink-0 ${ isDark ? 'text-white/50' : 'text-text-muted/40' }`} />
            )}

            {/* Item: link or plain text */}
            {!isLast && item.href ? (
              <Link
                to={item.href}
                className={`font-medium transition-colors whitespace-nowrap ${
                  isDark
                    ? 'text-white/50 hover:text-white'
                    : 'text-text-muted hover:text-primary'
                }`}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`font-medium truncate max-w-[160px] sm:max-w-[300px] ${
                  isDark ? 'text-white/90' : 'text-text-primary'
                }`}
                title={item.label}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
});

export default Breadcrumb;
