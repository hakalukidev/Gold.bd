"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { MessageSquareText } from "lucide-react";
import { verifyOtpSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { OtpInput } from "@/components/shared/otp-input";

// UI-only flow for now: there is no auth backend to check the code against, so
// only the code's shape is validated and any 6 digits land the user on /wallet.
const otpCodeSchema = verifyOtpSchema.pick({ code: true });
type OtpCodeInput = z.infer<typeof otpCodeSchema>;

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") ?? "";
  const purpose = searchParams.get("purpose") === "REGISTER" ? "REGISTER" : "LOGIN";
  const form = useForm<OtpCodeInput>({
    resolver: zodResolver(otpCodeSchema),
    defaultValues: { code: "" },
  });

  function onSubmit() {
    router.push("/wallet");
  }

  return (
    <div>
      <span className="flex size-10 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
        <MessageSquareText className="size-5" strokeWidth={1.75} />
      </span>
      <h1 className="mt-5 text-3xl font-bold tracking-tight">Enter the code</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We sent a 6-digit code to {phone ? <span className="font-medium text-foreground">{phone}</span> : "your phone"}.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>6-digit code</FormLabel>
                <FormControl>
                  <OtpInput
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" variant="gold-solid" className="h-11 w-full rounded-md text-sm">
            Verify
          </Button>
        </form>
      </Form>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Didn&apos;t get a code? Go back and submit the {purpose === "REGISTER" ? "registration" : "login"} form again to request a new one.
      </p>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  );
}
