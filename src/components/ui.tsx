import type { ComponentProps, ReactNode } from "react";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-line bg-white shadow-soft", className)} {...props} />;
}

export function CardHeader({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="border-b border-line px-5 py-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
    </div>
  );
}

export function Stat({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-5", accent ? "border-ink bg-ink text-white" : "border-line bg-white shadow-soft")}>
      <p className={cn("text-xs font-medium uppercase tracking-wider", accent ? "text-white/55" : "text-muted")}>{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className={cn("mt-1 text-xs", accent ? "text-white/55" : "text-muted")}>{hint}</p>}
    </div>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="mb-6 rounded-xl border border-warning/25 bg-warning/5 px-4 py-3 text-sm text-warning">
      {children}
    </div>
  );
}

export function Badge({ tone = "neutral", ...props }: ComponentProps<"span"> & { tone?: "neutral" | "danger" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "danger" ? "bg-danger/10 text-danger" : "bg-mist text-ink-3",
      )}
      {...props}
    />
  );
}

export function Empty({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-mist text-muted [&_svg]:size-5">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
    </div>
  );
}

export const buttonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-ink-3 disabled:opacity-60";
export const fieldClass =
  "w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none focus:ring-4 focus:ring-lime/40";
