"use client";

import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/store/store";
import { setLocale, type Locale } from "@/store/slices/ui-slice";

const LOCALE_STORAGE_KEY = "gold-bd-locale";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // One store per component instance (not module scope) so server-rendered
  // requests never leak state between users — see Redux Toolkit's Next.js guide.
  // useState's lazy initializer (not useRef) runs exactly once per mount, and
  // avoids the "no ref access during render" rule the React Compiler enforces.
  const [store] = useState(makeStore);

  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === "bn" || saved === "en") {
      store.dispatch(setLocale(saved));
    }

    let prevLocale: Locale = store.getState().ui.locale;
    const unsubscribe = store.subscribe(() => {
      const locale = store.getState().ui.locale;
      if (locale !== prevLocale) {
        prevLocale = locale;
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      }
    });
    return unsubscribe;
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}
