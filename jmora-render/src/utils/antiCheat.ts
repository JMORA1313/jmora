export interface AntiCheatCleanup {
  destroy: () => void;
}

export function installAntiCheat(
  onEject: (reason: string, detail: string) => void
): AntiCheatCleanup {
  let ejected = false;

  const trigger = (reason: string, detail: string) => {
    if (ejected) return;
    ejected = true;
    onEject(reason, detail);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    const ctrlOrMeta = e.ctrlKey || e.metaKey;

    // Ctrl+Shift+I / Cmd+Option+I (DevTools Inspect)
    if (ctrlOrMeta && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) {
      e.preventDefault();
      e.stopPropagation();
      trigger('devtools_shortcut', `Blocked key combination: ${e.ctrlKey ? 'Ctrl' : 'Cmd'}+Shift+${key.toUpperCase()}`);
      return;
    }
    // macOS Cmd+Option+I/J/C
    if (e.metaKey && e.altKey && (key === 'i' || key === 'j' || key === 'c')) {
      e.preventDefault();
      e.stopPropagation();
      trigger('devtools_shortcut', `Blocked macOS DevTools shortcut: Cmd+Opt+${key.toUpperCase()}`);
      return;
    }
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      trigger('devtools_f12', 'Blocked F12 inspector shortcut');
      return;
    }
    // Ctrl+U (View Source)
    if (ctrlOrMeta && key === 'u') {
      e.preventDefault();
      e.stopPropagation();
      trigger('view_source_shortcut', 'Blocked view-source shortcut');
    }
  };

  const handleContextMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }
    e.preventDefault();
  };

  // Silently purge legacy v1 storage keys so returning users never trigger false-positive tamper alerts
  try {
    localStorage.removeItem('jmora_user_state_v1');
    localStorage.removeItem('jmora_cart_v1');
  } catch {
    // ignore storage access issues
  }

  // Detect live localStorage admin tampering on active v2 session without a valid signed token
  const handleStorageTamperCheck = () => {
    try {
      const raw = localStorage.getItem('jmora_user_state_v2');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { auth?: { isAdmin?: boolean; token?: string } | null };
      if (parsed?.auth?.isAdmin && !parsed.auth.token) {
        localStorage.removeItem('jmora_user_state_v2');
        trigger('storage_tamper', 'Unsigned admin privilege tampering detected in localStorage');
      }
    } catch {
      // ignore JSON parse issues
    }
  };

  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('contextmenu', handleContextMenu);
  window.addEventListener('storage', handleStorageTamperCheck);
  const tamperTimer = window.setInterval(handleStorageTamperCheck, 4000);

  return {
    destroy: () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('storage', handleStorageTamperCheck);
      window.clearInterval(tamperTimer);
    },
  };
}
