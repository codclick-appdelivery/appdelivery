import { createContext, useContext, useState, useEffect } from "react";
import supabase from "@/services/supabaseService";
import { useParams } from "react-router-dom";

type Empresa = {
  id: string;
  nome_fantasia?: string;
  slug: string;
  logo_url?: string;
  cor_primaria?: string;
};

const EmpresaContext = createContext<{ empresa: Empresa | null }>({ empresa: null });

export const useEmpresa = () => useContext(EmpresaContext);

export const EmpresaProvider = ({ children }: { children: React.ReactNode }) => {
  const { slug } = useParams();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  useEffect(() => {
   const fetchEmpresa = async () => {
  if (!slug) return;

  console.log("Slug detectado:", slug);

  const { data, error } = await supabase
    .from("empresas")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Erro ao buscar empresa pelo slug:", error);
    setEmpresa(null);
    return;
  }

  console.log("Empresa carregada com sucesso:", data);
  setEmpresa(data);
};


    fetchEmpresa();
  }, [slug]);

  return (
    <EmpresaContext.Provider value={{ empresa }}>
      {children}
    </EmpresaContext.Provider>
  );
};
