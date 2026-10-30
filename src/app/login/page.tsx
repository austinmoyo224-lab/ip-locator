import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import { appPassword, safeNext } from "@/lib/auth";
import { Card } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const configured = Boolean(appPassword());
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-ink text-lime">
            <MapPin className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">IP Locator</h1>
            <p className="text-sm text-muted">Sign in to continue</p>
          </div>
        </div>
        {configured ? (
          <LoginForm next={safeNext(Array.isArray(next) ? next[0] : next)} />
        ) : (
          <p className="rounded-xl bg-mist px-4 py-3 text-sm text-ink-3">
            This app is locked because no password is set. Add an <code className="font-mono">APP_PASSWORD</code> environment variable on the server,
            then redeploy.
          </p>
        )}
      </Card>
    </main>
  );
}
