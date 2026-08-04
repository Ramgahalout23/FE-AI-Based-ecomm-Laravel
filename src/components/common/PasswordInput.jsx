import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Password input with a built-in show/hide visibility toggle.
 *
 * All props (value, onChange, id, placeholder, className, autoComplete,
 * minLength, disabled, style, ...) are forwarded to the underlying <input>.
 *
 * Extra props:
 *  - showLabel  (string) — aria-label when the password is hidden (default "Show password")
 *  - hideLabel  (string) — aria-label when the password is visible (default "Hide password")
 *  - buttonClassName (string) — extra classes for the toggle button (e.g. storefront token colors)
 */
export default function PasswordInput({
  value,
  onChange,
  showLabel = 'Show password',
  hideLabel = 'Hide password',
  buttonClassName = '',
  style,
  ...inputProps
}) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'block', width: '100%' }}>
      <input
        {...inputProps}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        style={{ ...style, paddingRight: '2.75rem' }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? hideLabel : showLabel}
        className={`absolute right-4 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 transition-colors ${buttonClassName}`}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
