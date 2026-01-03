'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Inicializa o Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(""); 
  const [sucesso, setSucesso] = useState("");
  
  // Estados de controle visual
  const [modoRecuperacao, setModoRecuperacao] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false); // <--- NOVO: Controla o olhinho
  
  const router = useRouter();

  // Função de Login Normal
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErro("E-mail ou senha incorretos.");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  // Função de Recuperar Senha
  const handleRecuperarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro("");
    setSucesso("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000/dashboard',
    });

    if (error) {
      setErro("Erro ao enviar e-mail. Verifique se o endereço está correto.");
    } else {
      setSucesso("Verifique seu e-mail! Enviamos um link para redefinir sua senha.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-500">
        
        <div className="text-center mb-8">
          <span className="text-4xl">🦭</span>
          <h2 className="text-2xl font-bold text-white mt-4">
            {modoRecuperacao ? "Recuperar Acesso" : "Bem-vindo de volta"}
          </h2>
          <p className="text-slate-400">
            {modoRecuperacao 
              ? "Digite seu e-mail para receber um link de acesso." 
              : "Insira seus dados para acessar."}
          </p>
        </div>

        <form onSubmit={modoRecuperacao ? handleRecuperarSenha : handleLogin} className="space-y-6">
          
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:border-blue-500 outline-none transition" 
              placeholder="seu@email.com" 
              required
            />
          </div>

          {/* Campo de Senha com o botão de Olhinho */}
          {!modoRecuperacao && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-slate-400">Senha</label>
                <button 
                  type="button"
                  onClick={() => { setModoRecuperacao(true); setErro(""); setSucesso(""); }}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              
              <div className="relative">
                <input 
                  type={mostrarSenha ? "text" : "password"} // <--- Aqui está a mágica
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 pr-12 text-white focus:border-blue-500 outline-none transition" 
                  placeholder="••••••••" 
                  required
                />
                {/* Botão do Olhinho */}
                <button 
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-slate-400 hover:text-white transition cursor-pointer"
                  title={mostrarSenha ? "Ocultar senha" : "Ver senha"}
                >
                  {mostrarSenha ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          )}

          {erro && (
            <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-200 text-sm text-center animate-pulse">
                {erro}
            </div>
          )}
          
          {sucesso && (
            <div className="p-3 bg-green-900/30 border border-green-800 rounded-lg text-green-200 text-sm text-center">
                {sucesso}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full font-bold py-4 rounded-xl transition shadow-lg shadow-blue-900/20 disabled:opacity-50 ${modoRecuperacao ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
          >
            {loading ? "Processando..." : (modoRecuperacao ? "Enviar Link de Recuperação" : "Entrar na Plataforma")}
          </button>
        </form>

        {modoRecuperacao && (
          <button 
            onClick={() => { setModoRecuperacao(false); setErro(""); setSucesso(""); }}
            className="w-full mt-4 text-slate-400 hover:text-white text-sm py-2"
          >
            ← Voltar para o Login
          </button>
        )}

        {!modoRecuperacao && (
          <div className="mt-8 text-center border-t border-slate-800 pt-6">
            <p className="text-slate-500 text-sm">Ainda não tem acesso?</p>
            <Link href="/#precos" className="text-blue-400 font-bold hover:underline">
              Comprar um Passe ou Assinatura
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}