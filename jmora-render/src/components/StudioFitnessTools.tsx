import { useEffect, useRef, useState } from 'react';
import { Droplets, Pause, Play, RotateCcw, Timer, Zap } from 'lucide-react';
import type { Locale } from '../types/jmora';
import { calculateDailyTargets } from '../utils/fitnessCalc';

interface StudioFitnessToolsProps {
  locale: Locale;
  initialWeightKg?: number;
  initialHeightCm?: number;
}

function playStudioChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.46);
  } catch {
    // ignore audio restrictions
  }
}

export function StudioFitnessTools({
  locale,
  initialWeightKg = 68,
  initialHeightCm = 172,
}: StudioFitnessToolsProps) {
  // Interactive Rest Timer
  const [presetSeconds, setPresetSeconds] = useState(60);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [running, setRunning] = useState(false);
  const chimeDoneRef = useRef(false);

  // Hydration & Protein Live Calculator
  const [weightKg, setWeightKg] = useState(initialWeightKg);
  const [heightCm, setHeightCm] = useState(initialHeightCm);
  const [activity, setActivity] = useState<'light' | 'moderate' | 'intense'>('moderate');

  useEffect(() => {
    setWeightKg(initialWeightKg);
  }, [initialWeightKg]);

  useEffect(() => {
    setHeightCm(initialHeightCm);
  }, [initialHeightCm]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          if (!chimeDoneRef.current) {
            chimeDoneRef.current = true;
            playStudioChime();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const selectPreset = (sec: number) => {
    setRunning(false);
    chimeDoneRef.current = false;
    setPresetSeconds(sec);
    setSecondsLeft(sec);
  };

  const toggleTimer = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(presetSeconds);
      chimeDoneRef.current = false;
    }
    setRunning((r) => !r);
  };

  const resetTimer = () => {
    setRunning(false);
    chimeDoneRef.current = false;
    setSecondsLeft(presetSeconds);
  };

  const progress = presetSeconds > 0 ? secondsLeft / presetSeconds : 0;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const targets = calculateDailyTargets(weightKg, heightCm, activity);

  const bmiLabel = {
    underweight: locale === 'fa' ? 'کم‌وزن' : 'Underweight',
    healthy: locale === 'fa' ? 'متعادل و استاندارد' : 'Healthy Range',
    overweight: locale === 'fa' ? 'اضافه‌وزن ملایم' : 'Elevated',
    obese: locale === 'fa' ? 'نیازمند برنامه چربی‌سوزی' : 'Focus Fat Loss',
  }[targets.bmiCategory];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Studio Rest Timer Card */}
      <div className="lg:col-span-5 jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-[var(--jmora-accent)]" />
            <h3 className="text-sm font-semibold">
              {locale === 'fa' ? 'تایمر استراحت بین ست‌ها' : 'Studio Set Rest Timer'}
            </h3>
          </div>
          <span className="text-[11px] text-[#71717A]">
            {locale === 'fa' ? 'با زنگ پایان' : 'With Chime'}
          </span>
        </div>

        <div className="my-5 flex items-center justify-center">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg viewBox="0 0 110 110" className="h-32 w-32 -rotate-90">
              <circle
                cx="55"
                cy="55"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeWidth="7"
              />
              <circle
                cx="55"
                cy="55"
                r={radius}
                fill="none"
                stroke="var(--jmora-accent)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-[stroke-dashoffset] duration-500 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                dir="ltr"
                className="font-mono-tabular text-2xl font-semibold tracking-tight"
              >
                {formattedTime}
              </span>
              <span className="text-[10px] text-[#71717A]">
                {secondsLeft === 0
                  ? locale === 'fa'
                    ? 'ست بعدی!'
                    : 'Next Set!'
                  : running
                    ? locale === 'fa'
                      ? 'در حال شمارش'
                      : 'Resting'
                    : locale === 'fa'
                      ? 'آماده'
                      : 'Ready'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-1.5">
            {[30, 60, 90, 120].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => selectPreset(sec)}
                className={`rounded-lg py-1.5 text-xs font-mono-tabular font-medium cursor-pointer transition-colors ${
                  presetSeconds === sec
                    ? 'bg-[var(--jmora-accent)] text-white'
                    : 'bg-[#F2F0EC] dark:bg-[#1F1F25] text-[#52525B] dark:text-[#A1A1AA]'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleTimer}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#111111] dark:bg-[#F5F5F4] py-2 text-xs font-medium text-white dark:text-[#111111] hover:bg-[var(--jmora-accent)] dark:hover:bg-[var(--jmora-accent)] dark:hover:text-white transition-colors cursor-pointer"
            >
              {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>
                {running
                  ? locale === 'fa'
                    ? 'توقف'
                    : 'Pause'
                  : locale === 'fa'
                    ? 'شروع تایمر'
                    : 'Start Timer'}
              </span>
            </button>
            <button
              type="button"
              onClick={resetTimer}
              aria-label={locale === 'fa' ? 'بازنشانی تایمر' : 'Reset timer'}
              className="rounded-lg border border-black/15 dark:border-white/15 px-3 py-2 hover:border-[var(--jmora-accent)] cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Hydration, Protein & BMI Studio Calculator */}
      <div className="lg:col-span-7 jmora-card border border-black/8 dark:border-white/10 bg-white dark:bg-[#16161A] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-[var(--jmora-accent)]" />
            <h3 className="text-sm font-semibold">
              {locale === 'fa'
                ? 'محاسبه‌گر هوشمند آب روزانه، پروتئین و BMI'
                : 'Live Hydration, Protein & BMI Calculator'}
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-[var(--jmora-accent)]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--jmora-accent)]">
            <Zap className="h-3 w-3" />
            <span>BMI {targets.bmi} · {bmiLabel}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#71717A]">
              {locale === 'fa' ? 'وزن (کیلوگرم)' : 'Weight (kg)'}
            </label>
            <input
              type="number"
              min={30}
              max={220}
              value={weightKg}
              onChange={(e) => setWeightKg(Number(e.target.value) || 65)}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs font-mono-tabular focus:border-[var(--jmora-accent)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#71717A]">
              {locale === 'fa' ? 'قد (سانتی‌متر)' : 'Height (cm)'}
            </label>
            <input
              type="number"
              min={120}
              max={230}
              value={heightCm}
              onChange={(e) => setHeightCm(Number(e.target.value) || 170)}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-xs font-mono-tabular focus:border-[var(--jmora-accent)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#71717A]">
              {locale === 'fa' ? 'شدت تمرین روزانه' : 'Training Intensity'}
            </label>
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value as 'light' | 'moderate' | 'intense')}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-[#16161A] px-3 py-2 text-xs"
            >
              <option value="light">{locale === 'fa' ? 'سبک (۱ تا ۲ جلسه)' : 'Light'}</option>
              <option value="moderate">{locale === 'fa' ? 'متوسط (۳ تا ۴ جلسه)' : 'Moderate'}</option>
              <option value="intense">{locale === 'fa' ? 'سنگین (۵+ جلسه)' : 'Intense'}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[#FAF9F7] dark:bg-[#1F1F25] p-3.5">
            <div className="text-[11px] text-[#71717A]">
              {locale === 'fa' ? 'نیاز آب روزانه' : 'Daily Water'}
            </div>
            <div dir="ltr" className="mt-1 font-mono-tabular text-lg font-semibold text-[var(--jmora-accent)] w-fit">
              {targets.waterLiters} L
            </div>
          </div>
          <div className="rounded-xl bg-[#FAF9F7] dark:bg-[#1F1F25] p-3.5">
            <div className="text-[11px] text-[#71717A]">
              {locale === 'fa' ? 'معادل بطری ۵۰۰ml آب JMORA' : 'JMORA 500ml Bottles'}
            </div>
            <div className="mt-1 font-mono-tabular text-lg font-semibold">
              {targets.mineralBottles500ml} {locale === 'fa' ? 'بطری' : 'bottles'}
            </div>
          </div>
          <div className="rounded-xl bg-[#FAF9F7] dark:bg-[#1F1F25] p-3.5">
            <div className="text-[11px] text-[#71717A]">
              {locale === 'fa' ? 'پروتئین پیشنهادی روزانه' : 'Daily Protein Target'}
            </div>
            <div dir="ltr" className="mt-1 font-mono-tabular text-lg font-semibold w-fit">
              {targets.proteinMinG}–{targets.proteinMaxG} g
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
