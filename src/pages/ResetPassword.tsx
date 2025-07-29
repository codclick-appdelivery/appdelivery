import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

// 🚀 IMPORTAÇÃO DO SEU CLIENTE SUPABASE REAL AQUI!
import { supabase } from "@/lib/supabaseClient"; // Ajuste o caminho se for diferente

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // O Supabase se encarrega de ler o access_token da URL automaticamente
  // quando a página carrega e uma nova sessão é estabelecida.
  // Você não precisa extrair o token manualmente na maioria dos casos.
  useEffect(() => {
    // Você pode adicionar uma lógica aqui para verificar a sessão
    // Se, por algum motivo, a sessão não for estabelecida (link expirado, inválido),
    // o supabase.auth.getSession() ou supabase.auth.onAuthStateChange
    // indicariam isso. Para este fluxo, o Supabase já lida com a validade do token.
    // No entanto, se precisar de alguma verificação extra ou redirecionamento,
    // este é o lugar. Por exemplo:
    // const checkSession = async () => {
    //   const { data: { session } } = await supabase.auth.getSession();
    //   if (!session) {
    //     // Se não houver sessão válida (token inválido/expirado), redirecione para /forgot-password
    //     setError("Link de redefinição inválido ou expirado. Por favor, solicite um novo.");
    //     // setTimeout(() => navigate('/forgot-password'), 3000); // Exemplo de redirecionamento após 3 segundos
    //   }
    // };
    // checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação básica de senhas
    if (password !== confirmPassword) {
      setError("As senhas não conferem. Por favor, digite novamente.");
      return;
    }

    if (password.length < 6) { // Exemplo de requisito mínimo, ajuste se necessário
        setError("A senha deve ter pelo menos 6 caracteres.");
        return;
    }

    try {
      setError("");
      setLoading(true);

      // 🚀 CHAMADA REAL PARA O SUPABASE PARA ATUALIZAR A SENHA
      // A função updateUser do Supabase é usada quando o usuário já está "logado"
      // ou tem uma sessão temporária via o token de recuperação.
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Senha redefinida com sucesso!",
        description: "Você já pode fazer login com sua nova senha.",
      });

      // Redireciona para a página de login com uma mensagem de sucesso
      navigate("/login", { state: { message: "password_reset_success" } });

    } catch (err: any) {
      console.error("Erro ao redefinir senha:", err);
      // Mensagem de erro mais amigável para o usuário
      setError(err.message || "Não foi possível redefinir sua senha. Por favor, tente novamente.");
      toast({
        title: "Erro",
        description: "Não foi possível redefinir sua senha.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Defina sua nova senha</h2>
          <p className="mt-2 text-sm text-gray-600">
            Crie uma senha forte e segura para sua conta AppDelivery.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Nova Senha
              </label>
              <div className="mt-1 relative">
                <Lock className="absolute top-3 left-3 text-gray-400 h-5 w-5" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirmar Nova Senha
              </label>
              <div className="mt-1 relative">
                <Lock className="absolute top-3 left-3 text-gray-400 h-5 w-5" />
                <Input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  required
                  className="pl-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-brand hover:bg-brand-600"
            disabled={loading}
          >
            {loading ? "Redefinindo..." : "Redefinir Senha"}
          </Button>
        </form>

        <div className="text-center mt-4">
          <Link to="/login" className="font-medium text-brand hover:text-brand-600">
            Voltar para o Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
