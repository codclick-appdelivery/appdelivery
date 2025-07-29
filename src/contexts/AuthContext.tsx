// src/contexts/AuthContext.tsx
import { useContext } from "react";
import React, { createContext, useEffect, useState } from "react";
import { useAuthState } from "@/hooks/useAuthState";
import {
  signUp as authSignUp,
  signIn as authSignIn,
  logOut as authLogOut,
} from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

interface CustomUser extends User {
  role?: string;
  empresa_id?: string; // Adicionado: Propriedade para armazenar o ID da empresa
}

interface AuthContextType {
  currentUser: CustomUser | null;
  userRole: string | null;
  loading: boolean; // Este 'loading' será o loading combinado
  signUp: (
    email: string,
    password: string,
    name?: string,
    phone?: string
  ) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  logOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser: supabaseUser, loading: authStateLoading } = useAuthState();
  const [currentUser, setCurrentUser] = useState<CustomUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // Estado de loading COMBINADO

  useEffect(() => {
    const fetchAndSetUser = async () => {
      setLoading(true); // Garante que o loading seja true enquanto busca os dados do usuário

      if (supabaseUser) {
        // Busca o role e o empresa_id do perfil do usuário na tabela 'usuarios'
        const { data, error } = await supabase
          .from("usuarios")
          .select("role, empresa_id") // Seleciona também o empresa_id
          .eq("id", supabaseUser.id)
          .single();

        if (data) { // Se os dados do perfil foram encontrados
          const updatedUser: CustomUser = {
            ...supabaseUser,
            role: data.role,
            empresa_id: data.empresa_id, // Atribui o empresa_id ao objeto currentUser
          };
          setCurrentUser(updatedUser);
          setUserRole(data.role);
          console.log("AuthContext: Usuário carregado com role:", data.role, "e empresa_id:", data.empresa_id);
        } else {
          // Se o perfil não foi encontrado ou não tem role/empresa_id
          setCurrentUser(supabaseUser as CustomUser); // Ainda define o usuário Supabase básico
          setUserRole(null);
          console.warn("AuthContext: Role ou empresa_id não encontrados para o usuário:", supabaseUser.id, error?.message);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false); // Sempre define como false após tentar carregar o usuário/role
    };

    // Só começa a buscar o role e o perfil personalizado após o useAuthState ter terminado seu carregamento inicial
    if (!authStateLoading) {
      fetchAndSetUser();
    }
  }, [supabaseUser, authStateLoading]);

  // Funções de Autenticação
  const signUp = async (email: string, password: string, name?: string, phone?: string) => {
    try {
      setLoading(true); // Inicia carregamento
      const result = await authSignUp(email, password, name, phone);
      toast({ title: "Conta criada com sucesso", description: "Bem-vindo ao nosso aplicativo!" });
      return result;
    } catch (error: any) {
      toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
      throw error;
    } finally {
      // O useEffect acima será acionado pelo novo supabaseUser, e ele cuidará do setLoading(false)
      // ao final da busca do role. Remover setLoading(false) daqui pode ser melhor para evitar
      // que o loading seja false antes do role ser totalmente carregado.
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const result = await authSignIn(email, password); // result agora deve conter { user, session }
      // IMPORTANTE: Remova ou comente esta toast de sucesso por enquanto.
      // Ela pode estar sendo disparada antes que a página redirecione,
      // ou pode ser redundante e causar confusão.
      // toast({ title: "Login realizado", description: "Você entrou com sucesso." });
      return result;
    } catch (error: any) {
      console.error("AuthContext: Erro capturado no signIn:", error.message); // Verifique esta mensagem no console
      toast({
        title: "Erro ao fazer login",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      // O useEffect que atualiza o currentUser e loading será disparado
      // pelo onAuthStateChange ou pela atualização do session/user no useAuthState.
    }
  };

  const logOut = async () => {
    try {
      setLoading(true); // Inicia carregamento
      await authLogOut();
      toast({ title: "Logout realizado", description: "Você foi desconectado com sucesso." });
    } catch (error: any) {
      toast({ title: "Erro ao fazer logout", description: error.message, variant: "destructive" });
      throw error;
    } finally {
      // O useEffect acima será acionado, e ele cuidará do setLoading(false)
    }
  };

  const value = {
    currentUser,
    userRole,
    loading,
    signUp,
    signIn,
    logOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Remova o "!loading && children" daqui. O PrivateRoute já cuida do loading. */}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
