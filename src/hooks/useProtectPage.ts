import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export function useProtectPage(expectedRole: string) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!currentUser) return;

      const { data, error } = await supabase
        .from("usuarios")
        .select("role")
        .eq("id", currentUser.id)
        .single();

      if (error || !data || data.role !== expectedRole) {
        navigate("/login");
        return;
      }

      setLoading(false);
    };

    checkAccess();
  }, [currentUser, expectedRole, navigate]);

  return loading;
}