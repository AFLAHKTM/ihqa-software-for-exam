"use client";

import Link from "next/link";
import { Globe, ShieldCheck, UserCheck } from "lucide-react";
import { useLocale } from "./LocaleContext";
import type { UiLocale } from "@/lib/i18n";

export function BrandHeader({
  showPortalLinks = true,
  rightSlot,
}: {
  showPortalLinks?: boolean;
  rightSlot?: React.ReactNode;
}) {
  const { locale, setLocale, t } = useLocale();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#e2dddb]">
      {/* Top institutional bar matching indiaquranaward.com --header_top_bg_color */}
      <div className="bg-[#034ea2] text-white text-xs py-1.5 px-4">
        <div className="max-w-[1220px] mx-auto flex items-center justify-between gap-4">
          <span className="truncate opacity-95 font-medium">
            {t.examSubtitle}
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="https://indiaquranaward.com/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#f0b64f] transition-colors hidden sm:inline"
            >
              indiaquranaward.com
            </a>
            <span className="hidden sm:inline text-white/40">|</span>
            <div className="flex items-center gap-1" aria-label="Language selector">
              <Globe className="w-3.5 h-3.5 text-[#f0b64f] mr-0.5" />
              {(["en", "ml", "ar"] as UiLocale[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLocale(code)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    locale === code
                      ? "bg-[#f0b64f] text-[#1c1c1c]"
                      : "text-white/85 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {code === "en" ? "EN" : code === "ml" ? "മലയാളം" : "العربية"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="max-w-[1220px] mx-auto px-4 sm:px-6 h-[76px] flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3.5 group">
          <img
            src="/brand/IHQA_Logo.svg"
            alt="India Holy Quran Award Logo"
            className="h-12 w-auto object-contain"
          />
          <div className="hidden sm:block border-l border-[#e2dddb] pl-3.5">
            <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#034ea2]">
              Kerala State Portal
            </div>
            <div className="text-sm font-semibold text-[#1c1c1c]">
              {t.examTitle}
            </div>
          </div>
        </Link>

        {rightSlot ? (
          rightSlot
        ) : showPortalLinks ? (
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/judge/login"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#1c1c1c] hover:text-[#034ea2] transition-colors"
            >
              <UserCheck className="w-4 h-4 text-[#53be95]" />
              <span className="hidden md:inline">{t.judgePortal}</span>
            </Link>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#1c1c1c] hover:text-[#034ea2] transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-[#034ea2]" />
              <span className="hidden md:inline">{t.adminPortal}</span>
            </Link>
            <Link
              href="/login"
              className="ihqa-btn-gold px-4 sm:px-5 py-2.5 text-sm inline-flex items-center gap-2"
            >
              {t.studentLogin}
            </Link>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
