"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Sparkles, Mail, Lock, User, ArrowLeft, AlertCircle } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        // Traduzir erros comuns do Supabase
        if (error.message.includes("Signups not allowed")) {
          setError("Os cadastros estão temporariamente desabilitados. Por favor, entre em contato com o administrador ou acesse o dashboard do Supabase em Authentication > Providers > Email e habilite 'Enable email signups'.");
        } else if (error.message.includes("User already registered")) {
          setError("Este email já está cadastrado. Tente fazer login.");
        } else {
          setError(error.message);
        }
        return;
      }

      if (data.user) {
        // Tentar criar perfil do médico (pode falhar se tabela não existir)
        try {
          await supabase
            .from("doctor_profiles")
            .insert({
              user_id: data.user.id,
              full_name: name,
              email: email,
            });
        } catch (profileError) {
          console.log("Perfil não criado (tabela pode não existir):", profileError);
        }

        alert("Conta criada com sucesso! Verifique seu email para confirmar (se necessário) e faça login.");
        setIsLogin(true);
        setEmail("");
        setPassword("");
        setName("");
      }
    } catch (error: any) {
      setError(error.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Traduzir erros comuns
        if (error.message.includes("Invalid login credentials")) {
          setError("Email ou senha incorretos. Verifique suas credenciais e tente novamente.");
        } else if (error.message.includes("Email not confirmed")) {
          setError("Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada.");
        } else {
          setError(error.message);
        }
        return;
      }

      if (data.user) {
        router.push("/");
        router.refresh();
      }
    } catch (error: any) {
      setError(error.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6F00] to-[#FFD600] flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-[#0D0D0D]" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#FF6F00] to-[#FFD600] bg-clip-text text-transparent">
              Medfy
            </h1>
          </div>
          <p className="text-white/60">
            {isLogin
              ? "Entre na sua conta para continuar"
              : "Crie sua conta e comece a usar"}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-8">
          <form onSubmit={isLogin ? handleSignIn : handleSignUp} className="space-y-6">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                    placeholder="Dr. João Silva"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00] transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#FF6F00] focus:ring-1 focus:ring-[#FF6F00] transition-all"
                />
              </div>
              {!isLogin && (
                <p className="text-xs text-white/50 mt-2">
                  Mínimo de 6 caracteres
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-400 mb-1">Erro ao {isLogin ? "fazer login" : "criar conta"}</p>
                    <p className="text-xs text-red-400/80">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF6F00] to-[#FFD600] font-semibold text-[#0D0D0D] hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Carregando..."
                : isLogin
                ? "Entrar"
                : "Criar Conta"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-sm text-white/60 hover:text-[#FF6F00] transition-colors"
            >
              {isLogin
                ? "Não tem conta? Criar conta"
                : "Já tem conta? Fazer login"}
            </button>
          </div>
        </div>

        {/* Back to Home */}
        <button
          onClick={() => router.push("/")}
          className="mt-6 w-full flex items-center justify-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o início
        </button>

        {/* Instruções para configuração */}
        {!isLogin && (
          <div className="mt-6 bg-[#FFD600]/10 border border-[#FFD600]/20 rounded-xl p-4">
            <p className="text-xs text-white/70 leading-relaxed">
              <strong className="text-[#FFD600]">Importante:</strong> Se aparecer erro "Signups not allowed", você precisa habilitar cadastros no Supabase:
              <br />
              1. Acesse o Dashboard do Supabase
              <br />
              2. Vá em Authentication → Providers → Email
              <br />
              3. Habilite "Enable email signups"
              <br />
              4. Salve as alterações
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
