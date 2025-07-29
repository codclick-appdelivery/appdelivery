import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { CartItem, MenuItem, SelectedVariationGroup } from "@/types/menu";
import { toast } from "@/components/ui/use-toast"; // Assumindo que você usa o use-toast do shadcn/ui
import { getAllVariations } from "@/services/variationService";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth"; // Importe o useAuth

// --- Interface para o Cupom ---
interface Coupon {
  id: string;
  nome: string;
  tipo: 'percentual' | 'fixo';
  valor: number;
  validade: string;
  descricao?: string;
  ativo: boolean;
  empresa_id: string;
}

// --- Interface para o Contexto do Carrinho ---
interface CartContextType {
  cartItems: CartItem[];
  addItem: (item: MenuItem & { selectedVariations?: SelectedVariationGroup[] }) => void;
  addToCart: (item: MenuItem) => void;
  removeFromCart: (id: string) => void;
  increaseQuantity: (id: string) => void;
  decreaseQuantity: (id: string) => void;
  clearCart: () => void;
  cartTotal: number; // Total bruto do carrinho (antes do cupom)
  itemCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  applyCoupon: (couponCode: string) => Promise<void>;
  appliedCoupon: Coupon | null;
  removeCoupon: () => void;
  discountAmount: number; // O valor monetário do desconto aplicado
  finalTotal: number; // O total final após o desconto
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// --- Componente CartProvider ---
export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- Estados do Carrinho ---
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartTotal, setCartTotal] = useState(0); // Este será o total ANTES do desconto
  const [itemCount, setItemCount] = useState(0);
  const [variations, setVariations] = useState<any[]>([]);

  // --- Estados do Cupom ---
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [finalTotal, setFinalTotal] = useState<number>(0);

  // --- Estado e Hook para o usuário logado e empresa_id ---
  const { currentUser } = useAuth(); // Obtém o usuário logado do AuthContext
  const [userEmpresaId, setUserEmpresaId] = useState<string | null>(null);

  // --- useEffect 1: Busca o empresa_id do usuário logado ---
  useEffect(() => {
    const fetchUserEmpresaId = async () => {
      console.log("DEBUG: useEffect do CartContext acionado (busca empresa_id).");
      console.log("DEBUG: currentUser (antes da verificação):", currentUser);

      if (currentUser) {
        console.log("DEBUG: currentUser existe. ID:", currentUser.id);
        console.log("DEBUG: Buscando empresa_id para o usuário na tabela 'usuarios'...");

        const { data, error } = await supabase
          .from('usuarios')
          .select('empresa_id')
          .eq('id', currentUser.id)
          .single();

        if (error) {
          console.error("DEBUG: ERRO Supabase ao buscar empresa_id:", error.message);
          setUserEmpresaId(null);
        } else if (data) {
          console.log("DEBUG: Dados encontrados:", data);
          if (data.empresa_id) {
            console.log("DEBUG: empresa_id ENCONTRADO:", data.empresa_id);
            setUserEmpresaId(data.empresa_id);
          } else {
            console.log("DEBUG: Dados encontrados, mas empresa_id é null/undefined.");
            setUserEmpresaId(null);
          }
        } else {
          console.log("DEBUG: Nenhum dado retornado para o usuário na tabela 'usuarios'.");
          setUserEmpresaId(null);
        }
      } else {
        console.log("DEBUG: currentUser é nulo, não é possível buscar empresa_id.");
        setUserEmpresaId(null);
      }
    };
    fetchUserEmpresaId();
  }, [currentUser]); // Dependência: só roda quando currentUser muda

  // --- useEffect 2: Carrega todas as variações (para cálculo de preço) ---
  useEffect(() => {
    console.log("DEBUG: useEffect do CartContext acionado (carrega variações).");
    const loadVariations = async () => {
      try {
        const allVariations = await getAllVariations();
        setVariations(allVariations);
        console.log("DEBUG: Variações carregadas.");
      } catch (error) {
        console.error("DEBUG: Erro ao carregar variações:", error);
      }
    };
    loadVariations();
  }, []); // Dependência: roda apenas uma vez na montagem do componente

  // --- Funções Auxiliares de Cálculo (podem ser definidas aqui) ---
  const getVariationPrice = (variationId: string): number => {
    const variation = variations.find(v => v.id === variationId);
    return variation?.additionalPrice || 0;
  };

  const getVariationName = (variationId: string): string => {
    const variation = variations.find(v => v.id === variationId);
    return variation?.name || '';
  };

  const calculateVariationsTotal = (item: CartItem): number => {
    let variationsTotal = 0;
    if (item.selectedVariations && item.selectedVariations.length > 0) {
      item.selectedVariations.forEach(group => {
        if (group.variations && group.variations.length > 0) {
          group.variations.forEach(variation => {
            const additionalPrice = variation.additionalPrice !== undefined ? variation.additionalPrice : getVariationPrice(variation.variationId);
            if (additionalPrice > 0) {
              variationsTotal += additionalPrice * (variation.quantity || 1);
            }
          });
        }
      });
    }
    return variationsTotal;
  };

  // --- useEffect 3: Recalcula cartTotal e itemCount (o total BRUTO) ---
  useEffect(() => {
    console.log("DEBUG: useEffect do CartContext acionado (calcula cartTotal/itemCount).");
    const { total, count } = cartItems.reduce(
      (acc, item) => {
        const basePrice = item.priceFrom ? 0 : (item.price || 0);
        const variationsTotal = calculateVariationsTotal(item);
        const itemTotal = (basePrice + variationsTotal) * item.quantity;

        acc.total += itemTotal;
        acc.count += item.quantity;
        return acc;
      },
      { total: 0, count: 0 }
    );

    setCartTotal(total);
    setItemCount(count);
  }, [cartItems, variations]); // Dependências: cartItems ou variations mudam

  // --- useEffect 4: Recalcula finalTotal quando cartTotal ou discountAmount mudam ---
  useEffect(() => {
    console.log("DEBUG: useEffect do CartContext acionado (calcula finalTotal).");
    let calculatedFinalTotal = cartTotal - discountAmount;
    if (calculatedFinalTotal < 0) {
      calculatedFinalTotal = 0;
    }
    setFinalTotal(calculatedFinalTotal);
  }, [cartTotal, discountAmount]);


  // --- Funções de Gerenciamento do Carrinho ---
  const generateCartItemId = (item: MenuItem, selectedVariations?: SelectedVariationGroup[]): string => {
    if (!selectedVariations || selectedVariations.length === 0) {
      return item.id;
    }
    const variationsKey = selectedVariations
      .map(group => {
        const groupVariations = group.variations
          .filter(v => v.quantity > 0)
          .sort((a, b) => a.variationId.localeCompare(b.variationId))
          .map(v => `${v.variationId}-${v.quantity}`)
          .join('.');
        return `${group.groupId}:${groupVariations}`;
      })
      .sort()
      .join('_');
    return `${item.id}_${variationsKey}`;
  };

  const enrichSelectedVariations = (selectedVariations?: SelectedVariationGroup[]): SelectedVariationGroup[] => {
    if (!selectedVariations || selectedVariations.length === 0) {
      return [];
    }
    const enriched = selectedVariations.map(group => {
      const enrichedGroup = {
        ...group,
        variations: group.variations.map(variation => {
          const name = variation.name || getVariationName(variation.variationId);
          const additionalPrice = variation.additionalPrice !== undefined ? variation.additionalPrice : getVariationPrice(variation.variationId);
          return {
            ...variation,
            name,
            additionalPrice
          };
        })
      };
      return enrichedGroup;
    });
    return enriched;
  };

  const addItem = (menuItem: MenuItem & { selectedVariations?: SelectedVariationGroup[] }) => {
    const { selectedVariations, ...item } = menuItem;
    const enrichedVariations = enrichSelectedVariations(selectedVariations);
    const cartItemId = generateCartItemId(item, enrichedVariations);

    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(
        i => generateCartItemId(i, i.selectedVariations) === cartItemId
      );
      if (existingItemIndex >= 0) {
        return prevItems.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        const newCartItem = {
          ...item,
          quantity: 1,
          selectedVariations: enrichedVariations
        };
        return [...prevItems, newCartItem];
      }
    });
    setAppliedCoupon(null);
    setDiscountAmount(0);
    toast({
      title: "Item adicionado",
      description: `${item.name} foi adicionado ao carrinho`,
      duration: 2000
    });
  };

  const addToCart = (item: MenuItem) => addItem(item);

  const removeFromCart = (id: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
    setAppliedCoupon(null);
    setDiscountAmount(0);
  };

  const increaseQuantity = (id: string) => {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
    setAppliedCoupon(null);
    setDiscountAmount(0);
  };

  const decreaseQuantity = (id: string) => {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === id && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ).filter(item => !(item.id === id && item.quantity === 1))
    );
    setAppliedCoupon(null);
    setDiscountAmount(0);
  };

  const clearCart = () => {
    setCartItems([]);
    setAppliedCoupon(null);
    setDiscountAmount(0);
  };

  // --- Função para Aplicar Cupom ---
  const applyCoupon = useCallback(async (couponCode: string) => {
    if (!currentUser) {
      toast({
        title: "Erro ao aplicar cupom",
        description: "Você precisa estar logado para aplicar um cupom.",
        variant: "destructive",
      });
      return;
    }

    if (!userEmpresaId) {
      toast({
        title: "Erro ao aplicar cupom",
        description: "Não foi possível carregar as informações da sua empresa. Tente novamente mais tarde.",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from('cupons')
      .select('*')
      .eq('nome', couponCode.toUpperCase())
      .eq('ativo', true)
      .eq('empresa_id', userEmpresaId)
      .single();

    if (error || !data) {
      toast({
        title: "Cupom inválido",
        description: "O código do cupom está incorreto ou o cupom não existe/não está ativo para sua empresa.",
        variant: "destructive",
      });
      setAppliedCoupon(null);
      setDiscountAmount(0);
      return;
    }

    const coupon: Coupon = data;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(coupon.validade);
    expiryDate.setHours(23, 59, 59, 999);

    if (today > expiryDate) {
      toast({
        title: "Cupom expirado",
        description: "Este cupom não é mais válido.",
        variant: "destructive",
      });
      setAppliedCoupon(null);
      setDiscountAmount(0);
      return;
    }

    let calculatedDiscount = 0;
    if (coupon.tipo === 'percentual') {
      calculatedDiscount = (cartTotal * coupon.valor) / 100;
    } else if (coupon.tipo === 'fixo') {
      calculatedDiscount = coupon.valor;
    }
    calculatedDiscount = Math.min(calculatedDiscount, cartTotal);

    setAppliedCoupon(coupon);
    setDiscountAmount(calculatedDiscount);

    toast({
      title: "Cupom aplicado!",
      description: `"${coupon.nome}" aplicado com sucesso.`,
    });

  }, [cartTotal, currentUser, userEmpresaId, toast]);

  // --- Função para Remover Cupom ---
  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    toast({
      title: "Cupom removido",
      description: "O cupom foi removido do seu pedido.",
    });
  }, [toast]);

  // --- Renderização do Provedor ---
  return (
    <CartContext.Provider
      value={{
        cartItems, addItem, addToCart, removeFromCart, increaseQuantity,
        decreaseQuantity, clearCart, cartTotal, itemCount, isCartOpen,
        setIsCartOpen, applyCoupon, appliedCoupon, removeCoupon, discountAmount, finalTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// --- Hook useContext para Consumir o Contexto ---
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
