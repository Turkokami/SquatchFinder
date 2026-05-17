import Link from "next/link";
import { Building2, LayoutDashboard, Map, Radar, Rows3, Sheet } from "lucide-react";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/search", label: "Lead search", icon: Radar },
  { href: "/map", label: "Map view", icon: Map },
  { href: "/pipeline", label: "Pipeline", icon: Rows3 },
];

export async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.22),_transparent_35%),linear-gradient(180deg,#10211f_0%,#0f172a_45%,#f8fafc_45%,#f8fafc_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <header className="rounded-[28px] border border-white/10 bg-slate-950/80 px-5 py-4 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/20">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-amber-200/80">
                  Sasquatch Pest Control
                </p>
                <h1 className="text-xl font-semibold text-white">Squatch Finder</h1>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <nav className="flex flex-wrap gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-amber-200/30 hover:bg-white/10",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
                <a
                  href="/api/export/leads"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20"
                >
                  <Sheet className="h-4 w-4" />
                  CSV export
                </a>
              </nav>
              <div className="flex items-center justify-between gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                <span>{session?.user?.name ?? "Signed in user"}</span>
                <SignOutButton />
              </div>
            </div>
          </div>
        </header>
        <main className="mt-6 flex-1">{children}</main>
      </div>
    </div>
  );
}
