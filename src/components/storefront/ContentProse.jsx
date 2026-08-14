/**
 * Shared prose typography for CMS / legal content pages.
 *
 * Renders CMS HTML with the house typography (extracted from the old
 * per-page .privacy-prose styles) so About-style content pages render
 * consistently without duplicating CSS in every page.
 */
export default function ContentProse({ html }) {
  return (
    <>
      <style>{`
        .content-prose { font-size: 15.5px; line-height: 1.85; color: #4a4a5a; word-break: break-word; }
        .content-prose h1, .content-prose h2, .content-prose h3, .content-prose h4 {
          font-family: var(--font-display);
          color: #1a1a1a;
          letter-spacing: -0.02em;
          line-height: 1.25;
        }
        .content-prose h1 { font-size: 1.9rem; font-weight: 800; margin: 0 0 1.3rem; }
        .content-prose h2 { font-size: 1.5rem; font-weight: 700; margin: 2.4rem 0 0.9rem; padding-bottom: 0.55rem; border-bottom: 1px solid rgba(26,26,26,0.08); }
        .content-prose h3 { font-size: 1.15rem; font-weight: 700; margin: 1.7rem 0 0.6rem; }
        .content-prose h4 { font-size: 1rem; font-weight: 700; margin: 1.3rem 0 0.5rem; }
        .content-prose p { margin: 0 0 1rem; }
        .content-prose a { color: #1a1a1a; text-decoration: underline; text-underline-offset: 3px; }
        .content-prose strong { color: #1a1a1a; font-weight: 700; }
        .content-prose ul, .content-prose ol { margin: 0 0 1.2rem 1.15rem; }
        .content-prose li { margin-bottom: 0.45rem; line-height: 1.75; }
        .content-prose li::marker { color: #1a1a1a; }
        .content-prose blockquote { border-left: 3px solid #1a1a1a; padding-left: 1rem; margin: 1.2rem 0; font-style: italic; color: #4a4a5a; }
        .content-prose table { width: 100%; border-collapse: collapse; margin: 1.2rem 0; font-size: 14px; }
        .content-prose th, .content-prose td { border: 1px solid rgba(26,26,26,0.1); padding: 10px 14px; text-align: left; }
        .content-prose th { background: #fafafa; color: #1a1a1a; font-weight: 700; }
        .content-prose img { max-width: 100%; border-radius: 12px; }
        .content-prose code { background: rgba(26,26,26,0.06); padding: 2px 6px; border-radius: 6px; font-size: 0.9em; }
      `}</style>
      <div className="content-prose" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
