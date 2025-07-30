// src/components/admin/SeedDataButton.tsx (exemplo de adaptação)
import React from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { seedSupabaseData } from "@/services/seedDataService"; // Importe a função

export const SeedDataButton = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSeedData = async () => {
    if (window.confirm("Isso irá importar os dados iniciais do cardápio para o Supabase e limpar os dados existentes da empresa atual. Deseja continuar?")) {
      setIsLoading(true);
      try {
        await seedSupabaseData(); // Chama a função de seed
        toast({
          title: "Sucesso!",
          description: "Dados iniciais importados com sucesso para o Supabase.",
        });
        // Você pode querer recarregar os dados na página de admin aqui
        // onDataChange?.(); // Se seu SeedDataButton puder receber um prop onDataChange
      } catch (error) {
        console.error("Erro ao importar dados iniciais:", error);
        toast({
          title: "Erro",
          description: "Não foi possível importar os dados iniciais. Verifique o console.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Button onClick={handleSeedData} disabled={isLoading} className="w-full sm:w-auto text-sm">
      {isLoading ? "Importando..." : "Importar Dados Iniciais Supabase"}
    </Button>
  );
};