import React, { useEffect, useState } from 'react';
import { Camera, Crown, Lock, LogOut, ShieldCheck } from 'lucide-react';
import { StudioFitnessTools } from '../components/StudioFitnessTools';
import { useApp } from '../context/AppContext';
import { getT } from '../i18n/translations';
import type { ProgressPhotoSubmission } from '../types/jmora';

function WeightProgressChart({
  entries,
}: {
  entries: { date: string; weightKg: number }[];
}) {
  if (entries.length === 0) return null;
  const weights = entries.map((e) => e.weightKg);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const range = Math.max(1, maxW - minW);

  const width = 480;
  const height = 160;
  const padX = 28;
  const padY = 20;

  const points = entries.map((entry, idx) => {
    const x =
      entries.length === 1
        ? width / 2
        : padX + (idx / (entries.length - 1)) * (width - padX * 2);
    const y =
      height - padY - ((entry.weightKg - minW) / range) * (height - padY * 2);
    return { x, y, ...entry };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
      <line
        x1={padX}
        y1={height - padY}
        x2={width - padX}
        y2={height - padY}
        stroke="currentColor"
        strokeOpacity="0.12"
      />
      <polyline
        fill="none"
        stroke="var(--jmora-accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polyline}
      />
      {points.map((p, idx) => (
        <g key={idx}>
          <circle cx={p.x} cy={p.y} r="4.5" fill="var(--jmora-accent)" />
          <text
            x={p.x}
            y={p.y - 10}
            textAnchor="middle"
            className="fill-current text-[10px] font-mono-tabular font-semibold"
          >
            {p.weightKg}
          </text>
          <text
            x={p.x}
            y={height - 4}
            textAnchor="middle"
            className="fill-[#71717A] text-[9px] font-mono-tabular"
          >
            {p.date.slice(5)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function DashboardPage() {
  const {
    locale,
    theme,
    catalog,
    userState,
    logWeight,
    toggleLocale,
    toggleTheme,
    setUserAuth,
    setAuthOpen,
    navigate,
  } = useApp();

  const t = getT(locale);
  const [newWeight, setNewWeight] = useState('');
  const [newWaist, setNewWaist] = useState('');
  const [myProgressPhotos, setMyProgressPhotos] = useState<ProgressPhotoSubmission[]>([]);

  useEffect(() => {
    const token = userState.auth?.token;
    if (!token) return;
    fetch('/api/progress-photos/mine', {
      headers: { 'x-jmora-token': token },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.submissions) setMyProgressPhotos(d.submissions);
      })
      .catch(() => {});
  }, [userState.auth?.token]);

  if (!userState.auth?.token) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="jmora-card border border-black/10 dark:border-white/15 bg-white dark:bg-[#16161A] p-8 space-y-4">
          <Lock className="mx-auto h-9 w-9 text-[var(--jmora-accent)]" />
          <h1 className="text-xl font-semibold">{t.authGate.requiredTitle}</h1>
          <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">{t.authGate.requiredDesc}</p>
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="rounded-lg bg-[var(--jmora-accent)] px-6 py-2.5 text-sm font-medium text-white cursor-pointer"
          >
            {t.authGate.openAuthBtn}
          </button>
        </div>
      </div>
    );
  }

  const handleLogWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const w = Number(newWeight);
    if (!w || w < 30 || w > 220) return;
    const waist = newWaist ? Number(newWaist) : undefined;
    logWeight(w, waist);
    setNewWeight('');
    setNewWaist('');
  };

  const customExercises = userState.customPlanExerciseIds
    .map((id) => catalog.exercises.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  const favoriteProducts = userState.favoriteProductIds
    .map((id) => catalog.products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const savedInfo = userState.savedInfo;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{t.dashboard.title}</h1>
          <p className="mt-1 text-sm text-[#52525B] dark:text-[#A1A1AA]">
            {t.dashboard.welcome}, {userState.auth.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(userState.coachAccessUnlocked || userState.auth.isAdmin) && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--jmora-accent)]/35 bg-[var(--jmora-accent)]/10 px-3 py-2 text-xs font-semibold text-[var(--jmora-accent)]">
              <Crown className="h-3.5 w-3.5" />
              <span>
                {userState.coachTier === 'private'
                  ? t.tiers.privateName
                  : userState.coachTier === 'standard'
                    ? t.tiers.standardName
                    : t.tiers.assistantName}
              </span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setUserAuth(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 dark:border-white/15 px-3.5 py-2 text-xs font-medium cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{t.dashboard.logout}</span>
          </button>
          {userState.auth.isAdmin && (
            <button
              type="button"
              onClick={() => navigate('admin')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--jmora-accent)]/40 bg-[var(--jmora-accent)]/10 px-3.5 py-2 text-xs font-medium text-[var(--jmora-accent)] cursor-pointer"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{t.dashboard.adminLink}</span>
            </button>
          )}
        </div>
      </div>

      {/* Saved Personal Info & Goal + Weight Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t.dashboard.savedGoalTitle}</h2>
            <button
              type="button"
              onClick={() => navigate('onboarding')}
              className="text-xs font-medium text-[var(--jmora-accent)] hover:underline cursor-pointer"
            >
              {t.onboarding.regenerate}
            </button>
          </div>

          {!savedInfo ? (
            <div className="mt-6 rounded-xl bg-[#FAF9F7] dark:bg-[#1F1F25] p-6 text-center">
              <h3 className="text-base font-semibold">{t.dashboard.noPlanTitle}</h3>
              <p className="mt-1.5 text-xs text-[#71717A]">{t.dashboard.noPlanDesc}</p>
              <button
                type="button"
                onClick={() => navigate('onboarding')}
                className="mt-4 rounded-lg bg-[var(--jmora-accent)] px-5 py-2.5 text-xs font-medium text-white cursor-pointer"
              >
                {t.dashboard.createPlanBtn}
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-[#FAF9F7] dark:bg-[#1F1F25] p-3">
                  <div className="text-[11px] text-[#71717A]">{t.infoForm.fullName}</div>
                  <div className="mt-1 text-sm font-semibold">{savedInfo.fullName}</div>
                </div>
                <div className="rounded-xl bg-[#FAF9F7] dark:bg-[#1F1F25] p-3">
                  <div className="text-[11px] text-[#71717A]">{t.infoForm.age}</div>
                  <div className="mt-1 font-mono-tabular text-sm font-semibold">{savedInfo.age}</div>
                </div>
                <div className="rounded-xl bg-[#FAF9F7] dark:bg-[#1F1F25] p-3">
                  <div className="text-[11px] text-[#71717A]">{t.infoForm.height}</div>
                  <div dir="ltr" className="mt-1 font-mono-tabular text-sm font-semibold w-fit">
                    {savedInfo.heightCm} cm
                  </div>
                </div>
                <div className="rounded-xl bg-[#FAF9F7] dark:bg-[#1F1F25] p-3">
                  <div className="text-[11px] text-[#71717A]">{t.infoForm.weight}</div>
                  <div
                    dir="ltr"
                    className="mt-1 font-mono-tabular text-sm font-semibold text-[var(--jmora-accent)] w-fit"
                  >
                    {savedInfo.weightKg} kg
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-black/8 dark:border-white/10 p-4 space-y-2">
                <div className="text-xs font-semibold text-[var(--jmora-accent)]">
                  {t.infoForm.goalLabel}
                </div>
                <p className="text-sm leading-relaxed">{savedInfo.goalText}</p>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6">
          <h2 className="text-lg font-semibold">{t.dashboard.weightTracker}</h2>
          <div className="mt-4">
            {userState.weightLog.length === 0 ? (
              <p className="py-6 text-xs text-[#71717A]">{t.dashboard.noWeightLogs}</p>
            ) : (
              <WeightProgressChart entries={userState.weightLog} />
            )}
          </div>
          <form onSubmit={handleLogWeight} className="mt-4 flex flex-wrap gap-2">
            <input
              type="number"
              step="0.1"
              placeholder={t.dashboard.logWeight}
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              className="flex-1 min-w-[120px] rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs font-mono-tabular focus:border-[var(--jmora-accent)] focus:outline-none"
            />
            <input
              type="number"
              step="0.5"
              placeholder={locale === 'fa' ? 'دور کمر (cm)' : 'Waist (cm)'}
              value={newWaist}
              onChange={(e) => setNewWaist(e.target.value)}
              className="w-28 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs font-mono-tabular focus:border-[var(--jmora-accent)] focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-[var(--jmora-accent)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 cursor-pointer"
            >
              {t.dashboard.saveWeight}
            </button>
          </form>
        </div>
      </div>

      {/* Saved Exercises + Order History (STRICTLY REAL USER ORDERS ONLY) + Preferences */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6">
          <h3 className="text-base font-semibold">{t.dashboard.customExercises}</h3>
          {customExercises.length === 0 ? (
            <p className="mt-4 text-xs text-[#71717A]">{t.dashboard.noSavedExercises}</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {customExercises.map((ex) => (
                <li
                  key={ex.id}
                  className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2 last:border-0"
                >
                  <button
                    type="button"
                    onClick={() => navigate('muscle-guide', { muscleId: ex.muscleId })}
                    className="hover:text-[var(--jmora-accent)] cursor-pointer text-start"
                  >
                    {ex.name[locale]}
                  </button>
                  <span className="text-xs text-[#71717A]">{ex.setsReps[locale]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6">
          <h3 className="text-base font-semibold">{t.dashboard.ordersTitle}</h3>
          {userState.orders.length === 0 ? (
            <p className="mt-4 text-xs text-[#71717A]">{t.dashboard.noOrders}</p>
          ) : (
            <ul className="mt-4 space-y-3 text-xs">
              {userState.orders.map((ord) => (
                <li
                  key={ord.id}
                  className="rounded-lg bg-[#FAF9F7] dark:bg-[#1F1F25] p-3"
                >
                  <div className="flex justify-between font-semibold">
                    <span className="font-mono-tabular">{ord.id}</span>
                    <span className="text-[var(--jmora-accent)] uppercase">{ord.status}</span>
                  </div>
                  <div className="mt-1 text-[#71717A]">
                    {ord.items.map((i) => `${i.name[locale]} ×${i.quantity}`).join('، ')}
                  </div>
                  <div className="mt-1 font-mono-tabular font-semibold">
                    {ord.totalToman.toLocaleString('fa-IR')}{' '}
                    {locale === 'fa' ? 'تومان' : 'Toman'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6 space-y-4">
          <h3 className="text-base font-semibold">{t.dashboard.settingsTitle}</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleLocale}
              className="flex-1 rounded-lg border border-black/15 dark:border-white/15 py-2 text-xs font-medium cursor-pointer"
            >
              {locale === 'fa' ? 'English (LTR)' : 'فارسی (RTL)'}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex-1 rounded-lg border border-black/15 dark:border-white/15 py-2 text-xs font-medium cursor-pointer"
            >
              {theme === 'dark' ? t.header.themeLight : t.header.themeDark}
            </button>
          </div>
          <div>
            <div className="text-xs font-semibold text-[#71717A]">
              {t.dashboard.favoritesTitle}
            </div>
            {favoriteProducts.length === 0 ? (
              <p className="mt-2 text-xs text-[#71717A]">{t.dashboard.noFavorites}</p>
            ) : (
              <ul className="mt-2 space-y-1 text-xs">
                {favoriteProducts.map((p) => (
                  <li key={p.id}>• {p.name[locale]}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Private Progress Photos Sent to Coach */}
      <div className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-[var(--jmora-accent)]" />
            <h3 className="text-base font-semibold">
              {locale === 'fa'
                ? 'عکس‌های پیشرفت محرمانه ارسال‌شده برای مربی'
                : 'Your Private Progress Check-Ins to Coach'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => navigate('transformations')}
            className="text-xs font-medium text-[var(--jmora-accent)] hover:underline cursor-pointer"
          >
            {t.transformations.submitBtn}
          </button>
        </div>

        {myProgressPhotos.length === 0 ? (
          <p className="text-xs text-[#71717A]">
            {locale === 'fa'
              ? 'هنوز عکس پیشرفتی برای مربی ارسال نکرده‌اید. این عکس‌ها کاملاً خصوصی هستند و فقط برای مربی نمایش داده می‌شوند.'
              : 'No private progress photos sent yet. Photos sent here are visible only to your coach.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {myProgressPhotos.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-black/8 dark:border-white/10 bg-[#FAF9F7] dark:bg-[#1F1F25] p-4 space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-[#71717A]">
                  <span className="font-mono-tabular">{item.createdAt.slice(0, 10)}</span>
                  {item.weightKg && (
                    <span className="font-mono-tabular font-semibold text-[var(--jmora-accent)]">
                      {item.weightKg} kg
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {item.beforeImage && (
                    <img
                      src={item.beforeImage}
                      alt="Before check-in"
                      className="h-28 w-full rounded-lg object-cover"
                    />
                  )}
                  {item.afterImage && (
                    <img
                      src={item.afterImage}
                      alt="After check-in"
                      className="h-28 w-full rounded-lg object-cover"
                    />
                  )}
                </div>
                {item.note && <p className="text-xs">{item.note}</p>}
                {item.coachFeedback ? (
                  <div className="rounded-lg border border-emerald-600/25 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs">
                    <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {locale === 'fa' ? 'پاسخ مربی:' : 'Coach Feedback:'}
                    </div>
                    <p className="mt-1">{item.coachFeedback}</p>
                  </div>
                ) : (
                  <div className="text-[11px] text-[#71717A]">
                    {locale === 'fa' ? 'در انتظار بررسی مربی...' : 'Awaiting coach review...'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Studio Rest Timer & Live Hydration/Protein/BMI Calculator */}
      <StudioFitnessTools
        locale={locale}
        initialWeightKg={savedInfo?.weightKg || 68}
        initialHeightCm={savedInfo?.heightCm || 172}
      />
    </div>
  );
}
