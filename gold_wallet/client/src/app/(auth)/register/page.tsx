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

// Step 1 of registration: wallet_server validates the form and texts a
// 6-digit code; no account exists yet (register -> /verify-otp -> /wallet).
export default function RegisterPage() {
  const router = useRouter();
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
      toast.error(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Create account</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Start buying and selling gold in a few minutes.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-3">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
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
                <FormLabel>Mobile number</FormLabel>
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
                  Email <span className="font-normal text-muted-foreground">(optional)</span>
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" placeholder="8+ characters" className="h-10" {...field} />
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
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" placeholder="Repeat password" className="h-10" {...field} />
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
            {form.formState.isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </Form>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="outline"
        className="h-10 w-full rounded-md text-sm font-semibold"
        nativeButton={false}
        render={
          <Link href="/login">
            <LogIn className="size-4" strokeWidth={1.75} />
            Sign in instead
          </Link>
        }
      />

      <p className="mt-4 text-center text-xs text-muted-foreground">
        By creating an account you agree to our terms and privacy policy.
      </p>
    </div>
  );
}
