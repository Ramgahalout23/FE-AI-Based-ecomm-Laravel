import { CheckCircle, XCircle, Mail, ArrowLeft } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEOHead from '../../components/seo/SEOHead';
import { useSettings } from '../../store/useSettings';
import { marketingAPI } from '../../api/marketing';
;

export default function UnsubscribePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');

  const [state, setState] = useState('confirming'); // 'confirming' | 'success' | 'error' | 'already'
  const [loading, setLoading] = useState(false);

  const handleUnsubscribe = useCallback(async () => {
    if (!email) {
      setState('error');
      return;
    }

    setLoading(true);
    try {
      const r = await marketingAPI.unsubscribe(email);
      const data = r.data?.data || r.data;
      if (data?.alreadyUnsubscribed) {
        setState('already');
      } else {
        setState('success');
      }
    } catch {
      setState('error');
    }
    setLoading(false);
  }, [email]);

  // If email is directly provided in URL, show confirmation screen; user clicks to confirm
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <SEOHead
        title={`Unsubscribe | ${storeName}`}
        description={`Unsubscribe from ${storeName} marketing emails. Manage your email preferences.`}
        noIndex={true}
      />
      <div className="w-full max-w-md">
        {!email && (
          /* No email provided */
          <div className="bg-white rounded-2xl border border-border shadow-soft p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
              <XCircle size={32} />
            </div>
            <h1 className="font-display text-2xl font-bold text-text-primary mb-2">
              {t('unsubscribe.title')}
            </h1>
            <p className="text-text-muted mb-6">
              {t('unsubscribe.no_email_desc')}
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-black text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors"
            >
              <ArrowLeft size={16} />
              {t('unsubscribe.back_home')}
            </Link>
          </div>
        )}

        {email && state === 'confirming' && (
          /* Confirmation screen */
          <div className="bg-white rounded-2xl border border-border shadow-soft p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <Mail size={32} />
            </div>
            <h1 className="font-display text-2xl font-bold text-text-primary mb-2">
              {t('unsubscribe.confirm_title')}
            </h1>
            <p className="text-text-muted mb-6">
              {t('unsubscribe.confirm_desc', { email })}
            </p>
            <div className="flex flex-col gap-3">
              <button
                className="w-full px-5 py-3 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                onClick={handleUnsubscribe}
                disabled={loading}
              >
                {loading ? t('unsubscribe.processing') : t('unsubscribe.yes_unsubscribe')}
              </button>
              <Link
                to="/"
                className="w-full px-5 py-3 border border-border rounded-xl text-sm font-semibold text-text-muted hover:border-brand-black/30 hover:text-text-primary transition-colors text-center"
              >
                {t('unsubscribe.no_keep')}
              </Link>
            </div>
          </div>
        )}

        {email && state === 'success' && (
          /* Success screen */
          <div className="bg-white rounded-2xl border border-border shadow-soft p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 text-green-500 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} />
            </div>
            <h1 className="font-display text-2xl font-bold text-text-primary mb-2">
              {t('unsubscribe.success_title')}
            </h1>
            <p className="text-text-muted mb-2">
              {t('unsubscribe.success_desc', { email })}
            </p>
            <p className="text-text-muted mb-6">
              {t('unsubscribe.success_note')}
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-black text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors"
            >
              <ArrowLeft size={16} />
              {t('unsubscribe.back_home')}
            </Link>
          </div>
        )}

        {email && state === 'already' && (
          /* Already unsubscribed */
          <div className="bg-white rounded-2xl border border-border shadow-soft p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center mx-auto mb-4">
              <Mail size={32} />
            </div>
            <h1 className="font-display text-2xl font-bold text-text-primary mb-2">
              {t('unsubscribe.already_title')}
            </h1>
            <p className="text-text-muted mb-2">
              {t('unsubscribe.already_desc', { email })}
            </p>
            <p className="text-text-muted mb-6">
              {t('unsubscribe.already_note')}
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-black text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors"
            >
              <ArrowLeft size={16} />
              {t('unsubscribe.back_home')}
            </Link>
          </div>
        )}

        {email && state === 'error' && (
          /* Error screen */
          <div className="bg-white rounded-2xl border border-border shadow-soft p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
              <XCircle size={32} />
            </div>
            <h1 className="font-display text-2xl font-bold text-text-primary mb-2">
              {t('unsubscribe.error_title')}
            </h1>
            <p className="text-text-muted mb-6">
              {t('unsubscribe.error_desc')}
            </p>
            <div className="flex flex-col gap-3">
              <button
                className="w-full px-5 py-3 bg-brand-black text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors"
                onClick={handleUnsubscribe}
              >
                {t('unsubscribe.try_again')}
              </button>
              <Link
                to="/"
                className="w-full px-5 py-3 border border-border rounded-xl text-sm font-semibold text-text-muted hover:border-brand-black/30 hover:text-text-primary transition-colors text-center"
              >
                {t('unsubscribe.back_home')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
