import Link from "next/link";
import Logo from "@/components/ui/Logo";

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <Logo />
        <Link href="/login" className="rounded-xl bg-brand px-5 py-3 text-sm font-medium text-white">Login</Link>
      </header>
      <section className="my-auto max-w-2xl py-20">
        <h1 className="font-serif text-5xl leading-tight sm:text-6xl">Your next chapter, with a clearer view.</h1>
        <p className="mt-6 text-lg text-muted">Track attendance, marks and study tasks in one place, and see where your semester is heading with ML-powered performance predictions.</p>
        <Link href="/login" className="mt-8 inline-block rounded-xl bg-brand px-6 py-3.5 font-medium text-white">Get started</Link>
      </section>
    </main>
  );
}
