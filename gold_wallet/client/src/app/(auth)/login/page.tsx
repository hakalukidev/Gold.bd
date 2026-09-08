"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Phone, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { walletAuthApi } from "@/lib/wallet-auth-api";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { IconInput } from "@/components/shared/icon-input";
import { PasswordInput } from "@/components/shared/password-input";
import { useTranslation } from "@/lib/i18n/use-translation";

// Step 1 of a real 2FA login: wallet_server checks the phone/password against
// the account and, only if they match, texts an OTP (login -> /verify-otp ->
// /wallet). A wrong or unregistered number never reaches the OTP screen — it
// reports back a generic "invalid phone number or password" so a fake number
// can't be used to probe which numbers are registered.
// "Remember me" and "Forgot password?" stay presentational — there's no
// remember-me or password-reset endpoint on the backend yet.
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", password: "" },
  });

  // Landed here via the auto-logout in providers.tsx (an authenticated call
  // 401'd because the access token expired or was revoked) rather than the
  // user choosing to sign out — say why instead of leaving them wondering
  // where their session went.
  useEffect(() => {
    if (searchParams.get("reason") === "expired") {
      toast.error(t("auth.login.sessionExpired"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function onSubmit(values: LoginInput) {
    try {
      const { devCode } = await walletAuthApi.login(values);
      const devCodeParam = devCode ? `&devCode=${encodeURIComponent(devCode)}` : "";
      router.push(`/verify-otp?phone=${encodeURIComponent(values.phone)}&purpose=LOGIN${devCodeParam}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("common.genericError"));
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{t("auth.login.title")}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.login.subtitle")}</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.login.phoneLabel")}</FormLabel>
                <FormControl>
                  <IconInput
                    icon={Phone}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="01XXXXXXXXX"
                    className="h-11"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.login.passwordLabel")}</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="current-password"
                    placeholder={t("auth.login.passwordPlaceholder")}
                    className="h-11"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox id="remember-me" />
              <Label htmlFor="remember-me" className="text-sm font-normal text-muted-foreground">
                {t("auth.login.rememberMe")}
              </Label>
            </div>
            <Link href="/verify-otp?purpose=LOGIN" className="text-sm font-medium text-gold hover:underline">
              {t("auth.login.forgotPassword")}
            </Link>
          </div>

          <Button
            type="submit"
            variant="gold-solid"
            className="h-11 w-full rounded-md text-sm"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? t("auth.login.signingIn") : t("auth.login.signIn")}
          </Button>
        </form>
      </Form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">{t("common.or")}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="outline"
        className="h-11 w-full rounded-md text-sm font-semibold"
        nativeButton={false}
        render={
          <Link href="/register">
            <UserPlus className="size-4" strokeWidth={1.75} />
            {t("auth.login.createAccount")}
          </Link>
        }
      />

      <p className="mt-6 text-center text-xs text-muted-foreground">{t("auth.login.footer")}</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
