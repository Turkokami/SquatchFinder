import { Building2, MapPinned, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInForm } from "@/components/sign-in-form";

export default async function SignInPage() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.35),_transparent_30%),linear-gradient(135deg,#10211f_0%,#111827_55%,#f8fafc_55%,#f8fafc_100%)] px-4 py-10 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-between rounded-[32px] border border-white/10 bg-slate-950/80 p-8 text-white shadow-2xl shadow-black/30 backdrop-blur">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-amber-200/80">
                  Sasquatch Pest Control
                </p>
                <h1 className="text-3xl font-semibold">Squatch Finder</h1>
              </div>
            </div>
            <p className="mt-8 max-w-xl text-lg leading-8 text-slate-200">
              A simple, daily-use CRM for finding and managing commercial pest control prospects across the U.S.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: MapPinned,
                title: "Lead search",
                copy: "Find restaurants, apartments, HOAs, breweries, grocery stores, and more.",
              },
              {
                icon: ShieldCheck,
                title: "Lead scoring",
                copy: "Rank the best-fit opportunities before your team spends time chasing them.",
              },
              {
                icon: Building2,
                title: "Pipeline control",
                copy: "Track outreach, follow-ups, notes, and next steps from one place.",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <Icon className="h-5 w-5 text-amber-300" />
                  <h2 className="mt-4 font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.copy}</p>
                </div>
              );
            })}
          </div>
        </section>
        <section className="flex items-center">
          <div className="surface-card w-full p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              Team sign in
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950">Open the CRM</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Demo credentials are prefilled so you can get straight into the app after seeding the database.
            </p>
            <div className="mt-8">
              <SignInForm />
            </div>
            <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
              Default demo login: <strong>owner@squatchfinder.local</strong> / <strong>sasquatch123</strong>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
