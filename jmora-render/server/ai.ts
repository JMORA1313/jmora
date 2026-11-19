import { GoogleGenAI } from '@google/genai';
import type { ClientInfoSubmission, CoachMessage, Locale } from '../src/types/jmora.ts';

function buildFallbackCoachReply(
  locale: Locale,
  userInfo: ClientInfoSubmission | null | undefined,
  latestMessage: string
): string {
  if (locale === 'en') {
    const goalLine = userInfo?.goalText
      ? `Based on your goal ("${userInfo.goalText.slice(0, 120)}"), focus on 3–4 weekly resistance sessions, 1.8g/kg daily protein, and 7+ hours of sleep.`
      : 'Stay consistent with compound movements, progressive overload, and clean hydration.';
    return `JMORA Coach Note: Received "${latestMessage.slice(0, 90)}". ${goalLine} Keep logging your sets and weights so we can adjust week by week.`;
  }

  const goalLine = userInfo?.goalText
    ? `با توجه به هدف ثبت‌شده شما («${userInfo.goalText.slice(0, 120)}»)، تمرکز اصلی را روی ۳ تا ۴ جلسه تمرین مقاومتی کنترل‌شده در هفته، دریافت پروتئین کافی و خواب منظم بگذارید.`
    : 'تداوم در اجرای صحیح حرکات پایه، کنترل ریتم منفی و نوشیدن آب معدنی کافی کلید پیشرفت شماست.';
  return `پیام مربی هوشمند JMORA: پیام شما دریافت شد. ${goalLine} اگر سوالی درباره جایگزینی حرکت یا تغذیه دارید همینجا بنویسید تا راهنمایی دقیق‌تری دریافت کنید.`;
}

export async function generateCoachReply(params: {
  locale: Locale;
  userName: string;
  userInfo?: ClientInfoSubmission | null;
  history: CoachMessage[];
  latestMessage: string;
}): Promise<string> {
  const { locale, userName, userInfo, history, latestMessage } = params;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return buildFallbackCoachReply(locale, userInfo, latestMessage);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const profileContext = userInfo
      ? `Client Stats: Name=${userInfo.fullName}, Gender=${userInfo.gender}, Age=${userInfo.age}, Height=${userInfo.heightCm}cm, Weight=${userInfo.weightKg}kg, Goal="${userInfo.goalText}", Experience/Gear="${userInfo.experienceAndGear}", Injuries/Notes="${userInfo.injuriesNotes}"`
      : `Client Name=${userName}. No body metrics submitted yet.`;

    const recentHistory = history
      .slice(-6)
      .map((m) => `${m.sender.toUpperCase()}: ${m.text}`)
      .join('\n');

    const prompt = [
      `You are a supportive, concise, evidence-based athletic strength & nutrition coach for JMORA.`,
      `Reply in ${locale === 'en' ? 'clear concise English' : 'clear warm natural Persian (Farsi)'}.`,
      `Keep your reply practical, safe, structured in 2–4 short sentences or bullets (max 150 words), and avoid medical claims.`,
      profileContext,
      recentHistory ? `Recent Conversation:\n${recentHistory}` : '',
      `Latest Client Message: ${latestMessage}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 8000);
    });

    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
      }),
      timeoutPromise,
    ]);

    const text = (response && 'text' in response ? response.text || '' : '').trim();
    if (!text) {
      return buildFallbackCoachReply(locale, userInfo, latestMessage);
    }
    return text;
  } catch (err) {
    console.warn('Gemini coach fallback triggered:', err instanceof Error ? err.message : err);
    return buildFallbackCoachReply(locale, userInfo, latestMessage);
  }
}
