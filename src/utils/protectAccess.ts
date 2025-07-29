import { supabase } from "@/lib/supabaseClient";

export async function protectPageByRole(expectedRole: string) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    window.location.href = "/login";
    return;
  }

  const { data, error } = await supabase
    .from("usuarios")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !data || data.role !== expectedRole) {
    window.location.href = "/login";
  }
}
