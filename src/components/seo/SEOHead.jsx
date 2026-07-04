import { Helmet } from 'react-helmet-async';

/**
 * SEOHead — Renders meta tags, title, OG tags, Twitter cards, canonical URL,
 * JSON-LD structured data, analytics tracking codes, and site verification
 * tags in the document <head>.
 */
export default function SEOHead({
  title,
  description,
  keywords,
  image,
  ogTitle,
  ogDescription,
  ogImage,
  twitterTitle,
  twitterDescription,
  twitterImage,
  canonicalUrl,
  noIndex = false,
  jsonLd = [],
  gaId = '',
  gtmId = '',
  fbPixelId = '',
  googleSiteVerification = '',
  contentLanguage = '',
  robotsMeta = '',
  noFollow = false,
}) {
  const metaTitle = title || '';
  const metaDescription = description || '';
  const metaKeywords = keywords || '';
  const metaImage = ogImage || image || '';
  const metaOgTitle = ogTitle || metaTitle;
  const metaOgDescription = ogDescription || metaDescription;
  const metaTwitterTitle = twitterTitle || metaOgTitle;
  const metaTwitterDescription = twitterDescription || metaOgDescription;
  const metaTwitterImage = twitterImage || metaImage;
  const metaRobots = noIndex ? 'noindex, nofollow' : robotsMeta || (noFollow ? 'index, nofollow' : '');

  return (
    <Helmet>
      <title>{metaTitle}</title>
      {metaTitle && <meta property="og:title" content={metaTitle} />}
      {metaTitle && <meta name="twitter:title" content={metaTwitterTitle} />}
      {metaDescription && <meta name="description" content={metaDescription} />}
      {metaDescription && <meta property="og:description" content={metaOgDescription} />}
      {metaDescription && <meta name="twitter:description" content={metaTwitterDescription} />}
      {metaKeywords && <meta name="keywords" content={metaKeywords} />}
      <meta property="og:type" content="website" />
      {metaImage && <meta property="og:image" content={metaImage} />}
      {metaImage && <meta name="twitter:image" content={metaTwitterImage} />}
      <meta name="twitter:card" content="summary_large_image" />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {metaRobots && <meta name="robots" content={metaRobots} />}
      {contentLanguage && <meta httpEquiv="content-language" content={contentLanguage} />}
      {Array.isArray(jsonLd) && jsonLd.map((schema, i) => (
        <script key={`jsonld-${i}`} type="application/ld+json">{JSON.stringify(schema)}</script>
      ))}
      {gaId && <><script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} /><script>{`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}');`}</script></>}
      {gtmId && <script>{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}</script>}
      {fbPixelId && <script>{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fbPixelId}');fbq('track','PageView');`}</script>}
      {googleSiteVerification && <meta name="google-site-verification" content={googleSiteVerification} />}
    </Helmet>
  );
}
