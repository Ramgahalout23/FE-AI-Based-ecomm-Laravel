import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import { pagesAPI } from '../../api/pages';
import PageContentSkeleton from '../../components/ui/PageContentSkeleton';

export default function AboutPage() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        const res = await pagesAPI.getBySlug('about');
        const page = res.data?.data || null;
        if (page && page.content) {
          setContent(page);
        } else {
          setError('Page not found');
        }
      } catch (err) {
        console.error('Failed to load about page:', err);
        setError('Failed to load content');
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, []);

  if (loading) {
    return <PageContentSkeleton />;
  }

  if (error || !content) {
    return (
      <div className="flex-1 bg-surface flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Page Not Available</h2>
          <p className="text-gray-500 mb-4">{error || 'Content not found'}</p>
          <a href="/" className="text-primary hover:underline">Go to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content bg-white">
      {/* SEO meta tags */}
      <SEOHead
        title={`${content.title || 'About Us'} | Threvolt`}
        description={content.metaDescription || content.seoDescription || pageSeo?.metaDescription || `Learn about ${content.title || 'Threvolt'} — our story, mission, and commitment to premium streetwear fashion.`}
        keywords="about us, streetwear brand, premium fashion, our story"
      />

      {/* Hero */}
      <div className="bg-black text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: content.title || 'About Us' },
            ]}
            variant="dark"
            className="justify-center mb-6"
          />
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">{content.title || 'About Us'}</h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            {content.subtitle || content.heroSubtitle || ''}
          </p>
        </div>
      </div>

      {/* Content */}
      {content.content && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content.content }} />
        </div>
      )}

      {/* CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="font-display text-3xl font-bold text-black mb-4">Ready to Make a Statement?</h2>
        <p className="text-gray-600 mb-8">Explore our latest collection and find your perfect tee.</p>
        <a href="/products" className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors">
          Shop Now <ArrowRight size={20} />
        </a>
      </div>
    </div>
  );
}