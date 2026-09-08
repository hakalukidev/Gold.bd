"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn, Mail, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { walletAuthApi } from "@/lib/wallet-auth-api";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { IconInput } from "@/components/shared/icon-input";
import { PasswordInput } from "@/components/shared/password-input";
import { useTranslation } from "@/lib/i18n/use-translation";

// Step 1 of registration: wallet_server validates the form and texts a
// 6-digit code; no account exists yet (register -> /verify-otp -> /wallet).
export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", phone: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: RegisterInput) {
    try {
      const { devCode } = await walletAuthApi.register({
        fullName: values.fullName,
        phone: values.phone,
        email: values.email || undefined,
        password: values.password,
      });
      const devCodeParam = devCode ? `&devCode=${encodeURIComponent(devCode)}` : "";
      router.push(`/verify-otp?phone=${encodeURIComponent(values.phone)}&purpose=REGISTER${devCodeParam}`);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (field in values) {
            form.setError(field as keyof RegisterInput, { message: messages[0] });
          }
        }
      }
      toast.error(error instanceof ApiError ? error.message : t("common.genericError"));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("auth.register.title")}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.register.subtitle")}</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-3">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.register.fullNameLabel")}</FormLabel>
                <FormControl>
                  <IconInput
                    icon={User}
                    autoComplete="name"
                    placeholder="Rahim Uddin"
                    className="h-10"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.register.phoneLabel")}</FormLabel>
                <FormControl>
                  <IconInput
                    icon={Phone}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="01XXXXXXXXX"
                    className="h-10"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("auth.register.emailLabel")}{" "}
                  <span className="font-normal text-muted-foreground">{t("auth.register.emailOptional")}</span>
                </FormLabel>
                <FormControl>
                  <IconInput
                    icon={Mail}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="h-10"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.register.passwordLabel")}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="new-password"
                      placeholder={t("auth.register.passwordPlaceholder")}
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.register.confirmPasswordLabel")}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="new-password"
                      placeholder={t("auth.register.confirmPasswordPlaceholder")}
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button
            type="submit"
            variant="gold-solid"
            className="h-10 w-full rounded-md text-sm"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? t("auth.register.creatingAccount") : t("auth.register.createAccount")}
          </Button>
        </form>
      </Form>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">{t("common.or")}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="outline"
        className="h-10 w-full rounded-md text-sm font-semibold"
        nativeButton={false}
        render={
          <Link href="/login">
            <LogIn className="size-4" strokeWidth={1.75} />
            {t("auth.register.signInInstead")}
          </Link>
        }
      />

      <p className="mt-4 text-center text-xs text-muted-foreground">{t("auth.register.terms")}</p>
    </div>
  );
}
