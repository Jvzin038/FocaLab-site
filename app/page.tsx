"use client";

import Link from "next/link";
import { useState, useRef } from "react";

export default function LandingPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- LINKS DO STRIPE CONFIGURADOS ---
  const LINK_PASSE_24H = "https://buy.stripe.com/test_fZueVf1OX0mk0zyaamdUY02"; 
  const LINK_MENSAL = "https://buy.stripe.com/test_dRm4gBctB3yw5TSbeqdUY03"; 

  // Estados para o Teste Grátis
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [fase, setFase] = useState<"inicio" | "processando" | "concluido">("inicio");
  const [resumoGratis, setResumoGratis] = useState("");

  const handleUploadGratis = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivo(file);
      processarTesteGratis(file);
    }
  };

  const processarTesteGratis = async (file: File) => {
    setFase("processando");
    
    // Simulação do processamento
    setTimeout(() => {
      setResumoGratis(`
        <h3>📝 Resumo: ${file.name}</h3>
        <p>Este é o seu resumo gratuito gerado pelo FocaLab.</p>
        <p>O documento trata dos conceitos fundamentais da matéria, destacando os pontos principais de fixação.</p>
        <br/>
        <p><strong>Pontos Chave:</strong></p>
        <ul>
          <li>Conceito principal definido com clareza.</li>
          <li>Diferenciação entre teoria e prática.</li>
          <li>Exemplos aplicados ao cotidiano.</li>
        </ul>
        <br/>
        <p class="text-yellow-400">🔒 Para gerar Flashcards, Questões e Audio desta aula, faça seu cadastro!</p>
      `);
      setFase("concluido");
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
      
      {/* --- HEADER --- */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-2xl font-bold tracking-tighter" translate="no">
            <span className="text-3xl">🦭</span> 
            <span>Foca<span className="text-blue-500">Lab</span></span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#upload-teste" className="hover:text-white transition">Testar Grátis</a>
            <a href="#funcionalidades" className="hover:text-white transition">Funcionalidades</a>
            <a href="#precos" className="hover:text-white transition">Planos</a>
          </div>

          <div>
            <Link href="/login" className="bg-white text-slate-950 px-6 py-2.5 rounded-full text-sm font-bold hover:bg-slate-200 transition shadow-lg shadow-white/10">
              Fazer Login
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="pt-40 pb-10 px-6 relative overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -z-10"></div>

        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block py-1 px-3 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wide mb-6 animate-in fade-in slide-in-from-bottom-4">
            🚀 Estude qualquer matéria 10x mais rápido
          </span>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight">
            Transforme arquivos em <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Conhecimento Dominado.</span>
          </h1>
          
          <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed">
            Seja para a Faculdade, Escola ou Concursos. Jogue seu PDF ou áudio aqui embaixo e receba <strong>Flashcards</strong>, <strong>Resumos</strong> e <strong>Questões</strong> instantaneamente.
          </p>

          <div className="flex justify-center gap-4">
             <a href="#upload-teste" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition shadow-lg shadow-blue-900/50">
               Testar Agora 👇
             </a>
          </div>
        </div>
      </section>

      {/* --- SEÇÃO DE UPLOAD (TESTE GRÁTIS) --- */}
      <section id="upload-teste" className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
            <div className="bg-slate-900/80 border-2 border-dashed border-slate-700 rounded-3xl p-8 relative hover:border-blue-500 transition-all group shadow-2xl overflow-hidden backdrop-blur-sm">
                
                {fase === "inicio" && (
                <>
                    <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    onChange={handleUploadGratis}
                    accept=".pdf,.docx,.txt,image/*,audio/*"
                    />
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="text-6xl mb-4 group-hover:scale-110 transition duration-300">📄</div>
                        <h3 className="text-2xl font-bold text-white mb-2">Arraste seu arquivo aqui</h3>
                        <p className="text-slate-400 text-sm mb-6">PDF, Word, Áudio ou Imagem</p>
                        <span className="bg-green-500/10 text-green-400 px-4 py-2 rounded-full text-sm font-bold border border-green-500/20 animate-pulse">
                            🎁 Gerar 1º Resumo Grátis
                        </span>
                    </div>
                </>
                )}

                {fase === "processando" && (
                <div className="flex flex-col items-center justify-center py-12 animate-pulse">
                    <div className="text-5xl mb-4">🔮</div>
                    <h3 className="text-xl font-bold text-white">Lendo seu arquivo...</h3>
                    <p className="text-slate-400 text-sm">A IA está gerando seu resumo gratuito.</p>
                </div>
                )}

                {fase === "concluido" && (
                <div className="text-left animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-slate-300 text-sm leading-relaxed mb-6 max-h-80 overflow-y-auto custom-scrollbar">
                        <div dangerouslySetInnerHTML={{ __html: resumoGratis }} />
                    </div>
                    
                    <div className="text-center bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                        <p className="text-white font-bold mb-4">Curtiu? Desbloqueie o Tutor IA e Flashcards agora.</p>
                        <div className="flex gap-4 justify-center">
                            <a href="#precos" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 shadow-lg">
                            🔓 Liberar Acesso Total
                            </a>
                        </div>
                    </div>
                </div>
                )}
            </div>
            <p className="text-center mt-4 text-xs text-slate-600 uppercase tracking-widest">* Teste limitado a 1 arquivo por usuário</p>
        </div>
      </section>

      {/* --- FUNCIONALIDADES (O QUE OFERECEMOS) --- */}
      <section id="funcionalidades" className="py-20 bg-slate-900/50 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">O que você ganha? 🧠</h2>
            <p className="text-slate-400">Todas as ferramentas que você precisa em um só lugar.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon="📝" 
              title="Resumos Automáticos" 
              desc="Jogue aquele PDF de 100 páginas aqui e receba os pontos chaves explicados."
            />
            <FeatureCard 
              icon="🃏" 
              title="Flashcards Inteligentes" 
              desc="A IA cria baralhos de memorização baseados na sua matéria. Pratique com repetição."
            />
            <FeatureCard 
              icon="💬" 
              title="Tutor IA Socrático" 
              desc="Um chat que não te dá a resposta pronta, mas te ensina a pensar e corrige erros."
            />
            <FeatureCard 
              icon="🎧" 
              title="Podcast de Estudo" 
              desc="Transforme seus textos em áudio para estudar no ônibus ou na academia."
            />
            <FeatureCard 
              icon="🗺️" 
              title="Mapas Mentais" 
              desc="Visualize as conexões entre os conceitos complexos com diagramas automáticos."
            />
            <FeatureCard 
              icon="📈" 
              title="Gestão de Desempenho" 
              desc="Saiba exatamente quais matérias você está dominando e onde precisa focar mais."
            />
          </div>
        </div>
      </section>

      {/* --- PREÇOS --- */}
      <section id="precos" className="py-20 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Escolha seu Acesso</h2>
            <p className="text-slate-400">Pague, receba a senha no e-mail e comece a usar.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-end">
            
            {/* 1. TESTE GRÁTIS */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl opacity-70 hover:opacity-100 transition relative">
              <h3 className="text-lg font-bold text-slate-400 mb-2">Visitante</h3>
              <div className="text-3xl font-bold text-white mb-4">Grátis</div>
              <p className="text-sm text-slate-500 mb-6 min-h-[40px]">Para testar um resumo.</p>
              
              <ul className="space-y-4 mb-8 text-slate-300 text-sm">
                <li className="flex items-center gap-3"><span>✅</span> <strong>1 Arquivo</strong> (Resumo)</li>
                <li className="flex items-center gap-3 text-slate-600"><span>❌</span> Outras ferramentas</li>
              </ul>
              <a href="#upload-teste" className="block w-full py-3 rounded-xl border border-slate-700 text-center font-bold hover:bg-slate-800 transition">
                Fazer Upload
              </a>
            </div>

            {/* 2. PASSE 24H (COM LINK REAIS) */}
            <div className="bg-slate-800 border-2 border-blue-500/30 p-8 rounded-3xl relative shadow-2xl shadow-blue-900/10 transform md:-translate-y-4">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase">Uso Único</div>
              <h3 className="text-lg font-bold text-blue-400 mb-2">Passe 24 Horas</h3>
              <div className="text-4xl font-bold text-white mb-2">R$ 10,00</div>
              <p className="text-sm text-slate-400 mb-6 min-h-[40px]">Acesso total por 1 dia.</p>
              
              <ul className="space-y-4 mb-8 text-white text-sm">
                <li className="flex items-center gap-3"><span>💎</span> <strong>Acesso ILIMITADO</strong> a tudo</li>
                <li className="flex items-center gap-3"><span>✅</span> Flashcards, Mapas e Chat</li>
                <li className="flex items-center gap-3"><span>✅</span> Podcasts de Áudio</li>
                <li className="flex items-center gap-3"><span>⚠️</span> Expira em 24h</li>
              </ul>
              <a href={LINK_PASSE_24H} className="block w-full py-4 rounded-xl bg-blue-600 text-white text-center font-bold hover:bg-blue-700 transition">
                Comprar Passe
              </a>
            </div>

            {/* 3. PLANO MENSAL (COM LINK REAIS) */}
            <div className="bg-gradient-to-b from-purple-900/20 to-slate-900 border border-purple-500/30 p-8 rounded-3xl relative">
              <h3 className="text-lg font-bold text-purple-400 mb-2">Foca Pro</h3>
              <div className="text-3xl font-bold text-white mb-2">R$ 19,90 <span className="text-sm font-normal text-slate-500">/mês</span></div>
              <p className="text-sm text-slate-500 mb-6 min-h-[40px]">Para o semestre todo.</p>
              
              <ul className="space-y-4 mb-8 text-slate-300 text-sm">
                <li className="flex items-center gap-3"><span>👑</span> <strong>Acesso Total Sempre</strong></li>
                <li className="flex items-center gap-3"><span>✅</span> Histórico salvo na nuvem</li>
                <li className="flex items-center gap-3"><span>✅</span> Acompanhamento de Desempenho</li>
              </ul>
              <a href={LINK_MENSAL} className="block w-full py-3 rounded-xl border border-purple-500/50 text-purple-300 text-center font-bold hover:bg-purple-900/20 transition">
                Assinar Mensal
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-10 border-t border-slate-800 text-center text-slate-500 text-sm bg-slate-950">
        <div className="flex items-center justify-center gap-2 mb-4" translate="no">
          <span>🦭</span> <span className="font-bold text-white">FocaLab</span>
        </div>
        <p>© 2025 FocaLab. Feito para estudantes.</p>

        {/* LINK INSTAGRAM ADICIONADO AQUI */}
        <div className="mt-2">
            <a 
              href="https://instagram.com/focalab.ia" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-bold uppercase tracking-widest hover:text-blue-400 transition"
            >
                Instagram
                
            </a>
            </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: any) {
  return (
    <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl hover:border-blue-500/50 hover:bg-blue-900/5 transition cursor-default">
      <div className="text-4xl mb-4 bg-slate-900 w-16 h-16 flex items-center justify-center rounded-xl border border-slate-800">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 leading-relaxed text-sm">{desc}</p>
    </div>
  );
}