import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  ARTICLES,
  DEFAULT_SITE_CONFIG,
  EXERCISES,
  FAQS,
  MUSCLES,
  PRODUCTS,
  SPONSORS,
  TRANSFORMATIONS,
} from '../data/catalog';
import type {
  Article,
  CartItem,
  ClientInfoSubmission,
  Exercise,
  FaqItem,
  GeneratedPlan,
  Locale,
  MuscleGroup,
  OnboardingProfile,
  OrderRecord,
  PageRoute,
  PaymentGateway,
  Product,
  SiteConfig,
  SponsorAd,
  ThemeMode,
  Transformation,
  UserAuth,
  UserState,
} from '../types/jmora';
import { installAntiCheat } from '../utils/antiCheat';

interface CatalogData {
  siteConfig: SiteConfig;
  muscles: MuscleGroup[];
  exercises: Exercise[];
  faqs: FaqItem[];
  products: Product[];
  sponsors: SponsorAd[];
  articles: Article[];
  transformations: Transformation[];
}

interface RouteState {
  page: PageRoute;
  muscleId?: string;
  articleId?: string;
}

interface AppContextValue {
  locale: Locale;
  theme: ThemeMode;
  route: RouteState;
  catalog: CatalogData;
  siteConfig: SiteConfig;
  userState: UserState;
  cart: CartItem[];
  isCartOpen: boolean;
  isSearchOpen: boolean;
  isAuthOpen: boolean;
  securityEjected: { reason: string; detail: string } | null;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
  toggleTheme: () => void;
  navigate: (page: PageRoute, params?: Partial<Omit<RouteState, 'page'>>) => void;
  setCartOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setAuthOpen: (open: boolean) => void;
  requireAuthenticatedAction: (fn: () => void) => void;
  addToCart: (productId: string, size: string, color: string) => void;
  updateCartQty: (productId: string, size: string, color: string, delta: number) => void;
  removeFromCart: (productId: string, size: string, color: string) => void;
  placeOrder: (payload: {
    customerName: string;
    phone: string;
    address: string;
    gateway: PaymentGateway;
  }) => Promise<OrderRecord>;
  addExerciseToPlan: (exerciseId: string) => void;
  toggleFavoriteExercise: (exerciseId: string) => void;
  toggleFavoriteProduct: (productId: string) => void;
  toggleDayComplete: (dayKey: string) => void;
  logWeight: (weightKg: number, waistCm?: number) => void;
  saveOnboardingPlan: (profile: OnboardingProfile, plan: GeneratedPlan) => void;
  saveClientInfo: (submission: ClientInfoSubmission) => void;
  addTicketId: (ticketId: string) => void;
  setUserAuth: (auth: UserAuth | null, syncedState?: UserState | null) => void;
  markCoachRequestPending: () => void;
  syncSessionFromServer: () => Promise<void>;
  refreshCatalog: () => Promise<void>;
  clearSecurityEjection: () => void;
}

const DEFAULT_USER_STATE: UserState = {
  auth: null,
  profile: null,
  savedInfo: null,
  ticketIds: [],
  plan: null,
  completedDays: {},
  customPlanExerciseIds: [],
  favoriteExerciseIds: [],
  favoriteProductIds: [],
  weightLog: [],
  orders: [],
  coachAccessUnlocked: false,
  coachRequestStatus: 'none',
};

const STORAGE_KEY_USER = 'jmora_user_state_v2';
const STORAGE_KEY_CART = 'jmora_cart_v2';
const STORAGE_KEY_LOCALE = 'jmora_locale_v1';
const STORAGE_KEY_THEME = 'jmora_theme_v1';

const AppContext = createContext<AppContextValue | null>(null);

const APP_BASE = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');

