"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ArrowLeft, MessageSquareText } from "lucide-react";
import { verifyOtpSchema } from "@/lib/validations/auth";
import { walletAuthApi } from "@/lib/wallet-auth-api";
import { ApiError } from "@/lib/api-client";
import { markSignedIn, setAccessToken } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { OtpInput } from "@/components/shared/otp-input";

// Step 2 of registration/login: wallet_server checks the code it texted in
// step 1 and, only on a match, creates the account (REGISTER) or issues the
// session (LOGIN) — a wrong or expired code never reaches /wallet.
const otpCodeSchema = verifyOtpSchema.pick({ code: true });
type OtpCodeInput = z.infer<typeof otpCodeSchema>;

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") ?? "";
  const purpose = searchParams.get("purpose") === "REGISTER" ? "REGISTER" : "LOGIN";
  // Outside production, wallet_server hands the code back in-band (see
  // wallet-auth-api.ts) instead of only texting it, so local dev/testing
  // doesn't require digging the code out of the server logs.
  const devCode = searchParams.get("devCode") ?? "";
  const form = useForm<OtpCodeInput>({
    resolver: zodResolver(otpCodeSchema),
    defaultValues: { code: devCode },
  });

  useEffect(() => {
    if (devCode) form.setValue("code", devCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devCode]);

  async function onSubmit(values: OtpCodeInput) {
    try {
      const verify = purpose === "REGISTER" ? walletAuthApi.verifyRegister : walletAuthApi.verifyLogin;
      const { accessToken } = await verify({ phone, code: values.code });
      setAccessToken(accessToken);
      markSignedIn();
      router.push("/wallet");
    } catch (error) {
      form.setError("code", {
        message: error instanceof ApiError ? error.message : "Something went wrong. Please try again.",
      });
    }
  }

  // Reachable directly (e.g. the presentational "Forgot password?" link on
  // /login) without a phone/OTP ever having been requested — nothing to verify.
  if (!phone) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nothing to verify</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We don&apos;t have a phone number to verify a code against. Start from{" "}
          {purpose === "REGISTER" ? "the sign-up" : "the sign-in"} form again.
        </p>
        <Button
          variant="gold-solid"
          className="mt-6 h-11 w-full rounded-md text-sm"
          nativeButton={false}
          render={
            <Link href={purpose === "REGISTER" ? "/register" : "/login"}>
              {purpose === "REGISTER" ? "Back to sign up" : "Back to sign in"}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <Link
        href={purpose === "REGISTER" ? "/register" : "/login"}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" strokeWidth={1.75} />
        Back
      </Link>
      <span className="mt-5 flex size-10 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
        <MessageSquareText className="size-5" strokeWidth={1.75} />
      </span>
      <h1 className="mt-5 text-3xl font-bold tracking-tight">Enter the code</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We sent a 6-digit code to {phone ? <span className="font-medium text-foreground">{phone}</span> : "your phone"}.
      </p>
      {devCode && (
        <p className="mt-2 text-xs font-medium text-gold">
          Dev mode: code auto-filled ({devCode}) — no SMS is sent outside production.
        </p>
      )}

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
          <Button
            type="submit"
            variant="gold-solid"
            className="h-11 w-full rounded-md text-sm"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Verifying…" : "Verify"}
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
