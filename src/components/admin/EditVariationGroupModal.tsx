
import React from "react";
import { VariationGroup, Variation } from "@/types/menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Save, XCircle } from "lucide-react";
import { saveVariationGroup } from "@/services/variationGroupService";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditVariationGroupModalProps {
  editVariationGroup: VariationGroup;
  setEditVariationGroup: (group: VariationGroup | null) => void;
  variations: Variation[];
  variationGroups: VariationGroup[];
  onSuccess: () => void;
}

export const EditVariationGroupModal = ({
  editVariationGroup,
  setEditVariationGroup,
  variations,
  variationGroups,
  onSuccess,
}: EditVariationGroupModalProps) => {
  const { toast } = useToast();

  const handleVariationCheckboxChange = (variationId: string) => {
    const updatedVariations = editVariationGroup.variations.includes(variationId)
      ? editVariationGroup.variations.filter(id => id !== variationId)
      : [...editVariationGroup.variations, variationId];
    
    setEditVariationGroup({
      ...editVariationGroup,
      variations: updatedVariations
    });
  };

  const handleSaveVariationGroup = async () => {
    if (!editVariationGroup.name) {
      toast({
        title: "Campo obrigatório",
        description: "O nome do grupo de variação é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (editVariationGroup.variations.length === 0) {
      toast({
        title: "Variações obrigatórias",
        description: "Selecione pelo menos uma variação para o grupo",
        variant: "destructive",
      });
      return;
    }

    if (editVariationGroup.minRequired > editVariationGroup.maxAllowed) {
      toast({
        title: "Valores inválidos",
        description: "O mínimo obrigatório não pode ser maior que o máximo permitido",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if we're creating a new group or updating an existing one
      const isNew = !editVariationGroup.id || !variationGroups.some(g => g.id === editVariationGroup.id);
      
      await saveVariationGroup(editVariationGroup);

      setEditVariationGroup(null);
      toast({
        title: "Sucesso",
        description: isNew
          ? "Grupo de variação criado com sucesso"
          : "Grupo de variação atualizado com sucesso",
      });
      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar grupo de variação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o grupo de variação. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const isNew = !editVariationGroup.id || !variationGroups.some(g => g.id === editVariationGroup.id);

  return (
    <Dialog open={!!editVariationGroup} onOpenChange={(open) => !open && setEditVariationGroup(null)}>
      <DialogContent className="max-w-md h-[85vh] flex flex-col p-0">
        <div className="flex justify-between items-center p-6 pb-4 flex-shrink-0 border-b">
          <h2 className="text-xl font-bold">
            {isNew ? "Novo Grupo de Variações" : "Editar Grupo de Variações"}
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setEditVariationGroup(null)}
          >
            <XCircle className="h-5 w-5" />
          </Button>
        </div>
        
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 pb-4">
            <div>
              <Label htmlFor="group-name">Nome do Grupo</Label>
              <Input
                id="group-name"
                value={editVariationGroup.name}
                onChange={(e) => setEditVariationGroup({...editVariationGroup, name: e.target.value})}
                placeholder="Ex: Sabores, Recheios, Complementos"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min-required">Mínimo Obrigatório</Label>
                <Input
                  id="min-required"
                  type="number"
                  min="0"
                  value={editVariationGroup.minRequired}
                  onChange={(e) => setEditVariationGroup({
                    ...editVariationGroup, 
                    minRequired: parseInt(e.target.value)
                  })}
                />
              </div>
              <div>
                <Label htmlFor="max-allowed">Máximo Permitido</Label>
                <Input
                  id="max-allowed"
                  type="number"
                  min="1"
                  value={editVariationGroup.maxAllowed}
                  onChange={(e) => setEditVariationGroup({
                    ...editVariationGroup, 
                    maxAllowed: parseInt(e.target.value)
                  })}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="custom-message">Mensagem Personalizada (opcional)</Label>
              <Input
                id="custom-message"
                value={editVariationGroup.customMessage || ""}
                onChange={(e) => setEditVariationGroup({
                  ...editVariationGroup, 
                  customMessage: e.target.value
                })}
                placeholder="Ex: Escolha {min} opções"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use {"{min}"} para o número mínimo, {"{max}"} para o máximo e {"{count}"} para quantidade selecionada
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Variações Disponíveis</Label>
              <div className="max-h-48 overflow-y-auto border rounded-md p-2">
                {variations.map((variation) => (
                  <div key={variation.id} className="flex items-center space-x-2 py-1">
                    <Checkbox 
                      id={`var-${variation.id}`}
                      checked={editVariationGroup.variations.includes(variation.id)}
                      onCheckedChange={() => handleVariationCheckboxChange(variation.id)}
                    />
                    <Label htmlFor={`var-${variation.id}`}>
                      {variation.name}
                      {variation.additionalPrice > 0 && ` (+R$ ${variation.additionalPrice.toFixed(2)})`}
                    </Label>
                  </div>
                ))}
                {variations.length === 0 && (
                  <p className="text-sm text-gray-500 py-2">
                    Nenhuma variação disponível. Adicione variações primeiro.
                  </p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
        
        <div className="flex justify-end gap-2 p-6 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => setEditVariationGroup(null)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveVariationGroup}>
            <Save className="h-4 w-4 mr-1" />
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
