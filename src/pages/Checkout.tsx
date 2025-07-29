//src/pages/Checkout.tsx
import React, { useState, useContext } from "react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createOrder } from "@/services/orderService";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { fetchAddressByCep } from "@/services/cepService";

// IMPORTANTE: Importamos o useAuth do seu AuthContext real
import { useAuth } from "@/contexts/AuthContext"; // <--- CORREÇÃO AQUI: Importação do seu AuthContext real


const Checkout = () => {
  const {
    cartItems,
    cartTotal, // Este é o total bruto, sem desconto
    finalTotal, // <--- NOVO: O total com desconto
    discountAmount, // <--- NOVO: O valor do desconto
    appliedCoupon, // <--- NOVO: O cupom aplicado
    clearCart,
  } = useCart();

  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentUser } = useAuth(); // Usando o hook useAuth real para obter o currentUser logado

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | "pix" | "payroll_discount">("card"); // Adicionado pix e payroll_discount
  const [observations, setObservations] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const handleCepChange = async (value: string) => {
    setCep(value);

    if (value.replace(/\D/g, '').length === 8) {
      setCepLoading(true);
      try {
        const cepInfo = await fetchAddressByCep(value);
        if (cepInfo) {
          setStreet(cepInfo.street || "");
          setNeighborhood(cepInfo.neighborhood || "");
          setCity(cepInfo.city || "");
          setState(cepInfo.state || "");
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
        toast({
          title: "Erro",
          description: "Não foi possível buscar as informações do CEP",
          variant: "destructive",
        });
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validação para garantir que o empresa_id está disponível
    // O empresa_id no currentUser do AuthContext vem do perfil do usuário no Supabase
    if (!currentUser || !currentUser.empresa_id) { // Agora verifica currentUser.empresa_id
      console.error("handleSubmit: empresa_id não encontrado no usuário logado.");
      toast({
        title: "Erro de Autenticação",
        description: "Não foi possível identificar a empresa. Por favor, faça login novamente.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    // Usa o empresa_id que foi carregado no AuthContext
    const empresaIdDoUsuarioLogado = currentUser.empresa_id; 

    try {
      // A variável fullAddress não é usada no objeto address, mas mantida para referência/logs se necessário.
      // const fullAddress = `${street}, ${number}${complement ? `, ${complement}` : ""} - ${neighborhood}, ${city} - ${state}`;

      console.log("=== CHECKOUT SUBMIT ===");
      console.log("Itens do carrinho:", cartItems);
      cartItems.forEach((item, index) => {
        console.log(`[CHECKOUT] Item ${index + 1}:`, JSON.stringify(item, null, 2));
        if (item.selectedVariations && item.selectedVariations.length > 0) {
          console.log(`[CHECKOUT] Variações do item ${index + 1}:`, item.selectedVariations);
          item.selectedVariations.forEach((group, groupIndex) => {
            console.log(`[CHECKOUT] Grupo ${groupIndex + 1} (${group.groupName}):`, group.variations);
          });
        } else {
          console.log(`[CHECKOUT] Item ${index + 1} SEM variações`);
        }
      });

      const orderData = {
        customerName,
        customerPhone,
        address: { // Objeto de endereço detalhado
          street,
          number,
          complement: complement || null, // Garante null em vez de ""
          neighborhood,
          city,
          state,
          zipCode: cep.replace(/\D/g, '') // Garante que o CEP seja salvo sem formatação
        },
        paymentMethod,
        observations: observations || null, // Garante null em vez de ""
        items: cartItems.map(item => ({
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          selectedVariations: item.selectedVariations || [],
          priceFrom: item.priceFrom || false
        })),
        totalAmount: finalTotal,
        discountAmount: discountAmount,
        couponCode: appliedCoupon ? appliedCoupon.nome : null,
        couponType: appliedCoupon ? appliedCoupon.tipo : null,
        couponValue: appliedCoupon ? appliedCoupon.valor : null,
        empresa_id: empresaIdDoUsuarioLogado, // <--- AQUI ESTÁ A CORREÇÃO CRÍTICA!
        paymentStatus: "a_receber", // Definido como "a_receber" por padrão no checkout
      };

      console.log("[CHECKOUT] Dados do pedido sendo enviados:", JSON.stringify(orderData, null, 2));

      const order = await createOrder(orderData);

      clearCart();

      toast({
        title: "Pedido realizado com sucesso!",
        description: `Seu pedido #${order.id.substring(0, 6)} foi enviado para o restaurante.`,
      });

      navigate("/");
    } catch (error) {
      console.error("Erro ao criar pedido:", error);
      toast({
        title: "Erro",
        description: "Não foi possível processar seu pedido. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <h2 className="text-xl font-semibold mb-4">Seu carrinho está vazio</h2>
            <Button onClick={() => navigate("/")} variant="outline">
              Voltar ao cardápio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Finalizar Pedido</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="customerName">Nome completo</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="customerPhone">Telefone/WhatsApp</Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                />
              </div>

              <Separator />

              <h3 className="text-lg font-semibold">Endereço de Entrega</h3>

              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder="00000-000"
                  disabled={cepLoading}
                  required
                />
                {cepLoading && <p className="text-sm text-gray-500 mt-1">Buscando CEP...</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <Label htmlFor="street">Rua</Label>
                  <Input
                    id="street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Apto, bloco, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Separator />

              <div>
                <Label>Forma de Pagamento</Label>
                <RadioGroup value={paymentMethod} onValueChange={(value: "card" | "cash" | "pix" | "payroll_discount") => setPaymentMethod(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card">Cartão</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash">Dinheiro</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pix" id="pix" />
                    <Label htmlFor="pix">PIX</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="payroll_discount" id="payroll_discount" />
                    <Label htmlFor="payroll_discount">Desconto em Folha</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Observações sobre o pedido..."
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Processando..." : `Finalizar Pedido - R$ ${finalTotal.toFixed(2)}`}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo do Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {cartItems.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-0 border-b pb-4 mb-2 last:border-b-0 last:pb-0"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-lg">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity}x {item.priceFrom ? (
                          <span>
                            <span className="text-xs text-gray-500">a partir de</span> R$ 0,00
                          </span>
                        ) : (
                          `R$ ${item.price.toFixed(2)}`
                        )}
                      </p>
                    </div>
                    <div className="text-right font-semibold text-lg">
                      R$ {(
                        ((item.priceFrom ? 0 : item.price) +
                          (item.selectedVariations
                            ? item.selectedVariations.reduce((acc, group) => {
                                return (
                                  acc +
                                  group.variations.reduce(
                                    (gacc, v) =>
                                      gacc +
                                      ((v.additionalPrice || 0) *
                                        (v.quantity || 1)),
                                    0
                                  )
                                );
                              }, 0)
                            : 0)) * item.quantity
                      ).toFixed(2)}
                    </div>
                  </div>

                  {item.selectedVariations && item.selectedVariations.length > 0 && (
                    <div className="mt-2 ml-1 text-sm">
                      {item.selectedVariations.map((group, groupIndex) => (
                        <div key={groupIndex} className="mb-2">
                          <div className="font-semibold text-gray-700">{group.groupName}:</div>
                          <div className="ml-2 text-gray-700 flex flex-col gap-0.5">
                            {group.variations.map((variation, varIndex) => {
                              const variationTotal =
                                (variation.additionalPrice || 0) *
                                (variation.quantity || 1) *
                                item.quantity;

                              if (variation.quantity > 0) {
                                return (
                                  <div key={varIndex} className="flex items-center justify-between">
                                    <span>
                                      <span className="inline-block w-7">{variation.quantity}x</span>
                                      {variation.name || "Variação"}
                                      {variation.additionalPrice && variation.additionalPrice > 0 ? (
                                        <>
                                          {" "}
                                          <span className="text-gray-500">
                                            (+R$ {variation.additionalPrice.toFixed(2)})
                                          </span>
                                        </>
                                      ) : null}
                                    </span>
                                    {variation.additionalPrice && variation.additionalPrice > 0 && (
                                      <span className="text-green-600 font-semibold tabular-nums">
                                        +R$ {(variationTotal).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <Separator />

              {/* --- NOVO: Seção de Resumo de Totais --- */}
              <div className="flex justify-between font-normal text-lg">
                <span>Subtotal do Pedido:</span>
                <span>R$ {cartTotal.toFixed(2)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between font-normal text-green-600 text-lg">
                  <span>Desconto do Cupom ({appliedCoupon?.nome}):</span>
                  <span>- R$ {discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-xl border-t pt-2">
                <span>Total a Pagar:</span>
                <span>R$ {finalTotal.toFixed(2)}</span>
              </div>
              {/* --- FIM da Seção de Resumo de Totais --- */}

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Checkout;