function parseInitialRoute(): RouteState {
  if (typeof window === 'undefined') return { page: 'home' };
  const params = new URLSearchParams(window.location.search);
  if (params.get('autostart') === '1') {
    return { page: 'onboarding' };
  }
  let rawPath = window.location.pathname;
  if (APP_BASE && rawPath.toLowerCase().startsWith(APP_BASE.toLowerCase())) {
    rawPath = rawPath.slice(APP_BASE.length);
  }
  const path = rawPath.replace(/^\/+|\/+$/g, '') as PageRoute;
  const valid: PageRoute[] = [
    'home',
    'muscle-guide',
    'onboarding',
    'dashboard',
    'shop',
    'transformations',
    'articles',
    'contact',
    'admin',
  ];
  return { page: valid.includes(path) ? path : 'home' };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LOCALE);
    return saved === 'en' || saved === 'fa' ? saved : 'fa';
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    return saved === 'dark' || saved === 'light' ? saved : 'light';
  });

  const [route, setRoute] = useState<RouteState>(parseInitialRoute);
  const [catalog, setCatalog] = useState<CatalogData>({
    siteConfig: DEFAULT_SITE_CONFIG,
    muscles: MUSCLES,
    exercises: EXERCISES,
    faqs: FAQS,
    products: PRODUCTS,
    sponsors: SPONSORS,
    articles: ARTICLES,
    transformations: TRANSFORMATIONS,
  });

  const [userState, setUserState] = useState<UserState>(() => {
    try {
      localStorage.removeItem('jmora_user_state_v1');
      localStorage.removeItem('jmora_cart_v1');
      const raw = localStorage.getItem(STORAGE_KEY_USER);
      if (raw) {
        const parsed = JSON.parse(raw) as UserState;
        // Never allow unsigned persisted session
        if (!parsed.auth?.token) {
          localStorage.removeItem(STORAGE_KEY_USER);
          return DEFAULT_USER_STATE;
        }
        return { ...DEFAULT_USER_STATE, ...parsed };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_USER_STATE;
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CART);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  });

  const [isCartOpen, setCartOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [isAuthOpen, setAuthOpen] = useState(false);
  const [securityEjected, setSecurityEjected] = useState<{ reason: string; detail: string } | null>(
    null
  );

  const siteConfig = catalog.siteConfig || DEFAULT_SITE_CONFIG;

  const refreshCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/catalog');
      if (res.ok) {
        const data = (await res.json()) as CatalogData;
        setCatalog(data);
        if (!localStorage.getItem(STORAGE_KEY_THEME) && data.siteConfig?.defaultTheme) {
          setTheme(data.siteConfig.defaultTheme);
        }
      }
    } catch {
      // keep local fallback
    }
  }, []);

  useEffect(() => {
    refreshCatalog();
  }, [refreshCatalog]);

  // Apply dynamic Admin Theme / Accent / Shape tokens live
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--jmora-accent', siteConfig.accentColor || '#EA580C');
    const radiusMap = {
      sharp: { control: '0.25rem', card: '0.375rem' },
      rounded: { control: '0.625rem', card: '1rem' },
      soft: { control: '1.125rem', card: '1.5rem' },
    }[siteConfig.radiusStyle || 'rounded'];
    root.style.setProperty('--jmora-radius', radiusMap.control);
    root.style.setProperty('--jmora-card-radius', radiusMap.card);
  }, [siteConfig.accentColor, siteConfig.radiusStyle]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
    localStorage.setItem(STORAGE_KEY_LOCALE, locale);
  }, [locale]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }, [theme]);

  // Install Anti-Cheat Guard
  useEffect(() => {
    const guard = installAntiCheat((reason, detail) => {
      const token = userState.auth?.token || '';
      fetch('/api/security/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-jmora-token': token } : {}),
        },
        body: JSON.stringify({ type: reason, detail }),
      }).catch(() => {});
      localStorage.removeItem('jmora_user_state_v1');
      localStorage.removeItem('jmora_cart_v1');
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_CART);
      setCart([]);
      setUserState(DEFAULT_USER_STATE);
      setCartOpen(false);
      setAuthOpen(false);
      setSecurityEjected({ reason, detail });
    });
    return () => guard.destroy();
  }, [userState.auth?.token]);

  // Persist user state when signed in
  useEffect(() => {
    try {
      if (!userState.auth?.token) {
        localStorage.removeItem(STORAGE_KEY_USER);
        return;
      }
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userState));
      fetch(`/api/user/${encodeURIComponent(userState.auth.id)}/state`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-jmora-token': userState.auth.token,
        },
        body: JSON.stringify({ state: userState }),
      }).catch(() => {});
    } catch {
      // ignore
    }
  }, [userState]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  useEffect(() => {
    const handlePop = () => {
      setRoute(parseInitialRoute());
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const syncSessionFromServer = useCallback(async () => {
    const auth = userState.auth;
    if (!auth?.id || !auth?.token) return;
    try {
      const [stateRes, ordersRes] = await Promise.all([
        fetch(`/api/user/${encodeURIComponent(auth.id)}/state`, {
          headers: { 'x-jmora-token': auth.token },
        }),
        fetch('/api/orders/mine', {
          headers: { 'x-jmora-token': auth.token },
        }),
      ]);
      if (stateRes.status === 401) {
        setUserState(DEFAULT_USER_STATE);
        return;
      }
      const stateJson = stateRes.ok ? await stateRes.json() : null;
      const ordersJson = ordersRes.ok ? await ordersRes.json() : null;

      setUserState((prev) => {
        if (!prev.auth) return prev;
        const unlocked = Boolean(stateJson?.coachAccessUnlocked ?? prev.coachAccessUnlocked);
        const coachTier = stateJson?.coachTier ?? prev.coachTier ?? prev.auth.coachTier;
        return {
          ...prev,
          ...(stateJson?.state || {}),
          auth: { ...prev.auth, coachAccessUnlocked: unlocked, coachTier },
          coachAccessUnlocked: unlocked,
          coachTier,
          orders: ordersJson?.orders ?? prev.orders,
        };
      });
    } catch {
      // ignore transient network errors
    }
  }, [userState.auth]);

  useEffect(() => {
    if (userState.auth?.token) {
      syncSessionFromServer();
    }
  }, [userState.auth?.id, userState.auth?.token]);

  const navigate = useCallback(
    (page: PageRoute, params?: Partial<Omit<RouteState, 'page'>>) => {
      const next: RouteState = { page, ...params };
      setRoute(next);
      const basePrefix = APP_BASE || '';
      const url = page === 'home' ? `${basePrefix}/` : `${basePrefix}/${page}`;
      window.history.pushState({}, '', url);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);
  const toggleLocale = useCallback(
    () => setLocaleState((prev) => (prev === 'fa' ? 'en' : 'fa')),
    []
  );
  const toggleTheme = useCallback(
    () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light')),
    []
  );

  const requireAuthenticatedAction = useCallback(
    (fn: () => void) => {
      if (!userState.auth?.token) {
        setAuthOpen(true);
        return;
      }
      fn();
    },
    [userState.auth]
  );

  const addToCart = useCallback(
    (productId: string, size: string, color: string) => {
      if (!userState.auth?.token) {
        setAuthOpen(true);
        return;
      }
      setCart((prev) => {
        const existing = prev.find(
          (i) => i.productId === productId && i.size === size && i.color === color
        );
        if (existing) {
          return prev.map((i) =>
            i.productId === productId && i.size === size && i.color === color
              ? { ...i, quantity: i.quantity + 1 }
              : i
          );
        }
        return [...prev, { productId, size, color, quantity: 1 }];
      });
      setCartOpen(true);
    },
    [userState.auth]
  );

  const updateCartQty = useCallback(
    (productId: string, size: string, color: string, delta: number) => {
      setCart((prev) =>
        prev
          .map((i) =>
            i.productId === productId && i.size === size && i.color === color
              ? { ...i, quantity: i.quantity + delta }
              : i
          )
          .filter((i) => i.quantity > 0)
      );
    },
    []
  );

  const removeFromCart = useCallback((productId: string, size: string, color: string) => {
    setCart((prev) =>
      prev.filter((i) => !(i.productId === productId && i.size === size && i.color === color))
    );
  }, []);

  const placeOrder = useCallback(
    async (payload: {
      customerName: string;
      phone: string;
      address: string;
      gateway: PaymentGateway;
    }) => {
      if (!userState.auth?.token) {
        setAuthOpen(true);
        throw new Error('Authentication required');
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-jmora-token': userState.auth.token,
        },
        body: JSON.stringify({ ...payload, items: cart }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to place order');
      }
      const data = (await res.json()) as { order: OrderRecord };
      setUserState((prev) => ({ ...prev, orders: [data.order, ...prev.orders] }));
      setCart([]);
      refreshCatalog();
      return data.order;
    },
    [cart, refreshCatalog, userState.auth]
  );

  const addExerciseToPlan = useCallback(
    (exerciseId: string) => {
      if (!userState.auth?.token) {
        setAuthOpen(true);
        return;
      }
      setUserState((prev) => {
        if (prev.customPlanExerciseIds.includes(exerciseId)) return prev;
        return {
          ...prev,
          customPlanExerciseIds: [...prev.customPlanExerciseIds, exerciseId],
        };
      });
    },
    [userState.auth]
  );

  const toggleFavoriteExercise = useCallback(
    (exerciseId: string) => {
      if (!userState.auth?.token) {
        setAuthOpen(true);
        return;
      }
      setUserState((prev) => {
        const exists = prev.favoriteExerciseIds.includes(exerciseId);
        return {
          ...prev,
          favoriteExerciseIds: exists
            ? prev.favoriteExerciseIds.filter((id) => id !== exerciseId)
            : [...prev.favoriteExerciseIds, exerciseId],
        };
      });
    },
    [userState.auth]
  );

  const toggleFavoriteProduct = useCallback(
    (productId: string) => {
      if (!userState.auth?.token) {
        setAuthOpen(true);
        return;
      }
      setUserState((prev) => {
        const exists = prev.favoriteProductIds.includes(productId);
        return {
          ...prev,
          favoriteProductIds: exists
            ? prev.favoriteProductIds.filter((id) => id !== productId)
            : [...prev.favoriteProductIds, productId],
        };
      });
    },
    [userState.auth]
  );

  const toggleDayComplete = useCallback((dayKey: string) => {
    setUserState((prev) => ({
      ...prev,
      completedDays: {
        ...prev.completedDays,
        [dayKey]: !prev.completedDays[dayKey],
      },
    }));
  }, []);

  const logWeight = useCallback(
    (weightKg: number, waistCm?: number) => {
      if (!userState.auth?.token) {
        setAuthOpen(true);
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      setUserState((prev) => ({
        ...prev,
        weightLog: [...prev.weightLog, { date: today, weightKg, waistCm }],
      }));
    },
    [userState.auth]
  );

  const saveOnboardingPlan = useCallback((profile: OnboardingProfile, plan: GeneratedPlan) => {
    setUserState((prev) => ({
      ...prev,
      profile,
      plan,
    }));
  }, []);

  const saveClientInfo = useCallback((submission: ClientInfoSubmission) => {
    setUserState((prev) => ({
      ...prev,
      savedInfo: submission,
    }));
  }, []);

  const addTicketId = useCallback((ticketId: string) => {
    setUserState((prev) => {
      const current = prev.ticketIds || [];
      if (current.includes(ticketId)) return prev;
      return {
        ...prev,
        ticketIds: [ticketId, ...current],
      };
    });
  }, []);

  const setUserAuth = useCallback((auth: UserAuth | null, syncedState?: UserState | null) => {
    if (!auth) {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_CART);
      setCart([]);
      setUserState(DEFAULT_USER_STATE);
      return;
    }
    setUserState({
      ...DEFAULT_USER_STATE,
      ...(syncedState || {}),
      auth,
      coachAccessUnlocked: Boolean(auth.coachAccessUnlocked || auth.isAdmin || syncedState?.coachAccessUnlocked),
      coachTier: auth.coachTier || syncedState?.coachTier || (auth.isAdmin ? 'private' : undefined),
    });
  }, []);

  const markCoachRequestPending = useCallback(() => {
    setUserState((prev) => ({
      ...prev,
      coachRequestStatus: 'pending',
    }));
  }, []);

  const clearSecurityEjection = useCallback(() => {
    try {
      localStorage.removeItem('jmora_user_state_v1');
      localStorage.removeItem('jmora_cart_v1');
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_CART);
    } catch {
      // ignore
    }
    setSecurityEjected(null);
    navigate('home');
  }, [navigate]);

  return (
    <AppContext.Provider
      value={{
        locale,
        theme,
        route,
        catalog,
        siteConfig,
        userState,
        cart,
        isCartOpen,
        isSearchOpen,
        isAuthOpen,
        securityEjected,
        setLocale,
        toggleLocale,
        toggleTheme,
        navigate,
        setCartOpen,
        setSearchOpen,
        setAuthOpen,
        requireAuthenticatedAction,
        addToCart,
        updateCartQty,
        removeFromCart,
        placeOrder,
        addExerciseToPlan,
        toggleFavoriteExercise,
        toggleFavoriteProduct,
        toggleDayComplete,
        logWeight,
        saveOnboardingPlan,
        saveClientInfo,
        addTicketId,
        setUserAuth,
        markCoachRequestPending,
        syncSessionFromServer,
        refreshCatalog,
        clearSecurityEjection,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
