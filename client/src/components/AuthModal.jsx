import React, { useState } from 'react';
import { X, Lock, Mail, User, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleToggleMode = () => {
    setIsRegister((prev) => !prev);
    setName('');
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setError('Email address is required.');
      return;
    }

    if (!cleanPassword) {
      setError('Password is required.');
      return;
    }

    if (isRegister && !name.trim()) {
      setError('Full name is required to create an account.');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        await register(name.trim(), cleanEmail, cleanPassword);
      } else {
        await login(cleanEmail, cleanPassword);
      }
      setName('');
      setEmail('');
      setPassword('');
      setError('');
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleConnect = () => {
    window.location.href = api.getGoogleAuthDirectUrl();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/60 backdrop-blur-xs">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-['Outfit'] flex items-center gap-2">
              {isRegister ? (
                <>
                  <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Create Account</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Sign In</span>
                </>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isRegister
                ? 'Register a new sales user for SHAMIIT LLP'
                : 'Sign in with Google or your credentials'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Direct Google Connect Button */}
          <button
            type="button"
            onClick={handleGoogleConnect}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isRegister ? 'Sign Up with Google' : 'Continue with Google'}</span>
          </button>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              or use email
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  maxLength={80}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="e.g. Rahul Verma"
                  required
                  autoFocus
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border text-xs sm:text-sm font-medium transition-colors duration-150 outline-none shadow-xs bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-2 dark:focus:ring-blue-500/20"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                maxLength={100}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="name@company.com"
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border text-xs sm:text-sm font-medium transition-colors duration-150 outline-none shadow-xs bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-2 dark:focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                maxLength={100}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border text-xs sm:text-sm font-medium transition-colors duration-150 outline-none shadow-xs bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-2 dark:focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isRegister ? 'Creating Account...' : 'Signing In...'}</span>
              </>
            ) : (
              <>
                {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
              </>
            )}
          </button>

          {/* Toggle Register / Login */}
          <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleToggleMode}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition cursor-pointer"
            >
              {isRegister
                ? 'Already have an account? Sign in here'
                : "Don't have an account? Sign up here"}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  );
}
