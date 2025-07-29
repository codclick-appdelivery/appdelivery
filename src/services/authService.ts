// services/authService.ts
import { supabase } from "@/lib/supabaseClient";

// ---------- SIGN UP CLIENTE ----------
export async function signUp(
  email: string,
  password: string,
  name?: string,
  phone?: string
): Promise<any> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  const user = data.user;

  // Se o usuário foi criado e um nome foi fornecido, insere na tabela 'usuarios' com role 'cliente'
  if (user && name) {
    // Usamos upsert aqui para garantir que se por algum motivo o registro já existir (ex: retentativa), ele atualize
    await supabase.from("usuarios").upsert({
      id: user.id,
      nome: name,
      role: "cliente", // padrão para quem se cadastra pelo cardápio
      telefone: phone, // Adicionando o telefone aqui também, se disponível
    });
  }

  return data;
}

// ---------- SIGN IN ----------
export async function signIn(email: string, password: string): Promise<any> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Erro do Supabase Auth signIn:", error); // Adicione este log para ver o erro real do Supabase
    throw error; // Lança o erro para o AuthContext
  }

  // **NOVA VERIFICAÇÃO**: Garante que o usuário existe no 'data' retornado
  if (!data || !data.user) {
      const customError = new Error("Usuário não encontrado após login bem-sucedido (verifique data.user).");
      console.error("authService: data ou data.user é nulo após signIn:", data);
      throw customError; // Lança um erro customizado se o usuário não for retornado
  }

  return data; // Retorna data.user
}
// ...
// ---------- SIGN OUT ----------
export async function logOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ---------- SIGN UP ADMIN ----------
interface AdminSignupData {
  email: string;
  password: string;
  nome: string; // Nome do usuário admin
  empresa_nome: string; // Nome da empresa
  empresa_telefone: string; // Telefone da empresa
}

// services/authService.ts

// ... (código anterior) ...

export async function signUpAdmin({
  email,
  password,
  nome,
  empresa_nome,
  empresa_telefone,
}: AdminSignupData): Promise<any> {
  try {
    // 1. Criar usuário no Supabase Auth
    const { data: userData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      console.error("Erro no Supabase Auth SignUp:", authError);
      throw new Error(authError.message || "Falha ao registrar usuário.");
    }

    const user = userData.user;
    if (!user) {
      console.error("Usuário NULO após Supabase Auth SignUp. userData:", userData); // Novo log
      throw new Error("Usuário não retornado após o signup. Verifique as configurações de autenticação.");
    }

    const userId = user.id;
    let empresaId: string | null = null;

    console.log("UserID obtido após signUp:", userId); // NOVO LOG
    console.log("Email do usuário:", user.email); // NOVO LOG

    // Gerar o slug
    const slugGerado = empresa_nome
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-')
      .trim();

    // 2. Inserir a nova empresa na tabela 'empresas'
    const { data: empresaData, error: insertEmpresaError } = await supabase
      .from("empresas")
      .insert({
        nome: empresa_nome,
        telefone: empresa_telefone,
        slug: slugGerado,
        admin_id: userId, // Usando o userId obtido
      })
      .select("id")
      .single();

    if (insertEmpresaError) {
      console.error("Erro ao inserir empresa. Dados passados:", { nome: empresa_nome, telefone: empresa_telefone, slug: slugGerado, admin_id: userId }); // Novo log
      throw new Error(insertEmpresaError.message || "Falha ao criar os dados da empresa.");
    }

    empresaId = empresaData.id;

    console.log("Empresa criada com sucesso. Empresa ID:", empresaId); // Novo log

    // 3. Inserir o perfil do usuário (admin) na tabela 'usuarios'
    const { error: insertUserError } = await supabase.from("usuarios").insert({
      id: userId,
      nome: nome,
      role: "admin",
      empresa_id: empresaId,
    });

    if (insertUserError) {
      console.error("Erro ao inserir usuário na tabela 'usuarios':", insertUserError);
      throw new Error(insertUserError.message || "Falha ao criar o perfil do administrador.");
    }

    console.log("Perfil do usuário admin criado com sucesso."); // Novo log

    return userData;
  } catch (error: any) {
    console.error("Erro geral no signUpAdmin:", error);
    throw error;
  }
}
