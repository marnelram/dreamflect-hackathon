/**
 * Auth pages share a centered, gradient-backed shell — no SessionShell
 * (which expects step+journal). Just a calm split for sign-in / sign-up.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_30%_20%,oklch(from_var(--accent)_l_c_h/0.18)_0%,transparent_55%),radial-gradient(circle_at_70%_80%,oklch(from_var(--primary)_l_c_h/0.18)_0%,transparent_55%)]">
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6 py-12">
        {children}
      </div>
    </div>
  );
}
