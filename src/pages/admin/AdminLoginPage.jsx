import { RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

;
import { adminAPI } from '../../api/admin';
import useAuthStore from '../../store/authStore';
import useSessionStore from '../../store/sessionStore';
import PasswordStrengthMeter from '../../components/admin/PasswordStrengthMeter';
import { useAdminFormValidation } from '../../hooks/useAdminFormValidation';
import { emailAddress, loginPassword } from '../../hooks/validationRules';

export default function AdminLoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  // Live inline validation — the same security rules the backend enforces
  const validation = useAdminFormValidation({
    email: emailAddress(),
    password: loginPassword(),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validation.validateForm(form)) return;
    setLoading(true);

    try {
      const res = await adminAPI.adminLogin(form);

      // Check if login was successful
      if (!res.data?.success && res.status !== 200 && res.status !== 201) {
        throw new Error(res.data?.message || 'Login failed');
      }

      // Response format: { success, message, data: { user, tokens: { accessToken, refreshToken } } }
      // axios wraps response: res.data = { success, message, data: { user, tokens: {...} } }
      const token = res.data?.data?.tokens?.accessToken || res.data?.data?.token;
      const user = res.data?.data?.user;

      if (token) {
        // ! XSS NOTE — adminToken stored in localStorage. For production,
        // migrate to httpOnly cookies via Laravel Sanctum SPA auth.
        localStorage.setItem('adminToken', token);
        localStorage.setItem('authToken', token);
        // A fresh token was issued — record it for the session indicator and
        // remember its expiry so the countdown banner counts down from the
        // real deadline (login returns expires_at, not token_expires_at).
        useSessionStore.getState().recordTokenRefresh();
        useSessionStore.getState().setTokenExpiry(res.data?.data?.expires_at ?? null);
        if (user) {
          setUser({ ...user, role: 'ADMIN' });
        } else {
          setUser({ email: form.email, role: 'ADMIN' });
        }
        navigate('/admin');
      } else if (res.status === 200 || res.status === 201) {
        // Sentinel-only session (backend returned no token) — mirror it in both
        // keys so authStore.init and the request interceptors stay consistent.
        localStorage.setItem('adminToken', 'logged-in');
        localStorage.setItem('authToken', 'logged-in');
        useSessionStore.getState().recordTokenRefresh();
        // Sentinel session has no real token — clear any stale expiry so the
        // banner never shows a wrong countdown.
        useSessionStore.getState().setTokenExpiry(null);
        setUser({ email: form.email, role: 'ADMIN' });
        navigate('/admin');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">T</span>
            </div>
            <h1 className="text-2xl font-bold text-black">Admin Login</h1>
            <p className="text-gray-500 mt-1">Enter your credentials to access the dashboard</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className={`field-wrap ${validation.errors.email ? 'has-error' : ''} ${validation.validFields.email ? 'is-valid' : ''}`}>
              <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                id="admin-email"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); validation.handleChange('email', e.target.value); }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-0 outline-none transition-colors"
                placeholder="admin@example.com"
                autoComplete="email"
                aria-required="true"
              />
              <AnimatePresence>
                {validation.errors.email && (
                  <motion.div
                    className="form-error"
                    role="alert"
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {validation.errors.email}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className={`field-wrap ${validation.errors.password ? 'has-error' : ''} ${validation.validFields.password ? 'is-valid' : ''}`}>
              <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); validation.handleChange('password', e.target.value); }}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-0 outline-none transition-colors"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  aria-required="true"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <PasswordStrengthMeter value={form.password} />
              <AnimatePresence>
                {validation.errors.password && (
                  <motion.div
                    className="form-error"
                    role="alert"
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {validation.errors.password}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw size={20} /> : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-gray-500 hover:text-primary">
              ← Back to store
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}