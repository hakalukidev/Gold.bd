import Image from "next/image";
import { Landmark, Wallet as WalletIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Selected-state look for the product / preset / payment toggle rows used
// on the buy-gold, sell-gold, and wallet pages — a solid gold fill, matching
// the reference design's active-chip style. `!important` beats the outline
// button variant's own `dark:bg-input/30` etc., which otherwise wins the
// cascade over a plain (non-dark-scoped) override.
export const SELECTED_GOLD = "!border-gold !bg-gold !text-ink hover:!bg-gold-light";

/** Real brand marks where one's already checked into public/payment-logos
 * (bKash, Nagad, Rocket, Visa/Mastercard for "Card") — bank transfer doesn't
 * have an asset there, so that one falls back to a plain icon rather than a
 * fabricated logo. */
export function PaymentLogo({ methodKey }: { methodKey: string }) {
  switch (methodKey) {
    case "bkash":
      return <Image src="/payment-logos/bkash.svg" alt="bKash" width={48} height={32} className="h-5 w-auto" />;
    case "nagad":
      return <Image src="/payment-logos/nagad.svg" alt="Nagad" width={48} height={32} className="h-5 w-auto" />;
    case "rocket":
      return <Image src="/payment-logos/rocket.svg" alt="Rocket" width={48} height={19} className="h-4 w-auto" />;
    case "card":
      return (
        <span className="flex items-center gap-1">
          <Image src="/payment-logos/visa.svg" alt="Visa" width={40} height={24} className="h-4 w-auto" />
          <Image src="/payment-logos/mastercard.svg" alt="Mastercard" width={28} height={17} className="h-4 w-auto" />
        </span>
      );
    case "bank":
      return <Landmark className="size-4" strokeWidth={1.75} />;
    default:
      return <WalletIcon className="size-4" strokeWidth={1.75} />;
  }
}

/** Selectable payment-method chip — logo/icon + label + optional subtext
 * (e.g. a wallet balance), with a "Soon" badge for methods that aren't wired
 * to a real integration yet. Shared by the buy-gold and wallet Add money
 * panels, which both offer the same bKash/Nagad/Rocket/Bank/Card set. */
export function PaymentMethodButton({
  method,
  selected,
  subtext,
  onSelect,
  className,
}: {
  method: { key: string; label: string; enabled: boolean };
  selected: boolean;
  subtext?: string;
  onSelect: (key: string, enabled: boolean) => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={selected}
      aria-disabled={!method.enabled}
      onClick={() => onSelect(method.key, method.enabled)}
      className={cn(
        "h-auto justify-between gap-2 rounded-md py-2.5 font-medium whitespace-normal",
        selected && SELECTED_GOLD,
        !method.enabled && "opacity-60",
        className
      )}
    >
      <span className="flex items-center gap-2">
        <PaymentLogo methodKey={method.key} />
        {method.label}
        {subtext && <span className={cn("text-xs", selected ? "text-ink/70" : "text-muted-foreground")}>({subtext})</span>}
      </span>
      {!method.enabled && (
        <Badge variant="secondary" className="text-[10px]">
          Soon
        </Badge>
      )}
    </Button>
  );
}
