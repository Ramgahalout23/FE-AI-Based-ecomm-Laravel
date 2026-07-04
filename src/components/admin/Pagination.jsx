import { useState } from 'react';

/**
 * Reusable Pagination component for admin tables.
 *
 * Full-featured mode (pageSize + onPageSizeChange provided):
 *   - Page size selector, item count, First/Prev/Next/Last buttons,
 *     smart page range (maxVisible=7) with ellipsis, jump-to-page input.
 *
 * Simple mode (onPageSizeChange omitted):
 *   - Item count, Prev/Next buttons, simple numbered page buttons (up to 10).
 *
 * Props:
 *   currentPage    {number}       - Active page (1-indexed)
 *   totalPages     {number}       - Total number of pages
 *   totalItems     {number}       - Total number of items across all pages
 *   onPageChange   {function}     - Called with new page number
 *   itemLabel      {string}       - Singular item label for display (e.g. "product", "order")
 *   pageSize       {number}       - [Full] Current page size
 *   onPageSizeChange {function}   - [Full] Called with new page size value
 *   pageSizeOptions {number[]}    - [Full] Array of page size options (default: [10, 25, 50, 100])
 */
export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  itemLabel = 'item',
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}) {
  const [jumpToInput, setJumpToInput] = useState('');
  const isFull = typeof onPageSizeChange === 'function';

  if (totalPages === 0) return null;

  const containerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.75rem',
    padding: '0.85rem 1.25rem',
    borderTop: '1px solid var(--border)',
    background: 'var(--off-white)',
    borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
  };

  const selectStyle = {
    padding: '0.3rem 0.5rem',
    borderRadius: 6,
    border: '1px solid var(--border)',
    fontSize: '0.78rem',
    background: '#fff',
    color: 'var(--charcoal)',
    fontWeight: 500,
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  };

  const pageBtnStyle = (isActive) => ({
    minWidth: '30px',
    height: '30px',
    padding: '0 0.35rem',
    borderRadius: 6,
    border: isActive ? '1.5px solid var(--gold)' : '1px solid transparent',
    background: isActive ? 'rgba(201,169,110,0.1)' : 'transparent',
    color: isActive ? 'var(--charcoal)' : 'var(--muted)',
    fontWeight: isActive ? 700 : 400,
    fontSize: '0.78rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
  });

  const navBtnStyle = (disabled) => ({
    fontSize: '0.72rem',
    padding: '0.3rem 0.5rem',
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  });

  const smallBtnStyle = (disabled) => ({
    fontSize: '0.7rem',
    padding: '0.3rem 0.45rem',
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  });

  // ── Simple mode ──
  if (!isFull) {
    return (
      <div className="pagination-container" style={containerStyle}>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} {totalItems === 1 ? itemLabel : `${itemLabel}s`})
        </span>
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          <button
            className="btn-ghost btn-sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            style={navBtnStyle(currentPage <= 1)}
          >
            ◀ Prev
          </button>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              className={p === currentPage ? 'btn-dark btn-sm' : 'btn-ghost btn-sm'}
              onClick={() => onPageChange(p)}
              style={{ minWidth: '32px' }}
            >
              {p}
            </button>
          ))}
          <button
            className="btn-ghost btn-sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            style={navBtnStyle(currentPage >= totalPages)}
          >
            Next ▶
          </button>
        </div>
      </div>
    );
  }

  // ── Full-featured mode ──
  return (
    <div className="pagination-container" style={containerStyle}>
      {/* Left: Page info + Page size selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
          <strong style={{ color: 'var(--charcoal)' }}>{totalItems}</strong>{' '}
          {totalItems === 1 ? itemLabel : `${itemLabel}s`}
        </span>

        {pageSizeOptions && (
          <>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Show</span>
              <select
                value={pageSize}
                onChange={e => onPageSizeChange(Number(e.target.value))}
                style={selectStyle}
                onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              >
                {pageSizeOptions.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>per page</span>
            </div>
          </>
        )}
      </div>

      {/* Right: Pagination controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* First / Prev */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: '0.2rem' }}>
            <button
              className="btn-ghost btn-sm"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(1)}
              title="First page"
              style={smallBtnStyle(currentPage <= 1)}
            >
              ◀◀
            </button>
            <button
              className="btn-ghost btn-sm"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              title="Previous page"
              style={navBtnStyle(currentPage <= 1)}
            >
              ◀ Prev
            </button>
          </div>
        )}

        {/* Page number buttons - smart range */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
            {(() => {
              const maxVisible = 7;
              const pages = [];
              let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
              let end = Math.min(totalPages, start + maxVisible - 1);
              if (end - start + 1 < maxVisible) {
                start = Math.max(1, end - maxVisible + 1);
              }
              for (let i = start; i <= end; i++) pages.push(i);
              return (
                <>
                  {start > 1 && (
                    <span style={{ color: 'var(--muted)', fontSize: '0.72rem', padding: '0 0.15rem' }}>...</span>
                  )}
                  {pages.map(p => (
                    <button
                      key={p}
                      onClick={() => onPageChange(p)}
                      style={pageBtnStyle(p === currentPage)}
                      onMouseEnter={e => {
                        if (p !== currentPage) {
                          e.currentTarget.style.background = '#f3f4f6';
                          e.currentTarget.style.color = 'var(--charcoal)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (p !== currentPage) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--muted)';
                        }
                      }}
                    >
                      {p}
                    </button>
                  ))}
                  {end < totalPages && (
                    <span style={{ color: 'var(--muted)', fontSize: '0.72rem', padding: '0 0.15rem' }}>...</span>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Next / Last */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: '0.2rem' }}>
            <button
              className="btn-ghost btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
              title="Next page"
              style={navBtnStyle(currentPage >= totalPages)}
            >
              Next ▶
            </button>
            <button
              className="btn-ghost btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(totalPages)}
              title="Last page"
              style={smallBtnStyle(currentPage >= totalPages)}
            >
              ▶▶
            </button>
          </div>
        )}

        {/* Jump to page */}
        {totalPages > 1 && (
          <>
            <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 0.15rem' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Go to</span>
              <input
                type="text"
                inputMode="numeric"
                value={jumpToInput}
                onChange={e => { setJumpToInput(e.target.value.replace(/\D/g, '')); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const p = parseInt(jumpToInput, 10);
                    if (p >= 1 && p <= totalPages) onPageChange(p);
                    setJumpToInput('');
                  }
                }}
                onBlur={() => setJumpToInput('')}
                placeholder={`1-${totalPages}`}
                style={{
                  width: 48,
                  padding: '0.3rem 0.4rem',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  fontSize: '0.78rem',
                  textAlign: 'center',
                  outline: 'none',
                  background: '#fff',
                  color: 'var(--charcoal)',
                  fontWeight: 500,
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; setJumpToInput(''); }}
                autoComplete="off"
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                of <strong style={{ color: 'var(--charcoal)' }}>{totalPages}</strong>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
