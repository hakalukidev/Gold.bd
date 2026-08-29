"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Phone, UserPlus } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { IconInput } from "@/components/shared/icon-input";
import { PasswordInput } from "@/components/shared/password-input";

// UI-only flow: this app is the frontend on its own, with no auth backend
// behind it, so a valid form just moves the user on to the OTP step
// (login -> /verify-otp -> /wallet). "Remember me" and "Forgot password?" are
// likewise presentational until that backend exists — the reset flow would run
// through the same OTP screen.
export default function LoginPage() {
  const router = useRouter();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", password: "" },
  });

  function onSubmit(values: LoginInput) {
    router.push(`/verify-otp?phone=${encodeURIComponent(values.phone)}&purpose=LOGIN`);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Sign in to continue to your gold account.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
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
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="current-password"
                    placeholder="Enter your password"
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
                Remember me
              </Label>
            </div>
            <Link href="/verify-otp?purpose=LOGIN" className="text-sm font-medium text-gold hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" variant="gold-solid" className="h-11 w-full rounded-md text-sm">
            Sign in
          </Button>
        </form>
      </Form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="outline"
        className="h-11 w-full rounded-md text-sm font-semibold"
        nativeButton={false}
        render={
          <Link href="/register">
            <UserPlus className="size-4" strokeWidth={1.75} />
            Create an account
          </Link>
        }
      />

      <p className="mt-6 text-center text-xs text-muted-foreground">Secure. Trusted. 100% yours.</p>
    </div>
  );
}
