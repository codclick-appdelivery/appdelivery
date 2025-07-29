import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order } from "@/types/order"; // Certifique-se de que sua interface Order inclui 'address' como objeto
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateOrder } from "@/services/orderService";
import { useAuth } from "@/hooks/useAuth"; // Importa o hook de autenticação
import { supabase } from "@/lib/supabaseClient"; // Importa o cliente Supabase

const Entregador = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth(); // Obtém o usuário logado do AuthContext
  const [delivererNames, setDelivererNames] = useState<Record<string, string>>({}); // Novo estado para armazenar nomes de entregadores

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

  // Função para buscar os nomes dos entregadores
  const fetchDelivererNames = async () => {
    if (!currentUser || !currentUser.empresa_id) {
      console.log("Entregador: currentUser ou empresa_id não disponível para buscar nomes de entregadores.");
      setDelivererNames({});
      return;
    }

    try {
      console.log("Entregador: Buscando nomes de entregadores para empresa_id:", currentUser.empresa_id);
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome')
        .eq('empresa_id', currentUser.empresa_id)
        .eq('role', 'entregador'); // Filtra apenas entregadores

      if (error) {
        throw error;
      }

      const namesMap: Record<string, string> = {};
      data.forEach(d => {
        namesMap[d.id] = d.nome;
      });
      setDelivererNames(namesMap);
      console.log("Entregador: Nomes de entregadores carregados:", namesMap);
    } catch (error: any) {
      console.error("Entregador: Erro ao buscar nomes de entregadores:", error.message);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os nomes dos entregadores.",
        variant: "destructive",
      });
    }
  };


  useEffect(() => {
    // Apenas tenta buscar pedidos se houver um currentUser e ele tiver um ID
    if (!currentUser || !currentUser.id) {
      console.log("Entregador: Usuário não logado ou ID não disponível, não buscando pedidos.");
      setLoading(false);
      setOrders([]);
      return;
    }

    // Chama a função para buscar os nomes dos entregadores
    fetchDelivererNames();

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const startTimestamp = Timestamp.fromDate(start);
    const endTimestamp = Timestamp.fromDate(end);

    const ordersRef = collection(db, "orders");
    
    // Inicia a lista de condições da query
    let conditions = [
      where("status", "==", "delivering"),
      where("createdAt", ">=", startTimestamp),
      where("createdAt", "<=", endTimestamp),
    ];

    // Condição para filtrar por entregador_id APENAS se o usuário NÃO for admin
    if (currentUser.role !== "admin") {
      console.log("Entregador: Usuário não é admin, filtrando por entregador_id:", currentUser.id);
      conditions.push(where("entregador_id", "==", currentUser.id));
    } else {
      console.log("Entregador: Usuário é admin, exibindo todos os pedidos 'delivering'.");
    }

    const ordersQuery = query(
      ordersRef,
      ...conditions, // Aplica todas as condições dinamicamente
      orderBy("status"), // Pode ser removido se todos forem 'delivering'
      orderBy("createdAt", "desc")
    );

    console.log("Entregador: Configurando listener de pedidos para o entregador/admin.");

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      console.log("Entregador: Snapshot de pedidos recebido.");
      const fetchedOrders: Order[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          // Garante que address seja um objeto ou null/undefined
          address: data.address || null, 
          // Garante que paymentStatus tenha um valor padrão se estiver faltando
          paymentStatus: data.paymentStatus || "a_receber", 
        } as Order;
      });
      setOrders(fetchedOrders);
      setLoading(false);
      console.log("Entregador: Pedidos carregados:", fetchedOrders.length);
    }, (error) => {
      console.error("Entregador: Erro no listener de pedidos:", error);
      toast({
        title: "Erro de Carregamento",
        description: "Não foi possível carregar seus pedidos de entrega. Tente novamente.",
        variant: "destructive",
      });
      setLoading(false);
    });

    return () => {
      console.log("Entregador: Desinscrevendo do listener de pedidos.");
      unsubscribe();
    };
  }, [currentUser]); // Adicionado currentUser como dependência para re-executar quando o usuário carregar

  const handleConfirmEntrega = async (order: Order) => {
    const novoStatus = order.paymentMethod === "cash" ? "received" : "delivered";

    try {
      await updateOrder(order.id, { status: novoStatus });
      toast({
        title: "Status atualizado",
        description: `Pedido #${order.id.substring(0, 6)} marcado como ${translateStatus(novoStatus)}`,
      });
      // A remoção do pedido da lista será tratada pelo onSnapshot, que recarregará os pedidos
      // setOrders((prev) => prev.filter((o) => o.id !== order.id)); // Removido para evitar inconsistência com onSnapshot
    } catch (err: any) {
      console.error("Entregador: Erro ao confirmar entrega:", err);
      toast({
        title: "Erro",
        description: `Não foi possível atualizar o status do pedido: ${err.message}`,
        variant: "destructive",
      });
    }
  };

  const translateStatus = (status: Order["status"]) => {
    const statusMap: Record<Order["status"], string> = {
      pending: "Pendente",
      confirmed: "Aceito",
      preparing: "Em produção",
      ready: "Pronto para Entrega",
      delivering: "Saiu para entrega",
      received: "Recebido",
      delivered: "Entrega finalizada",
      cancelled: "Cancelado",
      to_deduct: "A descontar",
      paid: "Pago"
    };
    return statusMap[status] || status;
  };

  const translatePaymentMethod = (method: Order["paymentMethod"]) => {
    switch (method) {
      case "card": return "Cartão (Crédito/Débito)";
      case "cash": return "Dinheiro";
      case "pix": return "PIX";
      case "payroll_discount": return "Desconto em Folha";
      default: return method;
    }
  };

  const getPaymentStatusText = (status?: Order["paymentStatus"]) => {
    if (status === "recebido") {
      return "Recebido (Pagamento já efetuado)";
    }
    return "A Receber (Pagamento no local)";
  };

  const getPaymentStatusColorClass = (status?: Order["paymentStatus"]) => {
    if (status === "recebido") {
      return "text-green-600 font-semibold";
    }
    return "text-red-600 font-semibold";
  };

  const formatFullDate = (input: string | Date | Timestamp) => {
    let date: Date;

    if (input instanceof Timestamp) {
      date = input.toDate();
    } else if (typeof input === 'string') {
      date = new Date(input);
    } else {
      date = input;
    }

    if (isNaN(date.getTime())) return "Data inválida";

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Pedidos em rota de entrega</h1>

      {loading ? (
        <p className="text-gray-500">Carregando pedidos...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500">Nenhum pedido em rota de entrega.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => {
            try {
              // Verifica se o entregador_id existe no pedido e se o nome está disponível
              const delivererName = order.entregador_id ? delivererNames[order.entregador_id] : null;

              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="bg-gray-50 py-4">
                    <div>
                      <p className="text-sm text-gray-500">Pedido #{order.id.substring(0, 6)} - {formatFullDate(order.createdAt)}</p>
                      <p className="text-base font-medium text-gray-700">
                        Cliente: {order.customerName}
                      </p>
                      <p className="text-sm text-gray-500">
                        Fone: <a href={`https://wa.me/55${order.customerPhone?.replace(/\D/g, '') || ''}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {order.customerPhone}
                        </a>
                      </p>
                      {/* NOVO: Exibe o nome do entregador se disponível */}
                      {order.entregador_id && (
                        <p className="text-sm text-gray-600 mt-1">
                          Entregador: {delivererName || "Desconhecido"}
                        </p>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="py-4 space-y-2">
                    {/* Endereço completo do cliente - AGORA FORMATADO */}
                    <div>
                      <p className="font-semibold text-sm">Endereço de Entrega:</p>
                      <p className="text-sm text-gray-700">{formatAddress(order.address)}</p>
                    </div>

                    {/* Pedido completo do cliente */}
                    <div>
                      <p className="font-semibold text-sm">Itens do Pedido:</p>
                      <ul className="list-disc list-inside text-sm text-gray-700">
                        {order.items.map((item, index) => (
                          <React.Fragment key={item.menuItemId + "-" + index}>
                            <li>
                              {item.quantity}x {item.name}
                              {item.notes && <span className="text-gray-500 italic"> ({item.notes})</span>}
                              {item.priceFrom && <span className="text-gray-500 italic"> (Preço a consultar)</span>}
                            </li>
                            {item.selectedVariations && item.selectedVariations.length > 0 && (
                              <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                                {item.selectedVariations.map((group, groupIdx) => (
                                  <React.Fragment key={group.groupId + "-" + groupIdx}>
                                    {group.variations.map((variation, varIdx) => (
                                      <li key={variation.variationId + "-" + varIdx}>
                                        {variation.quantity}x {variation.name}
                                      </li>
                                    ))}
                                  </React.Fragment>
                                ))}
                              </ul>
                            )}
                          </React.Fragment>
                        ))}
                      </ul>
                    </div>

                    {/* Forma de pagamento */}
                    <div>
                      <p className="font-semibold text-sm">Forma de Pagamento:</p>
                      <p className="text-sm text-gray-700">{translatePaymentMethod(order.paymentMethod)}</p>
                    </div>

                    {/* Status de Pagamento - AGORA COM CORES E LÓGICA REVISADA */}
                    <div>
                      <p className="font-semibold text-sm">Status de Pagamento:</p>
                      <p className={`text-sm ${getPaymentStatusColorClass(order.paymentStatus)}`}>
                        {getPaymentStatusText(order.paymentStatus)}
                      </p>
                    </div>

                    {order.observations && (
                      <div>
                        <p className="font-semibold text-sm">Observações:</p>
                        <p className="text-sm text-gray-700 italic">{order.observations}</p>
                      </div>
                    )}

                    <p className="font-medium text-lg text-right">Total: R$ {order.total.toFixed(2)}</p>

                    <Button onClick={() => handleConfirmEntrega(order)} className="w-full mt-4">
                      Confirmar entrega
                    </Button>
                  </CardContent>
                </Card>
              );
            } catch (renderError: any) {
              console.error(`Entregador: Erro ao renderizar pedido ${order.id}:`, renderError);
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
          })}
        </div>
      )}
    </div>
  );
};

export default Entregador;
