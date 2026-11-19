import React, { useCallback, useEffect, useState } from 'react';
import {
  Bot,
  Camera,
  Check,
  CheckCircle2,
  Crown,
  ExternalLink,
  Lock,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCheck,
} from 'lucide-react';
import { StudioFitnessTools } from '../components/StudioFitnessTools';
import { useApp } from '../context/AppContext';
import { getT } from '../i18n/translations';
import type { ClientInfoSubmission, CoachMessage, CoachTier } from '../types/jmora';
import { compressImageFile } from '../utils/imageUpload';

export function OnboardingPage() {
  const {
    locale,
    siteConfig,
    userState,
    saveClientInfo,
    setAuthOpen,
    markCoachRequestPending,
    syncSessionFromServer,
    navigate,
  } = useApp();
  const t = getT(locale);

  const isSignedIn = Boolean(userState.auth?.token);
  const isUnlocked = Boolean(userState.coachAccessUnlocked || userState.auth?.isAdmin);
  const isPending = userState.coachRequestStatus === 'pending' && !isUnlocked;

  const existing = userState.savedInfo;
  const [fullName, setFullName] = useState(existing?.fullName || userState.auth?.name || '');
  const [contact, setContact] = useState(existing?.contact || userState.auth?.identifier || '');
  const [gender, setGender] = useState<'female' | 'male'>(existing?.gender || 'female');
  const [age, setAge] = useState(String(existing?.age || 26));
  const [heightCm, setHeightCm] = useState(String(existing?.heightCm || 166));
  const [weightKg, setWeightKg] = useState(String(existing?.weightKg || 62));
  const [goalText, setGoalText] = useState(existing?.goalText || '');
  const [experienceAndGear, setExperienceAndGear] = useState(existing?.experienceAndGear || '');
  const [injuriesNotes, setInjuriesNotes] = useState(existing?.injuriesNotes || '');

  // Keep name/contact synced if auth state arrives after mount
  useEffect(() => {
    if (!fullName && (userState.savedInfo?.fullName || userState.auth?.name)) {
      setFullName(userState.savedInfo?.fullName || userState.auth?.name || '');
    }
    if (!contact && (userState.savedInfo?.contact || userState.auth?.identifier)) {
      setContact(userState.savedInfo?.contact || userState.auth?.identifier || '');
    }
  }, [userState.auth?.name, userState.auth?.identifier, userState.savedInfo]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedNotice, setSubmittedNotice] = useState(false);

  // Coach thread state
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // 3-tier Reymit unlock state
  const [selectedTier, setSelectedTier] = useState<CoachTier>('assistant');
  const [reymitRef, setReymitRef] = useState('');
  const [reqError, setReqError] = useState('');

  // Private Progress Photos check-in to Coach
  const [privBefore, setPrivBefore] = useState('');
  const [privAfter, setPrivAfter] = useState('');
  const [privNote, setPrivNote] = useState('');
  const [privSending, setPrivSending] = useState(false);
  const [privSuccess, setPrivSuccess] = useState(false);
  const [privError, setPrivError] = useState('');

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

  const activeUserTier = userState.coachTier || userState.auth?.coachTier || 'assistant';
  const activeUserTierName =
    activeUserTier === 'private'
      ? t.tiers.privateName
      : activeUserTier === 'standard'
        ? t.tiers.standardName
        : t.tiers.assistantName;

  const loadThread = useCallback(async () => {
    if (!userState.auth?.token || !isUnlocked) return;
    try {
      const res = await fetch('/api/coach/thread', {
        headers: { 'x-jmora-token': userState.auth.token },
      });
      if (res.ok) {
        const data = (await res.json()) as { messages: CoachMessage[] };
        setMessages(data.messages || []);
      }
    } catch {
      // ignore
    }
  }, [userState.auth?.token, isUnlocked]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  const handleUnlockRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqError('');
    if (!userState.auth?.token) {
      setAuthOpen(true);
      return;
    }
    if (reymitRef.trim().length < 3) {
      setReqError(
        locale === 'fa'
          ? 'کد پیگیری یا نام پرداخت‌کننده در ریمیت الزامی است.'
          : 'Please enter your Reymit payment reference.'
      );
      return;
    }
    const res = await fetch('/api/coach/unlock-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-jmora-token': userState.auth.token,
      },
      body: JSON.stringify({ planTier: selectedTier, reymitRef: reymitRef.trim() }),
    });
    if (res.ok) {
      markCoachRequestPending();
      setReymitRef('');
    }
  };

  const handleSubmitInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!userState.auth?.token) {
      setAuthOpen(true);
      return;
    }
    if (!fullName.trim() || !contact.trim() || !goalText.trim()) {
      setError(t.infoForm.errorRequired);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/info-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-jmora-token': userState.auth.token,
        },
        body: JSON.stringify({
          locale,
          fullName: fullName.trim(),
          contact: contact.trim(),
          gender,
          age: Number(age) || 26,
          heightCm: Number(heightCm) || 166,
          weightKg: Number(weightKg) || 62,
          goalText: goalText.trim(),
          experienceAndGear: experienceAndGear.trim(),
          injuriesNotes: injuriesNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      saveClientInfo(data.submission as ClientInfoSubmission);
      if (data.messages) setMessages(data.messages);
      setSubmittedNotice(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userState.auth?.token || !chatInput.trim()) return;
    setSendingMsg(true);
    try {
      const res = await fetch('/api/coach/thread', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-jmora-token': userState.auth.token,
        },
        body: JSON.stringify({ text: chatInput.trim(), locale }),
      });
      if (res.ok) {
        const data = (await res.json()) as { messages: CoachMessage[] };
        setMessages(data.messages);
        setChatInput('');
      }
    } finally {
      setSendingMsg(false);
    }
  };

  const handleUploadPrivatePhoto = async (
    file: File | undefined,
    which: 'before' | 'after'
  ) => {
    if (!file) return;
    setPrivError('');
    try {
      const url = await compressImageFile(file);
      if (which === 'before') setPrivBefore(url);
      else setPrivAfter(url);
    } catch {
      setPrivError(locale === 'fa' ? 'آپلود تصویر ناموفق بود.' : 'Failed to load image.');
    }
  };

  const handleSendPrivatePhotos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userState.auth?.token) return;
    setPrivError('');
    setPrivSuccess(false);
    if (!privBefore && !privAfter) {
      setPrivError(
        locale === 'fa'
          ? 'لطفاً حداقل یکی از عکس‌های قبل یا بعد را انتخاب کنید.'
          : 'Please attach at least one before or after photo.'
      );
      return;
    }
    setPrivSending(true);
    try {
      const res = await fetch('/api/progress-photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-jmora-token': userState.auth.token,
        },
        body: JSON.stringify({
          beforeImage: privBefore,
          afterImage: privAfter,
          weightKg: Number(weightKg) || undefined,
          note: privNote.trim(),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed');
      }
      setPrivBefore('');
      setPrivAfter('');
      setPrivNote('');
      setPrivSuccess(true);
    } catch (err) {
      setPrivError(err instanceof Error ? err.message : 'Error');
    } finally {
      setPrivSending(false);
    }
  };

  if (!isSignedIn) {
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

  if (!isUnlocked) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="jmora-card border border-[var(--jmora-accent)]/30 bg-white dark:bg-[#16161A] p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3">
            <Lock className="h-7 w-7 text-[var(--jmora-accent)] shrink-0" />
            <div>
              <h1 className="text-xl font-semibold">{t.muscleGuide.lockedTitle}</h1>
              <p className="mt-1 text-sm text-[#52525B] dark:text-[#A1A1AA]">
                {t.muscleGuide.lockedDesc}
              </p>
            </div>
          </div>

          {/* 3-Tier Selectable Coaching Packages */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]">
              {t.tiers.sectionTitle}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {tierOptions.map((tier) => {
                const active = selectedTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedTier(tier.id)}
                    className={`rounded-xl border p-4 text-start transition-all cursor-pointer ${
                      active
                        ? 'border-[var(--jmora-accent)] bg-[var(--jmora-accent)]/8 ring-1 ring-[var(--jmora-accent)]'
                        : 'border-black/10 dark:border-white/12 hover:border-[var(--jmora-accent)]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[var(--jmora-accent)]">
                      {tier.icon}
                      {active && <Check className="h-4 w-4" />}
                    </div>
                    <div className="mt-2.5 text-sm font-semibold">{tier.name}</div>
                    <p className="mt-1 text-xs leading-relaxed text-[#71717A]">{tier.desc}</p>
                    <div className="mt-3 font-mono-tabular text-base font-semibold text-[var(--jmora-accent)]">
                      {tier.price.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}{' '}
                      <span className="text-[11px] font-normal">
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
              <span className="font-mono-tabular text-lg font-semibold text-[var(--jmora-accent)]">
                {activeTierObj.price.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}{' '}
                {locale === 'fa' ? 'تومان' : 'Toman'}
              </span>
            </div>
            <a
              href={siteConfig.reymitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--jmora-accent)] px-5 py-2.5 text-xs font-medium text-white hover:opacity-90"
            >
              <span>{t.muscleGuide.payViaReymit}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {isPending ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-xs">
              <span>{t.muscleGuide.pendingTitle}</span>
              <button
                type="button"
                onClick={syncSessionFromServer}
                className="font-semibold text-[var(--jmora-accent)] cursor-pointer"
              >
                {locale === 'fa' ? 'بررسی وضعیت' : 'Refresh Status'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleUnlockRequest} className="space-y-3">
              <input
                type="text"
                value={reymitRef}
                onChange={(e) => setReymitRef(e.target.value)}
                placeholder={t.muscleGuide.reymitRefPlaceholder}
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2.5 text-sm"
              />
              {reqError && <p className="text-xs text-red-600">{reqError}</p>}
              <button
                type="submit"
                className="w-full rounded-lg bg-[#111111] dark:bg-[#F5F5F4] py-2.5 text-sm font-medium text-white dark:text-[#111111] cursor-pointer"
              >
                {t.muscleGuide.submitReceiptBtn}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{t.infoForm.title}</h1>
          <p className="mt-2 text-sm text-[#52525B] dark:text-[#A1A1AA]">{t.infoForm.subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--jmora-accent)]/35 bg-[var(--jmora-accent)]/10 px-3.5 py-1.5 text-xs font-semibold text-[var(--jmora-accent)]">
          <Crown className="h-3.5 w-3.5" />
          <span>{activeUserTierName}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Info & Goal Form */}
        <form
          onSubmit={handleSubmitInfo}
          className="lg:col-span-6 jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6 space-y-4"
        >
          {submittedNotice && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-700 dark:text-emerald-300">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t.infoForm.savedSuccess}
              </span>
              <button
                type="button"
                onClick={() => navigate('dashboard')}
                className="font-semibold underline cursor-pointer"
              >
                {t.infoForm.viewDashboard}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">{t.infoForm.fullName}</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm focus:border-[var(--jmora-accent)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">{t.infoForm.contact}</label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm focus:border-[var(--jmora-accent)] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['female', 'male'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`rounded-lg border py-2 text-xs font-medium cursor-pointer ${
                  gender === g
                    ? 'border-[var(--jmora-accent)] bg-[var(--jmora-accent)]/10 text-[var(--jmora-accent)]'
                    : 'border-black/12 dark:border-white/15'
                }`}
              >
                {t.infoForm[g]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium">{t.infoForm.age}</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm font-mono-tabular"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium">{t.infoForm.height}</label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm font-mono-tabular"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium">{t.infoForm.weight}</label>
              <input
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm font-mono-tabular"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--jmora-accent)]">
              {t.infoForm.goalLabel}
            </label>
            <textarea
              rows={3}
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              placeholder={t.infoForm.goalPlaceholder}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm focus:border-[var(--jmora-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">{t.infoForm.experienceLabel}</label>
            <input
              type="text"
              value={experienceAndGear}
              onChange={(e) => setExperienceAndGear(e.target.value)}
              placeholder={t.infoForm.experiencePlaceholder}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">{t.infoForm.injuriesLabel}</label>
            <input
              type="text"
              value={injuriesNotes}
              onChange={(e) => setInjuriesNotes(e.target.value)}
              placeholder={t.infoForm.injuriesPlaceholder}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[var(--jmora-accent)] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {submitting ? t.infoForm.submitting : t.infoForm.submitBtn}
          </button>
        </form>

        {/* Live Learning Thread With Coach / Assistant */}
        <div className="lg:col-span-6 jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] flex flex-col h-[560px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-black/8 dark:border-white/10 px-5 py-4">
            <div className="flex items-center gap-2">
              {siteConfig.aiAutoReply ? (
                <Bot className="h-4 w-4 text-[var(--jmora-accent)]" />
              ) : (
                <UserCheck className="h-4 w-4 text-[var(--jmora-accent)]" />
              )}
              <h2 className="text-sm font-semibold">{t.infoForm.coachChatTitle}</h2>
            </div>
            <button
              type="button"
              onClick={loadThread}
              aria-label="Refresh messages"
              className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#71717A]">
                {locale === 'fa'
                  ? 'اطلاعات خود را ثبت کنید یا اولین سوال تمرینی خود را از مربی بپرسید.'
                  : 'Submit your info or ask your coach your first training question.'}
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl p-3.5 text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'ms-8 bg-[var(--jmora-accent)] text-white'
                      : 'me-8 bg-[#F2F0EC] dark:bg-[#1F1F25] text-[#111111] dark:text-[#F5F5F4]'
                  }`}
                >
                  <div className="mb-1 text-[10px] font-semibold opacity-80">
                    {m.sender === 'user'
                      ? t.infoForm.senderUser
                      : m.sender === 'ai'
                        ? t.infoForm.senderAi
                        : t.infoForm.senderCoach}
                  </div>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={handleSendChat}
            className="flex items-center gap-2 border-t border-black/8 dark:border-white/10 p-3"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={t.infoForm.coachChatPlaceholder}
              className="flex-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs focus:border-[var(--jmora-accent)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={sendingMsg || !chatInput.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--jmora-accent)] px-4 py-2 text-xs font-medium text-white disabled:opacity-50 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{t.infoForm.coachSendBtn}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Private Progress Photos Check-In Directly to Coach */}
      <form
        onSubmit={handleSendPrivatePhotos}
        className="jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-[var(--jmora-accent)]" />
            <h2 className="text-base font-semibold">{t.transformations.submitTitle}</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600/12 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{locale === 'fa' ? 'ارسال کاملاً محرمانه به مربی' : 'Private to Coach Only'}</span>
          </span>
        </div>
        <p className="text-xs text-[#71717A]">{t.transformations.privacyBadge}</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/20 dark:border-white/20 p-4 text-center text-xs cursor-pointer hover:border-[var(--jmora-accent)]">
            <Upload className="h-4 w-4 text-[var(--jmora-accent)]" />
            <span>
              {privBefore
                ? locale === 'fa'
                  ? 'عکس قبل انتخاب شد ✓'
                  : 'Before Ready ✓'
                : locale === 'fa'
                  ? 'آپلود عکس قبل'
                  : 'Upload Before'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleUploadPrivatePhoto(e.target.files?.[0], 'before')}
            />
          </label>
          <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/20 dark:border-white/20 p-4 text-center text-xs cursor-pointer hover:border-[var(--jmora-accent)]">
            <Upload className="h-4 w-4 text-[var(--jmora-accent)]" />
            <span>
              {privAfter
                ? locale === 'fa'
                  ? 'عکس بعد انتخاب شد ✓'
                  : 'After Ready ✓'
                : locale === 'fa'
                  ? 'آپلود عکس بعد'
                  : 'Upload After'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleUploadPrivatePhoto(e.target.files?.[0], 'after')}
            />
          </label>
          <div className="flex flex-col justify-between gap-2">
            <input
              type="text"
              value={privNote}
              onChange={(e) => setPrivNote(e.target.value)}
              placeholder={
                locale === 'fa'
                  ? 'یادداشت کوتاه برای مربی (مثلاً هفته ۴ تمرین)'
                  : 'Short check-in note for coach'
              }
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs"
            />
            <button
              type="submit"
              disabled={privSending}
              className="w-full rounded-lg bg-[#111111] dark:bg-[#F5F5F4] py-2.5 text-xs font-medium text-white dark:text-[#111111] hover:bg-[var(--jmora-accent)] dark:hover:bg-[var(--jmora-accent)] dark:hover:text-white transition-colors cursor-pointer"
            >
              {privSending
                ? t.infoForm.submitting
                : locale === 'fa'
                  ? 'ارسال خصوصی به مربی'
                  : 'Send Privately to Coach'}
            </button>
          </div>
        </div>
        {privError && <p className="text-xs text-red-600">{privError}</p>}
        {privSuccess && (
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {t.transformations.submitSuccess}
          </p>
        )}
      </form>

      {/* Studio Rest Timer & Live Hydration/Protein/BMI Calculator */}
      <StudioFitnessTools
        locale={locale}
        initialWeightKg={Number(weightKg) || 65}
        initialHeightCm={Number(heightCm) || 168}
      />
    </div>
  );
}
