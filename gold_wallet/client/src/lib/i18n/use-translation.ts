import { useAppSelector } from "@/store/hooks";
import { en, type Messages } from "./en";
import { bn } from "./bn";

const DICTS = { en, bn } satisfies Record<string, Messages>;

function lookup(dict: Messages, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((node, key) => {
    if (node && typeof node === "object" && key in node) return (node as Record<string, unknown>)[key];
    return undefined;
  }, dict);
  return typeof value === "string" ? value : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined ? match : String(value);
  });
}

/** Reads the active `en`/`bn` copy for the current `ui.locale` and returns a
 * `t("dot.path.to.key", vars?)` lookup — dev-only fallback returns the path
 * itself if a key is ever missing at runtime (the `Messages` type on `bn`
 * already prevents that at compile time). */
export function useTranslation() {
  const locale = useAppSelector((state) => state.ui.locale);
  const dict = DICTS[locale];

  function t(path: string, vars?: Record<string, string | number>): string {
    const template = lookup(dict, path) ?? path;
    return interpolate(template, vars);
  }

  return { t, locale };
}
