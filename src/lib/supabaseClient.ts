// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://gjwmswafmuyhobwhuwup.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqd21zd2FmbXV5aG9id2h1d3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTgwODksImV4cCI6MjA2NTc3NDA4OX0.GGssWKxMhTggo0yGQpVArjulEiI9FSWUNitxqfCQjTw";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
