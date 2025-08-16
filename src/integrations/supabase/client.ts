
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://hwtngullwfecizxsgkea.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3dG5ndWxsd2ZlY2l6eHNna2VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyMTUyMjUsImV4cCI6MjA3MDc5MTIyNX0.B2nUIJ7LB8asKi2Zxh7TAW3fBaJa1Q81BzR0bkFzdOo";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
