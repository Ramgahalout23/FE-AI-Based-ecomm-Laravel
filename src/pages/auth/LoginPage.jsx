import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import { authAPI } from '../../api/auth';
import { useSettings } from '../../store/useSettings';
import toast from '../../utils/toast';
import { trackLogin } from '../../services/tracker';
import './Auth.css';

export default function LoginPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const { getSetting } = useSettings();
  const navigate = useNavigate();

  const storeName = getSetting('storeName', 'THREVOLT');
  const adminEnabledGoogle = getSetting('googleLoginEnabled', 'true') !== 'false';
  const adminEnabledFacebook = getSetting('facebookLoginEnabled', 'true') !== 'false';

  const [oauthStatus, setOauthStatus] = useState(null);

  useEffect(() => {
    authAPI.oauthStatus()
      .then((res) => setOauthStatus(res?.data?.data || {}))
      .catch(() => setOauthStatus({}));
  }, []);

  const providers = oauthStatus?.providers || {};
  const googleConfigured = providers.google?.enabled === true;
  const facebookConfigured = providers.facebook?.enabled === true;
  const googleEnabled = adminEnabledGoogle && googleConfigured;
  const facebookEnabled = adminEnabledFacebook && facebookConfigured;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form);
      trackLogin('email');
      toast.success(t('auth.welcome_back'));
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || t('auth.sign_in');
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const handleGoogleLogin = () => {
    trackLogin('google');
    window.location.href = authAPI.googleLogin();
  };

  const handleFacebookLogin = () => {
    trackLogin('facebook');
    window.location.href = authAPI.facebookLogin();
  };

  return (
    <div className="min-h-[calc(100dvh-64px)] flex items-center justify-center bg-surface px-4 py-8 sm:py-12 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
      <div className="bg-white border border-border rounded-2xl p-5 sm:p-8 w-full max-w-md shadow-card">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-text-primary mb-2">{t('auth.welcome_back')}</h1>
          <p className="text-text-muted">{t('auth.sign_in_account', { store: storeName })}</p>
        </div>

        {/* Social Login Buttons */}
        {(googleEnabled || facebookEnabled) && (
          <>
            <div className="space-y-3 mb-6">
              {googleEnabled && (
                <button
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 border-2 border-border rounded-xl px-4 py-3 font-semibold text-sm hover:bg-gray-50 transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {t('auth.continue_google')}
                </button>
              )}
              {facebookEnabled && (
                <button
                  onClick={handleFacebookLogin}
                  className="w-full flex items-center justify-center gap-3 border-2 border-border rounded-xl px-4 py-3 font-semibold text-sm hover:bg-gray-50 transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  {t('auth.continue_facebook')}
                </button>
              )}
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-text-muted font-medium">{t('auth.or_sign_in_email')}</span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="login-email" className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('auth.email')}</label>
            <input id="login-email" name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" className="w-full border-2 border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('auth.password')}</label>
              <Link to="/forgot-password" className="text-xs font-bold text-primary hover:text-primary-dark transition-colors">{t('auth.forgot_password')}</Link>
            </div>
            <input id="login-password" name="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="current-password" className="w-full border-2 border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors" />
          </div>
          <button type="submit" className="w-full bg-primary text-white rounded-xl py-3.5 font-bold hover:bg-primary-dark transition-colors shadow-glow-orange mt-6" disabled={loading}>
            {loading ? t('auth.signing_in') : t('auth.sign_in')}
          </button>
        </form>
        <p className="text-center mt-6 text-sm text-text-muted">{t('auth.no_account')} <Link to="/register" className="font-bold text-primary hover:text-primary-dark transition-colors">{t('auth.sign_up')}</Link></p>
      </div>
    </div>
  );
}
