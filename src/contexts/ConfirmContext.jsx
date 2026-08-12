/**
 * ConfirmProvider + useConfirm — async in-app confirmation for admin actions.
 *
 *   <ConfirmProvider>        // mounted once in AdminLayout
 *     ...
 *   </ConfirmProvider>
 *
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: 'Delete coupon?',
 *     message: 'This cannot be undone.',
 *     confirmLabel: 'Delete',
 *     danger: true,
 *   });
 *   if (!ok) return;
 *
 * Replaces every native window.confirm in the admin panel with the styled,
 * animated ConfirmDialog (black-on-white, danger variant for destructive
 * actions). The returned promise resolves true/false so callers keep their
 * existing try/catch + success-toast flow untouched.
 */

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import ConfirmDialog from '../components/admin/ConfirmDialog';

const ConfirmContext = createContext(null);

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }) {
  const [options, setOptions] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((opts = {}) => (
    new Promise((resolve) => {
      resolverRef.current = resolve;
      setOptions(opts);
    })
  ), []);

  const settle = useCallback((result) => {
    setOptions(null);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    if (resolve) resolve(result);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={!!options}
        {...options}
        onCancel={() => settle(false)}
        onConfirm={() => settle(true)}
      />
    </ConfirmContext.Provider>
  );
}
