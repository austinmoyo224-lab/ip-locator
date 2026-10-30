"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { fieldClass } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<LoginState, FormData>(login, { error: null });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "password-error" : undefined}
          className={`${fieldClass} h-11`}
        />
        {state.error && (
          <p id="password-error" className="text-sm text-danger">
            {state.error}
          </p>
        )}
      </div>
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
