import React, { useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Lock,
  MoveHorizontal,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getT } from '../i18n/translations';
import type { Transformation } from '../types/jmora';
import { compressImageFile } from '../utils/imageUpload';

function BeforeAfterSlider({
  item,
  locale,
  beforeLabel,
  afterLabel,
}: {
  item: Transformation;
  locale: 'fa' | 'en';
  beforeLabel: string;
  afterLabel: string;
}) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const updateFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(4, Math.min(96, pct));
    setPosition(clamped);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const beforeImg =
    item.beforeImage || item.image || '/src/assets/images/article_strength_studio_1795014056746.jpg';
  const afterImg =
    item.afterImage || item.image || '/src/assets/images/hero_jmora_athlete_1795014055096.jpg';

  return (
    <div
      ref={containerRef}
      dir="ltr"
      role="slider"
      tabIndex={0}
      aria-label={`${item.name[locale]} Before/After comparison`}
      aria-valuemin={4}
      aria-valuemax={96}
      aria-valuenow={Math.round(position)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') setPosition((p) => Math.max(4, p - 4));
        if (e.key === 'ArrowRight') setPosition((p) => Math.min(96, p + 4));
      }}
      className="relative aspect-[4/3] w-full overflow-hidden select-none touch-none cursor-ew-resize bg-[#18181B]"
    >
      <img
        src={afterImg}
        alt={`${item.name[locale]} ${afterLabel}`}
        draggable={false}
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover pointer-events-none"
      />
      <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/75 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
        {afterLabel} · {item.afterMetrics[locale]}
      </div>

      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={beforeImg}
          alt={`${item.name[locale]} ${beforeLabel}`}
          draggable={false}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
        <div className="absolute bottom-3 left-3 rounded-md bg-black/75 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          {beforeLabel} · {item.beforeMetrics[locale]}
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.45)]"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#111111] shadow-xl ring-2 ring-[var(--jmora-accent)]/70 transition-transform">
          <MoveHorizontal className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export function TransformationsPage() {
  const { locale, catalog, userState, setAuthOpen, navigate } = useApp();
  const t = getT(locale);

  const [genderFilter, setGenderFilter] = useState<'all' | 'women' | 'men'>('all');
  const [goalFilter, setGoalFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);

  // Private Progress Photos for Coach (Non-admins NEVER publish publicly)
  const [weightKg, setWeightKg] = useState('');
  const [note, setNote] = useState('');
  const [beforeImage, setBeforeImage] = useState('');
  const [afterImage, setAfterImage] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const visible = catalog.transformations.filter((tr) => {
    if (!tr.approved) return false;
    if (genderFilter !== 'all' && tr.gender !== genderFilter) return false;
    if (goalFilter !== 'all' && tr.goal !== goalFilter) return false;
    return true;
  });

  const handleFileUpload = async (file: File | undefined, target: 'before' | 'after') => {
    if (!file) return;
    setError('');
    try {
      const dataUrl = await compressImageFile(file);
      if (target === 'before') setBeforeImage(dataUrl);
      else setAfterImage(dataUrl);
    } catch {
      setError(locale === 'fa' ? 'آپلود تصویر ناموفق بود.' : 'Image upload failed.');
    }
  };

  const handleSendToCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!userState.auth?.token) {
      setAuthOpen(true);
      return;
    }
    if (!beforeImage && !afterImage) {
      setError(
        locale === 'fa'
          ? 'لطفاً حداقل یکی از عکس‌های قبل یا بعد را آپلود کنید.'
          : 'Please upload at least one Before or After photo.'
      );
      return;
    }
    if (!consent) {
      setError(
        locale === 'fa'
          ? 'لطفاً تیک تایید ارسال به مربی را بزنید.'
          : 'Please confirm sending these photos to your coach.'
      );
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/progress-photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-jmora-token': userState.auth.token,
        },
        body: JSON.stringify({
          beforeImage: beforeImage.trim(),
          afterImage: afterImage.trim(),
          weightKg: weightKg ? Number(weightKg) : undefined,
          note: note.trim(),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Submission failed');
      }
      setSubmitted(true);
      setBeforeImage('');
      setAfterImage('');
      setNote('');
      setWeightKg('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-4xl">{t.transformations.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#52525B] dark:text-[#A1A1AA]">
            {t.transformations.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {userState.auth?.isAdmin && (
            <button
              type="button"
              onClick={() => navigate('admin')}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--jmora-accent)]/40 bg-[var(--jmora-accent)]/10 px-4 py-2.5 text-xs font-semibold text-[var(--jmora-accent)] cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{locale === 'fa' ? 'مدیریت گالری (ادمین)' : 'Manage Gallery (Admin)'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (!userState.auth?.token) {
                setAuthOpen(true);
                return;
              }
              setSubmitted(false);
              setError('');
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#111111] dark:bg-[#F5F5F4] px-4 py-2.5 text-xs font-medium text-white dark:text-[#111111] hover:bg-[var(--jmora-accent)] dark:hover:bg-[var(--jmora-accent)] dark:hover:text-white transition-colors cursor-pointer"
          >
            <Camera className="h-4 w-4" />
            <span>{t.transformations.submitBtn}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-[#F2F0EC] dark:bg-[#1F1F25] p-1">
          {(['all', 'women', 'men'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenderFilter(g)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer ${
                genderFilter === g
                  ? 'bg-white dark:bg-[#16161A] text-[#111111] dark:text-white shadow-sm'
                  : 'text-[#52525B] dark:text-[#A1A1AA]'
              }`}
            >
              {t.transformations[g]}
            </button>
          ))}
        </div>

        <select
          value={goalFilter}
          onChange={(e) => setGoalFilter(e.target.value)}
          aria-label="Filter by goal"
          className="rounded-lg border border-black/12 dark:border-white/15 bg-white dark:bg-[#16161A] px-3 py-2 text-xs font-medium focus:border-[var(--jmora-accent)] focus:outline-none"
        >
          <option value="all">{t.transformations.all}</option>
          <option value="fat-loss">{t.onboarding.goals['fat-loss']}</option>
          <option value="glute-growth">{t.onboarding.goals['glute-growth']}</option>
          <option value="muscle-gain">{t.onboarding.goals['muscle-gain']}</option>
          <option value="recomp">{t.onboarding.goals.fitness}</option>
        </select>
      </div>

      {/* Public Admin-Curated Transformation Cards */}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {visible.map((item) => (
          <article
            key={item.id}
            className="jmora-card overflow-hidden border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A]"
          >
            <BeforeAfterSlider
              item={item}
              locale={locale}
              beforeLabel={t.transformations.beforeLabel}
              afterLabel={t.transformations.afterLabel}
            />
            <div className="p-6">
              <div className="flex items-center justify-between text-xs text-[#71717A]">
                <span className="font-mono-tabular font-semibold text-[var(--jmora-accent)]">
                  {item.weightDeltaKg}
                </span>
                <span className="tabular-nums">
                  {item.durationWeeks} {t.transformations.weeksUnit}
                </span>
              </div>
              <h2 className="mt-2 text-lg font-semibold">{item.name[locale]}</h2>
              <p className="mt-0.5 text-xs text-[#71717A]">{item.programName[locale]}</p>
              <p className="mt-3 text-sm leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                “{item.testimonial[locale]}”
              </p>
            </div>
          </article>
        ))}
      </div>

      {/* Private Check-In Photo Modal (Sent ONLY to Coach, Never Published Publicly by Non-Admins) */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={t.transformations.submitTitle}
        >
          <div className="my-auto w-full max-w-md rounded-2xl border border-black/10 dark:border-white/15 bg-white dark:bg-[#16161A] p-6 text-[#111111] dark:text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">{t.transformations.submitTitle}</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-600/25 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-200">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{t.transformations.privacyBadge}</span>
            </div>

            {!userState.auth?.token ? (
              <div className="py-8 text-center space-y-3">
                <Lock className="mx-auto h-8 w-8 text-[var(--jmora-accent)]" />
                <p className="text-sm">{t.authGate.requiredDesc}</p>
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="rounded-lg bg-[var(--jmora-accent)] px-5 py-2 text-xs font-medium text-white cursor-pointer"
                >
                  {t.authGate.openAuthBtn}
                </button>
              </div>
            ) : submitted ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <p className="text-sm">{t.transformations.submitSuccess}</p>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    navigate('dashboard');
                  }}
                  className="rounded-lg bg-[var(--jmora-accent)] px-5 py-2 text-xs font-medium text-white cursor-pointer"
                >
                  {t.infoForm.viewDashboard}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendToCoach} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/20 dark:border-white/20 p-3.5 text-center text-xs cursor-pointer hover:border-[var(--jmora-accent)]">
                    <Upload className="h-4 w-4 text-[var(--jmora-accent)]" />
                    <span>
                      {beforeImage
                        ? locale === 'fa'
                          ? 'عکس قبل آماده ✓'
                          : 'Before Ready ✓'
                        : locale === 'fa'
                          ? 'آپلود عکس قبل'
                          : 'Upload Before'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files?.[0], 'before')}
                    />
                  </label>
                  <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/20 dark:border-white/20 p-3.5 text-center text-xs cursor-pointer hover:border-[var(--jmora-accent)]">
                    <Upload className="h-4 w-4 text-[var(--jmora-accent)]" />
                    <span>
                      {afterImage
                        ? locale === 'fa'
                          ? 'عکس بعد آماده ✓'
                          : 'After Ready ✓'
                        : locale === 'fa'
                          ? 'آپلود عکس بعد'
                          : 'Upload After'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files?.[0], 'after')}
                    />
                  </label>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    {locale === 'fa' ? 'وزن فعلی (کیلوگرم - اختیاری)' : 'Current Weight (kg - optional)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="65"
                    className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    {locale === 'fa' ? 'یادداشت برای مربی' : 'Note for Your Coach'}
                  </label>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={
                      locale === 'fa'
                        ? 'مثلاً: عکس پایان ماه اول تمرین؛ لطفاً فرم شانه و کمرم را بررسی کنید...'
                        : 'e.g., End of Month 1 check-in; please review my progress...'
                    }
                    className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm focus:border-[var(--jmora-accent)] focus:outline-none"
                  />
                </div>

                <label className="flex items-start gap-2 text-xs text-[#52525B] dark:text-[#A1A1AA] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 accent-[var(--jmora-accent)]"
                  />
                  <span>{t.transformations.consentLabel}</span>
                </label>

                {error && <p className="text-xs text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full rounded-lg bg-[var(--jmora-accent)] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 cursor-pointer"
                >
                  {sending ? t.infoForm.submitting : t.contact.send}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
