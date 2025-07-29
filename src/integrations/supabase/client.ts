
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://gjwmswafmuyhobwhuwup.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqd21zd2FmbXV5aG9id2h1d3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTgwODksImV4cCI6MjA2NTc3NDA4OX0.GGssWKxMhTggo0yGQpVArjulEiI9FSWUNitxqfCQjTw";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
