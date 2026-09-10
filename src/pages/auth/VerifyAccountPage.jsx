import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Loader2, Mail, Smartphone, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { authAPI } from '../../api/auth';
import useAuthStore from '../../store/authStore';
import toast from '../../utils/toast';
import './Auth.css';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function VerifyAccountPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const completeRegistration = useAuthStore((s) => s.completeRegistration);

  const email = searchParams.get('email') || '';
  const linkToken = searchParams.get('token'); // present when arriving from email link

  const [status, setStatus] = useState(null); // { channel, maskedDestination }
  const [statusLoading, setStatusLoading] = useState(!email);
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [verified, setVerified] = useState(false);
  const inputsRef = useRef([]);

  // ── Determine channel + masked destination ──────────────────────────────
  useEffect(() => {
    if (!email) { setStatusLoading(false); return; }
    let cancelled = false;
    setStatusLoading(true);
    authAPI.registrationVerificationStatus({ email })
      .then((res) => {
        if (cancelled) return;
        const data = res?.data?.data || {};
        // Channel from server; fall back to link-token presence (email implies email channel)
        setStatus(data?.channel ? data : { channel: 'email', maskedDestination: email });
      })
      .catch(() => { if (!cancelled) setStatus({ channel: 'email', maskedDestination: email }); })
      .finally(() => { if (!cancelled) setStatusLoading(false); });
    return () => { cancelled = true; };
  }, [email]);

  // ── Email link: /verify-account?email=…&token=123456 → auto-verify ──────
  useEffect(() => {
    if (!linkToken || !email || verified || verifying) return;
    if (!/^\d{6}$/.test(linkToken)) {
      toast.error(t('auth.invalid_verification_code'));
      return;
    }
    handleVerify(linkToken.split(''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const startCooldown = () => setCooldown(RESEND_COOLDOWN);

  const fillCode = (codeStr) => {
    const next = codeStr.split('').slice(0, CODE_LENGTH);
    while (next.length < CODE_LENGTH) next.push('');
    setCode(next);
  };

  const handleVerify = async (codeArr) => {
    if (!email) {
      toast.error(t('auth.verify_missing_email'));
      return;
    }
    const otp = (codeArr || code).join('');
    if (otp.length !== CODE_LENGTH || !/^\d{6}$/.test(otp)) {
      toast.error(t('auth.invalid_verification_code'));
      return;
    }
    setVerifying(true);
    try {
      const res = await authAPI.verifyRegistration({ email, otp });
      const payload = res?.data?.data || {};
      // This is the single login point: the backend issues tokens only now,
      // after the OTP/code has been confirmed.
      completeRegistration(payload);
      setVerified(true);
      toast.success(t('auth.account_verified'));
      setTimeout(() => navigate('/', { replace: true }), 900);
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || t('auth.invalid_verification_code');
      toast.error(msg);
      fillCode('');
      inputsRef.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email || resending || cooldown > 0) return;
    setResending(true);
    try {
      const res = await authAPI.resendRegistrationVerification({ email });
      const data = res?.data?.data || {};
      if (data.channel) setStatus(data);
      toast.success(res?.data?.message || t('auth.verification_resent'));
      startCooldown();
      fillCode('');
      inputsRef.current[0]?.focus();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || t('auth.verification_resent');
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  const handleChange = (idx) => (e) => {
    const digit = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    if (digit && idx < CODE_LENGTH - 1) inputsRef.current[idx + 1]?.focus();
    // Auto-submit when the last cell is filled
    if (digit && idx === CODE_LENGTH - 1 && next.every(Boolean) && !verifying) {
      handleVerify(next);
    }
  };

  const handleKeyDown = (idx) => (e) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    fillCode(pasted);
    inputsRef.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
    if (pasted.length === CODE_LENGTH && !verifying) handleVerify(pasted.split(''));
  };

  const masked = status?.maskedDestination || email;
  const isSms = status?.channel === 'sms';

  if (verified) {
    return (
      <>
        <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
        <div className="min-h-[calc(100dvh-64px)] flex items-center justify-center bg-surface px-4 py-8 sm:py-12 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white border border-border rounded-2xl p-8 w-full max-w-md shadow-card text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h1 className="font-display text-2xl font-bold text-text-primary mb-2">{t('auth.account_verified')}</h1>
            <p className="text-sm text-text-muted mb-8">{t('auth.account_verified_sub')}</p>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <div className="min-h-[calc(100dvh-64px)] flex items-center justify-center bg-surface px-4 py-8 sm:py-12 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white border border-border rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-card"
        >
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
              {statusLoading ? (
                <Loader2 size={24} className="text-primary animate-spin" />
              ) : isSms ? (
                <Smartphone size={24} className="text-primary" />
              ) : (
                <Mail size={24} className="text-primary" />
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-2">
              {t('auth.verify_your_account')}
            </h1>
            <p className="text-sm sm:text-base text-text-muted">
              {statusLoading
                ? t('auth.checking')
                : isSms
                  ? t('auth.otp_sent_sms', { destination: masked })
                  : t('auth.otp_sent_email', { destination: masked })}
            </p>
          </div>

          {!email && (
            <div className="mb-6">
              <label htmlFor="verify-email-input" className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1 block">
                {t('auth.email')}
              </label>
              <input
                id="verify-email-input"
                type="email"
                defaultValue={email}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== email) setSearchParams({ email: v }, { replace: true });
                }}
                placeholder="you@example.com"
                className="w-full border-2 border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
              />
            </div>
          )}

          <div className="flex justify-center gap-2 sm:gap-3 mb-6" onPaste={handlePaste}>
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputsRef.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                aria-label={`${t('auth.otp_digit')} ${idx + 1}`}
                value={digit}
                onChange={handleChange(idx)}
                onKeyDown={handleKeyDown(idx)}
                disabled={verifying || verified}
                className="w-11 h-13 sm:w-13 sm:h-14 text-center text-xl font-bold border-2 border-border rounded-xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all disabled:opacity-60"
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleVerify()}
            disabled={verifying || code.some((d) => !d)}
            className="w-full bg-primary text-white rounded-xl py-3.5 font-bold hover:bg-primary-dark transition-colors shadow-glow-orange disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {verifying ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                {t('auth.verifying')}
              </>
            ) : (
              <>
                <ShieldCheck size={17} />
                {t('auth.verify_and_activate')}
              </>
            )}
          </button>

          <div className="mt-5 text-center text-sm text-text-muted">
            {t('auth.didnt_receive_code')}{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="font-bold text-primary hover:text-primary-dark transition-colors disabled:text-text-muted disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {resending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
              {cooldown > 0 ? t('auth.resend_in', { seconds: cooldown }) : t('auth.resend_code')}
            </button>
          </div>

          <p className="text-center mt-6 text-sm text-text-muted">
            {t('auth.wrong_account')}{' '}
            <Link to="/login" className="font-bold text-primary hover:text-primary-dark transition-colors">
              {t('auth.back_to_login')}
            </Link>
          </p>
        </motion.div>
      </div>
    </>
  );
}
