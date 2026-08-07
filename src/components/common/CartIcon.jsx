/**
 * CartIcon — Shopify-style filled shopping cart icon.
 * Same glyph as the Dawn-theme "icon-cart" used in the navbar.
 * Renders with fill="currentColor" so it inherits surrounding text/icon color.
 */
export default function CartIcon({ size = 22, className = '', style, ...rest }) {
  return (
    <svg
      viewBox="0 0 30 30"
      width={size}
      height={size}
      fill="currentColor"
      className={`icon icon-cart ${className}`}
      style={style}
      aria-hidden="true"
      {...rest}
    >
      <path d="M20,6V5c0-2.761-2.239-5-5-5s-5,2.239-5,5v1H4v24h22V6H20z M12,5c0-1.657,1.343-3,3-3s3,1.343,3,3v1h-6V5z M24,28H6V8h4v3 h2V8h6v3h2V8h4V28z" />
    </svg>
  );
}
