
import React, { useState, useEffect } from "react";
import { getAllMenuItems } from "@/services/menuItemService";
import { getAllCategories } from "@/services/categoryService";
import { MenuItem, Category } from "@/types/menu";
import RestaurantHeader from "@/components/RestaurantHeader";
import CategoryNav from "@/components/CategoryNav";
import MenuSection from "@/components/MenuSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

const Index = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const { itemCount, isCartOpen, setIsCartOpen } = useCart();

  useEffect(() => {
    const loadMenuItems = async () => {
      const items = await getAllMenuItems();
      setMenuItems(items);
    };

    const loadCategories = async () => {
      const categories = await getAllCategories();
      setCategories([{ id: "all", name: "Todos", order: 0 }, ...categories]);
    };

    loadMenuItems();
    loadCategories();
  }, []);

  // Filtrar itens por categoria
  const filteredItems = activeCategory === "all" 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory);

  // Agrupar itens filtrados por categoria para exibição
  const groupedItems = categories.reduce((acc, category) => {
    if (category.id === "all") return acc;
    
    const categoryItems = filteredItems.filter(item => item.category === category.id);
    if (categoryItems.length > 0) {
      acc.push({
        category,
        items: categoryItems
      });
    }
    return acc;
  }, [] as Array<{ category: Category; items: MenuItem[] }>);

  return (
    <div>
      <RestaurantHeader />
      <CategoryNav 
        categories={categories} 
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
      />
      
      <div className="container mx-auto px-4 py-8">
        {activeCategory === "all" ? (
          // Mostrar todas as categorias com seus itens
          groupedItems.map(({ category, items }) => (
            <MenuSection 
              key={category.id}
              title={category.name} 
              items={items} 
            />
          ))
        ) : (
          // Mostrar apenas a categoria selecionada
          <MenuSection 
            title={categories.find(cat => cat.id === activeCategory)?.name || "Menu"} 
            items={filteredItems} 
          />
        )}
      </div>

      
    </div>
  );
};

export default Index;
