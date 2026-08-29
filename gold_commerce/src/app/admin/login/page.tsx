"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Gem, Mail } from "lucide-react";
import { adminLoginSchema, type AdminLoginInput } from "@/lib/validations/admin-auth";
import { useAdminLogin } from "@/hooks/use-admin-auth";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { IconInput } from "@/components/shared/icon-input";
import { PasswordInput } from "@/components/shared/password-input";

export default function AdminLoginPage() {
  const router = useRouter();
  const login = useAdminLogin();

  const form = useForm<AdminLoginInput>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: AdminLoginInput) {
    login.mutate(values, {
      onSuccess: () => {
        router.push("/admin/users");
        router.refresh();
      },
      onError: (error) => {
        form.setError("password", { message: error instanceof ApiError ? error.message : "Login failed" });
      },
    });
  }

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-8 overflow-hidden px-4 py-16">
      <Image
        src="/backgrounds/gold-treasure-cave.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-center"
      />
      {/* Dark scrim over the photo so the form stays readable, plus the
          same warm gold glow the page used before the photo. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-ink/80" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_45%_at_50%_0%,color-mix(in_oklch,var(--color-gold)_16%,transparent),transparent)]"
      />
      <Link href="/" className="flex flex-col items-center gap-2.5">
        <span className="flex size-11 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold">
          <Gem className="size-5" />
        </span>
        <span className="flex flex-col items-center leading-none">
          <span className="text-lg font-bold tracking-tight">
            GOLD<span className="text-gold">.BD</span>
          </span>
          <span className="mt-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Admin</span>
        </span>
      </Link>

      <div className="w-full max-w-sm">
        <Card className="shadow-lg shadow-black/5">
          <CardHeader>
            <CardTitle className="text-xl">Admin log in</CardTitle>
            <CardDescription>Enter your admin email and password to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <IconInput icon={Mail} type="email" placeholder="admin@goldbd.com" {...field} />
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
                        <PasswordInput {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={login.isPending}>
                  {login.isPending ? "Logging in…" : "Log in"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
