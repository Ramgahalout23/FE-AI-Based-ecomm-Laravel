import { useEffect } from 'react';

/**
 * Injects `data-label` attributes into `<td>` cells of `table.admin-table`
 * elements by reading the matching `<th>` header text. The admin.css mobile
 * card layout (≤640px) renders `td::before { content: attr(data-label) }`,
 * so without these labels the stacked-card layout shows a broken column dump.
 *
 * Must run on BOTH storefront and admin layouts — admin-table is used in
 * storefront pages too (e.g. OrderDetailPage), but the injector previously
 * only ran inside AdminLayout.
 *
 * Implementation: any DOM mutation schedules one `injectAllTables()` on the
 * next animation frame (covers React.lazy/Suspense mounting, route changes,
 * pagination/filters that add rows, dialogs, etc.). The scan is idempotent —
 * cells that already have data-label are skipped — so at most one cheap
 * `document.querySelectorAll` pass runs per frame.
 */
function injectAllTables() {
  document.querySelectorAll('table.admin-table').forEach((table) => {
    const headerCells = table.querySelectorAll('thead th');
    if (!headerCells.length) return;
    table.querySelectorAll('tbody tr').forEach((row) => {
      const cells = row.querySelectorAll('td');
      cells.forEach((cell, idx) => {
        if (cell.hasAttribute('colspan')) return;
        if (cell.hasAttribute('data-label')) return;
        const header = headerCells[idx];
        if (header) {
          cell.setAttribute('data-label', header.textContent.trim());
        }
      });
    });
  });
}

export function useAdminTableLabels() {
  useEffect(() => {
    injectAllTables();

    let rafId = null;
    const observer = new MutationObserver(() => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        injectAllTables();
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, []);
}
