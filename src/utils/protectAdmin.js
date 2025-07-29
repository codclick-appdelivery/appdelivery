// protectAdmin.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabaseUrl = 'https://gjwmswafmuyhobwhuwup.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // sua anon key
const supabase = createClient(supabaseUrl, supabaseKey);

export async function protectAdminPage() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  const { data, error } = await supabase
    .from('usuarios')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || !data || data.role !== 'admin') {
    window.location.href = '/acesso-negado.html';
  }
}