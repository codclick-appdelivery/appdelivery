import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Empresa {
  id: string;
  nome: string;
  admin_id: string;
}

export function useEmpresa(userId: string | null) {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmpresa = async () => {
      setLoading(true);

      if (!userId) {
        console.log("useEmpresa: userId é nulo, não buscando empresa.");
        setEmpresa(null);
        setLoading(false);
        return;
      }

      try {
        // Passo 1: Buscar o perfil do usuário na tabela 'usuarios' para obter o empresa_id
        console.log("useEmpresa: Buscando empresaId para o usuário:", userId);
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("empresa_id")
          .eq("id", userId)
          .maybeSingle();

        if (userError) {
          throw userError;
        }

        if (!userData || !userData.empresa_id) {
          console.log("useEmpresa: Nenhum empresa_id encontrado para o usuário:", userId);
          setEmpresa(null);
          setLoading(false);
          return;
        }

        const empresaId = userData.empresa_id;
        console.log("useEmpresa: empresa_id encontrado:", empresaId);

        // Passo 2: Usar o empresa_id para buscar os dados completos da empresa
        const { data: empresaData, error: empresaError } = await supabase
          .from("empresas")
          .select("*")
          .eq("id", empresaId)
          .single();

        if (empresaError) {
          throw empresaError;
        }

        if (empresaData) {
          setEmpresa(empresaData as Empresa);
          console.log("useEmpresa: Dados da empresa encontrados:", empresaData);
        } else {
          setEmpresa(null);
          console.log("useEmpresa: Nenhum dado de empresa encontrado para o id:", empresaId);
        }

      } catch (err: any) {
        console.error("useEmpresa: Erro ao buscar empresa:", err.message);
        setEmpresa(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresa();
  }, [userId]);

  return { empresa, loading };
}
