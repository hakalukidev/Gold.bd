const GOLD_WORD_PATTERN = /(gold|গোল্ড)/gi;

/**
 * Splits a heading on the word "gold"/"গোল্ড" and colors just that part with
 * the brand gold accent, leaving the rest in `baseClassName` — the two-color
 * section title treatment ("Gold" + rest) used across the landing pages.
 */
export function GoldTitle({
  text,
  baseClassName = "text-neutral-900 dark:text-white",
}: {
  text: string;
  baseClassName?: string;
}) {
  const parts = text.split(GOLD_WORD_PATTERN);
  return (
    <span className={baseClassName}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="text-gold">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
}
