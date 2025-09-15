// src/app/register/page.tsx
"use client";

import { useEffect, useState } from "react";

const PPD = Number(process.env.NEXT_PUBLIC_POINTS_PER_DOLLAR ?? 10);

export default function RegisterPage() {
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // If we came back from QR page, keep prior input only when ?last=1 is present.
    const params = new URLSearchParams(window.location.search);
    if (!params.get("last")) {
      setAmount("");
      setReason("");
    }
  }, []);

  const dollars = Number(amount || 0);
  const points = Math.max(0, Math.floor(dollars * PPD));

  async function handleNext() {
    setSubmitting(true);
    const res = await fetch("/api/register/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountCents: Math.round(dollars * 100),
        points,
        reason,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data?.code) {
      window.location.href = `/register/${data.code}`;
    } else {
      alert(data?.error ?? "Failed to start session");
    }
  }

  return (
    <main className="mx-auto max-w-md p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Points Register</h1>
      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <label className="block">
          <span className="text-sm text-slate-600">Amount ($)</span>
          <input
            inputMode="decimal"
            pattern="^[0-9]*[.,]?[0-9]{0,2}$"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-md border p-2"
            placeholder="e.g. 24.50"
          />
        </label>

        <div className="text-sm text-slate-600">Conversion</div>
        <div className="rounded-md bg-slate-50 p-3 text-sm">
          {dollars > 0 ? `${dollars.toFixed(2)} × ${PPD} = ` : ""}
          <b className="text-lg">{points}</b> points
        </div>

        <label className="block">
          <span className="text-sm text-slate-600">Reason (optional)</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-md border p-2"
            placeholder="Purchase, welcome bonus, etc."
          />
        </label>

        <button
          onClick={handleNext}
          disabled={submitting || points <= 0}
          className="w-full rounded-md bg-black text-white py-2 font-medium hover:opacity-90"
        >
          {submitting ? "Preparing…" : "Next → QR"}
        </button>
      </div>
    </main>
  );
}
