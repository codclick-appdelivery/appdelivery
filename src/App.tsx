// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import Orders from "./pages/Orders";
import AdminOrders from "./pages/AdminOrders";
import Entregador from "./pages/Entregador";
import PDV from "./pages/PDV";
import Api from "./pages/Api";
import NotFound from "./pages/NotFound";
import ShoppingCart from "./components/ShoppingCart";
import Checkout from "./pages/Checkout";
import AppLayout from "@/components/layouts/AppLayout";
import AdminRegister from "./pages/AdminRegister";
import AdminCupons from "@/pages/AdminCupons";
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { EmpresaProvider } from "@/contexts/EmpresaContext";

const queryClient = new QueryClient();

const PrivateRoute = ({ children, role }: { children: React.ReactNode; role?: string }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center">Carregando...</div>;
  }

  if (!currentUser) {
    console.log("PrivateRoute: Usuário não autenticado, redirecionando para /login");
    return <Navigate to="/login" />;
  }

  // --- MODIFICAÇÃO AQUI ---
  // Se o usuário logado for 'admin', ele tem acesso a qualquer página privada,
  // independentemente do 'role' específico que a rota pede.
  if (currentUser.role === "admin") {
    console.log(`PrivateRoute: Usuário é admin. Acesso permitido a todas as páginas.`);
    return <>{children}</>;
  }
  // --- FIM DA MODIFICAÇÃO ---

  console.log(`PrivateRoute: currentUser.role = '${currentUser.role}' | role esperado = '${role}'`);

  // Lógica de verificação para outros roles (entregador, etc.)
  if (role && currentUser.role !== role) {
    console.log(`PrivateRoute: Acesso negado. currentUser.role '${currentUser.role}' != role esperado '${role}'. Redirecionando para /unauthorized`);
    return <Navigate to="/unauthorized" />;
  }

  console.log(`PrivateRoute: Acesso permitido para role '${currentUser.role}' na rota com role '${role || "qualquer logado"}'`);
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Rotas públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin-register" element={<AdminRegister />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/unauthorized" element={<NotFound />} /> {/* Ou uma página de "Acesso Negado" */}

              {/* Rota inicial que usa AppLayout */}
              <Route
                path="/"
                element={
                  <AppLayout>
                    <Index />
                  </AppLayout>
                }
              />

              {/* Rotas de Admin e outras rotas privadas com verificação de role */}
              <Route
                path="/admin-coupons"
                element={
                  <PrivateRoute role="admin">
                    <AppLayout>
                       <AdminCupons />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin-dashboard"
                element={
                  <PrivateRoute role="admin">
                    <AppLayout>
                      <AdminDashboard />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <PrivateRoute role="admin">
                    <AppLayout>
                      <Admin />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <PrivateRoute> {/* Esta rota aceita qualquer usuário logado */}
                    <AppLayout>
                      <Orders />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin-orders"
                element={
                  <PrivateRoute role="admin">
                    <AppLayout>
                      <AdminOrders />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/entregador"
                element={
                  <PrivateRoute role="entregador">
                    <AppLayout>
                      <Entregador />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/pdv"
                element={
                  <PrivateRoute role="admin">
                    <AppLayout>
                      <PDV />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/api/*"
                element={
                  <PrivateRoute role="admin">
                    <AppLayout>
                      <Api />
                    </AppLayout>
                  </PrivateRoute>
                }
              />

              {/* Rota de Cliente para slug específico (se ela ainda precisar de EmpresaProvider) */}
              <Route
                path="/:slug"
                element={
                  <EmpresaProvider>
                    <AppLayout>
                      <Index />
                    </AppLayout>
                  </EmpresaProvider>
                }
              />

              {/* Rota de 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <ShoppingCart />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
