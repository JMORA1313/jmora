import React, { useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getT } from '../i18n/translations';

export function FloatingChat() {
  const { locale, navigate } = useApp();
  const t = getT(locale);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ from: 'team' | 'user'; text: string }[]>([
    {
      from: 'team',
      text:
        locale === 'fa'
          ? 'سلام! برای پرسش یا پیگیری سفارش می‌توانید از سیستم تیکت سایت استفاده کنید.'
          : 'Hi! Use the in-site support ticket system for questions or order updates.',
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [
      ...prev,
      { from: 'user', text: userMsg },
      {
        from: 'team',
        text:
          locale === 'fa'
            ? 'برای ثبت رسمی و دریافت پاسخ ادمین، روی «تیکت و پشتیبانی» در زیر کلیک کنید.'
            : 'To log your request and receive an admin reply, open Support Tickets below.',
      },
    ]);
  };

  return (
    <div className="fixed bottom-16 md:bottom-4 end-4 z-40">
      {open ? (
        <div className="w-80 overflow-hidden rounded-2xl border border-black/10 dark:border-white/15 bg-white dark:bg-[#16161A] shadow-2xl">
          <div className="flex items-center justify-between bg-[#111111] dark:bg-[#1F1F25] px-4 py-3 text-white">
            <span className="text-xs font-semibold">{t.contact.chatTitle}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close support chat"
              className="rounded p-1 hover:bg-white/10 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-60 space-y-2.5 overflow-y-auto p-3 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`rounded-xl px-3 py-2 leading-relaxed ${
                  m.from === 'user'
                    ? 'ms-6 bg-[#EA580C] text-white'
                    : 'me-6 bg-[#F2F0EC] dark:bg-[#1F1F25] text-[#111111] dark:text-[#F5F5F4]'
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 border-t border-black/8 dark:border-white/10 p-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.contact.chatPlaceholder}
              className="flex-1 bg-transparent px-2 py-1.5 text-xs focus:outline-none"
            />
            <button
              type="submit"
              aria-label={t.contact.send}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EA580C] text-white cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
          <div className="border-t border-black/5 dark:border-white/5 px-3 py-1.5 text-center">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('contact');
              }}
              className="text-[11px] font-medium text-[#EA580C] hover:underline cursor-pointer"
            >
              {t.nav.contact}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.contact.chatTitle}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#111111] dark:bg-[#F5F5F4] text-white dark:text-[#111111] shadow-lg hover:bg-[#EA580C] dark:hover:bg-[#EA580C] dark:hover:text-white transition-colors cursor-pointer"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
