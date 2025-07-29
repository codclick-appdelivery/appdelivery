
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MenuItem, Variation, SelectedVariation, SelectedVariationGroup, VariationGroup } from "@/types/menu";
import { formatCurrency } from "@/lib/utils";
import { Plus, Minus } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ProductVariationDialogProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: MenuItem, selectedVariationGroups: SelectedVariationGroup[]) => void;
  availableVariations: Variation[];
  groupVariations: {[groupId: string]: Variation[]};
}

const ProductVariationDialog: React.FC<ProductVariationDialogProps> = ({
  item,
  isOpen,
  onClose,
  onAddToCart,
  availableVariations,
  groupVariations
}) => {
  const [selectedVariationGroups, setSelectedVariationGroups] = useState<SelectedVariationGroup[]>([]);
  const [isValid, setIsValid] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && item.variationGroups) {
      // Initialize selected variations for each group
      const initialGroups = item.variationGroups.map(group => {
        if (!group) return null;
        
        // Get available variations for this group
        const groupVars = groupVariations[group.id] || [];
        const variations = groupVars.map(variation => ({
          variationId: variation.id,
          quantity: 0,
          name: variation.name,
          additionalPrice: variation.additionalPrice || 0
        }));

        return {
          groupId: group.id,
          groupName: group.name,
          variations: variations
        };
      }).filter(Boolean) as SelectedVariationGroup[];

      setSelectedVariationGroups(initialGroups);
    }
  }, [isOpen, item.variationGroups, groupVariations]);

  // Validate selections whenever they change
  useEffect(() => {
    if (!item.variationGroups || selectedVariationGroups.length === 0) {
      setIsValid(false);
      return;
    }

    // Check if all required groups have the correct number of selections
    const allGroupsValid = item.variationGroups.every(group => {
      if (!group) return false;
      
      const selectedGroup = selectedVariationGroups.find(sg => sg.groupId === group.id);
      if (!selectedGroup) return false;

      const totalSelected = selectedGroup.variations.reduce((sum, v) => sum + v.quantity, 0);
      return totalSelected >= group.minRequired && totalSelected <= group.maxAllowed;
    });

    setIsValid(allGroupsValid);
  }, [selectedVariationGroups, item.variationGroups]);

  const increaseVariation = (groupId: string, variationId: string) => {
    setSelectedVariationGroups(prev => 
      prev.map(group => {
        if (group.groupId !== groupId) return group;

        // Find the variation group definition to get max allowed
        const groupDef = item.variationGroups?.find(g => g?.id === groupId);
        if (!groupDef) return group;

        // Count current total quantity (sum of all variation quantities) for this group
        const currentTotal = group.variations.reduce((sum, v) => sum + v.quantity, 0);
        
        // Don't allow increasing if we're already at max total quantity
        if (currentTotal >= groupDef.maxAllowed) return group;
        
        // Update the specific variation with name and additionalPrice
        return {
          ...group,
          variations: group.variations.map(variation => {
            if (variation.variationId === variationId) {
              // Get variation details to ensure we have name and price
              const variationDetails = getVariationDetails(variationId);
              return { 
                ...variation, 
                quantity: variation.quantity + 1,
                name: variationDetails?.name || variation.name,
                additionalPrice: variationDetails?.additionalPrice || variation.additionalPrice || 0
              };
            }
            return variation;
          })
        };
      })
    );
  };

  const decreaseVariation = (groupId: string, variationId: string) => {
    setSelectedVariationGroups(prev => 
      prev.map(group => {
        if (group.groupId !== groupId) return group;
        
        return {
          ...group,
          variations: group.variations.map(variation => 
            variation.variationId === variationId && variation.quantity > 0
              ? { ...variation, quantity: variation.quantity - 1 } 
              : variation
          )
        };
      })
    );
  };

  const handleAddToCart = () => {
    if (!isValid) return;
    
    // Filter out variations with quantity 0 and ensure all data is included
    const nonZeroGroups = selectedVariationGroups.map(group => ({
      ...group,
      variations: group.variations.filter(v => v.quantity > 0).map(v => {
        // Ensure variation has complete data
        const variationDetails = getVariationDetails(v.variationId);
        return {
          ...v,
          name: variationDetails?.name || v.name,
          additionalPrice: variationDetails?.additionalPrice || v.additionalPrice || 0
        };
      })
    })).filter(group => group.variations.length > 0);
    
    console.log("Enviando variações para o carrinho:", nonZeroGroups);
    
    onAddToCart(item, nonZeroGroups);
    onClose();
  };

  const getVariationDetails = (variationId: string) => {
    return availableVariations.find(v => v.id === variationId);
  };

  const getGroupSelectionStatus = (groupId: string) => {
    const groupDef = item.variationGroups?.find(g => g?.id === groupId);
    if (!groupDef) return { total: 0, min: 0, max: 0, isValid: false };

    const selectedGroup = selectedVariationGroups.find(sg => sg.groupId === groupId);
    if (!selectedGroup) return { total: 0, min: groupDef.minRequired, max: groupDef.maxAllowed, isValid: false };

    const totalSelected = selectedGroup.variations.reduce((sum, v) => sum + v.quantity, 0);
    const isValid = totalSelected >= groupDef.minRequired && totalSelected <= groupDef.maxAllowed;

    return {
      total: totalSelected,
      min: groupDef.minRequired,
      max: groupDef.maxAllowed,
      isValid
    };
  };

  // Generate message for a variation group
  const getVariationGroupMessage = (groupId: string) => {
    const groupDef = item.variationGroups?.find(g => g?.id === groupId);
    if (!groupDef) return "";

    const { total, min, max } = getGroupSelectionStatus(groupId);

    if (groupDef.customMessage) {
      let message = groupDef.customMessage;
      message = message.replace('{min}', min.toString());
      message = message.replace('{max}', max.toString());
      message = message.replace('{count}', total.toString());
      return message;
    }

    if (min === max) {
      return `Selecione exatamente ${min} unidades de ${groupDef.name.toLowerCase()} (${total}/${min} selecionadas)`;
    } else if (min > 0) {
      return `Selecione de ${min} a ${max} unidades de ${groupDef.name.toLowerCase()} (${total}/${max} selecionadas)`;
    } else {
      return `Selecione até ${max} unidades de ${groupDef.name.toLowerCase()} (opcional) (${total}/${max} selecionadas)`;
    }
  };

  if (!item.variationGroups || item.variationGroups.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-[95vw] max-h-[85vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full max-h-[85vh]">
          <DialogHeader className="px-6 py-4 flex-shrink-0 border-b">
            <DialogTitle className="text-left">{item.name}</DialogTitle>
            <DialogDescription className="text-left">{item.description}</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="h-48 w-full overflow-hidden rounded-md mb-6">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            </div>
            
            {item.variationGroups.map((group, groupIndex) => {
              if (!group) return null;
              const groupStatus = getGroupSelectionStatus(group.id);
              
              return (
                <div key={group.id} className="mb-6">
                  {groupIndex > 0 && <Separator className="my-6" />}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">{group.name}</h3>
                    <span className={`text-sm px-2 py-1 rounded ${
                      groupStatus.isValid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {groupStatus.total} / {groupStatus.max} unidades
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-4">
                    {getVariationGroupMessage(group.id)}
                  </p>
                  
                  <div className="space-y-3">
                    {selectedVariationGroups
                      .find(sg => sg.groupId === group.id)?.variations
                      .map(variation => {
                        const variationDetails = getVariationDetails(variation.variationId);
                        if (!variationDetails) return null;
                        
                        return (
                          <div key={variation.variationId} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                            <div className="flex-1">
                              <p className="font-medium">{variationDetails.name}</p>
                              {variationDetails.additionalPrice ? (
                                <p className="text-sm text-gray-500">
                                  +{formatCurrency(variationDetails.additionalPrice)}
                                </p>
                              ) : null}
                            </div>
                            
                            <div className="flex items-center space-x-3 flex-shrink-0">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9 w-9 p-0 touch-action-manipulation" 
                                onClick={() => decreaseVariation(group.id, variation.variationId)}
                                disabled={variation.quantity <= 0}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              
                              <span className="w-8 text-center font-medium">{variation.quantity}</span>
                              
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9 w-9 p-0 touch-action-manipulation" 
                                onClick={() => increaseVariation(group.id, variation.variationId)}
                                disabled={groupStatus.total >= groupStatus.max}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
            
            {/* Espaço extra no final para garantir acesso aos botões */}
            <div className="h-20"></div>
          </div>
          
          <div className="flex justify-between gap-3 p-6 border-t flex-shrink-0 bg-white">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleAddToCart} 
              disabled={!isValid}
              className="bg-food-green hover:bg-opacity-90 flex-1"
            >
              Adicionar ao carrinho
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductVariationDialog;
