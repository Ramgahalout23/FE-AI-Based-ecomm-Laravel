import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, Truck, RefreshCw, Sparkles, Gift } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { authAPI } from '../../api/auth';
import { useSettings } from '../../store/useSettings';
import { useLogo } from '../../hooks/useLogo';
import { getImageUrl } from '../../utils/formatters';
import toast from '../../utils/toast';
import { trackSignUp } from '../../services/tracker';
import PasswordStrengthMeter from '../../components/admin/PasswordStrengthMeter';
import { useAdminFormValidation, required } from '../../hooks/useAdminFormValidation';
import { emailAddress, loginPassword } from '../../hooks/validationRules';
import './Auth.css';

export default function RegisterPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null); // 'google' | 'facebook' | null
  const { register } = useAuthStore();
  const { getSetting } = useSettings();
  const { logoUrl: logo, storeName } = useLogo();
  const navigate = useNavigate();

  // Live inline validation — same rule set the backend enforces
  const validation = useAdminFormValidation({
    firstName: required('First name is required'),
    lastName: required('Last name is required'),
    email: emailAddress(),
    password: loginPassword(),
  });
  const adminEnabledGoogle = getSetting('googleLoginEnabled', 'true') !== 'false';
  const adminEnabledFacebook = getSetting('facebookLoginEnabled', 'true') !== 'false';
  const hasGoogleCreds = Boolean(getSetting('googleClientId', '')) && Boolean(getSetting('googleClientSecret', ''));
  const hasFacebookCreds = Boolean(getSetting('facebookAppId', '')) && Boolean(getSetting('facebookAppSecret', ''));

  const [oauthStatus, setOauthStatus] = useState(null);

  useEffect(() => {
    authAPI.oauthStatus()
      .then((res) => setOauthStatus(res?.data?.data || {}))
      .catch(() => setOauthStatus({}));
  }, []);

  const providers = oauthStatus?.providers || {};
  const googleConfigured = providers.google?.enabled === true || hasGoogleCreds;
  const facebookConfigured = providers.facebook?.enabled === true || hasFacebookCreds;
  const googleEnabled = adminEnabledGoogle && googleConfigured;
  const facebookEnabled = adminEnabledFacebook && facebookConfigured;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validation.validateForm(form)) return;
    setLoading(true);
    try {
      await register(form);
      trackSignUp('email');
      toast.success(t('auth.create_account'));
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || t('auth.create_account');
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const handleChange = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    validation.handleChange(key, value);
  };

  const handleGoogleLogin = async () => {
    if (oauthLoading) return;
    setOauthLoading('google');
    try {
      trackSignUp('google');
      const res = await authAPI.googleLoginRedirect();
      const redirectUrl = res?.data?.data?.redirect_url || res?.data?.redirect_url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        window.location.href = authAPI.googleLogin();
      }
    } catch (err) {
      console.error('Google login failed', err);
      toast.error('Google login is currently unavailable');
    } finally {
      setOauthLoading(null);
    }
  };

  const handleFacebookLogin = async () => {
    if (oauthLoading) return;
    setOauthLoading('facebook');
    try {
      trackSignUp('facebook');
      const res = await authAPI.facebookLoginRedirect();
      const redirectUrl = res?.data?.data?.redirect_url || res?.data?.redirect_url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        window.location.href = authAPI.facebookLogin();
      }
    } catch (err) {
      console.error('Facebook login failed', err);
      toast.error('Facebook login is currently unavailable');
    } finally {
      setOauthLoading(null);
    }
  };

  const perks = [
    { icon: Gift, text: 'Exclusive member-only drops' },
    { icon: Truck, text: 'Free shipping on orders above ₹499' },
    { icon: RefreshCw, text: 'Easy 7-day returns & exchanges' },
  ];

  const fieldState = (key) =>
    `${validation.errors[key] ? 'has-error' : ''} ${validation.validFields[key] ? 'is-valid' : ''}`.trim();

  return (
    <div className="auth-page auth-page--split">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="auth-split-card auth-split-card--lg"
      >
        {/* ── Brand Panel ── */}
        <div className="auth-brand-panel">
          <div className="auth-brand-orb auth-brand-orb--one" />
          <div className="auth-brand-orb auth-brand-orb--two" />

          <div className="relative z-10 flex flex-col h-full auth-brand-layout">
            <div className="auth-brand-header">
              {logo ? (
                <img src={logo} alt={storeName} className="h-16 w-auto object-contain" />
              ) : (
                <>
                  <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center shadow-lg">
                    <span className="text-black font-display font-extrabold text-2xl tracking-tight">T</span>
                  </div>
                  <span className="font-display font-bold text-white text-xl tracking-[0.22em]">{storeName}</span>
                </>
              )}
            </div>

            <div className="mt-auto auth-brand-copy">
              <p className="auth-brand-eyebrow">
                <Sparkles size={12} />
                Join the Community
              </p>
              <h2 className="auth-brand-title">Be first.<br />Always.</h2>
              <p className="auth-brand-sub">Create your account for early access to drops, members-only pricing, and faster checkout.</p>

              <div className="auth-perks">
                {perks.map(({ icon: Icon, text }) => (
                  <div key={text} className="auth-perk">
                    <span className="auth-perk-icon"><Icon size={13} /></span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Form Panel ── */}
        <div className="auth-form-panel">
          <div className="auth-form-inner">
            <div className="mb-8">
              <h1 className="font-display text-3xl sm:text-[2rem] font-bold text-text-primary tracking-tight mb-2">{t('auth.create_account')}</h1>
              <p className="text-text-muted">{t('auth.join_store', { store: storeName })}</p>
            </div>

            {/* Social Login Buttons */}
            {(googleEnabled || facebookEnabled) && (
              <>
                <div className="space-y-3 mb-6">
                  {googleEnabled && (
                    <button
                      onClick={handleGoogleLogin}
                      disabled={!!oauthLoading}
                      className="w-full flex items-center justify-center gap-3 border border-border rounded-xl px-4 py-3 font-semibold text-sm bg-white hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      {oauthLoading === 'google' ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          {t('auth.redirecting_google')}
                        </>
                      ) : (
                        t('auth.sign_up_google')
                      )}
                    </button>
                  )}
                  {facebookEnabled && (
                    <button
                      onClick={handleFacebookLogin}
                      disabled={!!oauthLoading}
                      className="w-full flex items-center justify-center gap-3 border border-border rounded-xl px-4 py-3 font-semibold text-sm bg-white hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      {oauthLoading === 'facebook' ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          {t('auth.redirecting_facebook')}
                        </>
                      ) : (
                        t('auth.sign_up_facebook')
                      )}
                    </button>
                  )}
                </div>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-text-muted font-medium">{t('auth.or_register_email')}</span>
                  </div>
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`field-wrap flex flex-col gap-1 ${fieldState('firstName')}`}>
                  <label htmlFor="reg-firstname" className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('auth.first_name')} *</label>
                  <div className="auth-input-wrap">
                    <User size={15} className="auth-input-icon" />
                    <input id="reg-firstname" value={form.firstName} onChange={handleChange('firstName')} required autoComplete="given-name" placeholder="First" className="auth-input" />
                  </div>
                  <AnimatePresence>
                    {validation.errors.firstName && (
                      <motion.span
                        className="form-error"
                        role="alert"
                        initial={{ opacity: 0, y: -6, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -6, height: 0 }}
                        transition={{ duration: 0.22 }}
                      >
                        {validation.errors.firstName}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <div className={`field-wrap flex flex-col gap-1 ${fieldState('lastName')}`}>
                  <label htmlFor="reg-lastname" className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('auth.last_name')} *</label>
                  <div className="auth-input-wrap">
                    <User size={15} className="auth-input-icon" />
                    <input id="reg-lastname" value={form.lastName} onChange={handleChange('lastName')} required autoComplete="family-name" placeholder="Last" className="auth-input" />
                  </div>
                  <AnimatePresence>
                    {validation.errors.lastName && (
                      <motion.span
                        className="form-error"
                        role="alert"
                        initial={{ opacity: 0, y: -6, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -6, height: 0 }}
                        transition={{ duration: 0.22 }}
                      >
                        {validation.errors.lastName}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className={`field-wrap flex flex-col gap-1 ${fieldState('email')}`}>
                <label htmlFor="reg-email" className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('auth.email')} *</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-input-icon" />
                  <input id="reg-email" type="email" value={form.email} onChange={handleChange('email')} required autoComplete="email" placeholder="you@example.com" className="auth-input" />
                </div>
                <AnimatePresence>
                  {validation.errors.email && (
                    <motion.span
                      className="form-error"
                      role="alert"
                      initial={{ opacity: 0, y: -6, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -6, height: 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      {validation.errors.email}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="reg-phone" className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('auth.phone')}</label>
                <div className="auth-input-wrap">
                  <Phone size={16} className="auth-input-icon" />
                  <input id="reg-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" placeholder="+91 98765 43210" className="auth-input" />
                </div>
              </div>
              <div className={`field-wrap flex flex-col gap-1 ${fieldState('password')}`}>
                <label htmlFor="reg-password" className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('auth.password')} *</label>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input id="reg-password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange('password')} required minLength={6} autoComplete="new-password" placeholder="Min. 8 characters" className="auth-input auth-input--pr" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
                    aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <PasswordStrengthMeter value={form.password} />
                <AnimatePresence>
                  {validation.errors.password && (
                    <motion.span
                      className="form-error"
                      role="alert"
                      initial={{ opacity: 0, y: -6, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -6, height: 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      {validation.errors.password}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <button type="submit" className="auth-submit group" disabled={loading || !!oauthLoading}>
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {t('auth.creating')}
                  </>
                ) : (
                  <>
                    {t('auth.create_account')}
                    <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
            <p className="text-center mt-6 text-sm text-text-muted">
              {t('auth.already_account')}{' '}
              <Link to="/login" className="font-bold text-primary hover:text-primary-dark transition-colors underline underline-offset-4 decoration-1">{t('auth.sign_in')}</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
