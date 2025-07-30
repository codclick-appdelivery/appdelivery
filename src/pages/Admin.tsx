// Admin.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getAllMenuItems } from "@/services/menuItemService"; // A ser atualizado para Supabase
import { getAllCategories } from "@/services/categoryService"; // A ser atualizado para Supabase
import { getAllVariations } from "@/services/variationService"; // A ser atualizado para Supabase
import { getAllVariationGroups } from "@/services/variationGroupService"; // A ser atualizado para Supabase
import { MenuItem, Category, Variation, VariationGroup } from "@/types/menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MenuItemsTab } from "@/components/admin/MenuItemsTab";
import { CategoriesTab } from "@/components/admin/CategoriesTab";
import { VariationsTab } from "@/components/admin/VariationsTab";
import { VariationGroupsTab } from "@/components/admin/VariationGroupsTab";
import { Database } from "lucide-react";
import { SeedDataButton } from "@/components/admin/SeedDataButton"; // O NOVO SeedDataButton
import { categories as localCategories, menuItems as localMenuItems } from "@/data/menuData";

const Admin = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [variationGroups, setVariationGroups] = useState<VariationGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("menu");

  // TODO: Obter o empresa_id do currentUser quando a autenticação for adaptada para Supabase
  // Por enquanto, usaremos um placeholder ou o ID fixo para testes.
  // Uma vez que o Supabase auth for integrado, currentUser.empresa_id estará disponível.
  const empresaId = currentUser?.empresaId; // ou o ID fixo de teste: "67ac5adf-02a7-4c22-8ec3-68c463323e35";

  useEffect(() => {
    // Apenas redirecione se não houver currentUser E não estivermos em modo de desenvolvimento/seed
    // Ou se a rota de login for a esperada
    if (!currentUser) {
      navigate("/login");
      return;
    }

    // Se tivermos um currentUser, e ele tiver um empresaId, carregamos os dados
    if (currentUser && empresaId) {
      loadData();
    } else {
      // Caso não haja empresaId no currentUser (ainda não migrado auth),
      // podemos decidir o que fazer: mostrar uma mensagem, carregar dados locais, etc.
      console.warn("Nenhum empresaId encontrado para o usuário atual. Dados podem não ser carregados.");
      setLoading(false); // Para não ficar em loop de carregamento
    }
  }, [currentUser, navigate, empresaId]); // Adicionar empresaId como dependência

  const loadData = async () => {
    // Garantir que temos um empresaId antes de carregar
    if (!empresaId) {
      console.error("Não foi possível carregar os dados: empresaId não disponível.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log("=== ADMIN: CARREGANDO DADOS ===");
      console.log("Admin: Loading menu data for empresaId:", empresaId);

      // As funções getAll... precisarão ser atualizadas para aceitar empresaId
      // e usar o Supabase. Por enquanto, a chamada é compatível com o mock.
      const [items, cats, vars, groups] = await Promise.all([
        getAllMenuItems(empresaId).catch((error) => { // Passa empresaId
          console.error("Erro ao buscar menu items do Supabase:", error);
          console.log("Using local menu items as fallback");
          return localMenuItems;
        }),
        getAllCategories(empresaId).catch((error) => { // Passa empresaId
          console.error("Erro ao buscar categorias do Supabase:", error);
          console.log("Using local categories as fallback");
          return localCategories;
        }),
        getAllVariations(empresaId).catch((error) => { // Passa empresaId
          console.error("Erro ao buscar variações do Supabase:", error);
          console.log("No variations found, using empty array");
          return [];
        }),
        getAllVariationGroups(empresaId).catch((error) => { // Passa empresaId
          console.error("Erro ao buscar grupos de variação do Supabase:", error);
          console.log("No variation groups found, using empty array");
          return [];
        })
      ]);

      // Certifique-se de que os dados retornados pelo Supabase (ou fallback)
      // correspondem aos seus tipos antes de setar o estado.
      // Suas validações existentes são boas aqui.
      const validCategories = cats.filter(cat => {
        const isValid = cat && cat.id && typeof cat.id === 'string' && cat.id.trim() !== '';
        if (!isValid) {
          console.warn("Filtering out invalid category:", cat);
        }
        return isValid;
      });

      const validVariations = vars.filter(variation => {
        const isValid = variation && variation.id && typeof variation.id === 'string' && variation.id.trim() !== '';
        if (!isValid) {
          console.warn("Filtering out invalid variation:", variation);
        }
        return isValid;
      });

      const validVariationGroups = groups.filter(group => {
        const isValid = group && group.id && typeof group.id === 'string' && group.id.trim() !== '' && group.name && group.name.trim() !== '';
        if (!isValid) {
          console.warn("Filtering out invalid variation group in Admin:", group);
        }
        return isValid;
      });

      console.log("Admin: Loaded items:", items.length, items);
      console.log("Admin: Loaded valid categories:", validCategories.length, validCategories);
      console.log("Admin: Loaded valid variations:", validVariations.length, validVariations);
      console.log("Admin: Loaded valid variation groups (FINAL):", validVariationGroups.length, validVariationGroups);

      setMenuItems(items);
      setCategories(validCategories);
      setVariations(validVariations);
      setVariationGroups(validVariationGroups);

      console.log("=== DADOS CARREGADOS E ESTADO ATUALIZADO ===");
    } catch (error) {
      console.error("Admin: Error loading data, using local fallback:", error);
      const validLocalCategories = localCategories.filter(cat =>
        cat && cat.id && typeof cat.id === 'string' && cat.id.trim() !== ''
      );

      setMenuItems(localMenuItems);
      setCategories(validLocalCategories);
      setVariations([]);
      setVariationGroups([]);

      toast({
        title: "Aviso",
        description: "Carregando dados locais. Algumas funcionalidades podem estar limitadas.",
        variant: "default",
      });
    } finally {
      setLoading(false);
    }
  };

  // REMOVEMOS A FUNÇÃO handleSeedData ANTIGA DAQUI, POIS ELA AGORA ESTÁ DENTRO DO SeedDataButton
  // const handleSeedData = async () => { ... }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-full overflow-x-hidden">
        {/* Header responsivo */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-0">
          <h1 className="text-xl sm:text-2xl font-bold leading-tight">
            Gerenciamento do Cardápio
          </h1>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* O NOVO SeedDataButton é renderizado aqui e já gerencia sua própria lógica */}
            <SeedDataButton onDataChange={loadData} /> {/* Passamos loadData para recarregar após o seed */}
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="w-full sm:w-auto text-sm"
            >
              Voltar para o Cardápio
            </Button>
          </div>
        </div>

        {loading && <div className="text-center py-4 text-sm">Carregando dados...</div>}

        {/* Alerta para coleções vazias - mobile friendly */}
        {/* Este alerta precisará ser adaptado para "Coleções do Supabase Vazias" e a mensagem */}
        {!loading && (menuItems.length === 0 || categories.length === 0) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-start gap-2 mb-2">
              <Database className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <h3 className="font-medium text-yellow-800 text-sm sm:text-base">
                Coleções do Supabase Vazias
              </h3>
            </div>
            <p className="text-yellow-700 mb-3 text-xs sm:text-sm leading-relaxed">
              Parece que as coleções do Supabase estão vazias para esta empresa.
              Use o botão "Importar Dados Iniciais Supabase" acima para popular o cardápio.
            </p>
            <p className="text-yellow-600 text-xs leading-relaxed">
              Isso irá criar: categorias, itens do menu, variações e grupos de variações.
            </p>
          </div>
        )}

        {/* Tabs responsivas */}
        <Tabs defaultValue="menu" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4 h-auto p-1">
            <TabsTrigger
              value="menu"
              className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white"
            >
              Itens
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white"
            >
              Categorias
            </TabsTrigger>
            <TabsTrigger
              value="variations"
              className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white"
            >
              Variações
            </TabsTrigger>
            <TabsTrigger
              value="groups"
              className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-white"
            >
              Grupos
            </TabsTrigger>
          </TabsList>

          <div className="w-full overflow-x-hidden">
            <TabsContent value="menu" className="mt-0">
              <MenuItemsTab
                menuItems={menuItems}
                categories={categories}
                variations={variations}
                variationGroups={variationGroups}
                loading={loading}
                onDataChange={loadData}
              />
            </TabsContent>

            <TabsContent value="categories" className="mt-0">
              <CategoriesTab
                categories={categories}
                loading={loading}
                onDataChange={loadData}
                // onSeedData={handleSeedData} // REMOVIDO: A lógica de seed está no SeedDataButton
              />
            </TabsContent>

            <TabsContent value="variations" className="mt-0">
              <VariationsTab
                variations={variations}
                categories={categories}
                loading={loading}
                onDataChange={loadData}
              />
            </TabsContent>

            <TabsContent value="groups" className="mt-0">
              <VariationGroupsTab
                variationGroups={variationGroups}
                variations={variations}
                loading={loading}
                onDataChange={loadData}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;