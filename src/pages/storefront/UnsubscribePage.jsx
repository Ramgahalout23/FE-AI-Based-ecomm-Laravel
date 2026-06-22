import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import SEOHead from '../../components/seo/SEOHead';
import { marketingAPI } from '../../api/marketing';
import { CheckCircle, XCircle, Mail, ArrowLeft } from 'lucide-react';

export default function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');

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
        title="Unsubscribe | Threvolt"
        description="Unsubscribe from Threvolt marketing emails. Manage your email preferences."
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
              Unsubscribe
            </h1>
            <p className="text-text-muted mb-6">
              No email address provided. Please use the unsubscribe link from your email.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-black text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Home
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
              Unsubscribe from Emails?
            </h1>
            <p className="text-text-muted mb-6">
              You're about to unsubscribe <strong className="text-text-primary">{email}</strong> from all marketing emails.
              You will no longer receive promotional offers, newsletters, or campaign updates.
            </p>
            <div className="flex flex-col gap-3">
              <button
                className="w-full px-5 py-3 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                onClick={handleUnsubscribe}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Yes, Unsubscribe Me'}
              </button>
              <Link
                to="/"
                className="w-full px-5 py-3 border border-border rounded-xl text-sm font-semibold text-text-muted hover:border-brand-black/30 hover:text-text-primary transition-colors text-center"
              >
                No, Keep Me Subscribed
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
              Successfully Unsubscribed
            </h1>
            <p className="text-text-muted mb-2">
              <strong className="text-text-primary">{email}</strong> has been unsubscribed from our marketing emails.
            </p>
            <p className="text-text-muted mb-6">
              You won't receive any more promotional emails from us. You can always resubscribe anytime.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-black text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Home
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
              Already Unsubscribed
            </h1>
            <p className="text-text-muted mb-2">
              <strong className="text-text-primary">{email}</strong> is already unsubscribed from our emails.
            </p>
            <p className="text-text-muted mb-6">
              No further action is needed. If you'd like to resubscribe, you can sign up again on our website.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-black text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Home
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
              Something Went Wrong
            </h1>
            <p className="text-text-muted mb-6">
              We couldn't process your unsubscribe request. Please try again or contact support.
            </p>
            <div className="flex flex-col gap-3">
              <button
                className="w-full px-5 py-3 bg-brand-black text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors"
                onClick={handleUnsubscribe}
              >
                Try Again
              </button>
              <Link
                to="/"
                className="w-full px-5 py-3 border border-border rounded-xl text-sm font-semibold text-text-muted hover:border-brand-black/30 hover:text-text-primary transition-colors text-center"
              >
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
