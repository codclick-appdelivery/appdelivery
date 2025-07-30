// src/data/menuData.ts

import { MenuItem, Category, Variation, VariationGroup } from "@/types/menu";
import { v4 as uuidv4 } from 'uuid';

// ÚNICA CATEGORIA
export const categories: Category[] = [
  { id: "lanches", name: "Lanches", order: 1 }
];

// DUAS VARIAÇÕES
export const variations: Variation[] = [
  // Adicione price_adjustment aqui para que o tipo esteja completo
  { id: "bacon", name: "Bacon Crocante", available: true, price_adjustment: 3.50, categoryIds: [] },
  { id: "queijo_extra", name: "Queijo Extra", available: true, price_adjustment: 2.00, categoryIds: [] },
];

// UM GRUPO DE VARIAÇÃO
export const adicionaisLancheGroup: VariationGroup = {
  id: uuidv4(), // Usar uuidv4 para gerar um ID único para o grupo
  name: "Adicionais",
  minRequired: 0, // Pode escolher nenhum adicional
  maxAllowed: 2,  // Pode escolher até 2 adicionais
  variations: ["bacon", "queijo_extra"], // IDs das variações pertencentes a este grupo
  customMessage: "Escolha seus adicionais ({count}/{max} selecionados)"
};

// UM ITEM DE MENU
export const menuItems: MenuItem[] = [
  {
    id: "hamburguer_simples", // ID local simples
    name: "Hamburguer Clássico",
    description: "Delicioso hambúrguer de carne com alface, tomate e maionese especial.",
    price: 25.00,
    image: "/images/hamburguer.jpg", // Certifique-se de ter essa imagem em public/images
    category: "lanches", // Associado à categoria "lanches"
    popular: true,
    hasVariations: true, // Indica que este item tem variações
    variationGroups: [adicionaisLancheGroup] // Associado ao grupo de adicionais
  }
];

// Funções utilitárias (podem ser mantidas, mas não serão usadas no seed simplificado)
export const getMenuItemsByCategory = (categoryId: string): MenuItem[] => {
  return menuItems.filter(item => item.category === categoryId);
};

export const getPopularItems = (): MenuItem[] => {
  return menuItems.filter(item => item.popular === true);
};

export const getVariationsForItem = (item: MenuItem): Variation[] => {
  if (!item.variationGroups) {
    return [];
  }
  const variationIds = item.variationGroups.flatMap(group => group.variations);
  return variations.filter(
    variation =>
      variation.available &&
      variationIds.includes(variation.id)
  );
};