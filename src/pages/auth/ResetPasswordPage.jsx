import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../../api/auth';
import PasswordInput from '../../components/common/PasswordInput';
import toast from '../../utils/toast';
import './Auth.css';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await authAPI.resetPassword({ token: searchParams.get('token'), newPassword: password }); toast.success(t('auth.reset_password')); navigate('/login'); }
    catch { toast.error(t('auth.forgot_password')); }
  };

  return (
    <>
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-surface px-4 py-12">
      <div className="bg-white border border-border rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-card">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-primary mb-2">{t('auth.reset_password')}</h1>
          <p className="text-text-muted">{t('auth.enter_new_password')}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">            <div className="flex flex-col gap-1">
              <label htmlFor="reset-password" className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('auth.new_password')}</label>
              <PasswordInput id="reset-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" className="w-full border-2 border-border rounded-xl px-4 py-3 pr-12 outline-none focus:border-primary transition-colors" showLabel={t('auth.show_password')} hideLabel={t('auth.hide_password')} buttonClassName="text-text-muted hover:text-primary" />
            </div>
          <button type="submit" className="w-full bg-primary text-white rounded-xl py-3.5 font-bold hover:bg-primary-dark transition-colors shadow-glow-orange mt-6">
            {t('auth.reset_password')}
          </button>
        </form>
      </div>
    </div>
    </>
  );
}
