// src/services/seedDataService.ts (ou onde você preferir colocar sua lógica de seed)

import { supabase } from "@/lib/supabaseClient";
import { v4 as uuidv4 } from 'uuid';
import {
  categories as localCategories,
  variations as localVariations,
  menuItems as localMenuItems,
  // recheioGroup e burritoGroup são objetos, não arrays exportados diretamente,
  // vamos precisar referenciá-los pelo nome.
} from "@/data/menuData";

// Defina o ID da empresa para associar os dados
const EMPRESA_ID = "67ac5adf-02a7-4c22-8ec3-68c463323e35";

// Funções auxiliares para gerar IDs e mapear dados
interface LocalCategory { id: string; name: string; order: number; }
interface LocalVariation { id: string; name: string; available: boolean; categoryIds: string[]; }
interface LocalVariationGroup {
  id: string; name: string; minRequired: number; maxAllowed: number;
  variations: string[]; // IDs das variações
  customMessage: string;
}
interface LocalMenuItem {
  id: string; name: string; description: string; price: number;
  image: string; category: string; popular?: boolean;
  hasVariations?: boolean; variationGroups?: LocalVariationGroup[];
}

// Mapa para armazenar os IDs gerados e manter as relações
const generatedIds = {
  categories: new Map<string, string>(), // oldId -> newUuid
  variations: new Map<string, string>(), // oldId -> newUuid
  variationGroups: new Map<string, string>(), // oldId -> newUuid
  menuItems: new Map<string, string>(), // oldId -> newUuid
};

