import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import SEOHead from '../../components/seo/SEOHead';
import { pagesAPI } from '../../api/pages';
import { seoAPI } from '../../api/seo';
import { ArrowLeft } from 'lucide-react';
import PageContentSkeleton from '../../components/ui/PageContentSkeleton';

export default function CustomPageView() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageSeo, setPageSeo] = useState(null);

  useEffect(() => {
    if (!slug) return;
    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await pagesAPI.getBySlug(slug);
        const pageData = res?.data?.data || res?.data || null;
        if (!pageData) {
          setError('Page not found');
        } else {
          setPage(pageData);

          // Fetch per-page SEO metadata
          try {
            const seoRes = await seoAPI.getEntitySEO('page', pageData.id);
            const seo = seoRes?.data?.data;
            if (seo?.metaTitle || seo?.metaDescription) {
              setPageSeo(seo);
            }
          } catch { /* no custom SEO — use defaults */ }
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setError('Page not found');
        } else {
          setError('Failed to load page. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [slug]);

  if (loading) {
    return <PageContentSkeleton withBreadcrumb={false} />;
  }

  if (error || !page) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
        <div className="text-6xl">📄</div>
        <h1 className="text-2xl font-bold text-text-primary">Page Not Found</h1>
        <p className="text-text-secondary">{error || 'This page does not exist or has been unpublished.'}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1">
      {/* SEO meta tags for custom page */}
      <SEOHead
        title={pageSeo?.metaTitle || `${page.title} | Threvolt`}
        description={pageSeo?.metaDescription || page.metaDescription || ''}
        keywords={pageSeo?.metaKeywords || ''}
        image={pageSeo?.ogImage || ''}
        canonicalUrl={pageSeo?.canonicalUrl || `${window.location.origin}/pages/${page.slug}`}
      />

      {/* Page Header */}
      <div className="bg-gradient-to-b from-charcoal to-charcoal/95 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={16} />
            Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display tracking-tight">
            {page.title}
          </h1>
          {page.updatedAt && (
            <p className="mt-3 text-sm text-white/50">
              Last updated: {new Date(page.updatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div
          className="prose prose-lg max-w-none
            prose-headings:text-text-primary prose-headings:font-bold
            prose-p:text-text-secondary prose-p:leading-relaxed
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-xl prose-img:shadow-soft
            prose-strong:text-text-primary
            prose-ul:list-disc prose-ol:list-decimal
            prose-blockquote:border-l-primary prose-blockquote:text-text-secondary
            prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-10
            prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-8"
          dangerouslySetInnerHTML={{ __html: page.content || '' }}
        />
      </div>
    </div>
  );
}
