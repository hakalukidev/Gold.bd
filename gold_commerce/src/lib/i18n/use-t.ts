"use client";

import { useAppSelector } from "@/store/hooks";
import dictionary, { type Dictionary } from "@/lib/i18n/dictionary";

/** Returns the whole translation tree for the currently-selected locale. */
export function useT(): Dictionary {
  const locale = useAppSelector((state) => state.ui.locale);
  return dictionary[locale];
}
