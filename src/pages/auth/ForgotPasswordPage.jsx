import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../api/auth';
import toast from '../../utils/toast';
import './Auth.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await authAPI.forgotPassword({ email }); setSent(true); toast.success('Reset link sent!'); }
    catch { toast.error('Failed to send reset email'); }
  };

  return (
    <div className="min-h-[calc(100dvh-64px)] flex items-center justify-center bg-surface px-4 py-8 sm:py-12 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
      <div className="bg-white border border-border rounded-2xl p-5 sm:p-8 w-full max-w-md shadow-card">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-primary mb-2">Forgot Password</h1>
          <p className="text-sm sm:text-base text-text-muted">{sent ? 'Check your email for the reset link' : 'Enter your email to reset password'}</p>
        </div>
        {!sent && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="forgot-email" className="text-xs font-bold text-text-muted uppercase tracking-wider">Email</label>
              <input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="w-full border-2 border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors" />
            </div>
            <button type="submit" className="w-full bg-primary text-white rounded-xl py-3.5 font-bold hover:bg-primary-dark transition-colors shadow-glow-orange mt-6">
              Send Reset Link
            </button>
          </form>
        )}
        <p className="text-center mt-6 text-sm text-text-muted"><Link to="/login" className="font-bold text-primary hover:text-primary-dark transition-colors">Back to login</Link></p>
      </div>
    </div>
  );
}
