"use client";
import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, MailCheck } from "lucide-react";
import AuthShell from "@/components/layout/AuthShell";
import Button from "@/components/ui/Button";
import { createClient } from "@/utils/supabase/client";

function Verify() {
  const router = useRouter();
  const supabase = createClient();
  const email = useSearchParams().get("email") ?? "";
  const [digits, setDigits] = useState(Array(6).fill(""));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const refs = useRef([]);

  function change(i, v) {
    const d = v.replace(/\D/g, "").slice(-1);
    setDigits(digits.map((x, j) => (j === i ? d : x)));
    if (d && i < 5) refs.current[i + 1].focus();
  }
  const keyDown = (i, e) => e.key === "Backspace" && !digits[i] && i > 0 && refs.current[i - 1].focus();
  const paste = (e) => {
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (p) setDigits(Array.from({ length: 6 }, (_, i) => p[i] ?? ""));
  };

  async function verify() {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: digits.join(""), type: "signup" });
    setBusy(false);
    if (error) return setMsg(error.message);
    router.replace("/onboarding");
  }

  async function resend() {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setMsg(error ? error.message : "A new code is on its way.");
  }

  return (
    <AuthShell>
      <Link href="/login" className="mb-6 flex items-center gap-2 text-sm text-muted"><ArrowLeft size={14} />Back to Signup</Link>
      <span className="grid size-14 place-items-center rounded-2xl bg-panel text-brand"><MailCheck size={24} /></span>
      <h2 className="mt-6 text-3xl font-bold">Check your inbox.</h2>
      <p className="mt-3 text-sm text-muted">We sent a 6-digit verification code to</p>
      <p className="font-semibold">{email}</p>
      <Link href="/login" className="text-xs font-medium text-brand">Change email</Link>

      <p className="mb-2 mt-6 text-sm font-medium">Verification code</p>
      <div className="flex gap-3" onPaste={paste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            value={d}
            inputMode="numeric"
            aria-label={`Digit ${i + 1}`}
            onChange={(e) => change(i, e.target.value)}
            onKeyDown={(e) => keyDown(i, e)}
            className="size-14 rounded-xl border border-line bg-card text-center text-xl font-medium outline-none focus:border-brand"
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">Your code is valid for 10 minutes.</p>
      {msg && <p className="mt-3 text-sm text-bad">{msg}</p>}

      <Button onClick={verify} disabled={busy || digits.join("").length < 6} className="mt-6 w-full"><ArrowRight size={16} />Verify email</Button>
      <p className="mt-6 text-center text-sm text-muted">
        Didn't receive an email?
        <button onClick={resend} className="mt-1 block w-full font-medium text-brand">Resend code</button>
        <span className="text-xs">Check your spam folder, just in case.</span>
      </p>
    </AuthShell>
  );
}

export default function VerifyPage() {
  return <Suspense><Verify /></Suspense>;
}
