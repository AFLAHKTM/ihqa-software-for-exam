"use client";

import Link from "next/link";
import { useLocale } from "./LocaleContext";

export function BrandFooter() {
  const { t } = useLocale();

  return (
    <footer className="mt-auto bg-[#034ea2] text-white border-t-4 border-[#53be95]">
      <div className="max-w-[1220px] mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="space-y-3">
            <img
              src="/brand/IHQA_Logo-1.svg"
              alt="India Holy Quran Award"
              className="h-12 w-auto"
            />
            <p className="text-sm text-white/80 max-w-sm leading-relaxed">
              {t.purposeQuote}
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <h3 className="font-semibold text-[#f0b64f] tracking-wide uppercase text-xs">
              Examination Ecosystem
            </h3>
            <ul className="space-y-1.5 text-white/85">
              <li>
                <Link href="/login" className="hover:text-[#f0b64f] transition-colors">
                  Student Portal &amp; Screening
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#f0b64f] transition-colors">
                  Live Recitation Assessment
                </Link>
              </li>
              <li>
                <Link href="/judge/login" className="hover:text-[#f0b64f] transition-colors">
                  Judge Assessment Portal
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-[#f0b64f] transition-colors">
                  Central Administration
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2 text-sm">
            <h3 className="font-semibold text-[#f0b64f] tracking-wide uppercase text-xs">
              Official Governance
            </h3>
            <p className="text-white/80 leading-relaxed">
              Official Kerala State Initial Screening &amp; Live Recitation Assessment
              extension of{" "}
              <a
                href="https://indiaquranaward.com/"
                target="_blank"
                rel="noreferrer"
                className="underline text-[#f0b64f] hover:text-white"
              >
                indiaquranaward.com
              </a>
              .
            </p>
            <p className="text-xs text-white/65">
              Live recitation sessions operate strictly without server-side audio or
              video recording.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/70">
          <span>
            &copy; {new Date().getFullYear()} India Holy Quran Award — Kerala State Examination Board.
          </span>
          <span>Designed for 14 Districts of Kerala</span>
        </div>
      </div>
    </footer>
  );
}
