import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, UserCheck, UserX, UserPlus, Save, X } from "lucide-react"; // Ícones para o modal

// Interface para um entregador (usuário com role 'entregador')
interface Deliverer {
  id: string;
  nome: string;
  telefone: string | null;
  placa: string | null;
  cpf: string | null;
  status_entregador: 'ativo' | 'inativo';
  empresa_id: string;
  email?: string; // Email é necessário para signup, mas pode não ser exibido na lista
}

interface DelivererManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string | null; // O ID da empresa do admin logado
}

const DelivererManagementModal: React.FC<DelivererManagementModalProps> = ({ isOpen, onClose, empresaId }) => {
  const { toast } = useToast();
  const [deliverers, setDeliverers] = useState<Deliverer[]>([]);
  const [loading, setLoading] = useState(true); // Estado de carregamento
  const [isAddDelivererFormOpen, setIsAddDelivererFormOpen] = useState(false); // Estado para o formulário de adicionar
  const [newDelivererData, setNewDelivererData] = useState<Partial<Deliverer & { email: string; password: string }>>({
    nome: "",
    telefone: "",
    placa: "",
    cpf: "",
    email: "",
    password: "",
    status_entregador: "ativo", // Padrão para ativo
  });

  // Log para verificar as props do modal
  console.log("DelivererManagementModal: Renderizando. isOpen:", isOpen, "empresaId:", empresaId);


  // Função para buscar entregadores
  const fetchDeliverers = async () => {
    console.log("fetchDeliverers: Função iniciada.");
    if (!empresaId) {
      console.warn("fetchDeliverers: empresaId não fornecido. Não é possível buscar entregadores.");
      setDeliverers([]);
      setLoading(false); // Finaliza o loading se userId for nulo
      return;
    }

    setLoading(true); // Garante que o estado de loading é ativado
    console.log("fetchDeliverers: Tentando buscar entregadores para empresaId:", empresaId);
    try {
      console.log("fetchDeliverers: Fazendo chamada ao Supabase...");
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, telefone, placa, cpf, status_entregador, empresa_id, email')
        .eq('empresa_id', empresaId)
        .eq('role', 'entregador');

      if (error) {
        console.error("fetchDeliverers: Erro do Supabase:", error.message);
        throw error;
      }

      setDeliverers(data as Deliverer[]);
      console.log("fetchDeliverers: Entregadores carregados com sucesso:", data);
    } catch (error: any) {
      console.error("fetchDeliverers: Erro capturado ao buscar entregadores:", error.message);
      toast({
        title: "Erro",
        description: `Não foi possível carregar os entregadores: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      console.log("fetchDeliverers: Bloco finally executado. Definindo loading para false.");
      setLoading(false); // Garante que o estado de loading é desativado
    }
  };

  // Efeito para buscar entregadores quando o modal abre ou empresaId muda
  useEffect(() => {
    console.log("useEffect: Disparado no DelivererManagementModal. isOpen:", isOpen, "empresaId:", empresaId, "loading atual:", loading);
    if (isOpen && empresaId) {
      // CORREÇÃO AQUI: Chamada direta de fetchDeliverers.
      // A lógica de `setLoading(true)` e `setLoading(false)` já está dentro de fetchDeliverers.
      fetchDeliverers(); 
    } else if (!isOpen) {
        // Se o modal fechar, resetar o estado de loading para a próxima abertura
        setLoading(true);
        setDeliverers([]); // Opcional: limpar a lista ao fechar
    }
  }, [isOpen, empresaId]); // Removido 'loading' das dependências para evitar loop infinito

  // Função para alternar o status do entregador
  const handleToggleStatus = async (delivererId: string, currentStatus: 'ativo' | 'inativo') => {
    const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ status_entregador: newStatus })
        .eq('id', delivererId);

      if (error) {
        throw error;
      }

      // Atualiza o estado local para refletir a mudança
      setDeliverers(prev =>
        prev.map(d => (d.id === delivererId ? { ...d, status_entregador: newStatus } : d))
      );
      toast({
        title: "Status atualizado",
        description: `Entregador agora ${newStatus}.`,
      });
    } catch (error: any) {
      console.error("Erro ao atualizar status do entregador:", error.message);
      toast({
        title: "Erro",
        description: `Não foi possível atualizar o status: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Lidar com a mudança nos campos do formulário de novo entregador
  const handleNewDelivererChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setNewDelivererData(prev => ({ ...prev, [id]: value }));
  };

  // Lidar com a submissão do formulário de novo entregador
  const handleAddDelivererSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) {
      toast({
        title: "Erro",
        description: "ID da empresa não disponível. Não é possível adicionar entregador.",
        variant: "destructive",
      });
      return;
    }

    if (!newDelivererData.email || !newDelivererData.password || !newDelivererData.nome) {
      toast({
        title: "Campos obrigatórios",
        description: "Email, senha e nome são obrigatórios para um novo entregador.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true); // Ativa o loading para a operação de adicionar
    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newDelivererData.email,
        password: newDelivererData.password,
        options: {
          data: {
            nome: newDelivererData.nome,
            role: "entregador",
            empresa_id: empresaId,
            telefone: newDelivererData.telefone,
            placa: newDelivererData.placa,
            cpf: newDelivererData.cpf,
            status_entregador: newDelivererData.status_entregador,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Usuário não retornado após signup.");
      }

      // 2. Inserir dados adicionais na tabela 'usuarios' (se não for feito automaticamente pelo trigger do Supabase)
      const { error: insertError } = await supabase
        .from('usuarios')
        .upsert({
          id: authData.user.id,
          nome: newDelivererData.nome,
          email: newDelivererData.email,
          role: "entregador",
          empresa_id: empresaId,
          telefone: newDelivererData.telefone || null,
          placa: newDelivererData.placa || null,
          cpf: newDelivererData.cpf || null,
          status_entregador: newDelivererData.status_entregador || "ativo",
          created_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (insertError) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw insertError;
      }

      toast({
        title: "Entregador adicionado",
        description: `O entregador ${newDelivererData.nome} foi adicionado com sucesso.`,
      });

      setIsAddDelivererFormOpen(false);
      setNewDelivererData({ // Resetar formulário
        nome: "",
        telefone: "",
        placa: "",
        cpf: "",
        email: "",
        password: "",
        status_entregador: "ativo",
      });
      fetchDeliverers(); // Recarrega a lista de entregadores
    } catch (error: any) {
      console.error("Erro ao adicionar entregador:", error.message);
      toast({
        title: "Erro",
        description: `Não foi possível adicionar o entregador: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false); // Desativa o loading após a operação de adicionar
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Entregadores</DialogTitle>
          <DialogDescription>
            Visualize e altere o status dos entregadores, ou adicione novos.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Button onClick={() => setIsAddDelivererFormOpen(true)} className="mb-4 flex items-center gap-2">
            <PlusCircle size={18} /> Adicionar Novo Entregador
          </Button>

          {loading ? (
            <p className="text-center text-gray-500">Carregando entregadores...</p>
          ) : deliverers.length === 0 ? (
            <p className="text-center text-gray-500">Nenhum entregador encontrado para esta empresa.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliverers.map((deliverer) => (
                  <TableRow key={deliverer.id}>
                    <TableCell className="font-medium">{deliverer.nome}</TableCell>
                    <TableCell>{deliverer.telefone || "N/A"}</TableCell>
                    <TableCell>{deliverer.placa || "N/A"}</TableCell>
                    <TableCell>{deliverer.cpf || "N/A"}</TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        deliverer.status_entregador === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {deliverer.status_entregador === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={deliverer.status_entregador === 'ativo'}
                        onCheckedChange={() => handleToggleStatus(deliverer.id, deliverer.status_entregador)}
                        aria-label={`Alternar status de ${deliverer.nome}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>

        {/* Modal para Adicionar Novo Entregador */}
        <Dialog open={isAddDelivererFormOpen} onOpenChange={setIsAddDelivererFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Entregador</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar um novo entregador.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddDelivererSubmit} className="space-y-4 py-4">
              <div>
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={newDelivererData.nome} onChange={handleNewDelivererChange} required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={newDelivererData.email} onChange={handleNewDelivererChange} required />
              </div>
              <div>
                <Label htmlFor="password">Senha (temporária)</Label>
                <Input id="password" type="password" value={newDelivererData.password} onChange={handleNewDelivererChange} required />
              </div>
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" value={newDelivererData.telefone} onChange={handleNewDelivererChange} />
              </div>
              <div>
                <Label htmlFor="placa">Placa do Veículo</Label>
                <Input id="placa" value={newDelivererData.placa} onChange={handleNewDelivererChange} />
              </div>
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" value={newDelivererData.cpf} onChange={handleNewDelivererChange} />
              </div>
              {/* O status_entregador será ativo por padrão, mas pode ser um switch se quiser */}
              {/* <div className="flex items-center space-x-2">
                <Switch
                  id="status_entregador"
                  checked={newDelivererData.status_entregador === 'ativo'}
                  onCheckedChange={(checked) => setNewDelivererData(prev => ({ ...prev, status_entregador: checked ? 'ativo' : 'inativo' }))}
                />
                <Label htmlFor="status_entregador">Ativo</Label>
              </div> */}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDelivererFormOpen(false)} type="button">
                  <X size={16} className="mr-2" /> Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  <Save size={16} className="mr-2" /> {loading ? "Adicionando..." : "Salvar Entregador"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default DelivererManagementModal;
