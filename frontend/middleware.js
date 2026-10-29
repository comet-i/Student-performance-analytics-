import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const PROTECTED = ["/dashboard", "/subjects", "/attendance", "/marks", "/planner", "/insights", "/settings", "/onboarding"];

export async function middleware(req) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser(); // also refreshes the session
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const go = (to) => NextResponse.redirect(new URL(to, req.url));

  if (!user && isProtected) return go("/login");
  if (user && pathname === "/login") return go("/dashboard");
  if (user && isProtected && !user.user_metadata?.onboarded && !pathname.startsWith("/onboarding")) return go("/onboarding");
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"] };
