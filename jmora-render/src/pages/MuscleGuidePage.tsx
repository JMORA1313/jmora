import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check, CheckCircle2, Clock, Crown, ExternalLink, Lock, Plus, RotateCw, Sparkles, UserCheck } from 'lucide-react';
import { MuscleScene3D } from '../components/MuscleScene3D';
import { useApp } from '../context/AppContext';
import { getT } from '../i18n/translations';
import type { CoachTier, EquipmentType, ExerciseLevel, MuscleSide, TrainingLocation } from '../types/jmora';

function ExerciseMotionPreview({ type }: { type: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-black/8 dark:border-white/10 bg-[#FAF9F7] dark:bg-[#1F1F25]"
    >
      <svg viewBox="0 0 48 48" className="h-9 w-9 text-[var(--jmora-accent)]">
        <line
          x1="8"
          y1="38"
          x2="40"
          y2="38"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <motion.circle
          cx="24"
          cy="20"
          r="4"
          fill="currentColor"
          animate={
            type === 'press' || type === 'curl'
              ? { y: [4, -7, 4] }
              : type === 'squat' || type === 'hinge'
                ? { y: [-6, 5, -6] }
                : { x: [-6, 6, -6] }
          }
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.line
          x1="14"
          y1="28"
          x2="34"
          y2="28"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          animate={
            type === 'press'
              ? { y: [0, -11, 0] }
              : type === 'pull'
                ? { y: [-10, 1, -10] }
                : { opacity: [0.6, 1, 0.6] }
          }
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  );
}

export function MuscleGuidePage() {
  const {
    locale,
    theme,
    catalog,
    siteConfig,
    route,
    userState,
    addExerciseToPlan,
    setAuthOpen,
    markCoachRequestPending,
    syncSessionFromServer,
  } = useApp();
  const t = getT(locale);

  const [side, setSide] = useState<MuscleSide>('front');
  const [selectedMuscleId, setSelectedMuscleId] = useState<string>(route.muscleId || 'chest');
  const [hoveredMuscleId, setHoveredMuscleId] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<ExerciseLevel | 'all'>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentType | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<TrainingLocation | 'all'>('all');

  const [selectedTier, setSelectedTier] = useState<CoachTier>('assistant');
  const [reymitRef, setReymitRef] = useState('');
  const [receiptNote, setReceiptNote] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);
  const [reqError, setReqError] = useState('');

  const tierOptions: {
    id: CoachTier;
    name: string;
    desc: string;
    price: number;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'assistant',
      name: t.tiers.assistantName,
      desc: t.tiers.assistantDesc,
      price: siteConfig.coachAssistantToman || siteConfig.coachPassToman || 490_000,
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      id: 'standard',
      name: t.tiers.standardName,
      desc: t.tiers.standardDesc,
      price: siteConfig.standardCoachToman || 980_000,
      icon: <UserCheck className="h-4 w-4" />,
    },
    {
      id: 'private',
      name: t.tiers.privateName,
      desc: t.tiers.privateDesc,
      price: siteConfig.privateCoachToman || 2_400_000,
      icon: <Crown className="h-4 w-4" />,
    },
  ];
  const activeTierObj = tierOptions.find((x) => x.id === selectedTier) || tierOptions[0];

  useEffect(() => {
    if (route.muscleId) {
      setSelectedMuscleId(route.muscleId);
      const muscle = catalog.muscles.find((m) => m.id === route.muscleId);
      if (muscle && muscle.side !== 'both') {
        setSide(muscle.side);
      }
    }
  }, [route.muscleId, catalog.muscles]);

  const isSignedIn = Boolean(userState.auth?.token);
  const isUnlocked = Boolean(userState.coachAccessUnlocked || userState.auth?.isAdmin);
  const isPending = userState.coachRequestStatus === 'pending' && !isUnlocked;

  const selectedMuscle =
    catalog.muscles.find((m) => m.id === selectedMuscleId) || catalog.muscles[0];

  const filteredExercises = catalog.exercises.filter((ex) => {
    if (ex.muscleId !== selectedMuscle.id) return false;
    if (levelFilter !== 'all' && ex.level !== levelFilter) return false;
    if (equipmentFilter !== 'all' && ex.equipment !== equipmentFilter) return false;
    if (locationFilter !== 'all' && !ex.location.includes(locationFilter)) return false;
    return true;
  });

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqError('');
    if (!userState.auth?.token) {
      setAuthOpen(true);
      return;
    }
    if (!reymitRef.trim() || reymitRef.trim().length < 3) {
      setReqError(
        locale === 'fa'
          ? 'لطفاً شماره پیگیری یا نام پرداخت‌کننده در درگاه ریمیت را وارد کنید.'
          : 'Please enter your Reymit payment reference or payer name.'
      );
      return;
    }
    setSubmittingReq(true);
    try {
      const res = await fetch('/api/coach/unlock-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-jmora-token': userState.auth.token,
        },
        body: JSON.stringify({
          planTier: selectedTier,
          reymitRef: reymitRef.trim(),
          note: receiptNote.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit payment reference');
      markCoachRequestPending();
      setReymitRef('');
      setReceiptNote('');
    } catch (err) {
      setReqError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSubmittingReq(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-4xl">{t.muscleGuide.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#52525B] dark:text-[#A1A1AA]">
            {t.muscleGuide.subtitle}
          </p>
        </div>

        {/* Front / Back View Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-[#F2F0EC] dark:bg-[#1F1F25] p-1">
            <button
              type="button"
              onClick={() => setSide('front')}
              className={`rounded-md px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                side === 'front'
                  ? 'bg-white dark:bg-[#16161A] text-[#111111] dark:text-white shadow-sm'
                  : 'text-[#52525B] dark:text-[#A1A1AA]'
              }`}
            >
              {t.muscleGuide.frontView}
            </button>
            <button
              type="button"
              onClick={() => setSide('back')}
              className={`rounded-md px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                side === 'back'
                  ? 'bg-white dark:bg-[#16161A] text-[#111111] dark:text-white shadow-sm'
                  : 'text-[#52525B] dark:text-[#A1A1AA]'
              }`}
            >
              {t.muscleGuide.backView}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSide((s) => (s === 'front' ? 'back' : 'front'))}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-black/12 dark:border-white/15 px-3.5 text-xs font-medium hover:border-[var(--jmora-accent)] cursor-pointer whitespace-nowrap"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>{t.muscleGuide.rotateBtn}</span>
          </button>
        </div>
      </div>

      {/* Main Split: 3D Anatomical Muscle Model + Exercise / Paywall Drawer */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Left/Start: 3D Anatomy Canvas + Quick Muscle Selector Chips */}
        <div className="lg:col-span-5 space-y-4">
          <MuscleScene3D
            muscles={catalog.muscles}
            selectedMuscleId={selectedMuscleId}
            hoveredMuscleId={hoveredMuscleId}
            side={side}
            accentColor={siteConfig.accentColor}
            theme={theme}
            locale={locale}
            onSelectMuscle={setSelectedMuscleId}
            onHoverMuscle={setHoveredMuscleId}
            onSideChange={setSide}
          />

          <div className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-4">
            <div className="mb-2.5 text-xs font-medium text-[#71717A]">
              {t.muscleGuide.hoverHint}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {catalog.muscles.map((m) => {
                const active = m.id === selectedMuscle.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMuscleId(m.id);
                      if (m.side !== 'both') setSide(m.side);
                    }}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-[var(--jmora-accent)] text-white'
                        : 'bg-[#F2F0EC] dark:bg-[#1F1F25] text-[#52525B] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white'
                    }`}
                  >
                    {m.name[locale]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right/End: Muscle Details & Reymit Paywall OR Unlocked Exercises */}
        <div className="lg:col-span-7 space-y-6">
          <div className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold sm:text-2xl">
                  {selectedMuscle.name[locale]}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                  {selectedMuscle.description[locale]}
                </p>
              </div>
              <div className="text-xs text-[#71717A]">
                <span>{t.muscleGuide.recoveryLabel}: </span>
                <span className="font-mono-tabular font-semibold text-[#111111] dark:text-white">
                  {selectedMuscle.recoveryHours} {t.muscleGuide.hours}
                </span>
              </div>
            </div>

            {isUnlocked && (
              <div className="mt-6 grid grid-cols-1 gap-3 border-t border-black/8 dark:border-white/10 pt-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#71717A]">
                    {t.muscleGuide.filters.level}
                  </label>
                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value as ExerciseLevel | 'all')}
                    className="w-full rounded-lg border border-black/12 dark:border-white/15 bg-white dark:bg-[#16161A] px-3 py-2 text-xs font-medium focus:border-[var(--jmora-accent)] focus:outline-none"
                  >
                    <option value="all">{t.muscleGuide.filters.all}</option>
                    <option value="beginner">{t.muscleGuide.filters.beginner}</option>
                    <option value="intermediate">{t.muscleGuide.filters.intermediate}</option>
                    <option value="pro">{t.muscleGuide.filters.pro}</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#71717A]">
                    {t.muscleGuide.filters.equipment}
                  </label>
                  <select
                    value={equipmentFilter}
                    onChange={(e) =>
                      setEquipmentFilter(e.target.value as EquipmentType | 'all')
                    }
                    className="w-full rounded-lg border border-black/12 dark:border-white/15 bg-white dark:bg-[#16161A] px-3 py-2 text-xs font-medium focus:border-[var(--jmora-accent)] focus:outline-none"
                  >
                    <option value="all">{t.muscleGuide.filters.all}</option>
                    <option value="bodyweight">{t.muscleGuide.filters.bodyweight}</option>
                    <option value="dumbbell">{t.muscleGuide.filters.dumbbell}</option>
                    <option value="machine">{t.muscleGuide.filters.machine}</option>
                    <option value="barbell">{t.muscleGuide.filters.barbell}</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#71717A]">
                    {t.muscleGuide.filters.location}
                  </label>
                  <select
                    value={locationFilter}
                    onChange={(e) =>
                      setLocationFilter(e.target.value as TrainingLocation | 'all')
                    }
                    className="w-full rounded-lg border border-black/12 dark:border-white/15 bg-white dark:bg-[#16161A] px-3 py-2 text-xs font-medium focus:border-[var(--jmora-accent)] focus:outline-none"
                  >
                    <option value="all">{t.muscleGuide.filters.all}</option>
                    <option value="home">{t.muscleGuide.filters.home}</option>
                    <option value="gym">{t.muscleGuide.filters.gym}</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Locked vs Unlocked Exercises View */}
          {!isUnlocked ? (
            <div className="jmora-card border border-[var(--jmora-accent)]/30 bg-white dark:bg-[#16161A] p-6 sm:p-8 space-y-5">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--jmora-accent)]/12 text-[var(--jmora-accent)]">
                  {isPending ? <Clock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {isPending ? t.muscleGuide.pendingTitle : t.muscleGuide.lockedTitle}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                    {isPending ? t.muscleGuide.pendingDesc : t.muscleGuide.lockedDesc}
                  </p>
                </div>
              </div>

              {/* 3-Tier Selectable Coaching Packages (Live Admin-Controlled Prices) */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]">
                  {t.tiers.sectionTitle}
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {tierOptions.map((tier) => {
                    const active = selectedTier === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setSelectedTier(tier.id)}
                        className={`rounded-xl border p-3.5 text-start transition-all cursor-pointer ${
                          active
                            ? 'border-[var(--jmora-accent)] bg-[var(--jmora-accent)]/8 ring-1 ring-[var(--jmora-accent)]'
                            : 'border-black/10 dark:border-white/12 hover:border-[var(--jmora-accent)]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 text-[var(--jmora-accent)]">
                          {tier.icon}
                          {active && <Check className="h-3.5 w-3.5" />}
                        </div>
                        <div className="mt-2 text-xs font-semibold">{tier.name}</div>
                        <p className="mt-1 text-[11px] leading-relaxed text-[#71717A]">
                          {tier.desc}
                        </p>
                        <div className="mt-2.5 font-mono-tabular text-sm font-semibold text-[var(--jmora-accent)]">
                          {tier.price.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}{' '}
                          <span className="text-[10px] font-normal">
                            {locale === 'fa' ? 'تومان' : 'Toman'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl bg-[#FAF9F7] dark:bg-[#1F1F25] p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-[#71717A]">{activeTierObj.name}</div>
                  <div className="mt-0.5 font-mono-tabular text-lg font-semibold text-[var(--jmora-accent)]">
                    {activeTierObj.price.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}{' '}
                    {locale === 'fa' ? 'تومان' : 'Toman'}
                  </div>
                </div>
                <a
                  href={siteConfig.reymitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--jmora-accent)] px-5 py-2.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                >
                  <span>{t.muscleGuide.payViaReymit}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              {!isSignedIn ? (
                <div className="border-t border-black/8 dark:border-white/10 pt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-[#71717A]">{t.authGate.requiredDesc}</span>
                  <button
                    type="button"
                    onClick={() => setAuthOpen(true)}
                    className="rounded-lg bg-[#111111] dark:bg-[#F5F5F4] px-4 py-2 text-xs font-medium text-white dark:text-[#111111] cursor-pointer"
                  >
                    {t.authGate.openAuthBtn}
                  </button>
                </div>
              ) : isPending ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-xs">
                  <span className="inline-flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    {t.muscleGuide.pendingTitle}
                  </span>
                  <button
                    type="button"
                    onClick={syncSessionFromServer}
                    className="font-semibold text-[var(--jmora-accent)] hover:underline cursor-pointer"
                  >
                    {locale === 'fa' ? 'بررسی وضعیت تایید' : 'Check Approval Status'}
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleUnlockSubmit}
                  className="border-t border-black/8 dark:border-white/10 pt-5 space-y-3"
                >
                  <div className="text-xs font-semibold">{t.muscleGuide.submitReceiptTitle}</div>
                  <input
                    type="text"
                    value={reymitRef}
                    onChange={(e) => setReymitRef(e.target.value)}
                    placeholder={t.muscleGuide.reymitRefPlaceholder}
                    className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2.5 text-sm focus:border-[var(--jmora-accent)] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={receiptNote}
                    onChange={(e) => setReceiptNote(e.target.value)}
                    placeholder={t.muscleGuide.receiptNotePlaceholder}
                    className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2.5 text-sm focus:border-[var(--jmora-accent)] focus:outline-none"
                  />
                  {reqError && <p className="text-xs text-red-600">{reqError}</p>}
                  <button
                    type="submit"
                    disabled={submittingReq}
                    className="w-full rounded-lg bg-[#111111] dark:bg-[#F5F5F4] py-2.5 text-xs sm:text-sm font-medium text-white dark:text-[#111111] hover:bg-[var(--jmora-accent)] dark:hover:bg-[var(--jmora-accent)] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {t.muscleGuide.submitReceiptBtn}
                  </button>
                </form>
              )}
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-8 text-center">
              <p className="text-sm text-[#71717A]">{t.muscleGuide.emptyExercises}</p>
              <button
                type="button"
                onClick={() => {
                  setLevelFilter('all');
                  setEquipmentFilter('all');
                  setLocationFilter('all');
                }}
                className="mt-4 rounded-lg bg-[#111111] dark:bg-[#F5F5F4] px-4 py-2 text-xs font-medium text-white dark:text-[#111111] cursor-pointer"
              >
                {t.muscleGuide.resetFilters}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredExercises.map((ex) => {
                const isAdded = userState.customPlanExerciseIds.includes(ex.id);
                return (
                  <article
                    key={ex.id}
                    className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <ExerciseMotionPreview type={ex.animationType} />
                        <div>
                          <h3 className="text-base font-semibold">{ex.name[locale]}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#71717A]">
                            <span>{t.muscleGuide.filters[ex.level]}</span>
                            <span aria-hidden="true">·</span>
                            <span>{t.muscleGuide.filters[ex.equipment]}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {ex.location.map((loc) => t.muscleGuide.filters[loc]).join(' / ')}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-medium">
                            <span className="text-[var(--jmora-accent)]">{ex.setsReps[locale]}</span>
                            <span className="font-mono-tabular text-[#71717A]">
                              {t.muscleGuide.tempoLabel}: {ex.tempo}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => addExerciseToPlan(ex.id)}
                        className={`inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                          isAdded
                            ? 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400'
                            : 'bg-[#111111] dark:bg-[#F5F5F4] text-white dark:text-[#111111] hover:bg-[var(--jmora-accent)] dark:hover:bg-[var(--jmora-accent)] dark:hover:text-white'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>{t.muscleGuide.addedToPlan}</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            <span>{t.muscleGuide.addToPlan}</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 border-t border-black/8 dark:border-white/10 pt-4 sm:grid-cols-2">
                      <div>
                        <h4 className="text-xs font-semibold text-[#111111] dark:text-white">
                          {t.muscleGuide.cuesTitle}
                        </h4>
                        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                          {ex.cues.map((cue, idx) => (
                            <li key={idx}>• {cue[locale]}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-[#111111] dark:text-white">
                          {t.muscleGuide.mistakesTitle}
                        </h4>
                        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                          {ex.mistakes.map((m, idx) => (
                            <li key={idx}>• {m[locale]}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
