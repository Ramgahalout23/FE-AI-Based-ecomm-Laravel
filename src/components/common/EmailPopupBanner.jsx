import { useState, useEffect } from 'react';
import { X, Mail, CheckCircle } from 'lucide-react';
import client from '../../api/client';
import { useSettings } from '../../store/useSettings';

export default function EmailPopupBanner() {
  const { settings } = useSettings();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const enabled = settings.emailPopupEnabled !== 'false';
  const heading = settings.emailPopupHeading || 'Get 10% Off Your First Order!';
  const offerText = settings.emailPopupOfferText || 'Enter your email to receive exclusive offers, early access to new drops, and an instant 10% discount on your first purchase!';
  const btnText = settings.emailPopupBtnText || 'Claim 10% Off';

  useEffect(() => {
    if (!enabled) return;
    const dismissed = localStorage.getItem('emailPopupDismissed');
    if (dismissed) return;
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [enabled]);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem('emailPopupDismissed', 'true');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await client.post('/marketing/subscribe', { email });
      setSubmitted(true);
      localStorage.setItem('emailPopupDismissed', 'true');
      setTimeout(() => setVisible(false), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || !enabled) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      style={{ animation: 'emailFadeIn 0.3s ease-out' }}>
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ animation: 'emailScaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-colors"
          aria-label="Close"
        >
          <X size={16} className="text-gray-600" />
        </button>

        {/* Header */}
        <div className="bg-[#1A1A1A] px-6 pt-10 pb-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'radial-gradient(circle at 30% 30%, #C9A96E 0%, transparent 60%), radial-gradient(circle at 70% 80%, #C9A96E 0%, transparent 50%)'
          }} />
          <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#C9A96E]/40 to-transparent" />
          
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center border border-white/10">
              <Mail size={28} className="text-[#C9A96E]" />
            </div>
            <h2 className="text-2xl font-bold text-white font-display leading-tight mb-2 tracking-tight">
              {heading}
            </h2>
            <p className="text-white/60 text-sm leading-relaxed max-w-xs mx-auto font-light">
              {offerText}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-6 bg-[#FAF7F2]">
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 mx-auto mb-3 bg-[#EAFAF1] rounded-full flex items-center justify-center">
                <CheckCircle size={28} className="text-[#27AE60]" />
              </div>
              <p className="text-[#27AE60] font-semibold text-sm">You're in! Check your email for exclusive offers</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#E8E2D9] focus:border-[#1A1A1A] focus:outline-none text-base transition-colors bg-white"
                  autoComplete="email"
                  disabled={submitting}
                />
                {error && <p className="text-[#C0392B] text-xs mt-1.5">{error}</p>}
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#1A1A1A] text-white font-semibold text-sm hover:bg-[#2C2C2C] transition-all disabled:opacity-60 shadow-lg shadow-black/10 active:scale-[0.98]"
              >
                {submitting ? 'Submitting...' : btnText}
              </button>
              <p className="text-center text-xs text-[#9B958E] mt-3">
                No spam. Unsubscribe anytime. Your data is safe with us.
              </p>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes emailFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes emailScaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
