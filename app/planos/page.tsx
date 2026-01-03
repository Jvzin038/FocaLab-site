'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Conexão com o banco para saber quem é o usuário
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PlanosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Verifica se tem alguém logado ao abrir a página
  useEffect(() => {
    const getUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setUser(session.user);
        } else {
            // Se não estiver logado, manda pro login
            router.push('/login');
        }
    };
    getUser();
  }, []);

  // Função que inicia o pagamento
  const irParaCheckout = async () => {
    setLoading(true);
    
    try {
        // Chama a nossa API (que vamos criar no passo 2)
        const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: user?.email, 
                userId: user?.id 
            })
        });

        const data = await res.json();

        // Se a API devolver o link do Stripe, enviamos o usuário para lá
        if (data.url) {
            window.location.href = data.url;
        } else {
            alert("Erro: " + (data.error || "Não foi possível criar o pagamento."));
        }
    } catch (error) {
        console.error(error);
        alert("Erro de conexão com o servidor.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-blue-500 selection:text-white">
      {/* HEADER */}
      <nav className="flex justify-between items-center p-6 max-w-6xl mx-auto">
        <div className="text-2xl font-bold flex items-center gap-2 cursor-pointer hover:opacity-80 transition" onClick={() => router.push('/dashboard')}>
            <span className="text-3xl">🦭</span> Foca<span className="text-blue-500">Lab</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-white font-medium transition flex items-center gap-2">
            ← Voltar para o Dashboard
        </button>
      </nav>

      {/* CONTEÚDO */}
      <div className="flex flex-col items-center justify-center py-10 px-4">
        <div className="text-center max-w-3xl mb-16 animate-in slide-in-from-bottom-5 duration-700">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
                Estude como um <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Mestre</span>.
            </h1>
            <p className="text-lg md:text-xl text-slate-400">
                Desbloqueie IA ilimitada, Podcasts exclusivos e Flashcards automáticos.
            </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl w-full">
            
            {/* PLANO GRÁTIS */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 flex flex-col hover:border-slate-700 transition duration-300">
                <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest mb-4">Iniciante</h3>
                <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold text-white">R$ 0</span>
                    <span className="text-slate-500">/mês</span>
                </div>
                <ul className="space-y-4 mb-8 text-slate-300 flex-1 text-sm">
                    <li className="flex gap-3"><span className="text-blue-500 font-bold">✓</span> 3 Arquivos por mês</li>
                    <li className="flex gap-3"><span className="text-blue-500 font-bold">✓</span> Resumos Básicos</li>
                    <li className="flex gap-3 opacity-50"><span className="text-slate-600 font-bold">✕</span> Sem Podcast IA</li>
                    <li className="flex gap-3 opacity-50"><span className="text-slate-600 font-bold">✕</span> Sem Tutor 24h</li>
                </ul>
                <button className="w-full py-4 rounded-xl border border-slate-700 text-slate-400 font-bold hover:bg-slate-800 transition cursor-default">
                    Seu Plano Atual
                </button>
            </div>

            {/* PLANO PRO (DESTAQUE) */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-blue-600 rounded-3xl p-8 flex flex-col relative transform hover:scale-[1.02] transition duration-300 shadow-2xl shadow-blue-900/20">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg">
                    Recomendado
                </div>
                <h3 className="text-lg font-bold text-blue-400 uppercase tracking-widest mb-4">Estudante Pro</h3>
                <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-5xl font-bold text-white">R$ 19,90</span>
                    <span className="text-slate-500">/mês</span>
                </div>
                <p className="text-slate-400 text-sm mb-6 border-b border-slate-800 pb-6">
                    O pacote completo para passar em qualquer prova.
                </p>
                <ul className="space-y-4 mb-8 text-white flex-1 font-medium text-sm">
                    <li className="flex gap-3 items-center"><div className="bg-blue-500/20 p-1 rounded-full"><span className="text-blue-400 text-xs">✓</span></div> Arquivos Ilimitados</li>
                    <li className="flex gap-3 items-center"><div className="bg-blue-500/20 p-1 rounded-full"><span className="text-blue-400 text-xs">✓</span></div> 🎧 Podcast AI com Voz Real</li>
                    <li className="flex gap-3 items-center"><div className="bg-blue-500/20 p-1 rounded-full"><span className="text-blue-400 text-xs">✓</span></div> 🤖 Tutor IA Especialista</li>
                    <li className="flex gap-3 items-center"><div className="bg-blue-500/20 p-1 rounded-full"><span className="text-blue-400 text-xs">✓</span></div> 🧠 Mapas Mentais</li>
                </ul>
                
                <button 
                    onClick={irParaCheckout} 
                    disabled={loading}
                    className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg shadow-lg hover:shadow-blue-500/25 transition flex justify-center items-center gap-2"
                >
                    {loading ? (
                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <>Assinar Agora 🚀</>
                    )}
                </button>
                <p className="text-center text-xs text-slate-500 mt-4">Cancelamento fácil a qualquer momento.</p>
            </div>

        </div>
      </div>
    </div>
  );
}