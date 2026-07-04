import { Home, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

;
import { useTranslation } from 'react-i18next';
import SEOHead from '../../components/seo/SEOHead';
import { useSettings } from '../../store/useSettings';

export default function NotFoundPage() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  return (
    <div className="flex-1 flex items-center justify-center min-h-[70vh] bg-surface px-4 py-12">
      <SEOHead
        title={`Page Not Found | ${storeName}`}
        description={`The page you're looking for doesn't exist or has been moved. Browse our collection of premium products at ${storeName}.`}
        noIndex={true}
      />
      <div className="text-center max-w-lg">
        <div className="mb-8">
          <span className="text-[150px] leading-none font-display font-extrabold text-text-primary/10">
            404
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-display font-extrabold text-text-primary mb-4">
          {t('not_found.title')}
        </h1>

        <p className="text-text-secondary text-base md:text-lg mb-8 max-w-md mx-auto">
          {t('not_found.desc')}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 bg-primary text-white px-8 py-4 rounded-full text-base font-bold hover:bg-primary-dark transition-all shadow-glow-orange hover:shadow-xl hover:-translate-y-1"
          >
            <Home size={20} />
            {t('not_found.back_home')}
          </Link>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 bg-white border-2 border-border text-text-primary px-8 py-4 rounded-full text-base font-bold hover:border-primary hover:text-primary transition-all"
          >
            <ArrowLeft size={20} />
            {t('not_found.go_back')}
          </button>
        </div>
      </div>
    </div>
  );
}