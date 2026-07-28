export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">E-Ticket Pro</h1>
          <p className="mt-1 text-sm text-slate-500">Console d’administration</p>
        </div>
        <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">{children}</div>
      </div>
    </div>
  );
}
