"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function SignInForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(event.currentTarget);
        const response = await signIn("credentials", {
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
          redirect: false,
          callbackUrl: "/dashboard",
        });

        setLoading(false);

        if (response?.error) {
          setError("Incorrect email or password.");
          return;
        }

        window.location.href = "/dashboard";
      }}
    >
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue="owner@squatchfinder.local"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          required
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          defaultValue="sasquatch123"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          required
        />
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Open Squatch Finder"}
      </button>
    </form>
  );
}
