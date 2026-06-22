import { useState, useEffect } from 'react';
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import { pagesAPI } from '../../api/pages';
import PageContentSkeleton from '../../components/ui/PageContentSkeleton';

export default function PrivacyPage() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        const res = await pagesAPI.getBySlug('privacy-policy');
        const page = res.data?.data || null;
        if (page && page.content) {
          setContent(page);
        } else {
          setError('Page not found');
        }
      } catch (err) {
        console.error('Failed to load privacy policy:', err);
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
      <SEOHead
        title={content?.title ? `${content.title} | Threvolt` : 'Privacy Policy | Threvolt'}
        description={content?.metaDescription || 'Learn how Threvolt collects, uses, and protects your personal information. Our privacy policy outlines our commitment to your data security.'}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: content.title || 'Privacy Policy' },
          ]}
          variant="light"
          className="mb-6"
        />
        <h1 className="font-display text-4xl font-bold text-black mb-8">{content.title || 'Privacy Policy'}</h1>
        {content.lastUpdated && (
          <p className="text-gray-500 mb-8">Last updated: {content.lastUpdated}</p>
        )}
        {content.content ? (
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content.content }} />
        ) : (
          <p className="text-gray-600">No content available</p>
        )}
      </div>
    </div>
  );
}