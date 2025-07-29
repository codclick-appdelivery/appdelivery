import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient"; // Ajustado para usar supabaseClient

interface Empresa {
  id: string;
  nome: string;
  admin_id: string;
  // Adicione outras propriedades da sua tabela 'empresas' aqui, se houver
}

export function useEmpresa(userId: string | null) {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true); // Adicionado estado de loading

  useEffect(() => {
    const fetchEmpresa = async () => {
      setLoading(true); // Inicia o loading

      if (!userId) {
        console.log("useEmpresa: userId é nulo, não buscando empresa.");
        setEmpresa(null);
        setLoading(false); // Finaliza o loading se userId for nulo
        return;
      }

      console.log("useEmpresa: Buscando empresa para userId:", userId);
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("admin_id", userId)
        .single();

      if (error) {
        console.error("useEmpresa: Erro ao buscar empresa:", error.message);
        setEmpresa(null); // Garante que empresa seja null em caso de erro
      } else if (data) {
        setEmpresa(data as Empresa);
        console.log("useEmpresa: Empresa encontrada:", data);
      } else {
        setEmpresa(null); // Se não houver dados, define como null
        console.log("useEmpresa: Nenhuma empresa encontrada para userId:", userId);
      }
      setLoading(false); // Finaliza o loading
    };

    fetchEmpresa();
  }, [userId]);

  return { empresa, loading }; // Retorna o estado de loading
}
