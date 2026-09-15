"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, X } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { removeFromCart } from "@/store/slices/cart-slice";
import { useT } from "@/lib/i18n/use-t";
import { formatBDT } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Navbar cart icon + a small preview dropdown — reads the client-only cart
 * slice populated by products-section.tsx's "add to cart" buttons. */
export function CartButton({ className }: { className?: string }) {
  const t = useT();
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.cart.items);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.unitPriceBDT * item.quantity, 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={count > 0 ? `${t.nav.cart} (${count})` : t.nav.cart}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-full text-neutral-600 outline-none transition-colors hover:bg-black/10 hover:text-gold data-popup-open:bg-black/10 data-popup-open:text-gold dark:text-neutral-200 dark:hover:bg-white/10 dark:data-popup-open:bg-white/10",
          className
        )}
      >
        <ShoppingCart className="size-4.5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 min-w-4 items-center justify-center rounded-full bg-gold px-0.5 text-[10px] font-bold text-ink">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-80 max-w-[90vw] border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-ink-light"
      >
        {items.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">{t.nav.cartEmpty}</p>
        ) : (
          <>
            <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/5">
                  <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/5 dark:bg-black">
                    <Image src={item.image} alt={item.name} width={44} height={44} className="size-full object-contain p-1" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-neutral-900 dark:text-white">{item.name}</p>
                    <p className="text-[11px] text-muted-white">
                      {item.quantity} × {formatBDT(item.unitPriceBDT)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={t.nav.cartRemove}
                    onClick={() => dispatch(removeFromCart(item.id))}
                    className="flex size-6 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-black/10 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-black/10 pt-3 text-sm dark:border-white/10">
              <span className="text-neutral-600 dark:text-neutral-300">{t.nav.cartSubtotal}</span>
              <span className="font-bold text-gold">{formatBDT(subtotal)}</span>
            </div>
            <Button
              variant="gold-solid"
              size="lg"
              nativeButton={false}
              className="mt-3 w-full text-xs"
              render={<Link href="/checkout">{t.nav.cartCheckout}</Link>}
            />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
