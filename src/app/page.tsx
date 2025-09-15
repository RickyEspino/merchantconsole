export default function Dashboard() {
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Member Console</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <a href="/register" className="rounded-xl border p-6 bg-white shadow-sm hover:bg-slate-50">
          <h3 className="font-medium text-lg">💳 Points Register</h3>
          <p className="text-slate-600 text-sm mt-1">Enter purchase amount → generate QR.</p>
        </a>
        <a href="/register?last=1" className="rounded-xl border p-6 bg-white shadow-sm hover:bg-slate-50">
          <h3 className="font-medium text-lg">🕘 Continue</h3>
          <p className="text-slate-600 text-sm mt-1">Jump back to the register.</p>
        </a>
      </div>
    </main>
  );
}
