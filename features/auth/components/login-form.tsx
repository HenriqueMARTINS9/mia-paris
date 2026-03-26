"use client";

import { useActionState } from "react";
import { Loader2, LockKeyhole, Mail } from "lucide-react";

import { loginAction } from "@/features/auth/actions/login";
import type { LoginFormState } from "@/features/auth/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoginFormProps {
  redirectTo: string;
}

const initialState: LoginFormState = {
  error: null,
};

export function LoginForm({ redirectTo }: Readonly<LoginFormProps>) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          Email professionnel
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="prenom.nom@miaparis.com"
            className="pl-11"
            disabled={isPending}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          Mot de passe
        </label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Votre mot de passe"
            className="pl-11"
            disabled={isPending}
            required
          />
        </div>
      </div>

      {state.error ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Connexion en cours
          </>
        ) : (
          "Se connecter"
        )}
      </Button>
    </form>
  );
}
