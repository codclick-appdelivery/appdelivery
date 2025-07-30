// src/services/seedDataService.ts

import { supabase } from "@/lib/supabaseClient";
import { v4 as uuidv4 } from 'uuid';
import {
  categories as localCategories,
  variations as localVariations,
  menuItems as localMenuItems,
  adicionaisLancheGroup, // AGORA IMPORTAMOS APENAS O GRUPO SIMPLIFICADO
} from "@/data/menuData"; // Verifique se o caminho está correto

// Defina o ID da empresa para associar os dados
const EMPRESA_ID = "67ac5adf-02a7-4c22-8ec3-68c463323e35";

// Mapa para armazenar os IDs gerados e manter as relações
const generatedIds = {
  categories: new Map<string, string>(),
  variations: new Map<string, string>(),
  variationGroups: new Map<string, string>(),
  menuItems: new Map<string, string>(),
};

export const seedSupabaseData = async () => {
  console.log("Iniciando processo de seed data para o Supabase...");

  try {
    // 1. Limpar tabelas existentes (CUIDADO AO USAR EM PRODUÇÃO!)
    console.log("Tentando limpar dados existentes para empresa_id:", EMPRESA_ID);
    // Note que essas deleções agora podem ser menos problemáticas com o RLS desativado
    // e com o CASCADE configurado nas chaves estrangeiras se você tiver
    // (não adicionamos CASCADE nos scripts de CREATE TABLE anteriores, mas é uma boa prática para deleções).
    await supabase.from('item_variation_groups').delete().eq('empresa_id', EMPRESA_ID);
    await supabase.from('group_variations').delete().eq('empresa_id', EMPRESA_ID);
    await supabase.from('menu_items').delete().eq('empresa_id', EMPRESA_ID);
    await supabase.from('variation_groups').delete().eq('empresa_id', EMPRESA_ID);
    await supabase.from('variations').delete().eq('empresa_id', EMPRESA_ID);
    await supabase.from('categories').delete().eq('empresa_id', EMPRESA_ID);
    console.log("Dados limpos para o empresa_id:", EMPRESA_ID);

    // 2. Inserir Categorias
    const categoriesToInsert = localCategories.map(cat => {
      const newId = uuidv4();
      generatedIds.categories.set(cat.id, newId);
      return {
        id: newId,
        name: cat.name,
        display_order: String(cat.order),
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
        price_adjustment: variation.price_adjustment ?? 0,
        is_available: variation.available,
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
    // Usamos o grupo simplificado diretamente
    const localVariationGroups = [adicionaisLancheGroup];

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

      // A lógica para is_base_price_included pode ser simplificada para este único item
      const isBasePriceIncluded = !(item.hasVariations && item.variationGroups && item.variationGroups.length > 0);

      const categoryUUID = generatedIds.categories.get(item.category);
      if (!categoryUUID) {
        console.error(`Categoria "${item.category}" não encontrada no mapa de IDs gerados para o item:`, item);
        throw new Error(`Erro de Seed Data: Categoria com ID local "${item.category}" não encontrada.`);
      }

      return {
        id: newId,
        name: item.name,
        description: item.description,
        price: item.price,
        image_url: item.image,
        category_id: categoryUUID,
        is_base_price_included: isBasePriceIncluded,
        is_available: true,
        is_popular: !!item.popular,
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
    const groupVariationsInserts: Array<{ variation_group_id: string; variation_id: string; empresa_id: string }> = [];
    localVariationGroups.forEach(group => {
      const newGroupId = generatedIds.variationGroups.get(group.id);
      if (newGroupId) {
        group.variations.forEach(varId => {
          const newVarId = generatedIds.variations.get(varId);
          if (newVarId) {
            groupVariationsInserts.push({
              variation_group_id: newGroupId,
              variation_id: newVarId,
              empresa_id: EMPRESA_ID,
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

    const itemVariationGroupsInserts: Array<{ menu_item_id: string; variation_group_id: string; empresa_id: string }> = [];
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
                empresa_id: EMPRESA_ID,
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