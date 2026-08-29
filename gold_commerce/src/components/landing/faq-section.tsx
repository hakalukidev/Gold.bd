"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useT } from "@/lib/i18n/use-t";

export function FaqSection() {
  const t = useT();

  return (
    <section id="faq" className="scroll-mt-24 border-t bg-background py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.faq.heading}</h2>
          <p className="mt-3 text-muted-foreground">{t.faq.subheading}</p>
        </div>
        <Accordion className="mt-10" multiple={false}>
          {t.faq.items.map((faq, i) => (
            <AccordionItem key={faq.question} value={`faq-${i}`}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
