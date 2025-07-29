
import React, { useState } from "react";
import { MenuItem, Variation, VariationGroup } from "@/types/menu";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Edit } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AddVariationGroupModal } from "./AddVariationGroupModal";
import { formatCurrency } from "@/lib/utils";

interface VariationGroupsSectionProps {
  editItem: MenuItem;
  setEditItem: (item: MenuItem) => void;
  variations: Variation[];
  variationGroups: VariationGroup[];
  onDataChange?: () => void; // Added optional callback
}

export const VariationGroupsSection = ({
  editItem,
  setEditItem,
  variations,
  variationGroups,
  onDataChange, // Added to props
}: VariationGroupsSectionProps) => {
  const [tempVariationGroup, setTempVariationGroup] = useState<VariationGroup | null>(null);

  const handleAddVariationGroup = () => {
    setTempVariationGroup({
      id: crypto.randomUUID(),
      name: "",
      minRequired: 1,
      maxAllowed: 1,
      variations: [],
      customMessage: ""
    });
  };

  const handleSelectExistingGroup = (groupId: string) => {
    const selectedGroup = variationGroups.find(group => group.id === groupId);
    
    if (selectedGroup) {
      // Check if this group is already added to the item
      const isAlreadyAdded = editItem.variationGroups?.some(g => g.id === selectedGroup.id);
      
      if (!isAlreadyAdded) {
        setEditItem({
          ...editItem,
          hasVariations: true,
          variationGroups: [...(editItem.variationGroups || []), selectedGroup]
        });
      }
    }
  };

  const handleRemoveAllVariationGroups = () => {
    if (window.confirm("Tem certeza que deseja remover todos os grupos de variação deste item?")) {
      setEditItem({
        ...editItem,
        hasVariations: false,
        variationGroups: []
      });
    }
  };

  const getVariationName = (variationId: string): string => {
    const variation = variations.find(v => v.id === variationId);
    return variation ? variation.name : "Variação não encontrada";
  };

  const getVariationPrice = (variationId: string): number => {
    const variation = variations.find(v => v.id === variationId);
    return variation?.additionalPrice || 0;
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Grupos de Variações</h3>
        <div className="flex gap-2">
          <Button 
            onClick={handleRemoveAllVariationGroups} 
            size="sm" 
            variant="destructive"
            className="px-2 py-1"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Remover Todos
          </Button>
          <Button 
            onClick={handleAddVariationGroup} 
            size="sm" 
            variant="outline"
            className="px-2 py-1"
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Novo Grupo
          </Button>
        </div>
      </div>
      
      {/* Dropdown to select existing variation groups */}
      <div className="mt-4 space-y-2">
        <Label>Adicionar Grupo Existente</Label>
        <div className="flex gap-2">
          <Select onValueChange={handleSelectExistingGroup}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um grupo existente" />
            </SelectTrigger>
            <SelectContent>
              {variationGroups
                .filter(group => !editItem.variationGroups?.some(g => g.id === group.id))
                .map(group => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name} ({group.minRequired}-{group.maxAllowed})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="mt-4 space-y-4">
        {editItem.variationGroups && editItem.variationGroups.length > 0 ? (
          editItem.variationGroups.map(group => (
            <div key={group.id} className="p-4 border rounded-md bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold">{group.name}</h4>
                  <p className="text-sm text-gray-600">
                    {group.minRequired === group.maxAllowed
                      ? `Exatamente ${group.minRequired} seleção(ões) necessária(s)`
                      : `De ${group.minRequired} até ${group.maxAllowed} seleções`
                    }
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      // Remove this group from the item's variationGroups array
                      setEditItem({
                        ...editItem,
                        variationGroups: editItem.variationGroups?.filter(g => g.id !== group.id) || []
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              
              <div className="mt-2">
                <p className="text-sm font-semibold">Variações:</p>
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {group.variations.map(varId => {
                    const price = getVariationPrice(varId);
                    const name = getVariationName(varId);
                    
                    return (
                      <div key={varId} className="flex items-center justify-between bg-white rounded px-3 py-2 border">
                        <span className="text-sm font-medium">{name}</span>
                        <span className="text-sm font-semibold text-green-600">
                          {price > 0 ? `+${formatCurrency(price)}` : 'Grátis'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {group.customMessage && (
                <div className="mt-2">
                  <p className="text-sm font-semibold">Mensagem personalizada:</p>
                  <p className="text-xs text-gray-600 bg-white rounded px-2 py-1 border">"{group.customMessage}"</p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-gray-500 border rounded-md">
            Nenhum grupo de variação configurado para este item.
            <br />
            <span className="text-sm">
              Adicione grupos de variações para permitir que os clientes personalizem este item.
            </span>
          </div>
        )}
      </div>

      {tempVariationGroup && (
        <AddVariationGroupModal
          tempVariationGroup={tempVariationGroup}
          setTempVariationGroup={setTempVariationGroup}
          editItem={editItem}
          setEditItem={setEditItem}
          variations={variations}
          variationGroups={variationGroups}
          onDataChange={onDataChange} // Pass the callback
        />
      )}
    </div>
  );
};
