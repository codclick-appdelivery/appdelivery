
import React, { useState } from "react";
import { Variation, Category } from "@/types/menu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Edit, Plus, Trash2 } from "lucide-react";
import { deleteVariation } from "@/services/variationService";
import { EditVariationModal } from "./EditVariationModal";

interface VariationsTabProps {
  variations: Variation[];
  categories: Category[];
  loading: boolean;
  onDataChange: () => void;
}

export const VariationsTab = ({
  variations,
  categories,
  loading,
  onDataChange,
}: VariationsTabProps) => {
  const { toast } = useToast();
  const [editVariation, setEditVariation] = useState<Variation | null>(null);

  const handleAddVariation = () => {
    const newVariation: Variation = {
      id: "", // ID vazio para nova variação
      name: "",
      description: "",
      additionalPrice: 0,
      available: true,
      categoryIds: []
    };
    setEditVariation(newVariation);
  };

  const handleEditVariation = (variation: Variation) => {
    setEditVariation({...variation});
  };

  const handleDeleteVariation = async (variation: Variation) => {
    console.log("VariationsTab: Tentando deletar variação:", variation);
    console.log("VariationsTab: ID da variação:", variation.id);
    console.log("VariationsTab: Tipo do ID:", typeof variation.id);
    
    if (!variation.id) {
      console.error("VariationsTab: Variação não possui ID válido:", variation);
      toast({
        title: "Erro",
        description: "Variação não possui ID válido para exclusão",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir a variação "${variation.name}"?`)) {
      try {
        console.log("VariationsTab: Confirmação recebida, chamando deleteVariation com ID:", variation.id);
        await deleteVariation(variation.id);
        toast({
          title: "Sucesso",
          description: "Variação excluída com sucesso",
        });
        console.log("VariationsTab: Variação deletada com sucesso, chamando onDataChange");
        onDataChange();
      } catch (error) {
        console.error("VariationsTab: Erro ao excluir variação:", error);
        toast({
          title: "Erro",
          description: `Não foi possível excluir a variação: ${error.message}`,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Variações</h2>
        <Button onClick={handleAddVariation}>
          <Plus className="h-4 w-4 mr-1" />
          Nova Variação
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {variations.map(variation => (
          <Card key={variation.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold">{variation.name}</h3>
                  {variation.description && (
                    <p className="text-sm text-gray-600 mb-2">{variation.description}</p>
                  )}
                  {variation.additionalPrice > 0 && (
                    <p className="text-sm font-semibold">
                      + R$ {variation.additionalPrice.toFixed(2)}
                    </p>
                  )}
                  <div className="flex items-center mt-2">
                    <span className={`inline-block h-2 w-2 rounded-full mr-2 ${variation.available ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-xs text-gray-500">
                      {variation.available ? 'Disponível' : 'Indisponível'}
                    </span>
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">
                      Categorias: {
                        variation.categoryIds.length > 0 
                          ? variation.categoryIds.map(id => 
                            categories.find(c => c.id === id)?.name || id
                          ).join(", ")
                          : "Todas"
                      }
                    </p>
                  </div>
                  
                  <p className="text-xs text-gray-400 mt-1">
                    ID: {variation.id}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEditVariation(variation)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteVariation(variation)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {variations.length === 0 && !loading && (
          <div className="col-span-full text-center py-8 text-gray-500">
            Nenhuma variação encontrada. Adicione variações para personalizar os itens do menu.
          </div>
        )}
      </div>

      {editVariation && (
        <EditVariationModal
          editVariation={editVariation}
          setEditVariation={setEditVariation}
          categories={categories}
          onSuccess={onDataChange}
        />
      )}
    </>
  );
};
