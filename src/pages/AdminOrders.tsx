import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// Importações do Firestore (mantidas para a lógica de pedidos)
import { collection, query, where, onSnapshot, orderBy, Timestamp, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Assumindo que db é sua instância do Firestore

// Importação do Supabase do arquivo centralizado
import { supabase } from "@/lib/supabaseClient"; // Importa a instância configurada do Supabase

import { Order } from "@/types/order";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { updateOrder, getOrdersByDateRange } from "@/services/orderService";
import OrderDetails from "@/components/OrderDetails";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/DateRangePicker";

// Definindo um tipo básico para o entregador, agora com 'nome'
interface Deliverer {
  id: string;
  nome: string; // Alterado de 'name' para 'nome'
}

const AdminOrders = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeStatus, setActiveStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Novos estados para a seleção de entregador ---
  const [isDelivererSelectionModalOpen, setIsDelivererSelectionModalOpen] = useState(false);
  const [availableDeliverers, setAvailableDeliverers] = useState<Deliverer[]>([]);
  const [selectedDelivererId, setSelectedDelivererId] = useState<string>("");
  const [orderToAssignDeliverer, setOrderToAssignDeliverer] = useState<Order | null>(null);
  const [loadingDeliverers, setLoadingDeliverers] = useState(false); // Novo estado de carregamento para entregadores
  // --- Fim dos novos estados ---

  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: today,
    to: today
  });

  // Função para formatar o endereço estruturado
  const formatAddress = (address: Order['address']) => {
    if (!address) return "Endereço não disponível";
    // Garante que as propriedades existem antes de acessá-las
    const street = address.street || '';
    const number = address.number || '';
    const complement = address.complement || '';
    const neighborhood = address.neighborhood || '';
    const city = address.city || '';
    const state = address.state || '';
    const zipCode = address.zipCode || '';

    let formattedAddress = `${street}, ${number}`;
    if (complement) formattedAddress += `, ${complement}`;
    formattedAddress += ` - ${neighborhood}, ${city} - ${state}`;
    if (zipCode) formattedAddress += ` (${zipCode})`;
    return formattedAddress;
  };

  // Função para carregar os pedidos (agora com lógica para "A descontar")
  const loadOrders = async (status: string, dateRange: DateRange | undefined) => {
    console.log("loadOrders: Iniciando carregamento de pedidos (Firestore)...");
    try {
      setLoading(true);
      setError(null);

      if (!dateRange?.from) {
        console.log("loadOrders: Data inicial não definida. Limpando pedidos.");
        setOrders([]);
        setLoading(false);
        return;
      }

      const startDate = dateRange.from;
      const endDate = dateRange.to || dateRange.from;

      let orders: Order[] = [];

      if (status === "to_deduct") {
        console.log(`loadOrders: Buscando pedidos 'A descontar' (Desconto em Folha, A Receber) de ${startDate.toLocaleDateString()} a ${endDate.toLocaleDateString()}`);
        // Chama getOrdersByDateRange com filtros específicos para paymentMethod e paymentStatus
        orders = await getOrdersByDateRange(startDate, endDate, undefined, "payroll_discount", "a_receber");
      } else {
        console.log(`loadOrders: Buscando pedidos de ${startDate.toLocaleDateString()} a ${endDate.toLocaleDateString()} com status '${status}'`);
        // Chama getOrdersByDateRange com o status normal
        orders = await getOrdersByDateRange(startDate, endDate, status === "all" ? undefined : status);
      }
      
      setOrders(orders);
      console.log(`loadOrders: ${orders.length} pedidos carregados.`);
      setLoading(false);
    } catch (err) {
      console.error("loadOrders: Erro ao carregar pedidos:", err);
      setError("Não foi possível carregar os pedidos. Tente novamente.");
      setLoading(false);

      toast({
        title: "Erro",
        description: "Não foi possível carregar os pedidos. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para buscar entregadores ativos (AGORA USA SUPABASE com empresa_id dinâmico e nomes de colunas corrigidos)
  const fetchAvailableDeliverers = async (empresaId: string) => { // Recebe empresaId como argumento
    console.log("fetchAvailableDeliverers: Iniciando busca de entregadores (Supabase)...");
    console.log("fetchAvailableDeliverers: Empresa ID para busca:", empresaId); // Log para confirmar o ID

    setLoadingDeliverers(true); // Ativa o estado de carregamento
    try {
      if (!supabase) {
        console.error("fetchAvailableDeliverers: Instância do Supabase não disponível.");
        toast({
          title: "Erro de Configuração",
          description: "Cliente Supabase não inicializado. Verifique suas variáveis de ambiente.",
          variant: "destructive",
        });
        setLoadingDeliverers(false);
        return;
      }

      // Consulta ao Supabase com filtros relaxados para depuração
      // Temporariamente, estamos removendo os filtros 'role' e 'status_entregador'
      // para ver se algum usuário é retornado para o empresa_id.
      const { data, error } = await supabase
        .from('usuarios') // Nome da sua tabela de usuários no Supabase
        .select('id, nome, role, status_entregador, empresa_id') // Seleciona todas as colunas relevantes para depuração
        .eq('empresa_id', empresaId); // Filtra APENAS pelo empresa_id

      if (error) {
        console.error("fetchAvailableDeliverers: Erro ao buscar entregadores do Supabase:", error.message);
        toast({
          title: "Erro de Supabase",
          description: `Erro ao buscar entregadores: ${error.message}`,
          variant: "destructive",
        });
        throw error; // Lança o erro para ser capturado pelo catch
      }

      // NOVO LOG: Mostra os dados brutos retornados pelo Supabase
      console.log("fetchAvailableDeliverers: Dados brutos do Supabase para entregadores (com filtros relaxados):", data);

      // Agora, filtre os entregadores no frontend com base nos dados brutos
      const filteredDeliverers: Deliverer[] = (data || [])
        .filter(user => user.role === 'entregador' && user.status_entregador === 'ativo')
        .map(user => ({ id: user.id, nome: user.nome }));

      setAvailableDeliverers(filteredDeliverers);

      if (filteredDeliverers.length > 0) {
        setSelectedDelivererId(filteredDeliverers[0].id); // Seleciona o primeiro por padrão
        console.log(`fetchAvailableDeliverers: ${filteredDeliverers.length} entregadores ATIVOS e com ROLE 'entregador' encontrados no Supabase. Primeiro selecionado: ${filteredDeliverers[0].nome}`);
      } else {
        setSelectedDelivererId("");
        console.log("fetchAvailableDeliverers: Nenhum entregador ativo encontrado no Supabase para esta empresa (após filtro no frontend).");
      }
    } catch (err) {
      console.error("fetchAvailableDeliverers: Erro geral ao buscar entregadores:", err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os entregadores disponíveis. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setLoadingDeliverers(false); // Desativa o estado de carregamento
    }
  };

  useEffect(() => {
    console.log("useEffect: Disparado devido a mudança de activeStatus ou dateRange.");
    loadOrders(activeStatus, dateRange);

    if (dateRange?.from) {
      console.log("useEffect: Configurando listener de snapshot para pedidos (Firestore).");
      const start = new Date(dateRange.from);
      start.setHours(0, 0, 0, 0);

      const end = new Date(dateRange.to || dateRange.from);
      end.setHours(23, 59, 59, 999);

      const startTimestamp = Timestamp.fromDate(start);
      const endTimestamp = Timestamp.fromDate(end);

      const ordersRef = collection(db, "orders");
      
      // A query do onSnapshot deve ser mais genérica ou refletir o filtro atual
      // Para manter a detecção de "novos pedidos pendentes", vamos manter a query ampla aqui
      const ordersQuery = query(
        ordersRef,
        where("createdAt", ">=", startTimestamp),
        where("createdAt", "<=", endTimestamp),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(
        ordersQuery,
        (snapshot) => {
          console.log("onSnapshot: Mudança detectada nos pedidos.");
          // Se houver mudanças, recarrega os pedidos com os filtros atuais
          loadOrders(activeStatus, dateRange); 

          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const data = change.doc.data();
              const createdAt = data.createdAt?.toDate() || new Date();
              const isRecent = (new Date().getTime() - createdAt.getTime()) < 10000;

              if (isRecent && data.status === "pending") {
                toast({
                  title: "Novo pedido recebido!",
                  description: `Cliente: ${data.customerName}`,
                });
                console.log(`onSnapshot: Novo pedido pendente detectado: ${data.customerName}`);
              }
            }
          });
        },
        (err) => {
          console.error("onSnapshot: Erro no listener:", err);
          toast({
            title: "Erro",
            description: "Não foi possível monitorar novos pedidos.",
            variant: "destructive",
          });
        }
      );

      return () => {
        console.log("useEffect cleanup: Desinscrevendo do listener de snapshot.");
        unsubscribe();
      };
    }
  }, [activeStatus, dateRange, toast]); // activeStatus adicionado como dependência

  const handleDateRangeChange = (range: DateRange | undefined) => {
    console.log("handleDateRangeChange: Nova faixa de data selecionada:", range);
    setDateRange(range);
  };

  const handleViewOrder = (order: Order) => {
    console.log("handleViewOrder: Visualizando detalhes do pedido:", order.id);
    console.log("handleViewOrder: Objeto selectedOrder sendo passado:", JSON.stringify(order, null, 2)); // NOVO LOG AQUI!
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus?: Order["status"],
    cancellationReason?: string,
    paymentStatus?: "a_receber" | "recebido"
  ) => {
    console.log(`handleUpdateOrderStatus: Tentando atualizar pedido ${orderId} para status ${newStatus || 'N/A'}`);
    try {
      // --- Lógica para seleção de entregador ---
      if (newStatus === "delivering" && selectedOrder?.status === "ready") {
        console.log("handleUpdateOrderStatus: Transição para 'delivering' detectada. Abrindo modal de seleção de entregador.");

        // NOVO LOG: Verifica o empresa_id do pedido selecionado
        console.log("handleUpdateOrderStatus: selectedOrder.empresa_id para busca de entregadores:", selectedOrder?.empresa_id);

        // Verifica se o selectedOrder e empresa_id existem antes de chamar
        if (selectedOrder && selectedOrder.empresa_id) {
          setOrderToAssignDeliverer(selectedOrder);
          await fetchAvailableDeliverers(selectedOrder.empresa_id); // Passa o empresa_id do pedido
          setIsDelivererSelectionModalOpen(true);
          return; // Interrompe a atualização normal do status por enquanto
        } else {
          console.warn("handleUpdateOrderStatus: Pedido selecionado ou empresa_id não disponível para atribuição de entregador.");
          toast({
            title: "Aviso",
            description: "Não foi possível atribuir entregador: ID da empresa não encontrado no pedido.",
            variant: "destructive",
          });
          return;
        }
      }
      // --- Fim da lógica para seleção de entregador ---

      // Preparar objeto de atualização
      const updateData: any = {};

      if (newStatus) {
        updateData.status = newStatus;
      }

      if (paymentStatus) {
        updateData.paymentStatus = paymentStatus;
      }

      console.log("handleUpdateOrderStatus: Chamando updateOrder com dados:", updateData);
      const updatedOrder = await updateOrder(orderId, updateData);

      if (updatedOrder) {
        console.log("handleUpdateOrderStatus: Pedido atualizado com sucesso no Firestore.");
        // Atualizar a lista de pedidos
        setOrders(prev =>
          prev.map(order => order.id === orderId ? updatedOrder : order)
        );

        // Atualizar o pedido selecionado se for o mesmo
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(updatedOrder);
        }

        const statusMessage = newStatus ?
          `Status alterado para ${translateStatus(newStatus)}` :
          paymentStatus ? `Status de pagamento alterado para ${paymentStatus === "recebido" ? "Recebido" : "A Receber"}` :
          "Pedido atualizado."; // Fallback message

        toast({
          title: "Pedido atualizado",
          description: statusMessage,
        });
      } else {
        console.warn("handleUpdateOrderStatus: updateOrder retornou null, pedido não encontrado ou não atualizado.");
        toast({
          title: "Aviso",
          description: "Pedido não encontrado ou não foi possível atualizar.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("handleUpdateOrderStatus: Erro ao atualizar pedido:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o pedido. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Nova função para atribuir o entregador e finalizar a atualização para "delivering"
  const handleAssignDelivererAndDeliver = async () => {
    console.log("handleAssignDelivererAndDeliver: Iniciando atribuição de entregador.");
    if (!orderToAssignDeliverer || !selectedDelivererId) {
      console.warn("handleAssignDelivererAndDeliver: Pedido ou entregador não selecionado.");
      toast({
        title: "Erro",
        description: "Selecione um entregador para continuar.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log(`handleAssignDelivererAndDeliver: Atribuindo pedido ${orderToAssignDeliverer.id} ao entregador ${selectedDelivererId}`);
      const updatedOrder = await updateOrder(orderToAssignDeliverer.id, {
        status: "delivering",
        entregador_id: selectedDelivererId, // Adiciona o ID do entregador
      });

      if (updatedOrder) {
        console.log("handleAssignDelivererAndDeliver: Pedido atualizado com entregador e status 'delivering'.");
        setOrders(prev =>
          prev.map(order => order.id === orderToAssignDeliverer.id ? updatedOrder : order)
        );

        if (selectedOrder && selectedOrder.id === orderToAssignDeliverer.id) {
          setSelectedOrder(updatedOrder);
        }

        toast({
          title: "Pedido atualizado",
          description: `Pedido ${orderToAssignDeliverer.id.substring(0, 6)} atribuído ao entregador e em rota de entrega.`,
        });

        setIsDelivererSelectionModalOpen(false); // Fecha o modal de seleção
        setOrderToAssignDeliverer(null); // Limpa o pedido em atribuição
        setSelectedDelivererId(""); // Limpa o entregador selecionado
      } else {
        console.warn("handleAssignDelivererAndDeliver: updateOrder retornou null após atribuição.");
        toast({
          title: "Aviso",
          description: "Não foi possível finalizar a atribuição do entregador.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("handleAssignDelivererAndDeliver: Erro ao atribuir entregador e atualizar pedido:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atribuir o entregador e atualizar o pedido. Tente novamente.",
        variant: "destructive",
      });
    }
  };


  const translateStatus = (status: Order["status"]) => {
    const statusMap: Record<Order["status"], string> = {
      pending: "Pendente",
      accepted: "Aceito",
      confirmed: "Aceito",
      preparing: "Em produção",
      ready: "Pronto para Entrega",
      delivering: "Saiu para entrega",
      received: "Recebido",
      delivered: "Entrega finalizada",
      cancelled: "Cancelado",
      to_deduct: "A descontar", // Este é um status de filtro, não um status de pedido real
      paid: "Pago"
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "confirmed":
      case "accepted": return "bg-blue-100 text-blue-800";
      case "preparing": return "bg-purple-100 text-purple-800";
      case "ready": return "bg-green-100 text-green-800";
      case "delivering": return "bg-indigo-100 text-indigo-800"; // Cor diferente para "em rota"
      case "received":
      case "delivered": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "to_deduct": return "bg-orange-100 text-orange-800";
      case "paid": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatFullDate = (dateString: string | Date | Timestamp) => { // Ajustado para aceitar Timestamp
    let date: Date;

    if (dateString instanceof Timestamp) {
      date = dateString.toDate();
    } else if (typeof dateString === 'string') {
      date = new Date(dateString);
    } else {
      date = dateString;
    }

    if (isNaN(date.getTime())) return "Data inválida";

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const statusOptions = [
    { value: "all", label: "Todos" },
    { value: "pending", label: "Pendentes" },
    { value: "confirmed", label: "Aceitos" },
    { value: "preparing", label: "Em Produção" },
    { value: "ready", label: "Prontos" },
    { value: "delivering", label: "Em Entrega" },
    { value: "received", label: "Recebidos" },
    { value: "delivered", label: "Finalizados" },
    { value: "cancelled", label: "Cancelados" },
    { value: "to_deduct", label: "A descontar" }, // Esta opção agora terá um tratamento especial
    { value: "paid", label: "Pagos" }
  ];

  const handleRetryLoad = () => {
    console.log("handleRetryLoad: Tentando recarregar pedidos.");
    loadOrders(activeStatus, dateRange);
  };

  // Calculate summary statistics
  const totalOrders = orders.length;
  const totalSales = orders.reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gerenciamento de Pedidos</h1>
        <Button onClick={() => navigate("/admin-dashboard")} variant="outline">
          Página de Administração
        </Button>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Filtrar por status:</label>
            <Select value={activeStatus} onValueChange={setActiveStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Filtrar por período:</label>
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {loading ? (
          <p className="col-span-full text-center text-gray-500">Carregando pedidos...</p>
        ) : error ? (
          <div className="col-span-full text-center text-red-500">
            <p>{error}</p>
            <Button onClick={handleRetryLoad} className="mt-2">Tentar Novamente</Button>
          </div>
        ) : orders.length === 0 ? (
          <p className="col-span-full text-center text-gray-500">Nenhum pedido encontrado para o período selecionado.</p>
        ) : (
          orders.map((order) => {
            try {
              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="bg-gray-50 py-4">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm text-gray-500">
                          Pedido #{order.id.substring(0, 6)}
                        </p>
                        <p className="text-sm font-medium text-gray-700">
                          {formatFullDate(order.createdAt as string)}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs flex items-center ${getStatusColor(order.status)}`}>
                        {translateStatus(order.status)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="font-semibold">{order.customerName}</div>
                      <div className="text-sm text-gray-500">{order.customerPhone}</div>
                      {/* Exibindo o endereço formatado na listagem */}
                      <div className="text-xs text-gray-600 mt-1">
                        Endereço: {formatAddress(order.address)}
                      </div>
                      {order.entregador_id && (
                        <div className="text-xs text-gray-600 mt-1">
                          Entregador: {availableDeliverers.find(d => d.id === order.entregador_id)?.nome || order.entregador_id}
                        </div>
                      )}
                      {/* NOVO: Exibe o horário de entrega finalizada se o status for 'delivered' */}
                      {order.status === "delivered" && order.deliveredAt && (
                        <div className="text-xs text-green-700 font-semibold mt-1">
                          Entrega Finalizada: {formatFullDate(order.deliveredAt)}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="py-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Itens: {order.items.length}</p>
                      <p className="font-medium">Total: R$ {order.total.toFixed(2)}</p>
                      <Button
                        onClick={() => handleViewOrder(order)}
                        variant="outline"
                        className="w-full mt-2"
                      >
                        Ver detalhes
                      </Button>
                      {/* Botão de "Marcar como Recebido" só aparece se o status não for "received" ou "delivered" */}
                      {order.status !== "received" && order.status !== "delivered" && (
                        <Button
                          onClick={() => {
                            const novoStatus = order.status === "delivering" ? "delivered" : "delivered";
                            handleUpdateOrderStatus(order.id, novoStatus);
                          }}
                          variant="secondary"
                          className="w-full mt-2"
                        >
                          ✅ Marcar como Recebido
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            } catch (renderError: any) {
              console.error(`AdminOrders: Erro ao renderizar pedido ${order.id}:`, renderError);
              console.error("Pedido que causou o erro:", order);
              toast({
                title: "Erro de Renderização",
                description: `Não foi possível exibir o pedido ${order.id.substring(0,6)}. Verifique o console para mais detalhes.`,
                variant: "destructive",
              });
              return (
                <Card key={order.id} className="overflow-hidden bg-red-50 border border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-700">Erro ao Carregar Pedido #{order.id.substring(0,6)}</CardTitle>
                    <CardDescription className="text-red-600">
                      Ocorreu um erro ao exibir os detalhes deste pedido. Consulte o console para mais informações.
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            }
          })
        )}
      </div>

      {/* Summary Footer */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg border-t-4 border-blue-500">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total de Pedidos no Período</p>
            <p className="text-2xl font-bold text-blue-600">{totalOrders}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Valor Total das Vendas</p>
            <p className="text-2xl font-bold text-green-600">R$ {totalSales.toFixed(2)}</p>
          </div>
        </div>
        {dateRange?.from && (
          <div className="text-center mt-2 text-sm text-gray-500">
            Período: {dateRange.from.toLocaleDateString('pt-BR')}
            {dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime() && ` até ${dateRange.to.toLocaleDateString('pt-BR')}`}
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Pedido (existente) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
            <DialogDescription>
              Visualize e atualize o status do pedido
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <OrderDetails
              order={selectedOrder}
              onUpdateStatus={handleUpdateOrderStatus}
              // --- PASSA AS INFORMAÇÕES DO CUPOM PARA O ORDERDETAILS ---
              discountAmount={selectedOrder.discountAmount || 0}
              couponCode={selectedOrder.couponCode}
              couponType={selectedOrder.couponType}
              couponValue={selectedOrder.couponValue}
              // --- FIM DOS NOVOS PROPS ---
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NOVO Modal de Seleção de Entregador */}
      <Dialog open={isDelivererSelectionModalOpen} onOpenChange={setIsDelivererSelectionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Entregador</DialogTitle>
            <DialogDescription>
              Selecione o entregador responsável por este pedido.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label htmlFor="deliverer-select" className="text-sm font-medium mb-2 block">
              Entregador:
            </label>
            {loadingDeliverers ? (
              <p className="text-gray-500">Carregando entregadores...</p>
            ) : (
              <Select
                value={selectedDelivererId}
                onValueChange={setSelectedDelivererId}
                disabled={availableDeliverers.length === 0} // Desabilita se não houver entregadores
              >
                <SelectTrigger id="deliverer-select" className="w-full">
                  <SelectValue placeholder="Selecione um entregador" />
                </SelectTrigger>
                <SelectContent>
                  {/* Renderiza as opções de entregadores disponíveis */}
                  {availableDeliverers.length > 0 ? (
                    availableDeliverers.map((deliverer) => (
                      <SelectItem key={deliverer.id} value={deliverer.id}>
                        {deliverer.nome}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      Nenhum entregador ativo disponível.
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}
            {availableDeliverers.length === 0 && !loadingDeliverers && (
              <p className="text-sm text-red-500 mt-2">Nenhum entregador ativo encontrado. Verifique a coleção 'usuarios' no Supabase para o 'empresa_id' do pedido.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              console.log("Modal de seleção de entregador: Cancelado.");
              setIsDelivererSelectionModalOpen(false);
              setOrderToAssignDeliverer(null); // Limpa o pedido em atribuição
              setSelectedDelivererId(""); // Limpa o entregador selecionado
            }}>
              Cancelar
            </Button>
            <Button
              onClick={handleAssignDelivererAndDeliver}
              disabled={!selectedDelivererId || availableDeliverers.length === 0 || loadingDeliverers}
            >
              Atribuir e Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;
