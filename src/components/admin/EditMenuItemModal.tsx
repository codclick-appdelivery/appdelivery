
import React from "react";
import { MenuItem, Category, Variation, VariationGroup } from "@/types/menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Save, XCircle } from "lucide-react";
import { saveMenuItem } from "@/services/menuItemService";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VariationGroupsSection } from "./VariationGroupsSection";
import { formatCurrency } from "@/lib/utils";

interface EditMenuItemModalProps {
  editItem: MenuItem;
  setEditItem: (item: MenuItem | null) => void;
  menuItems: MenuItem[];
  categories: Category[];
  variations: Variation[];
  variationGroups: VariationGroup[];
  onSuccess: () => void;
}

export const EditMenuItemModal = ({
  editItem,
  setEditItem,
  menuItems,
  categories,
  variations,
  variationGroups,
  onSuccess,
}: EditMenuItemModalProps) => {
  const { toast } = useToast();

  const handleSaveItem = async () => {
    console.log("Tentando salvar item:", editItem);
    
    if (!editItem.name || !editItem.description || editItem.price <= 0) {
      console.log("Validação falhou - campos obrigatórios");
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (!editItem.category) {
      console.log("Validação falhou - categoria não selecionada");
      toast({
        title: "Categoria obrigatória",
        description: "Selecione uma categoria para o item",
        variant: "destructive",
      });
      return;
    }

    // If item has variations, ensure all variation groups have required fields
    if (editItem.hasVariations && editItem.variationGroups) {
      for (const group of editItem.variationGroups) {
        if (!group.name || group.variations.length === 0) {
          console.log("Validação falhou - grupo de variação incompleto:", group);
          toast({
            title: "Grupos de variação incompletos",
            description: "Todos os grupos de variação devem ter nome e pelo menos uma variação selecionada",
            variant: "destructive",
          });
          return;
        }
      }
    }

    try {
      console.log("Iniciando salvamento do item...");
      
      // Update hasVariations based on whether there are any variation groups
      const itemToSave = {
        ...editItem,
        hasVariations: !!(editItem.variationGroups && editItem.variationGroups.length > 0)
      };

      console.log("Item preparado para salvar:", itemToSave);

      const savedId = await saveMenuItem(itemToSave);
      console.log("Item salvo com sucesso, ID:", savedId);
      
      setEditItem(null);
      toast({
        title: "Sucesso",
        description: "Item salvo com sucesso",
      });
      onSuccess();
    } catch (error) {
      console.error("Erro detalhado ao salvar item:", error);
      toast({
        title: "Erro",
        description: `Não foi possível salvar o item: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive",
      });
    }
  };

  // Enhanced filtering with more strict validation
  const validCategories = categories.filter(category => {
    const isValid = category && 
                   category.id && 
                   typeof category.id === 'string' && 
                   category.id.trim() !== '' && 
                   category.name && 
                   typeof category.name === 'string' && 
                   category.name.trim() !== '';
    if (!isValid) {
      console.warn("Invalid category found and filtered out:", category);
    }
    return isValid;
  });

  console.log("Valid categories for select:", validCategories);
  console.log("Current editItem category:", editItem.category);

  return (
    <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {editItem.id && menuItems.some(item => item.id === editItem.id) ? "Editar Item" : "Novo Item"}
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setEditItem(null)}
          >
            <XCircle className="h-5 w-5" />
          </Button>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={editItem.name}
              onChange={(e) => setEditItem({...editItem, name: e.target.value})}
              placeholder="Nome do item"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={editItem.description}
              onChange={(e) => setEditItem({...editItem, description: e.target.value})}
              placeholder="Descrição do item"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Preço (R$) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                value={editItem.price}
                onChange={(e) => setEditItem({...editItem, price: parseFloat(e.target.value) || 0})}
                placeholder="0.00"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="category">Categoria *</Label>
              {validCategories.length === 0 ? (
                <div className="text-sm text-red-500 p-2 border border-red-300 rounded">
                  Nenhuma categoria válida encontrada. Crie categorias primeiro.
                </div>
              ) : (
                <Select 
                  value={editItem.category && validCategories.some(cat => cat.id === editItem.category) ? editItem.category : ""}
                  onValueChange={(value) => {
                    console.log("Category selected:", value);
                    if (value && value.trim() !== '') {
                      setEditItem({...editItem, category: value});
                    }
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {validCategories.map((category) => {
                      console.log("Rendering category option:", category.id, category.name);
                      // Double check the category ID is valid before rendering
                      if (!category.id || category.id.trim() === '') {
                        console.error("Attempted to render category with invalid ID:", category);
                        return null;
                      }
                      return (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          
          <div>
            <Label htmlFor="image">URL da Imagem</Label>
            <Input
              id="image"
              value={editItem.image}
              onChange={(e) => setEditItem({...editItem, image: e.target.value})}
              placeholder="URL da imagem ou deixe em branco para usar placeholder"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="popular"
              checked={editItem.popular || false}
              onCheckedChange={(checked) => 
                setEditItem({...editItem, popular: checked === true})
              }
            />
            <Label htmlFor="popular">Item popular (destacado no cardápio)</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="priceFrom"
              checked={editItem.priceFrom || false}
              onCheckedChange={(checked) => 
                setEditItem({...editItem, priceFrom: checked === true})
              }
            />
            <Label htmlFor="priceFrom">Preço "a partir de" (valor base não será somado no carrinho)</Label>
          </div>

          {/* Variation groups section with enhanced display */}
          <VariationGroupsSectionWithPrices
            editItem={editItem}
            setEditItem={setEditItem}
            variations={variations}
            variationGroups={variationGroups}
            onDataChange={onSuccess}
          />
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveItem}>
              <Save className="h-4 w-4 mr-1" />
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const VariationGroupsSectionWithPrices = ({
  editItem,
  setEditItem,
  variations,
  variationGroups,
  onDataChange,
}: {
  editItem: MenuItem;
  setEditItem: (item: MenuItem) => void;
  variations: Variation[];
  variationGroups: VariationGroup[];
  onDataChange?: () => void;
}) => {
  const getVariationName = (variationId: string): string => {
    const variation = variations.find(v => v.id === variationId);
    return variation ? variation.name : "Variação não encontrada";
  };

  const getVariationPrice = (variationId: string): number => {
    const variation = variations.find(v => v.id === variationId);
    return variation?.additionalPrice || 0;
  };

  return (
    <VariationGroupsSection
      editItem={editItem}
      setEditItem={setEditItem}
      variations={variations}
      variationGroups={variationGroups}
      onDataChange={onDataChange}
    />
  );
};
