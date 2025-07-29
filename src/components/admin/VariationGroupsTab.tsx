
import React, { useState } from "react";
import { VariationGroup, Variation } from "@/types/menu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Edit, Plus, Trash2, AlertTriangle } from "lucide-react";
import { deleteVariationGroup } from "@/services/variationGroupService";
import { EditVariationGroupModal } from "./EditVariationGroupModal";

interface VariationGroupsTabProps {
  variationGroups: VariationGroup[];
  variations: Variation[];
  loading: boolean;
  onDataChange: () => void;
}

export const VariationGroupsTab = ({
  variationGroups,
  variations,
  loading,
  onDataChange,
}: VariationGroupsTabProps) => {
  const { toast } = useToast();
  const [editVariationGroup, setEditVariationGroup] = useState<VariationGroup | null>(null);

  // Detectar duplicatas e criar versão limpa
  const cleanVariationGroups = React.useMemo(() => {
    console.log("=== LIMPANDO DUPLICATAS NA INTERFACE ===");
    console.log("Grupos recebidos:", variationGroups.length);
    
    const uniqueGroups = new Map<string, VariationGroup>();
    const duplicateIds = new Set<string>();
    
    variationGroups.forEach(group => {
      if (uniqueGroups.has(group.id)) {
        duplicateIds.add(group.id);
        console.warn(`DUPLICATA LOCAL DETECTADA: ID ${group.id}`);
      } else {
        uniqueGroups.set(group.id, group);
      }
    });
    
    const cleanGroups = Array.from(uniqueGroups.values());
    console.log("Grupos após limpeza:", cleanGroups.length);
    console.log("IDs duplicados removidos:", Array.from(duplicateIds));
    
    return {
      groups: cleanGroups,
      duplicateIds: duplicateIds
    };
  }, [variationGroups]);

  const handleAddNewVariationGroup = () => {
    setEditVariationGroup({
      id: "",
      name: "",
      minRequired: 1,
      maxAllowed: 1,
      variations: [],
      customMessage: ""
    });
  };

  const handleEditExistingVariationGroup = (group: VariationGroup) => {
    setEditVariationGroup({...group});
  };

  const handleDeleteExistingVariationGroup = async (group: VariationGroup) => {
    console.log("Tentando deletar grupo:", group.name, "ID:", group.id);
    
    if (!group.id) {
      console.error("Grupo não possui ID válido:", group);
      toast({
        title: "Erro",
        description: "Grupo não possui ID válido para exclusão",
        variant: "destructive",
      });
      return;
    }

    const isDuplicate = cleanVariationGroups.duplicateIds.has(group.id);
    const confirmMessage = isDuplicate 
      ? `ATENÇÃO: Este grupo "${group.name}" tinha DUPLICATAS locais que foram detectadas!\n\nA exclusão removerá o grupo definitivamente. Tem certeza que deseja continuar?`
      : `Tem certeza que deseja excluir o grupo "${group.name}"? Isso pode afetar itens do menu que o utilizam.`;

    if (window.confirm(confirmMessage)) {
      try {
        console.log("Confirmação recebida, deletando grupo:", group.id);
        
        await deleteVariationGroup(group.id);
        
        console.log("Grupo deletado com sucesso");
        
        toast({
          title: "Sucesso",
          description: isDuplicate 
            ? "Grupo de variação e suas duplicatas excluídos com sucesso"
            : "Grupo de variação excluído com sucesso",
        });
        
        console.log("Recarregando dados...");
        onDataChange();
        
      } catch (error) {
        console.error("Erro ao excluir grupo de variação:", error);
        
        toast({
          title: "Erro",
          description: `Não foi possível excluir o grupo: ${error.message}`,
          variant: "destructive",
        });
      }
    }
  };

  const getVariationName = (variationId: string): string => {
    const variation = variations.find(v => v.id === variationId);
    return variation ? variation.name : "Variação não encontrada";
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          Grupos de Variações ({cleanVariationGroups.groups.length} grupos)
          {cleanVariationGroups.duplicateIds.size > 0 && (
            <span className="ml-2 text-orange-600 text-sm">
              ({cleanVariationGroups.duplicateIds.size} duplicatas removidas)
            </span>
          )}
        </h2>
        <Button onClick={handleAddNewVariationGroup}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Grupo de Variações
        </Button>
      </div>
      
      {cleanVariationGroups.duplicateIds.size > 0 && (
        <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <h3 className="font-medium text-orange-800">Duplicatas Locais Detectadas e Removidas</h3>
          </div>
          <p className="text-sm text-orange-700">
            {cleanVariationGroups.duplicateIds.size} grupo(s) tinham duplicatas na interface que foram automaticamente removidas.
            A lista abaixo mostra apenas grupos únicos.
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cleanVariationGroups.groups.map(group => (
          <Card key={group.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{group.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    {group.minRequired === group.maxAllowed
                      ? `Exatamente ${group.minRequired} seleção(ões) necessária(s)`
                      : `De ${group.minRequired} até ${group.maxAllowed} seleções`
                    }
                  </p>
                  
                  {group.customMessage && (
                    <p className="text-xs text-gray-500 mt-2">
                      Mensagem: {group.customMessage}
                    </p>
                  )}

                  <div className="mt-3">
                    <p className="text-sm font-semibold mb-1">Variações:</p>
                    <div className="flex flex-wrap gap-1">
                      {group.variations.map(varId => (
                        <span key={varId} className="inline-block bg-gray-200 rounded-full px-2 py-1 text-xs">
                          {getVariationName(varId)}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-400 mt-2">
                    ID: {group.id}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleEditExistingVariationGroup(group)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleDeleteExistingVariationGroup(group)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {cleanVariationGroups.groups.length === 0 && !loading && (
          <div className="col-span-full text-center py-8 text-gray-500">
            Nenhum grupo de variação encontrado. Adicione grupos para organizar as variações.
          </div>
        )}
      </div>

      {editVariationGroup && (
        <EditVariationGroupModal
          editVariationGroup={editVariationGroup}
          setEditVariationGroup={setEditVariationGroup}
          variations={variations}
          variationGroups={cleanVariationGroups.groups}
          onSuccess={onDataChange}
        />
      )}
    </>
  );
};
