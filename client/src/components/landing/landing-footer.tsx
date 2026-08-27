"use client";

import Link from "next/link";
import { Gem, Hash, MapPin, Phone } from "lucide-react";
import { useT } from "@/lib/i18n/use-t";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { cn } from "@/lib/utils";
import { FacebookIcon, InstagramIcon, LinkedinIcon, YoutubeIcon } from "./social-icons";

export function LandingFooter() {
  const t = useT();
  const { data: settings } = useSiteSettings();
  // Set from /admin/settings — every field starts blank, so the column only
  // appears once at least one of them has actually been filled in.
  const contactRows = [
    { label: t.footer.addressLabel, value: settings?.address, icon: MapPin },
    { label: t.footer.binLabel, value: settings?.bin, icon: Hash },
    { label: t.footer.phoneLabel, value: settings?.phone, icon: Phone },
  ].filter((row) => row.value);

  // Set from /admin/footer — same blank-hides-it rule as contactRows above,
  // so an icon only shows up once its URL has actually been filled in.
  const socialLinks = [
    { label: "Facebook", href: settings?.facebookUrl, icon: FacebookIcon },
    { label: "Instagram", href: settings?.instagramUrl, icon: InstagramIcon },
    { label: "LinkedIn", href: settings?.linkedinUrl, icon: LinkedinIcon },
    { label: "YouTube", href: settings?.youtubeUrl, icon: YoutubeIcon },
  ].filter((link) => link.href);

  const columns = [
    {
      title: t.footer.companyHeading,
      links: [
        { href: "/", label: t.nav.home },
        { href: "/products/gold", label: t.nav.buyGold },
        { href: "/buying-guide", label: t.nav.buyingGuide },
        { href: "/calculator", label: t.nav.calculator },
      ],
    },
    {
      title: t.footer.supportHeading,
      links: [
        { href: "/#contact", label: t.nav.contactUs },
        { href: "/#faq", label: t.faq.heading },
        { href: "/login", label: t.nav.login },
        { href: "/register", label: t.nav.register },
      ],
    },
  ];

  return (
    <footer id="contact" className="scroll-mt-24 border-t border-white/10 bg-ink py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className={cn("grid gap-10", contactRows.length > 0 ? "sm:grid-cols-[1.3fr_1fr_1fr_1fr]" : "sm:grid-cols-[1.5fr_1fr_1fr]")}>
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold">
                <Gem className="size-4.5" />
              </span>
              <span className="text-lg font-bold tracking-tight text-white">
                GOLD<span className="text-gold">.BD</span>
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-neutral-400">{t.footer.tagline}</p>

            {socialLinks.length > 0 && (
              <>
                <p className="mt-6 text-xs font-semibold tracking-wide text-neutral-500 uppercase">{t.footer.followUs}</p>
                <div className="mt-3 flex items-center gap-2">
                  {socialLinks.map(({ label, href, icon: Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex size-9 items-center justify-center rounded-full border border-white/10 text-neutral-400 transition-colors hover:border-gold/40 hover:text-gold"
                    >
                      <Icon className="size-4" />
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-medium text-white">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-neutral-400 hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {contactRows.length > 0 && (
            <div>
              <p className="text-sm font-medium text-white">{t.footer.contactInfoHeading}</p>
              <ul className="mt-3 space-y-2.5">
                {contactRows.map(({ label, value, icon: Icon }) => (
                  <li key={label} className="flex items-start gap-2 text-sm text-neutral-400">
                    <Icon className="mt-0.5 size-3.5 shrink-0 text-gold" />
                    <span>
                      <span className="sr-only">{label}: </span>
                      {value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="mt-10 flex flex-col items-center gap-2 border-t border-white/10 pt-6 text-xs text-neutral-500 sm:flex-row sm:justify-between">
          <span>
            © {new Date().getFullYear()} Gold BD. {t.footer.copyright}
          </span>
          <span>
            {t.footer.developedBy}{" "}
            <a
              href="https://hakaluki.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 transition-colors hover:text-gold"
            >
              hakaluki.dev
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
