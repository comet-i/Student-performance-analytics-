import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p className="font-serif text-6xl">404</p>
        <p className="mt-2 text-muted">We couldn't find that page.</p>
        <Link href="/dashboard" className="mt-6 inline-block rounded-xl bg-brand px-4 py-3 text-sm text-white">Back to dashboard</Link>
      </div>
    </main>
  );
}
