// src/types/order.ts
import { Timestamp } from "firebase/firestore";

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  address: { 
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  items: Array<{
    menuItemId: string; 
    name: string;
    price: number;
    quantity: number;
    notes?: string;
    priceFrom?: boolean; 
    selectedVariations?: Array<{
      groupId: string;
      groupName?: string;
      variations: Array<{
        variationId: string;
        name?: string;
        quantity?: number;
        additionalPrice?: number;
      }>;
    }>;
  }>;
  total: number;
  status: "pending" | "accepted" | "confirmed" | "preparing" | "ready" | "delivering" | "received" | "delivered" | "cancelled" | "to_deduct" | "paid";
  paymentMethod: string;
  paymentStatus: "a_receber" | "recebido";
  deliveryFee?: number;
  observations?: string;
  createdAt: string | Timestamp;
  updatedAt?: string | Timestamp;
  discountAmount?: number;
  couponCode?: string;
  couponType?: "percentage" | "fixed";
  couponValue?: number;
  entregador_id?: string;
  empresa_id: string;
  deliveredAt?: string | Date | Timestamp; 
}

export interface CreateOrderRequest {
  customerName: string;
  customerPhone: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  items: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    selectedVariations?: Array<{
      groupId: string;
      groupName?: string;
      variations: Array<{
        variationId: string;
        name?: string;
        quantity?: number;
        additionalPrice?: number;
      }>;
    }>;
    priceFrom?: boolean;
  }>;
  paymentMethod: string;
  observations?: string;
  totalAmount?: number;
  discountAmount?: number;
  couponCode?: string;
  couponType?: "percentage" | "fixed";
  couponValue?: number;
  entregador_id?: string;
  empresa_id: string;
  paymentStatus: "a_receber" | "recebido";
  // --- NOVO: Permite passar um status inicial ao criar o pedido ---
  status?: Order["status"]; 
}

export interface UpdateOrderRequest {
  status?: "pending" | "accepted" | "confirmed" | "preparing" | "ready" | "delivering" | "received" | "delivered" | "cancelled" | "to_deduct" | "paid";
  paymentStatus?: "a_receber" | "recebido";
  cancellationReason?: string;
  entregador_id?: string;
  customerName?: string;
  customerPhone?: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  items?: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
    priceFrom?: boolean;
    selectedVariations?: Array<{
      groupId: string;
      groupName?: string;
      variations: Array<{
        variationId: string;
        name?: string;
        quantity?: number;
        additionalPrice?: number;
      }>;
    }>;
  }>;
  total?: number;
  paymentMethod?: string;
  deliveryFee?: number;
  observations?: string;
  discountAmount?: number;
  couponCode?: string;
  couponType?: "percentage" | "fixed";
  couponValue?: number;
  deliveredAt?: string | Date | Timestamp;
}
