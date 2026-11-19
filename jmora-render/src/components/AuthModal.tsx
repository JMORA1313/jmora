import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getT } from '../i18n/translations';
import type { UserAuth, UserState } from '../types/jmora';

export function AuthModal() {
  const { isAuthOpen } = useApp();
  if (!isAuthOpen) return null;
  return <AuthModalContent />;
}

function AuthModalContent() {
  const { locale, setAuthOpen, setUserAuth, navigate } = useApp();
  const t = getT(locale);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Human verification + Server visual challenge (never auto-filled)
  const [humanChecked, setHumanChecked] = useState(false);
  const [challengeId, setChallengeId] = useState('');
  const [challengeSvg, setChallengeSvg] = useState('');
  const [challengeCode, setChallengeCode] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchChallenge = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/challenge');
      if (res.ok) {
        const data = (await res.json()) as { challengeId: string; svgDataUrl: string };
        setChallengeId(data.challengeId);
        setChallengeSvg(data.svgDataUrl);
        setChallengeCode('');
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!humanChecked) {
      setError(
        locale === 'fa'
          ? 'لطفاً تیک «من ربات نیستم» را بزنید.'
          : 'Please check "I am not a robot".'
      );
      return;
    }
    if (!challengeCode.trim()) {
      setError(
        locale === 'fa'
          ? 'لطفاً کد امنیتی تصویر را به درستی وارد کنید.'
          : 'Please enter the security code accurately.'
      );
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          identifier,
          name: name.trim(),
          password,
          humanChecked,
          challengeId,
          challengeCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        await fetchChallenge();
        throw new Error(data.error || 'Authentication failed');
      }
      const auth = data.user as UserAuth;
      const syncedState = (data.state || null) as UserState | null;
      setUserAuth(auth, syncedState);
      setAuthOpen(false);
      navigate(auth.isAdmin ? 'admin' : 'dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={t.auth.title}
    >
      <div className="my-auto w-full max-w-md rounded-2xl border border-black/10 dark:border-white/15 bg-white dark:bg-[#16161A] p-6 text-[#111111] dark:text-white shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t.auth.title}</h2>
            <p className="mt-1 text-xs text-[#71717A]">{t.auth.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setAuthOpen(false)}
            aria-label="Close sign in"
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Switch: Create Account vs Sign In */}
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-[#F2F0EC] dark:bg-[#1F1F25] p-1">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`rounded-md py-2 text-xs font-medium transition-colors cursor-pointer ${
              mode === 'register'
                ? 'bg-white dark:bg-[#16161A] text-[#111111] dark:text-white shadow-sm'
                : 'text-[#71717A]'
            }`}
          >
            {t.auth.registerTab}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`rounded-md py-2 text-xs font-medium transition-colors cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-[#16161A] text-[#111111] dark:text-white shadow-sm'
                : 'text-[#71717A]'
            }`}
          >
            {t.auth.loginTab}
          </button>
        </div>

        {/* Method Switch: Phone vs Email */}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setMethod('phone')}
            className={`flex-1 rounded-lg border py-1.5 text-xs font-medium cursor-pointer transition-colors ${
              method === 'phone'
                ? 'border-[var(--jmora-accent)] bg-[var(--jmora-accent)]/10 text-[var(--jmora-accent)]'
                : 'border-black/10 dark:border-white/15 text-[#71717A]'
            }`}
          >
            {t.auth.phoneTab}
          </button>
          <button
            type="button"
            onClick={() => setMethod('email')}
            className={`flex-1 rounded-lg border py-1.5 text-xs font-medium cursor-pointer transition-colors ${
              method === 'email'
                ? 'border-[var(--jmora-accent)] bg-[var(--jmora-accent)]/10 text-[var(--jmora-accent)]'
                : 'border-black/10 dark:border-white/15 text-[#71717A]'
            }`}
          >
            {t.auth.emailTab}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-xs font-medium">{t.auth.nameLabel}</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm focus:border-[var(--jmora-accent)] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium">
              {method === 'phone' ? t.auth.phoneLabel : t.auth.emailLabel}
            </label>
            <input
              type={method === 'phone' ? 'tel' : 'email'}
              required
              dir="ltr"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={method === 'phone' ? t.auth.phonePlaceholder : 'you@example.com'}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm font-mono-tabular focus:border-[var(--jmora-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">{t.auth.passwordLabel}</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm focus:border-[var(--jmora-accent)] focus:outline-none"
            />
          </div>

          {/* Human Verification ("من ربات نیستم" + typed verification code) */}
          <div className="rounded-xl border border-black/10 dark:border-white/15 bg-[#FAF9F7] dark:bg-[#1F1F25] p-3.5 space-y-3">
            <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={humanChecked}
                onChange={(e) => setHumanChecked(e.target.checked)}
                className="h-4 w-4 accent-[var(--jmora-accent)] rounded"
              />
              <ShieldCheck className="h-4 w-4 text-[var(--jmora-accent)]" />
              <span>{t.auth.humanCheckLabel}</span>
            </label>

            <div className="flex items-center justify-between gap-2">
              {challengeSvg ? (
                <img
                  src={challengeSvg}
                  alt="Security verification code"
                  className="h-[48px] w-[164px] rounded-lg border border-black/10 bg-[#F4F2EE] select-none"
                />
              ) : (
                <div className="h-[48px] w-[164px] rounded-lg bg-black/5 animate-pulse" />
              )}
              <button
                type="button"
                onClick={fetchChallenge}
                className="inline-flex items-center gap-1 rounded-lg border border-black/15 dark:border-white/15 px-2.5 py-2 text-[11px] font-medium hover:border-[var(--jmora-accent)] cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{t.auth.refreshCaptcha}</span>
              </button>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#52525B] dark:text-[#A1A1AA]">
                {t.auth.captchaLabel}
              </label>
              <input
                type="text"
                dir="ltr"
                autoComplete="off"
                value={challengeCode}
                onChange={(e) => setChallengeCode(e.target.value.toUpperCase())}
                placeholder={t.auth.captchaHint}
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-[#16161A] px-3 py-2 text-sm font-mono-tabular tracking-widest uppercase focus:border-[var(--jmora-accent)] focus:outline-none"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--jmora-accent)] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
          >
            {mode === 'register' ? t.auth.registerBtn : t.auth.loginBtn}
          </button>
        </form>
      </div>
    </div>
  );
}
