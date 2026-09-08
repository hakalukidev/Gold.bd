"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLocale } from "@/store/slices/ui-slice";
import { cn } from "@/lib/utils";
import { BdFlagIcon, UsFlagIcon } from "@/components/shared/flag-icons";
import { useTranslation } from "@/lib/i18n/use-translation";

/** Flag chip for the dashboard chrome — shows the currently active language's
 * flag + label and flips to the other locale on click. Styled as a
 * self-contained dark/green badge rather than following the surrounding
 * theme tokens, same reasoning as the landing header's fixed dark palette
 * (see CLAUDE.md): a language switch should read the same regardless of the
 * page's own light/dark surface. */
export function LanguageToggle({ className }: { className?: string }) {
  const locale = useAppSelector((state) => state.ui.locale);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const isEnglish = locale === "en";
  const Flag = isEnglish ? UsFlagIcon : BdFlagIcon;

  return (
    <button
      type="button"
      onClick={() => dispatch(setLocale(isEnglish ? "bn" : "en"))}
      aria-label={isEnglish ? t("languageToggle.switchToBangla") : t("languageToggle.switchToEnglish")}
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-emerald-500/80 bg-[#0b1424] py-1 pl-1.5 pr-2.5",
        "shadow-[0_0_0_3px_rgba(16,185,129,0.15)] transition-shadow hover:shadow-[0_0_0_4px_rgba(16,185,129,0.25)]",
        className
      )}
    >
      <Flag className="h-3.5 w-5 rounded-xs" />
      <span className="text-xs font-semibold text-white">
        {isEnglish ? t("languageToggle.enLabel") : t("languageToggle.bnLabel")}
      </span>
    </button>
  );
}
