/**
 * @deprecated REMOVED — replaced by SettingsAdminPage.jsx.
 *
 * This was a small legacy stub that called adminAPI.updateSettings with the
 * wrong body shape. The real admin settings UI lives in SettingsAdminPage.jsx
 * (wired into the admin router). See Audits/SettingsAdminPage-audit.md.
 *
 * Safe to `git rm` this file. Kept as a tombstone so a stale import fails
 * loudly instead of silently rendering the old stub.
 */
export default function SettingsPage() {
  throw new Error(
    'SettingsPage.jsx is deprecated. Use SettingsAdminPage.jsx instead.'
  );
}
