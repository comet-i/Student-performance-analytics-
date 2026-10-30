import { createClient } from "@/utils/supabase/client";

const BASE = process.env.NEXT_PUBLIC_API_URL;

// Fetch wrapper for the Node.js backend: attaches the Supabase JWT to every call.
export async function api(path, { method = "GET", body } = {}) {
  const { data: { session } } = await createClient().auth.getSession();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(session && { Authorization: `Bearer ${session.access_token}` }),
    },
    body: body && JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText);
  return res.json();
}
