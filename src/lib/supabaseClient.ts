// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://hwtngullwfecizxsgkea.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3dG5ndWxsd2ZlY2l6eHNna2VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyMTUyMjUsImV4cCI6MjA3MDc5MTIyNX0.B2nUIJ7LB8asKi2Zxh7TAW3fBaJa1Q81BzR0bkFzdOo";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
