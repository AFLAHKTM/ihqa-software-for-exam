"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { UI_COPY, type UiLocale } from "@/lib/i18n";

interface LocaleContextValue {
  locale: UiLocale;
  setLocale: (l: UiLocale) => void;
  t: (typeof UI_COPY)["en"];
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  t: UI_COPY.en,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<UiLocale>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("ihqa_locale") as UiLocale | null;
    if (saved && ["en", "ml", "ar"].includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (next: UiLocale) => {
    setLocaleState(next);
    window.localStorage.setItem("ihqa_locale", next);
  };

  const t = UI_COPY[locale];

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      <div dir={t.dir} className="min-h-screen flex flex-col">
        {children}
      </div>
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
