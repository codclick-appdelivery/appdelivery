import React, { useState } from "react";
import { Order } from "@/types/order";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardList,
  CheckCircle2,
  ChefHat,
  Package,
  Truck,
  XCircle,
  Check,
  DollarSign
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { getNextStatusOptions, hasReceivedPayment } from "@/services/orderStatusService";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


interface OrderDetailsProps {
  order: Order;
  onUpdateStatus: (orderId: string, status: Order["status"], cancellationReason?: string, paymentStatus?: "a_receber" | "recebido") => void;
  // --- NOVOS PROPS PARA DETALHES DO CUPOM ---
  discountAmount?: number;
  couponCode?: string | null;
  couponType?: 'percentual' | 'fixo' | null;
  couponValue?: number | null;
  // --- FIM DOS NOVOS PROPS ---
}

const OrderDetails: React.FC<OrderDetailsProps> = ({
  order,
  onUpdateStatus,
  discountAmount = 0, // Valor padrão para 0
  couponCode,
  couponType,
  couponValue,
}) => {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isReasonDialogOpen, setIsReasonDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");

  // Debug do pedido completo
  console.log("=== ORDER DETAILS DEBUG ===");
  console.log("Pedido completo:", order);
  console.log("Status de pagamento:", order.paymentStatus);

  // Traduzir status para português
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

  // Traduzir método de pagamento para português
  const translatePaymentMethod = (method: Order["paymentMethod"]) => {
    const methodMap: Record<Order["paymentMethod"], string> = {
      card: "Cartão",
      cash: "Dinheiro",
      pix: "PIX",
      payroll_discount: "Desconto em Folha"
    };
    return methodMap[method] || method;
  };

  // Formatar data para exibição
  const formatDate = (dateString: string | Date) => { // Ajustado para aceitar Date ou string
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return "Data inválida";
    }
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Obter classe de cor com base no status
  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "confirmed": return "bg-blue-100 text-blue-800";
      case "preparing": return "bg-purple-100 text-purple-800";
      case "ready": return "bg-green-100 text-green-800";
      case "delivering": return "bg-indigo-100 text-indigo-800"; // Alterado para indigo para diferenciar
      case "received": return "bg-blue-200 text-blue-800";
      case "delivered": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "to_deduct": return "bg-orange-100 text-orange-800";
      case "paid": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Obter ícone para cada status
  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "pending": return <ClipboardList className="h-5 w-5" />;
      case "confirmed": return <CheckCircle2 className="h-5 w-5" />;
      case "preparing": return <ChefHat className="h-5 w-5" />;
      case "ready": return <Package className="h-5 w-5" />;
      case "delivering": return <Truck className="h-5 w-5" />;
      case "received": return <DollarSign className="h-5 w-5" />;
      case "delivered": return <CheckCircle2 className="h-5 w-5" />;
      case "cancelled": return <XCircle className="h-5 w-5" />;
      case "to_deduct": return <DollarSign className="h-5 w-5" />;
      case "paid": return <CheckCircle2 className="h-5 w-5" />;
      default: return <ClipboardList className="h-5 w-5" />;
    }
  };

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

  // Calcular subtotal do item incluindo variações
  const calculateItemSubtotal = (item: any) => {
    // console.log("Calculando subtotal para item:", item);

    // Se o item tem "a partir de", o preço base é 0 para o cálculo inicial
    let basePrice = (item.priceFrom ? 0 : (item.price || 0)) * item.quantity;
    let variationsTotal = 0;

    if (item.selectedVariations && Array.isArray(item.selectedVariations)) {
      item.selectedVariations.forEach((group: any) => {
        if (group.variations && Array.isArray(group.variations)) {
          group.variations.forEach((variation: any) => {
            const additionalPrice = variation.additionalPrice || 0;
            const quantity = variation.quantity || 1;

            if (additionalPrice > 0) {
              // O custo da variação é multiplicado pela quantidade da variação e pela quantidade do item principal
              const variationCost = additionalPrice * quantity * item.quantity;
              variationsTotal += variationCost;
            }
          });
        }
      });
    }
    const total = basePrice + variationsTotal;
    return total;
  };

  // Calcular o subtotal geral dos itens antes do desconto
  const calculateOverallSubtotal = () => {
    return order.items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
  };

  const overallSubtotal = calculateOverallSubtotal();

  // FUNÇÃO PARA ENVIAR WEBHOOK SEMPRE QUE O STATUS FOR ATUALIZADO
  const sendOrderStatusWebhook = async (orderData: Order & { cancellationReason?: string }) => {
    try {
      const response = await fetch("https://n8n-n8n-start.yh11mi.easypanel.host/webhook/status_pedido", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });
      console.log("Webhook de atualização de status enviado. Status:", response.status);
      if (!response.ok) {
        console.error("Falha ao enviar webhook de status:", await response.text());
      }
    } catch (err) {
      console.error("Erro ao enviar webhook de status:", err);
    }
  };

  // Função wrapper para atualizar o status principal do pedido
  const handleUpdateStatus = (orderId: string, status: Order["status"], cancellationReasonValue?: string) => {
    console.log("Atualizando status principal para:", status);
    const updatedOrder: Order & { cancellationOrderReason?: string } = { ...order, status }; // Corrigido para cancellationOrderReason
    if (status === "cancelled" && cancellationReasonValue) {
      updatedOrder.cancellationOrderReason = cancellationReasonValue; // Corrigido para cancellationOrderReason
    }
    sendOrderStatusWebhook(updatedOrder);
    onUpdateStatus(orderId, status, cancellationReasonValue);
  };

  // Função SEPARADA para atualizar APENAS o status de pagamento
  const handleUpdatePaymentStatus = (orderId: string, paymentStatus: "a_receber" | "recebido") => {
    console.log("Atualizando APENAS status de pagamento para:", paymentStatus);
    const updatedOrder: Order = { ...order, paymentStatus };
    sendOrderStatusWebhook(updatedOrder);
    // Chama onUpdateStatus mantendo o status atual, mas passando o paymentStatus
    onUpdateStatus(orderId, order.status, undefined, paymentStatus);
  };

  // Quando confirmar o cancelamento no primeiro modal, abrir o do motivo
  const handleConfirmCancelDialogYes = () => {
    setIsConfirmDialogOpen(false);
    setIsReasonDialogOpen(true);
  };

  // Ao fechar o modal do motivo ou cancelar, resetar states
  const handleCloseReasonDialog = () => {
    setIsReasonDialogOpen(false);
    setCancellationReason("");
  };

  // Finalizar cancelamento após inserir o motivo
  const handleSubmitReason = () => {
    // Pode adicionar validação se quiser motivo obrigatório
    handleUpdateStatus(order.id, "cancelled", cancellationReason);
    setIsReasonDialogOpen(false);
    setCancellationReason("");
  };

  // Usar a nova lógica de sequência de status
  const paymentReceived = hasReceivedPayment(order);
  const nextStatusOptions = getNextStatusOptions(order.status, paymentReceived, order.paymentMethod);

  // Lista de botões para atualização de status
  const nextStatusButtons = nextStatusOptions.map(status => {
    const icon = getStatusIcon(status);
    const label = translateStatus(status);

    if (status === "cancelled") {
      return (
        <>
          <AlertDialog key={status} open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="flex items-center gap-1"
              >
                {icon}
                {label}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar o Pedido?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O pedido será marcado como cancelado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsConfirmDialogOpen(false)}>Não</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleConfirmCancelDialogYes}
                >
                  Sim
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Dialog open={isReasonDialogOpen} onOpenChange={setIsReasonDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Motivo do cancelamento</DialogTitle>
                <DialogDescription>
                  Por favor, informe o motivo desse cancelamento. Isso será salvo nos detalhes do pedido.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <Textarea
                  value={cancellationReason}
                  onChange={e => setCancellationReason(e.target.value)}
                  placeholder="Digite o motivo do cancelamento..."
                  className="w-full"
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={handleCloseReasonDialog}
                  type="button"
                >Cancelar</Button>
                <Button
                  variant="destructive"
                  onClick={handleSubmitReason}
                  type="button"
                  disabled={!cancellationReason.trim()}
                >Confirmar Cancelamento</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      );
    }

    // Destacar botões específicos com cores diferentes
    let buttonVariant: "default" | "secondary" | "outline" = "default";
    let buttonClass = "flex items-center gap-1";

    if (status === "received") {
      buttonVariant = "secondary";
      buttonClass = "flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-800 border-green-300";
    } else if (status === "to_deduct") {
      buttonClass = "flex items-center gap-1 bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300";
    } else if (status === "paid") {
      buttonClass = "flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300";
    }

    return (
      <Button
        key={status}
        onClick={() => handleUpdateStatus(order.id, status)}
        variant={buttonVariant}
        className={buttonClass}
      >
        {icon}
        {label}
      </Button>
    );
  });

  return (
    <div className="space-y-6">
      {/* Informações básicas do pedido */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">ID do Pedido</h3>
          <p className="mt-1">{order.id}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Data do Pedido</h3>
          <p className="mt-1">{formatDate(order.createdAt as string)}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Cliente</h3>
          <p className="mt-1">{order.customerName}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Telefone</h3>
          <p className="mt-1">{order.customerPhone}</p>
        </div>
        <div className="col-span-2">
          <h3 className="text-sm font-medium text-gray-500">Endereço</h3>
          {/* CORREÇÃO AQUI: Exibindo o endereço formatado */}
          <p className="mt-1">{formatAddress(order.address)}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Forma de Pagamento</h3>
          <p className="mt-1 font-medium">{translatePaymentMethod(order.paymentMethod)}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Total</h3>
          {/* O total final já inclui o desconto, mas queremos mostrar a quebra */}
          <p className="mt-1 font-semibold">R$ {order.total.toFixed(2)}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Status</h3>
          <p className="mt-1">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${getStatusColor(order.status)}`}>
              {getStatusIcon(order.status)}
              {translateStatus(order.status)}
            </span>
          </p>
        </div>
        {order.observations && (
          <div className="col-span-2">
            <h3 className="text-sm font-medium text-gray-500">Observações</h3>
            <p className="mt-1">{order.observations}</p>
          </div>
        )}
      </div>

      {/* Status de Pagamento - Novo grupo separado */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
        <h3 className="text-md font-medium mb-3 text-blue-800">Status de Pagamento</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            <span className="font-medium">
              Status: {order.paymentStatus === "recebido" ? "Recebido" : "A Receber"}
            </span>
          </div>
          {order.paymentStatus !== "recebido" && (
            <Button
              onClick={() => handleUpdatePaymentStatus(order.id, "recebido")}
              variant="default"
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="h-4 w-4" />
              Marcar como Recebido
            </Button>
          )}
        </div>
      </div>

      {/* Motivo do cancelamento, se existir */}
      {order.status === "cancelled" && (order.cancellationReason || cancellationReason) && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-md">
          <div className="text-sm font-semibold text-red-700">Motivo do cancelamento:</div>
          <div className="text-sm text-gray-800 mt-1">
            {order.cancellationReason || cancellationReason}
          </div>
        </div>
      )}

      {/* Itens do pedido */}
      <div>
        <h3 className="text-md font-medium mb-2">Itens do Pedido</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Preço Base</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item, index) => {
              return (
                <React.Fragment key={index}>
                  <TableRow>
                    {/* ITEM COLUMN: Name + Variations as stacked block */}
                    <TableCell className="font-medium align-top w-[280px] min-w-[220px]">
                      <div className="font-semibold">
                        {item.name}
                        {item.priceFrom && (
                          <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            a partir de
                          </span>
                        )}
                      </div>
                      {/* Exibir variações se existirem */}
                      {item.selectedVariations && Array.isArray(item.selectedVariations) && item.selectedVariations.length > 0 ? (
                        <div className="mt-1">
                          {item.selectedVariations.map((group, groupIndex) => (
                            <div key={groupIndex} className="pl-2 text-xs text-gray-700 border-l-2 border-gray-200 mb-1">
                              {group.groupName && (
                                <div className="font-medium text-[12px] text-gray-600 mb-0.5">{group.groupName}:</div>
                              )}
                              {group.variations && Array.isArray(group.variations) && group.variations.length > 0 ? (
                                group.variations.map((variation, varIndex) => {
                                  const additionalPrice = variation.additionalPrice || 0;
                                  const quantity = variation.quantity || 1;
                                  const variationTotal = additionalPrice * quantity;
                                  return (
                                    <div key={varIndex} className="flex justify-between items-center text-gray-700">
                                      <span>
                                        • {variation.name || `Variação ${varIndex + 1}`}
                                        {quantity > 1 && (
                                          <span className="ml-0.5 text-[11px]">({quantity}x)</span>
                                        )}
                                      </span>
                                      {additionalPrice > 0 && (
                                        <span className="text-green-600 font-extrabold tabular-nums text-[13px] ml-2 whitespace-nowrap">
                                          +R$ {variationTotal.toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="text-gray-400 italic">Nenhuma variação</div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 mt-1">
                          (Sem variações selecionadas)
                        </div>
                      )}
                    </TableCell>
                    {/* PREÇO BASE */}
                    <TableCell className="align-top w-28 text-right font-normal tabular-nums">
                      {item.priceFrom ? (
                        <span className="text-gray-500">R$ 0,00</span>
                      ) : (
                        `R$ ${(item.price || 0).toFixed(2)}`
                      )}
                    </TableCell>
                    {/* QTD */}
                    <TableCell className="align-top w-12 text-center tabular-nums">
                      {item.quantity}
                    </TableCell>
                    {/* SUBTOTAL */}
                    <TableCell className="align-top w-28 text-right font-semibold tabular-nums">
                      R$ {calculateItemSubtotal(item).toFixed(2)}
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
          {/* REMOVI O TABLE FOOTER DO TOTAL AQUI PARA USAR O NOVO BLOCO DE RESUMO FINANCEIRO */}
        </Table>
      </div>

      {/* --- NOVO BLOCO DE RESUMO FINANCEIRO --- */}
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-md mt-4">
        <h3 className="text-lg font-semibold mb-3">Resumo Financeiro</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-md">
            <span className="font-medium">Subtotal dos Itens:</span>
            <span className="font-semibold">R$ {overallSubtotal.toFixed(2)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between items-center text-md text-red-600">
              <span className="font-medium">Desconto Aplicado:</span>
              <span className="font-semibold">- R$ {discountAmount.toFixed(2)}</span>
            </div>
          )}

          {couponCode && (
            <div className="flex justify-between items-center text-sm text-gray-700 italic border-t border-gray-100 pt-2">
              <span>Cupom:</span>
              <span>
                **{couponCode}** ({couponType === 'percentual' ? `${couponValue}%` : `R$ ${couponValue?.toFixed(2)}`})
              </span>
            </div>
          )}

          <div className="flex justify-between items-center text-xl font-bold border-t-2 border-gray-300 pt-3 mt-3">
            <span>Total Final do Pedido:</span>
            <span>R$ {order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
      {/* --- FIM DO NOVO BLOCO DE RESUMO FINANCEIRO --- */}

      {/* Botões de atualização de status */}
      {nextStatusButtons.length > 0 && (
        <div className="mt-6">
          <h3 className="text-md font-medium mb-2">Atualizar Status do Pedido</h3>
          <div className="flex flex-wrap gap-2">
            {nextStatusButtons}
            {/* Botão Finalizado - apenas para desconto em folha */}
            {order.paymentMethod === "payroll_discount" && order.status === "paid" && (
              <Button
                onClick={() => handleUpdateStatus(order.id, "delivered")}
                variant="default"
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="h-5 w-5" />
                Finalizado
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;
