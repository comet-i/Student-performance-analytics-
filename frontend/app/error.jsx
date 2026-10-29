"use client";
import Button from "@/components/ui/Button";

export default function Error({ error, reset }) {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">{error.message}</p>
        <Button onClick={reset} className="mt-6">Try again</Button>
      </div>
    </main>
  );
}
