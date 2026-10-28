import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.https://supabase.com/dashboard/project/oqgfijnwowaleoyzmxgw,
    process.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xZ2Zpam53b3dhbGVveXpteGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNzMyOTcsImV4cCI6MjEwODc0OTI5N30.cS47siD_dTZpuNdPGzWcK8UxcSJERjL98-eCzSXqZr0
  );
}