"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLocale } from "@/store/slices/ui-slice";
import { cn } from "@/lib/utils";
import { BdFlagIcon, UkFlagIcon } from "@/components/shared/flag-icons";
import { useTranslation } from "@/lib/i18n/use-translation";

/** Flag chip for the dashboard chrome — shows the currently active language's
 * flag + label and flips to the other locale on click. Follows the app's
 * light/dark theme tokens (bg-muted/text-foreground) like everything else in
 * the topbar, with a green accent border/glow as its one fixed brand touch —
 * a hardcoded dark navy fill here (this component's previous styling) reads
 * fine against a dark topbar but sticks out as a stray dark patch once the
 * surrounding chrome switches to light mode. */
export function LanguageToggle({ className }: { className?: string }) {
  const locale = useAppSelector((state) => state.ui.locale);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const isEnglish = locale === "en";
  const Flag = isEnglish ? UkFlagIcon : BdFlagIcon;

  return (
    <button
      type="button"
      onClick={() => dispatch(setLocale(isEnglish ? "bn" : "en"))}
      aria-label={isEnglish ? t("languageToggle.switchToBangla") : t("languageToggle.switchToEnglish")}
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-emerald-500/60 bg-muted py-1 pl-1.5 pr-2.5",
        "shadow-[0_0_0_3px_rgba(16,185,129,0.12)] transition-shadow hover:shadow-[0_0_0_4px_rgba(16,185,129,0.22)]",
        className
      )}
    >
      <Flag className="h-3.5 w-5 rounded-xs" />
      <span className="text-xs font-semibold text-foreground">
        {isEnglish ? t("languageToggle.enLabel") : t("languageToggle.bnLabel")}
      </span>
    </button>
  );
}
