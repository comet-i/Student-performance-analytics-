import { ShieldCheck } from "lucide-react";
import Logo from "@/components/ui/Logo";

// Split-screen shell shared by the login/signup and verify screens.
// Add the library photo from your mockup at public/library.jpg.
export default function AuthShell({ children }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col bg-panel/70 p-12 lg:flex">
        <Logo />
        <div className="my-auto max-w-lg py-10">
          <p className="text-xs font-medium tracking-wider text-brand">A LITTLE CLARITY. A LOT OF POSSIBILITY.</p>
          <h1 className="mt-6 font-serif text-5xl leading-tight">Your next chapter, with a clearer view.</h1>
          <p className="mt-6 text-muted">Make sense of your subjects, attendance and progress. Build the habits that move you forward.</p>
          <img src="/library.jpg" alt="" className="mt-10 aspect-[1.45] w-full rounded-3xl object-cover" />
        </div>
        <p className="flex items-center gap-2 text-sm text-muted"><ShieldCheck size={16} className="text-brand" />Your progress is personal. Your data stays yours.</p>
        <p className="mt-4 text-xs text-muted">© 2026 EduTrack. Made for your learning journey.</p>
      </section>

      <section className="flex flex-col px-6 py-6">
        <p className="self-end text-sm text-muted">Need a hand? Help center</p>
        <div className="m-auto w-full max-w-md py-10">{children}</div>
        <p className="flex justify-center gap-6 text-xs text-muted"><span>Privacy policy</span><span>Terms of service</span></p>
      </section>
    </main>
  );
}
