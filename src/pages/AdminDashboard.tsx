import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ClipboardList, Settings, LogOut, ArrowLeft, Calculator, Percent, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useAuth } from "@/hooks/useAuth";
import { useProtectPage } from "@/hooks/useProtectPage";
import { useAuthState } from "@/hooks/useAuthState";
import { useEmpresa } from "@/hooks/useEmpresa";
import DelivererManagementModal from "@/components/DelivererManagementModal";

const AdminDashboard = () => {
  useProtectPage("admin");

  const navigate = useNavigate();
  const { logOut } = useAuth();
  // CORREÇÃO AQUI: Desestruturando 'currentUser' diretamente de useAuthState
  const { currentUser, loading: authUserLoading } = useAuthState(); 

  // Passa currentUser?.id apenas quando ele está disponível e authUserLoading é false
  const { empresa, loading: empresaDataLoading } = useEmpresa(
    authUserLoading ? null : (currentUser?.id ?? null) // Usa currentUser.id
  );

  const [isDelivererModalOpen, setIsDelivererModalOpen] = useState(false);

  // Combina os estados de carregamento
  const totalLoading = authUserLoading || empresaDataLoading;

  // Log para depuração do estado da empresa
  useEffect(() => {
    console.log("AdminDashboard: Estado da empresa atualizado.");
    console.log("AdminDashboard: authUserLoading:", authUserLoading);
    console.log("AdminDashboard: currentUser:", currentUser); // Loga o objeto currentUser completo
    console.log("AdminDashboard: currentUser.id:", currentUser?.id);
    console.log("AdminDashboard: empresaDataLoading:", empresaDataLoading);
    console.log("AdminDashboard: empresa:", empresa);
    console.log("AdminDashboard: empresa.id:", empresa?.id);
    console.log("AdminDashboard: totalLoading:", totalLoading);
  }, [currentUser, empresa, empresaDataLoading, authUserLoading, totalLoading]);


  // Função para abrir o modal de entregadores, verificando se o empresaId está disponível
  const handleOpenDelivererModal = () => {
    if (totalLoading) { // Usa totalLoading combinado
      console.log("AdminDashboard: Carregando dados, não abrindo modal.");
      // Opcional: mostrar um toast informando que os dados ainda estão carregando
      return;
    }
    if (!empresa?.id) {
      console.warn("AdminDashboard: empresa.id não disponível, não é possível abrir o modal de entregadores.");
      // Opcional: mostrar um toast informando que o ID da empresa não foi encontrado
      return;
    }
    console.log("AdminDashboard: Abrindo modal de entregadores com empresaId:", empresa.id);
    setIsDelivererModalOpen(true);
  };


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Painel de Administração</h1>
          {empresa?.nome && (
            <p className="text-gray-600 text-lg mt-1">{empresa.nome}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Voltar ao Cardápio
          </Button>
          <Button
            onClick={logOut}
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut size={16} />
            Sair
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
              <ClipboardList className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-xl">Ver Pedidos</CardTitle>
            <CardDescription>
              Visualize e gerencie todos os pedidos do restaurante
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/admin-orders">Acessar Pedidos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
              <Settings className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-xl">Gerenciamento do Cardápio</CardTitle>
            <CardDescription>
              Gerencie categorias, itens do menu, grupos e variações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/admin">Gerenciar Cardápio</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-purple-100 rounded-full w-fit">
              <Calculator className="h-8 w-8 text-purple-600" />
            </div>
            <CardTitle className="text-xl">Ponto de Venda</CardTitle>
            <CardDescription>
              Acesse o sistema de ponto de venda para registrar pedidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/pdv">Acessar PDV</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-yellow-100 rounded-full w-fit">
              <Percent className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle className="text-xl">Cupons de Desconto</CardTitle>
            <CardDescription>
              Crie e gerencie cupons promocionais para seus clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/admin-coupons">Gerenciar Cupons</Link>
            </Button>
          </CardContent>
        </Card>

        {/* NOVO CARD: Gerenciamento de Entregadores */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full w-fit">
              <Users className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-xl">Gerenciar Entregadores</CardTitle>
            <CardDescription>
              Visualize, ative/desative e adicione entregadores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleOpenDelivererModal} // Chama a nova função
              className="w-full"
              disabled={totalLoading || !empresa?.id} // Desabilita o botão enquanto carrega ou se empresaId não estiver disponível
            >
              {totalLoading ? "Carregando..." : "Acessar Entregadores"}
            </Button>
          </CardContent>
        </Card>
        {/* FIM DO NOVO CARD */}

      </div>


      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Bem-vindo, Administrador!</h2>
        <p className="text-gray-600">
          Use este painel para gerenciar todos os aspectos do seu restaurante.
          Você pode visualizar e atualizar pedidos, gerenciar o cardápio completo
          e acessar o sistema de PDV.
        </p>
      </div>

      {/* Modal de Gerenciamento de Entregadores */}
      {/* Renderiza o modal apenas se estiver aberto E o empresaId estiver disponível */}
      {isDelivererModalOpen && empresa?.id && (
        <DelivererManagementModal
          isOpen={isDelivererModalOpen}
          onClose={() => setIsDelivererModalOpen(false)}
          empresaId={empresa.id} // Passa o empresa.id garantido
        />
      )}
    </div>
  );
};

export default AdminDashboard;
