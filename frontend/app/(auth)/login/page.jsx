"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Mail, User } from "lucide-react";
import AuthShell from "@/components/layout/AuthShell";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { email, password, name } = form;
    const { error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    setBusy(false);
    if (error) return setError(error.message);
    router.push(isLogin ? "/dashboard" : `/verify?email=${encodeURIComponent(email)}`);
  }

  const google = () =>
    supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/callback` } });

  return (
    <AuthShell>
      <div className="mb-8 grid grid-cols-2 rounded-xl bg-panel/60 p-1 text-sm font-medium">
        {[["login", "Login"], ["signup", "Signup"]].map(([k, label]) => (
          <button key={k} onClick={() => setMode(k)} className={`rounded-lg py-2.5 ${mode === k ? "bg-card shadow-sm" : "text-muted"}`}>{label}</button>
        ))}
      </div>

      <h2 className="text-3xl font-bold">{isLogin ? "Welcome back." : "Your next chapter starts here."}</h2>
      <p className="mb-6 mt-2 text-sm text-muted">{isLogin ? "A little check-in. A clearer picture of your semester." : "Create your personal space for academic progress."}</p>

      <Button variant="outline" onClick={google} className="w-full">Continue with Google</Button>
      <p className="my-6 text-center text-xs text-muted">or {isLogin ? "continue" : "sign up"} with email</p>

      <form onSubmit={submit} className="space-y-4">
        {!isLogin && <Input required label="Full name" value={form.name} onChange={set("name")} right={<User size={16} />} />}
        <Input required type="email" label="Email address" value={form.email} onChange={set("email")} right={<Mail size={16} />} />
        <Input
          required minLength={8}
          type={show ? "text" : "password"}
          label={isLogin ? "Password" : "Create password"}
          value={form.password}
          onChange={set("password")}
          right={<button type="button" aria-label="Toggle password" onClick={() => setShow(!show)}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
        />
        {!isLogin && <p className="text-xs text-muted">Use at least 8 characters, a number and a symbol.</p>}
        {!isLogin && (
          <label className="flex items-center gap-2 text-xs text-muted">
            <input required type="checkbox" className="accent-brand" /> I agree to the Terms of service and Privacy policy.
          </label>
        )}
        {error && <p className="text-sm text-bad">{error}</p>}
        <Button disabled={busy} className="w-full"><ArrowRight size={16} />{isLogin ? "Login" : "Create account"}</Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted">
        {isLogin ? "New to EduTrack?" : "Already have an account?"}{" "}
        <button onClick={() => setMode(isLogin ? "signup" : "login")} className="font-medium text-ink">{isLogin ? "Create an account" : "Login"}</button>
      </p>
    </AuthShell>
  );
}