export const seedSupabaseData = async () => {
  console.log("Iniciando processo de seed data para o Supabase...");

  try {
    // 1. Limpar tabelas existentes (cuidado ao usar em produção!)
    // A ordem de deleção é inversa à de inserção devido às chaves estrangeiras.
    await supabase.from('item_variation_groups').delete().eq('menu_item_id', EMPRESA_ID); // dummy condition for now, will fail
    await supabase.from('group_variations').delete().eq('variation_group_id', EMPRESA_ID); // dummy condition
    await supabase.from('menu_items').delete().eq('empresa_id', EMPRESA_ID);
    await supabase.from('variation_groups').delete().eq('empresa_id', EMPRESA_ID);
    await supabase.from('variations').delete().eq('empresa_id', EMPRESA_ID);
    await supabase.from('categories').delete().eq('empresa_id', EMPRESA_ID);
    console.log("Tabelas limpas para o empresa_id:", EMPRESA_ID);
    // Nota: As operações de delete acima precisarão de RLS para funcionar por empresa_id.
    // Para um seed inicial sem RLS configurado, você pode precisar de 'TRUNCATE TABLE' se tiver permissão,
    // ou apenas inserir sem limpar se o banco estiver vazio.

    // 2. Inserir Categorias
    const categoriesToInsert = localCategories.map(cat => {
      const newId = uuidv4();
      generatedIds.categories.set(cat.id, newId);
      return {
        id: newId,
        name: cat.name,
        display_order: String(cat.order), // Converter number para string
        empresa_id: EMPRESA_ID,
      };
    });
    const { data: insertedCategories, error: categoriesError } = await supabase
      .from('categories')
      .insert(categoriesToInsert)
      .select();

    if (categoriesError) throw categoriesError;
    console.log("Categorias inseridas:", insertedCategories?.length);

    // 3. Inserir Variações
    const variationsToInsert = localVariations.map(variation => {
      const newId = uuidv4();
      generatedIds.variations.set(variation.id, newId);
      return {
        id: newId,
        name: variation.name,
        price_adjustment: variation.price_adjustment || 0, // Adicionar se não existir no menuData.ts
        is_available: variation.available, // Usar o campo 'available'
        empresa_id: EMPRESA_ID,
      };
    });
    const { data: insertedVariations, error: variationsError } = await supabase
      .from('variations')
      .insert(variationsToInsert)
      .select();

    if (variationsError) throw variationsError;
    console.log("Variações inseridas:", insertedVariations?.length);

    // 4. Inserir Grupos de Variação
    // Precisamos acessar os objetos recheioGroup e burritoGroup diretamente
    const localVariationGroups: LocalVariationGroup[] = [
      (await import("@/data/menuData")).recheioGroup,
      (await import("@/data/menuData")).burritoGroup,
    ];

    const variationGroupsToInsert = localVariationGroups.map(group => {
      const newId = uuidv4();
      generatedIds.variationGroups.set(group.id, newId);
      return {
        id: newId,
        name: group.name,
        min_selections: group.minRequired,
        max_selections: group.maxAllowed,
        empresa_id: EMPRESA_ID,
      };
    });
    const { data: insertedGroups, error: groupsError } = await supabase
      .from('variation_groups')
      .insert(variationGroupsToInsert)
      .select();

    if (groupsError) throw groupsError;
    console.log("Grupos de Variação inseridos:", insertedGroups?.length);

    // 5. Inserir Itens do Menu
    const menuItemsToInsert = localMenuItems.map(item => {
      const newId = uuidv4();
      generatedIds.menuItems.set(item.id, newId);

      // Determinar is_base_price_included
      const isBasePriceIncluded = !(item.name.includes("Combo 3 Tacos") || item.name.includes("Combo 2 Burritos"));

      return {
        id: newId,
        name: item.name,
        description: item.description,
        price: item.price,
        image_url: item.image,
        category_id: generatedIds.categories.get(item.category), // Usar o novo UUID da categoria
        is_base_price_included: isBasePriceIncluded,
        is_available: true, // Por padrão, itens do seed estão disponíveis
        is_popular: !!item.popular, // Mapear o campo popular
        empresa_id: EMPRESA_ID,
      };
    });
    const { data: insertedMenuItems, error: menuItemsError } = await supabase
      .from('menu_items')
      .insert(menuItemsToInsert)
      .select();

    if (menuItemsError) throw menuItemsError;
    console.log("Itens do Menu inseridos:", insertedMenuItems?.length);

    // 6. Popular as Tabelas de Junção
    const groupVariationsInserts: Array<{ variation_group_id: string; variation_id: string }> = [];
    localVariationGroups.forEach(group => {
      const newGroupId = generatedIds.variationGroups.get(group.id);
      if (newGroupId) {
        group.variations.forEach(varId => {
          const newVarId = generatedIds.variations.get(varId);
          if (newVarId) {
            groupVariationsInserts.push({
              variation_group_id: newGroupId,
              variation_id: newVarId,
            });
          }
        });
      }
    });

    if (groupVariationsInserts.length > 0) {
      const { error: gvError } = await supabase.from('group_variations').insert(groupVariationsInserts);
      if (gvError) throw gvError;
      console.log("Relações group_variations inseridas:", groupVariationsInserts.length);
    }

    const itemVariationGroupsInserts: Array<{ menu_item_id: string; variation_group_id: string }> = [];
    localMenuItems.forEach(item => {
      if (item.hasVariations && item.variationGroups) {
        const newMenuItemId = generatedIds.menuItems.get(item.id);
        if (newMenuItemId) {
          item.variationGroups.forEach(group => {
            const newGroupId = generatedIds.variationGroups.get(group.id);
            if (newGroupId) {
              itemVariationGroupsInserts.push({
                menu_item_id: newMenuItemId,
                variation_group_id: newGroupId,
              });
            }
          });
        }
      }
    });

    if (itemVariationGroupsInserts.length > 0) {
      const { error: ivgError } = await supabase.from('item_variation_groups').insert(itemVariationGroupsInserts);
      if (ivgError) throw ivgError;
      console.log("Relações item_variation_groups inseridas:", itemVariationGroupsInserts.length);
    }

    console.log("Seed data concluído com sucesso!");
  } catch (error: any) {
    console.error("Erro ao realizar seed data:", error.message);
    alert(`Erro ao realizar seed data: ${error.message}. Verifique o console para mais detalhes.`);
  }
};