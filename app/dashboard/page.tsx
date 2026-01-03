'use client';

import { useState, useEffect, useRef } from "react";
import { createClient } from '@supabase/supabase-js';
import { useRouter } from "next/navigation";
import mermaid from "mermaid";
import PptxGenJS from "pptxgenjs"; // Exportação PPTX
import jsPDF from "jspdf";         // Exportação PDF

// --- CONFIGURAÇÃO DO SUPABASE ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Dashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slideImageInputRef = useRef<HTMLInputElement>(null);
  
  // --- REFERÊNCIAS ---
  const audioRef = useRef<HTMLAudioElement>(null); 
  const chatScrollRef = useRef<HTMLDivElement>(null); 
  
  // --- CONFIGURAÇÃO ---
  const PLANO_ATUAL = "estudante"; 

  // --- ESTADOS GERAIS ---
  const [loading, setLoading] = useState(true);
  const [usuario, setUsuario] = useState<any>(null);
  const [menuAtivo, setMenuAtivo] = useState("inicio"); 
  const [menuPerfilAberto, setMenuPerfilAberto] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);

  // --- ESTADOS DE PERFIL ---
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [loadingSenha, setLoadingSenha] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  // --- ESTADOS DO UPLOAD E FLUXO ---
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [fase, setFase] = useState<"upload" | "opcoes" | "processando" | "resultado">("upload");
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([]);
  
  // --- ESTADOS DE LEITURA (MEUS ARQUIVOS) ---
  const [arquivoLeitura, setArquivoLeitura] = useState<any>(null);

  // --- ESTADOS DOS FLASHCARDS ---
  const [flashcards, setFlashcards] = useState<any[]>([]); 
  const [cardIndex, setCardIndex] = useState(0); 
  const [cardVirado, setCardVirado] = useState(false); 
  const [fimFlashcards, setFimFlashcards] = useState(false); 
  const [modoJogoAtivo, setModoJogoAtivo] = useState(false);

  // --- ESTADOS DE QUESTÕES ---
  const [configQuestao, setConfigQuestao] = useState({ tipo: "mista", dificuldade: "medio" });

  // --- ESTADOS DO CHAT TUTOR IA ---
  const [chatInput, setChatInput] = useState("");
  const [chatMensagens, setChatMensagens] = useState<any[]>([
    { role: "ai", content: "Olá! Sou seu Tutor IA. Responda questões para alimentar seu gráfico de desempenho!" }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // --- ESTADOS DE DESEMPENHO ---
  const [semanaSelecionada, setSemanaSelecionada] = useState("Esta Semana");
  const [progressoSemanal, setProgressoSemanal] = useState([0, 0, 0, 0, 0, 0, 0]); 
  
  const [stats, setStats] = useState({
      questoesFeitas: 0, 
      acertos: 0, 
      erros: 0, 
      segundosEstudados: 0,
      assuntosFracos: [] as string[]
  });

  // --- ESTADOS DO PODCAST ---
  const [podcastTocando, setPodcastTocando] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [meusPodcasts, setMeusPodcasts] = useState<any[]>([]); 

  // --- ESTADO DA SUGESTÃO ---
  const [sugestaoTexto, setSugestaoTexto] = useState("");
  const [enviandoSugestao, setEnviandoSugestao] = useState(false);

  // --- NOVOS ESTADOS: ROTEIRO E ABNT ---
  const [roteiroAtual, setRoteiroAtual] = useState<any>(null);
  const [referenciaArquivo, setReferenciaArquivo] = useState("");
  // --- ESTADOS PARA FERRAMENTA DE LINK ABNT ---
  const [linkInput, setLinkInput] = useState("");
  const [referenciaLinkGerada, setReferenciaLinkGerada] = useState("");
  const [loadingLink, setLoadingLink] = useState(false);

  // --- ESTADOS PARA APRESENTAÇÃO ---
  const [slidesAtuais, setSlidesAtuais] = useState<any[]>([]);
  const [referenciasABNT, setReferenciasABNT] = useState("");
  const [slideIndex, setSlideIndex] = useState(0);
  const [fonteSelecionada, setFonteSelecionada] = useState("font-sans");

  // =========================================================
  // === 1. CARREGAR DADOS E VERIFICAR LOGIN ===============
  // =========================================================
  useEffect(() => {
    const carregarDados = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) { 
        router.push("/login"); 
        return; 
      }

      setUsuario(session.user);
      
      if (session.user.user_metadata?.avatar_url) {
          setFotoPreview(session.user.user_metadata.avatar_url);
      }

      // A. Busca Histórico de Arquivos
      const { data: arquivos } = await supabase
        .from('historicos')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (arquivos) setHistorico(arquivos);

      // B. Busca Estatísticas da Semana
      const hoje = new Date();
      const dataHojeString = hoje.toLocaleDateString('en-CA'); 

      const diaDaSemana = hoje.getDay(); 
      const diffSegunda = hoje.getDate() - (diaDaSemana === 0 ? 6 : diaDaSemana - 1);
      const segundaFeira = new Date(hoje.setDate(diffSegunda));
      
      const dataFormatada = segundaFeira.toLocaleDateString('en-CA'); 

      const { data: dadosSemana } = await supabase
        .from('progresso_diario')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('data', dataFormatada);

      if (dadosSemana) {
          const novoGrafico = [0, 0, 0, 0, 0, 0, 0];
          let totalQuestoes = 0;
          let totalAcertos = 0;
          let totalErros = 0;
          let tempoDoDiaAtual = 0; 

          dadosSemana.forEach(dado => {
              const dataRegistro = new Date(dado.data + 'T12:00:00');
              let indexDia = dataRegistro.getDay() - 1;
              if (indexDia === -1) indexDia = 6; 

              const taxa = dado.questoes_feitas > 0 ? Math.round((dado.acertos / dado.questoes_feitas) * 100) : 0;
              novoGrafico[indexDia] = taxa;

              totalQuestoes += dado.questoes_feitas;
              totalAcertos += dado.acertos;
              totalErros += dado.erros;
              
              if (dado.data === dataHojeString) {
                  tempoDoDiaAtual = dado.segundos_estudos;
              }
          });

          setProgressoSemanal(novoGrafico);
          setStats(prev => ({
              ...prev,
              questoesFeitas: totalQuestoes,
              acertos: totalAcertos,
              erros: totalErros,
              segundosEstudados: tempoDoDiaAtual 
          }));
      }

      setLoading(false);
    };

    carregarDados();
    mermaid.initialize({ startOnLoad: false, theme: 'dark' });
  }, [router]);

  // --- 2. CRONÔMETRO DE ESTUDO ---
  useEffect(() => {
      const timer = setInterval(async () => {
          setStats(prev => ({ ...prev, segundosEstudados: prev.segundosEstudados + 1 }));
          
          if (usuario && stats.segundosEstudados > 0 && stats.segundosEstudados % 60 === 0) {
              await salvarProgressoNoBanco(0, 0, 0, 60); 
          }
      }, 1000);
      return () => clearInterval(timer);
  }, [usuario, stats.segundosEstudados]);

  // --- 3. CORREÇÃO MERMAID ---
  useEffect(() => {
    if ((menuAtivo === "mapas" || arquivoLeitura) && typeof mermaid !== 'undefined') {
       setTimeout(() => { 
           try {
               mermaid.init(undefined, document.querySelectorAll('.mermaid'));
           } catch(e) { console.log("Mermaid load", e) }
       }, 500);
    }
  }, [menuAtivo, historico, arquivoLeitura]);

  // --- FUNÇÃO AUXILIAR: SALVAR PROGRESSO ---
  const salvarProgressoNoBanco = async (qFeitas: number, acertos: number, erros: number, segundos: number) => {
      if (!usuario) return;
      const hoje = new Date().toLocaleDateString('en-CA'); 

      const { data: registroHoje } = await supabase
          .from('progresso_diario')
          .select('*')
          .eq('user_id', usuario.id)
          .eq('data', hoje)
          .single();

      if (registroHoje) {
          await supabase.from('progresso_diario').update({
                  questoes_feitas: registroHoje.questoes_feitas + qFeitas,
                  acertos: registroHoje.acertos + acertos,
                  erros: registroHoje.erros + erros,
                  segundos_estudos: registroHoje.segundos_estudos + segundos
              }).eq('id', registroHoje.id);
      } else {
          await supabase.from('progresso_diario').insert({
                  user_id: usuario.id,
                  data: hoje,
                  questoes_feitas: qFeitas,
                  acertos: acertos,
                  erros: erros,
                  segundos_estudos: segundos
              });
      }
  };

  const formatarTempo = (segundos: number) => {
      const h = Math.floor(segundos / 3600);
      const m = Math.floor((segundos % 3600) / 60);
      if (h > 0) return `${h}h ${m}m`;
      return `${m}m ${segundos % 60}s`; 
  };

  // Scroll automático do Chat
  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMensagens, menuAtivo]);

  // --- LÓGICA DO CHAT ---
  const enviarMensagemChat = async () => {
    if (!chatInput.trim()) return;
    const msgUsuario = { role: "user", content: chatInput };
    setChatMensagens(prev => [...prev, msgUsuario]);
    setChatInput("");
    setIsTyping(true);

    setTimeout(async () => {
        const acertou = Math.random() > 0.4;
        let respostaIA = "";
        let topico = "Geral"; 

        if(acertou) {
            respostaIA = "✅ Correto! Excelente análise.";
        } else {
            respostaIA = `❌ Incorreto. Vou marcar este ponto para revisão.`;
        }

        setChatMensagens(prev => [...prev, { role: "ai", content: respostaIA }]);
        setIsTyping(false);

        const hojeIndex = new Date().getDay() - 1; 
        const indexAjustado = hojeIndex === -1 ? 6 : hojeIndex; 

        setProgressoSemanal(prev => {
            const novo = [...prev];
            const valorAtual = novo[indexAjustado];
            const novoValor = acertou ? 100 : 0;
            novo[indexAjustado] = valorAtual > 0 ? (valorAtual + novoValor) / 2 : novoValor;
            return novo;
        });

        setStats(prev => ({
            ...prev, 
            questoesFeitas: prev.questoesFeitas + 1, 
            acertos: acertou ? prev.acertos + 1 : prev.acertos,
            erros: !acertou ? prev.erros + 1 : prev.erros,
            assuntosFracos: !acertou ? [...prev.assuntosFracos, topico] : prev.assuntosFracos
        }));

        await salvarProgressoNoBanco(1, acertou ? 1 : 0, !acertou ? 1 : 0, 0);
    }, 1500);
  };

  // --- FUNÇÕES DE SISTEMA ---
  const sairDaConta = async () => { 
    await supabase.auth.signOut(); 
    router.push("/login"); 
  };

  // --- NOVO: ENVIAR SUGESTÃO ---
  const enviarSugestao = async () => {
      if(!sugestaoTexto.trim()) {
          alert("Por favor, escreva algo antes de enviar.");
          return;
      }
      setEnviandoSugestao(true);
      try {
          const res = await fetch('/api/sugestao', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  texto: sugestaoTexto,
                  emailUsuario: usuario?.email || "anonimo@focalab.com",
                  nomeUsuario: usuario?.user_metadata?.display_name || "Usuário"
              })
          });
          if (res.ok) {
              alert("✅ Sugestão enviada com sucesso! Verifique seu e-mail.");
              setSugestaoTexto(""); 
          } else {
              const erro = await res.json();
              alert("❌ Erro ao enviar: " + (erro.error || "Erro desconhecido"));
          }
      } catch (error) {
          console.error(error);
          alert("❌ Erro de conexão com o servidor.");
      } finally {
          setEnviandoSugestao(false);
      }
  };

  // --- NOVA FUNÇÃO: GERAR ABNT POR LINK ---
  const gerarAbntPorLink = async () => {
      if(!linkInput.trim()) { alert("Cole um link primeiro."); return; }
      setLoadingLink(true);
      try {
          const res = await fetch('/api/processar', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ servicos: ['abnt_link'], textoLink: linkInput })
          });
          const data = await res.json();
          if(data.referencia) setReferenciaLinkGerada(data.referencia);
          else alert("Não foi possível gerar.");
      } catch (e) { alert("Erro ao gerar referência."); }
      finally { setLoadingLink(false); }
  };

  // --- LÓGICA DOS FLASHCARDS ---
  const abrirDeckFlashcards = (deck: any[]) => {
      setFlashcards(deck); setCardIndex(0); setCardVirado(false); setFimFlashcards(false); setModoJogoAtivo(true);
  };
  const virarCarta = () => setCardVirado(!cardVirado);
  const proximoCard = (acertou: boolean) => {
    setCardVirado(false); if (!acertou) setFlashcards([...flashcards, flashcards[cardIndex]]); if (cardIndex + 1 < flashcards.length) setCardIndex(cardIndex + 1); else setFimFlashcards(true); 
  };
  const sairDoJogoFlashcards = () => { setModoJogoAtivo(false); setFlashcards([]); };
  const reiniciarFlashcards = () => { setCardIndex(0); setCardVirado(false); setFimFlashcards(false); };

  // --- FUNÇÕES DE UPLOAD ---
  
  const converterBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
      });
  };

  const handleArquivoSelecionado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) { setArquivo(file); setFase("opcoes"); setServicosSelecionados(["resumo"]); }
  };
  const toggleServico = (id: string) => {
    if (servicosSelecionados.includes(id)) setServicosSelecionados(servicosSelecionados.filter(item => item !== id)); else setServicosSelecionados([...servicosSelecionados, id]);
  };

  // =========================================================
  // === LÓGICA DA FOTO DE PERFIL (STORAGE) =================
  // =========================================================
  const acionarInputFoto = () => fileInputRef.current?.click();
  
  const trocarFotoLocalmente = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !usuario) return;

      setUploadingFoto(true);

      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${usuario.id}/${Date.now()}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath);

          const { error: updateError } = await supabase.auth.updateUser({
              data: { avatar_url: publicUrl }
          });

          if (updateError) throw updateError;

          setFotoPreview(publicUrl);
          alert("Foto de perfil atualizada com sucesso!");

      } catch (error: any) {
          console.error("Erro ao subir foto:", error);
          alert("Erro ao atualizar foto. Verifique se criou o bucket 'avatars' como PUBLICO no Supabase.");
      } finally {
          setUploadingFoto(false);
      }
  };

  // =========================================================
  // === FUNÇÃO PRINCIPAL: PROCESSAR COM A IA REAL ===========
  // =========================================================
  const processarTudo = async () => {
    if (!arquivo || !usuario) {
        alert("Selecione um arquivo.");
        // --- FUNÇÃO QUE ESTÁ FALTANDO ---
  const gerarAbntPorLink = async () => {
      // Verifica se tem link
      if(!linkInput.trim()) {
          alert("Por favor, cole um link antes.");
          return;
      }
      
      setLoadingLink(true);

      try {
          // Chama a API pedindo a referência ABNT
          const res = await fetch('/api/processar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  servicos: ['abnt_link'], 
                  textoLink: linkInput 
              })
          });
          
          const data = await res.json();
          
          if(data.referencia) {
              setReferenciaLinkGerada(data.referencia);
          } else {
              alert("Não foi possível gerar a referência.");
          }
      } catch (e) {
          alert("Erro ao conectar com a IA.");
      } finally {
          setLoadingLink(false);
      }
  };
        return;
    }

    setFase("processando");

    try {
        const { data: existente } = await supabase
            .from('historicos')
            .select('id')
            .eq('user_id', usuario.id)
            .eq('title', arquivo.name)
            .single();

        if (existente) {
            const confirmar = confirm(`O arquivo "${arquivo.name}" já existe!\nDeseja processar novamente?`);
            if (!confirmar) {
                setFase("upload"); setArquivo(null); setMenuAtivo("arquivos"); return;
            }
        }

        const base64 = await converterBase64(arquivo);
        const response = await fetch('/api/processar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileBase64: base64,
                mimeType: arquivo.type,
                modo: PLANO_ATUAL,
                servicos: servicosSelecionados,
                configQuestao: configQuestao
            })
        });

        const dadosIA = await response.json();
        if (dadosIA.error) throw new Error(dadosIA.error);

        // --- NOVA FUNÇÃO: ABRIR ROTEIRO SALVO ---
  const abrirRoteiroSalvo = (item: any) => {
      if (item.slides_data && item.slides_data.roteiro) {
          setRoteiroAtual(item.slides_data.roteiro);
          setReferenciaArquivo(item.slides_data.referencia);
          setMenuAtivo("apresentacao");
      } else {
          alert("Este arquivo não possui roteiro salvo.");
      }
  };

        // 3. Salva no Banco (AQUI ADICIONEI O SALVAMENTO DE SLIDES)
        const { data: novoItem, error: erroSalvar } = await supabase
            .from('historicos')
            .insert({ 
                user_id: usuario.id, 
                title: arquivo.name, 
                resumo: dadosIA.resumo, 
                mermaid: dadosIA.mermaid, 
                modo: PLANO_ATUAL, 
                flashcards_data: dadosIA.flashcards,
                slides_data: { slides: dadosIA.slides, referencias: dadosIA.referencias_abnt } // Salva os slides e ABNT
            })
            .select();

        if (erroSalvar) throw erroSalvar;

        if (novoItem) setHistorico([novoItem[0], ...historico]);
        setFase("upload"); 
        setArquivo(null);

        // --- LÓGICA DE REDIRECIONAMENTO ---
        if (servicosSelecionados.includes("apresentacao") && dadosIA.roteiro_estruturado) {
            setRoteiroAtual(dadosIA.roteiro_estruturado);
            setReferenciaArquivo(dadosIA.referencia_abnt_arquivo);
            setMenuAtivo("apresentacao");
        }
        else if (servicosSelecionados.includes("podcast") && dadosIA.audio_base64) {
             const novoPod = { 
                id: Date.now(), 
                titulo: "Podcast: " + arquivo.name, 
                duracao: "01:00", 
                data: "Agora", 
                url: dadosIA.audio_base64 
            };
            setMeusPodcasts([novoPod, ...meusPodcasts]);
            setMenuAtivo("podcasts");
        }
        else if (servicosSelecionados.includes("questoes") && dadosIA.questoes) {
            let textoChat = `🤖 **Questões Geradas sobre: ${arquivo.name}**\n\n`;
            dadosIA.questoes.forEach((q: any, i: number) => {
                textoChat += `**${i+1}. ${q.enunciado}**\n${q.alternativas.map((a: string) => `• ${a}`).join('\n')}\n\n`;
            });
            setChatMensagens(prev => [...prev, { role: "ai", content: textoChat }]);
            setMenuAtivo("tutor_ia");
        } 
        else if (servicosSelecionados.includes("flashcards") && dadosIA.flashcards) { 
            setMenuAtivo("flashcards"); abrirDeckFlashcards(dadosIA.flashcards); 
        } 
        else if (servicosSelecionados.includes("mapa")) { 
            setMenuAtivo("mapas"); 
        } 
        else if (novoItem) {
            setMenuAtivo("arquivos"); setArquivoLeitura(novoItem[0]); 
        }

    } catch (erro: any) {
        alert("Erro ao processar: " + erro.message);
        setFase("upload");
    }
  };

  // --- AUXILIARES ---
  const fecharPodcast = () => { if(audioRef.current) audioRef.current.pause(); setIsPlaying(false); setPodcastTocando(null); };
  const tocarPodcast = (podcast: any) => {
    if (podcastTocando?.id === podcast.id) { if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false); } else { audioRef.current?.play(); setIsPlaying(true); } } else { setPodcastTocando(podcast); setIsPlaying(true); setTimeout(() => { if(audioRef.current) audioRef.current.play().catch(e => console.log("Erro play:", e)); }, 100); }
  };
  
  // Função para atualizar senha
  const atualizarSenha = async () => { if (novaSenha.length < 6) { alert("Mínimo 6 caracteres."); return; } setLoadingSenha(true); try { await supabase.auth.updateUser({ password: novaSenha }); alert("Senha atualizada!"); setNovaSenha(""); } catch (e) { alert("Erro ao atualizar."); } finally { setLoadingSenha(false); } };

  // --- MUDANÇA AQUI: VOLTOU A SER UM ALERTA SIMPLES ---
  const gerenciarPlano = () => {
      alert(`Plano atual: ${PLANO_ATUAL.toUpperCase()}\nRenovação em: 30/01/2026`);
  };

  // --- NOVA FUNÇÃO: ABRIR SLIDES SALVOS ---
  const abrirSlidesSalvos = (item: any) => {
      if (item.slides_data && item.slides_data.slides) {
          setSlidesAtuais(item.slides_data.slides);
          setReferenciasABNT(item.slides_data.referencias);
          setMenuAtivo("apresentacao");
      } else {
          alert("Este arquivo não tem apresentação gerada.");
      }
  };

  // =========================================================
  // === NOVAS FUNÇÕES: EDIÇÃO E EXPORTAÇÃO =================
  // =========================================================

  // 1. Atualizar conteúdo ao digitar (Edição)
  const atualizarSlideAtual = (campo: string, valor: any, indexTopico?: number) => {
    const novosSlides = [...slidesAtuais];
    if (campo === "titulo") novosSlides[slideIndex].titulo = valor;
    else if (campo === "imagem") novosSlides[slideIndex].imagem = valor; // Salva imagem
    else if (campo === "roteiro") novosSlides[slideIndex].roteiro_fala = valor;
    else if (campo === "topico" && typeof indexTopico === 'number') novosSlides[slideIndex].topicos[indexTopico] = valor;
    setSlidesAtuais(novosSlides);
  };

  // --- NOVA FUNÇÃO: ADICIONAR SLIDE VAZIO MANUALMENTE ---
  const adicionarNovoSlide = () => {
      const novoSlide = {
          tipo: "conteudo",
          titulo: "Novo Título",
          topicos: ["Clique para editar o tópico"],
          imagem: null,
          roteiro_fala: ""
      };
      // Adiciona após o slide atual
      const novosSlides = [...slidesAtuais];
      novosSlides.splice(slideIndex + 1, 0, novoSlide);
      setSlidesAtuais(novosSlides);
      setSlideIndex(slideIndex + 1); // Vai para o novo slide
  };

  // --- NOVA FUNÇÃO: UPLOAD DE IMAGEM PARA O SLIDE ---
  const handleImagemSlideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const base64 = await converterBase64(file);
      atualizarSlideAtual("imagem", base64);
  };

  // 3. Baixar PPTX (Com Design)
  const baixarPPTX = () => {
      const pres = new PptxGenJS();
      pres.title = slidesAtuais[0]?.titulo || "Apresentação";

      slidesAtuais.forEach((slide) => {
          let slidePPT = pres.addSlide();
          
          // Lógica de Design por Tipo de Slide
          if (slide.tipo === "capa") {
              slidePPT.background = { color: "1e3a8a" }; // blue-900
              slidePPT.color = "FFFFFF";
          } 
          else if (slide.tipo === "final") {
              slidePPT.background = { color: "2563eb" }; // blue-600
              slidePPT.color = "FFFFFF";
          } 
          else {
              slidePPT.background = { color: "FFFFFF" };
              slidePPT.color = "000000";
              // Barra lateral azul apenas no conteudo
              slidePPT.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '15%', h: '100%', fill: { color: '1e3a8a' } });
          }

          // Título
          slidePPT.addText(slide.titulo, { 
              x: slide.tipo === 'conteudo' ? '18%' : 0.5, 
              y: 0.5, 
              w: '80%', 
              fontSize: slide.tipo === 'capa' ? 44 : 32, 
              bold: true, 
              color: slide.tipo === 'conteudo' ? '1e3a8a' : 'FFFFFF',
              align: slide.tipo === 'conteudo' ? 'left' : 'center'
          });

          // Imagem
          if (slide.imagem) {
              slidePPT.addImage({ data: slide.imagem, x: '60%', y: 1.5, w: 3, h: 3 });
          }

          // Tópicos
          let textoTopicos = slide.topicos.map((t: string) => ({ text: t, options: { bullet: slide.tipo === 'conteudo' } }));
          slidePPT.addText(textoTopicos, { 
              x: slide.tipo === 'conteudo' ? '18%' : 0.5, 
              y: 1.8, 
              w: slide.imagem ? '40%' : '75%', 
              h: 4, 
              fontSize: 18, 
              color: slide.tipo === 'conteudo' ? '333333' : 'EEEEEE',
              align: slide.tipo === 'conteudo' ? 'left' : 'center'
          });

          slidePPT.addNotes(slide.roteiro_fala);
      });
      pres.writeFile({ fileName: `Apresentacao.pptx` });
  };

  // 4. Baixar PDF (Com Design)
  const baixarPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    
    slidesAtuais.forEach((slide, index) => {
        if (index > 0) doc.addPage();

        if (slide.tipo === "capa") {
            // Capa: Fundo Azul
            doc.setFillColor(30, 58, 138); // RGB Blue 900
            doc.rect(0, 0, 297, 210, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(30);
            doc.text(doc.splitTextToSize(slide.titulo, 250), 148, 80, { align: "center" });
            doc.setFontSize(14);
            slide.topicos.forEach((t:string, i:number) => doc.text(t, 148, 110 + (i*10), { align: "center" }));
        } 
        else if (slide.tipo === "final") {
            // Final: Fundo Azul Mais Claro
            doc.setFillColor(37, 99, 235); // RGB Blue 600
            doc.rect(0, 0, 297, 210, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(40);
            doc.text(slide.titulo, 148, 90, { align: "center" });
            doc.setFontSize(14);
            slide.topicos.forEach((t:string, i:number) => doc.text(t, 148, 120 + (i*10), { align: "center" }));
        } 
        else {
            // Conteúdo: Barra Lateral
            doc.setFillColor(30, 58, 138);
            doc.rect(0, 0, 40, 210, 'F'); // Barra lateral esquerda

            doc.setTextColor(30, 58, 138);
            doc.setFontSize(24);
            doc.text(slide.titulo, 50, 30);
            
            // Imagem
            if (slide.imagem) {
                try {
                    doc.addImage(slide.imagem, "JPEG", 200, 50, 80, 60);
                } catch(e){}
            }

            doc.setTextColor(50, 50, 50);
            doc.setFontSize(14);
            let yPos = 60;
            const maxW = slide.imagem ? 140 : 230;
            
            slide.topicos.forEach((topico: string) => {
                const txt = doc.splitTextToSize(`• ${topico}`, maxW);
                doc.text(txt, 50, yPos);
                yPos += (8 * txt.length) + 5;
            });
        }
    });
    doc.save("Apresentacao.pdf");
  };

  const copiarReferencia = () => {
      navigator.clipboard.writeText(referenciasABNT);
      alert("Referência copiada!");
  };

  // --- RENDERIZAÇÃO ---
  const renderizarConteudo = () => {
    if (loading) return <div className="p-10 text-slate-400 animate-pulse flex items-center justify-center h-full">Carregando painel...</div>;

    switch (menuAtivo) {
      case "inicio":
        return (
          <div className="animate-in fade-in duration-500 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <CardStat icone="📚" numero={historico.length} texto="Arquivos" cor="blue" />
              <CardStat icone="🖥️" numero={historico.filter(h => h.slides_data).length} texto="Apresentações" cor="orange" />
              <CardStat icone="💬" numero={stats.questoesFeitas} texto="Questões" cor="purple" />
            </div>
            
            <h3 className="text-lg font-bold mb-4 text-slate-300">Acesso Rápido</h3>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex items-center justify-between hover:border-blue-500/50 transition cursor-pointer mb-10" onClick={() => { setMenuAtivo("upload"); setFase("upload"); setArquivo(null); }}>
               <div className="flex items-center gap-4"><div className="h-12 w-12 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center text-2xl">🚀</div><div><h4 className="font-bold text-white">Novo Projeto</h4><p className="text-sm text-slate-400">PDF, Áudio ou Imagem</p></div></div><div className="text-blue-400 font-bold text-2xl">→</div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-2 flex items-center gap-2">💡 Dúvidas ou Sugestões?</h3>
                <p className="text-slate-400 text-sm mb-4">Sua opinião é fundamental para melhorarmos o FocaLab. Envie sua mensagem para nossa equipe.</p>
                <div className="flex flex-col gap-4">
                    <textarea 
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none resize-none transition"
                        rows={3}
                        placeholder="Escreva sua dúvida ou sugestão aqui..."
                        value={sugestaoTexto}
                        onChange={(e) => setSugestaoTexto(e.target.value)}
                        disabled={enviandoSugestao}
                    />
                    <div className="flex justify-end">
                        <button 
                          onClick={enviarSugestao} 
                          disabled={enviandoSugestao}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {enviandoSugestao ? "Enviando..." : "Enviar Mensagem ➤"}
                        </button>
                    </div>
                </div>
            </div>
          </div>
        );

      case "upload":
        return (
          <div className="animate-in zoom-in duration-300 max-w-4xl mx-auto pb-20">
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-2xl font-bold">Novo Projeto</h2>
               <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase border border-blue-600/30">Plano {PLANO_ATUAL}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
               {fase === "upload" && (
                   <div className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center hover:border-blue-500 transition cursor-pointer relative bg-slate-950/50 group animate-in fade-in">
                       <input 
                          type="file" 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50" 
                          accept=".pdf,.docx,.txt,image/*,audio/*" 
                          onChange={handleArquivoSelecionado} 
                       />
                       <div className="text-5xl mb-4 group-hover:scale-110 transition relative z-10">☁️</div>
                       <p className="font-bold text-xl text-white relative z-10">Clique para carregar seu material</p>
                       <p className="text-sm text-slate-500 mt-2 relative z-10">PDF, DOCX, Imagem ou Áudio</p>
                   </div>
               )}
               {fase === "opcoes" && arquivo && (
                   <div className="animate-in slide-in-from-bottom-5">
                       <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-800">
                            <div className="flex items-center gap-3"><div className="text-3xl">{arquivo.type.includes("audio") ? "🎤" : "📄"}</div><div><h3 className="font-bold text-lg text-white">{arquivo.name}</h3></div></div>
                            <button onClick={() => {setArquivo(null); setFase("upload")}} className="text-sm text-red-400 hover:underline">Cancelar</button>
                       </div>
                       <h4 className="text-slate-300 font-bold mb-4">O que você quer gerar?</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                           {/* --- OPÇÃO NOVA DE APRESENTAÇÃO --- */}
                           <ServicoCard id="apresentacao" icon="🖥️" titulo={<span translate="no">Apresentação</span>} desc="Roteiro + Normas ABNT." selecionado={servicosSelecionados.includes("apresentacao")} onClick={() => toggleServico("apresentacao")} />
                           
                           <ServicoCard id="resumo" icon="📝" titulo="Resumo" desc="Vai para 'Meus Arquivos'." selecionado={servicosSelecionados.includes("resumo")} onClick={() => toggleServico("resumo")} />
                           <ServicoCard id="mapa" icon="🧠" titulo="Mapa Mental" desc="Vai para 'Galeria'." selecionado={servicosSelecionados.includes("mapa")} onClick={() => toggleServico("mapa")} />
                           <ServicoCard id="podcast" icon="🎧" titulo="Podcast AI" desc="Gera um Áudio com Voz Real." selecionado={servicosSelecionados.includes("podcast")} onClick={() => toggleServico("podcast")} />
                           
                           <ServicoCard id="flashcards" icon="🃏" titulo={<span translate="no">Flashcards</span>} desc="Vai para 'Decks'." selecionado={servicosSelecionados.includes("flashcards")} onClick={() => toggleServico("flashcards")} />
                           
                           <ServicoCard id="questoes" icon="❓" titulo="Questões" desc="Vai para 'Tutor IA'." selecionado={servicosSelecionados.includes("questoes")} onClick={() => toggleServico("questoes")} />
                       </div>
                       {servicosSelecionados.includes("questoes") && (
                           <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl p-6 mb-8 animate-in zoom-in-95 duration-300">
                               <h4 className="font-bold text-blue-400 mb-4 flex items-center gap-2">⚙️ Configurar Questões</h4>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                   <div><label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Estilo da Prova</label><div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">{['aberta', 'fechada', 'mista'].map((tipo) => (<button key={tipo} onClick={() => setConfigQuestao({...configQuestao, tipo: tipo})} className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition ${configQuestao.tipo === tipo ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"}`}>{tipo}</button>))}</div></div>
                                   <div><label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Nível de Dificuldade</label><div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">{['facil', 'medio', 'dificil'].map((dif) => (<button key={dif} onClick={() => setConfigQuestao({...configQuestao, dificuldade: dif})} className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition ${configQuestao.dificuldade === dif ? "bg-orange-600 text-white shadow" : "text-slate-400 hover:text-white"}`}>{dif}</button>))}</div></div>
                               </div>
                           </div>
                       )}
                       <button onClick={processarTudo} disabled={servicosSelecionados.length === 0} className={`w-full py-4 rounded-xl font-bold text-lg transition shadow-lg ${servicosSelecionados.length === 0 ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>{servicosSelecionados.length === 0 ? "Selecione algo" : "Gerar com IA Real 🚀"}</button>
                   </div>
               )}
               {fase === "processando" && (<div className="py-20 text-center animate-pulse"><div className="text-5xl mb-4">🔮</div><h3 className="text-xl font-bold">A IA está criando...</h3><p className="text-slate-400">Isso pode levar alguns segundos.</p></div>)}
            </div>
          </div>
        );

      // --- TELA DE APRESENTAÇÃO MODIFICADA (SEM SIMULAÇÃO DE TEMA) ---
      case "apresentacao":
        return (
            <div className="animate-in fade-in slide-in-from-right-10 duration-500 h-full flex flex-col pb-20">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold">🗣️ Roteiro & ABNT</h2>
                        <p className="text-slate-400 text-sm">O que falar e como referenciar.</p>
                    </div>
                    <button onClick={() => setMenuAtivo("inicio")} className="text-slate-400 hover:text-white">Fechar</button>
                </div>

                <div className="grid md:grid-cols-2 gap-8 h-full overflow-hidden">
                    {/* ESQUERDA: O ROTEIRO GERADO DO ARQUIVO */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 overflow-y-auto custom-scrollbar flex flex-col">
                        <div className="mb-8">
                            <h3 className="text-blue-400 font-bold mb-2 uppercase text-xs tracking-wider">📢 Introdução</h3>
                            <div className="text-slate-300 text-lg leading-relaxed whitespace-pre-wrap">{roteiroAtual?.introducao || "..."}</div>
                        </div>
                        <div className="mb-8">
                            <h3 className="text-blue-400 font-bold mb-2 uppercase text-xs tracking-wider">🧠 Desenvolvimento</h3>
                            <div className="text-slate-300 text-lg leading-relaxed whitespace-pre-wrap">{roteiroAtual?.desenvolvimento || "..."}</div>
                        </div>
                        <div className="mb-8">
                            <h3 className="text-blue-400 font-bold mb-2 uppercase text-xs tracking-wider">🏁 Conclusão</h3>
                            <div className="text-slate-300 text-lg leading-relaxed whitespace-pre-wrap">{roteiroAtual?.conclusao || "..."}</div>
                        </div>
                        <div className="mt-auto pt-6 border-t border-slate-800">
                            <p className="text-xs text-slate-500 font-bold mb-1 uppercase">Referência deste Arquivo (ABNT):</p>
                            <div className="bg-black/20 p-3 rounded text-green-400 font-mono text-xs select-all">
                                {referenciaArquivo || "Gerando..."}
                            </div>
                        </div>
                    </div>

                    {/* DIREITA: FERRAMENTA ABNT POR LINK */}
                    <div className="flex flex-col gap-6">
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">🔗 Gerador ABNT por Link</h3>
                            <p className="text-slate-400 text-sm mb-4">Cole o link de um site, artigo ou notícia e a IA formata a referência.</p>
                            <div className="flex gap-2 mb-4">
                                <input type="text" placeholder="https://site.com/artigo..." className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm outline-none focus:border-green-500 transition" value={linkInput} onChange={(e) => setLinkInput(e.target.value)} />
                                <button onClick={gerarAbntPorLink} disabled={loadingLink} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition disabled:opacity-50">{loadingLink ? "..." : "Gerar"}</button>
                            </div>
                            {referenciaLinkGerada && (
                                <div className="animate-in zoom-in">
                                    <textarea readOnly className="w-full h-32 bg-black/30 border border-green-500/30 rounded-lg p-3 text-slate-300 font-mono text-sm resize-none focus:outline-none" value={referenciaLinkGerada} />
                                    <button onClick={() => {navigator.clipboard.writeText(referenciaLinkGerada); alert("Copiado!");}} className="mt-2 w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded text-xs font-bold transition">Copiar Referência</button>
                                </div>
                            )}
                        </div>
                        <div className="bg-blue-900/10 border border-blue-500/20 p-6 rounded-2xl flex-1">
                            <h4 className="font-bold text-blue-400 mb-3">Dicas para Apresentar</h4>
                            <ul className="space-y-2 text-sm text-slate-400">
                                <li>• Não leia o roteiro, use como guia.</li>
                                <li>• Respire entre os tópicos.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        );
          
      case "tutor_ia":
          return (
              <div className="animate-in fade-in slide-in-from-right-10 duration-500 h-[calc(100vh-140px)] flex flex-col">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">💬 Tutor IA</h2>
                  <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-y-auto mb-4 custom-scrollbar flex flex-col gap-4" ref={chatScrollRef}>
                      {chatMensagens.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"}`}>
                                  <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{msg.content}</div>
                              </div>
                          </div>
                      ))}
                      {isTyping && (<div className="flex justify-start animate-pulse"><div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-700 text-slate-500 text-sm">Digitando...</div></div>)}
                  </div>
                  <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-2 flex gap-2 relative transition-all duration-300 ${podcastTocando ? "mb-24 shadow-2xl border-purple-500/30" : ""}`}>
                      <input type="text" placeholder="Responda ou tire dúvidas..." className="flex-1 bg-transparent text-white p-3 outline-none" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && enviarMensagemChat()} />
                      <button onClick={enviarMensagemChat} className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition">➤</button>
                  </div>
              </div>
          );

      case "podcasts":
        return (<div className="animate-in fade-in slide-in-from-right-10 duration-500 pb-20"><div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold">🎧 Estante de Podcasts</h2><button onClick={() => {setMenuAtivo("upload"); setFase("upload");}} className="bg-purple-600/20 text-purple-400 px-3 py-1 rounded-lg text-xs font-bold hover:bg-purple-600 hover:text-white transition">Gerar Novo</button></div><div className="grid gap-4">{meusPodcasts.length === 0 && <p className="text-slate-500">Nenhum podcast gerado.</p>}{meusPodcasts.map((pod) => (<div key={pod.id} className={`bg-slate-900 border ${podcastTocando?.id === pod.id ? "border-purple-500 bg-purple-900/10" : "border-slate-800"} p-5 rounded-xl hover:border-purple-500/50 transition flex justify-between items-center group`}><div className="flex items-center gap-5"><button onClick={() => tocarPodcast(pod)} className={`h-12 w-12 rounded-full flex items-center justify-center text-xl shadow-lg transition ${podcastTocando?.id === pod.id && isPlaying ? "bg-purple-500 text-white" : "bg-slate-800 text-purple-400 group-hover:bg-purple-500 group-hover:text-white"}`}>{podcastTocando?.id === pod.id && isPlaying ? "⏸" : "▶"}</button><div><h4 className={`font-bold ${podcastTocando?.id === pod.id ? "text-purple-400" : "text-white"}`}>{pod.titulo}</h4><p className="text-xs text-slate-500 flex gap-3 mt-1"><span>🕒 {pod.duracao}</span><span>📅 {pod.data}</span></p></div></div></div>))}</div></div>);

      case "arquivos":
        return (
            <div className="animate-in fade-in slide-in-from-right-10 duration-500 pb-20">
                {arquivoLeitura ? (
                    <div className="h-full flex flex-col">
                        <div className="flex items-center gap-4 mb-6">
                            <button onClick={() => setArquivoLeitura(null)} className="text-slate-400 hover:text-white">← Voltar</button>
                            <h2 className="text-xl font-bold truncate">{arquivoLeitura.title}</h2>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 overflow-y-auto custom-scrollbar flex-1">
                             <h3 className="text-blue-400 font-bold mb-4 uppercase text-sm tracking-wider">Resumo Gerado</h3>
                             <div className="prose prose-invert prose-lg max-w-none text-slate-300" dangerouslySetInnerHTML={{ __html: arquivoLeitura.resumo || "<p>Conteúdo não disponível em texto.</p>" }} />
                        </div>
                    </div>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold mb-6">Meus Arquivos (Resumos)</h2>
                        <div className="grid gap-4">
                            {historico.length === 0 && <p className="text-slate-500">Nenhum arquivo salvo.</p>}
                            {historico.map((item) => (
                                <div key={item.id} onClick={() => {if(item.slides_data) abrirSlidesSalvos(item); else setArquivoLeitura(item);}} className="bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-blue-500 transition flex justify-between items-center cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        {/* Ícone muda se for apresentação */}
                                        <div className="h-12 w-12 bg-slate-800 group-hover:bg-blue-900/30 rounded-lg flex items-center justify-center text-2xl transition">{item.slides_data ? '🖥️' : '📄'}</div>
                                        <div><h4 className="font-bold text-white group-hover:text-blue-400 transition">{item.title}</h4><p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString()}</p></div>
                                    </div>
                                    <button className="text-blue-400 text-sm hover:underline">{item.slides_data ? 'Ver Apresentação' : 'Ler Resumo'}</button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );

      case "mapas": 
        return (
            <div className="animate-in fade-in slide-in-from-right-10 duration-500 pb-20">
                <h2 className="text-2xl font-bold mb-6">Galeria de Mapas Mentais 🧠</h2>
                <div className="grid md:grid-cols-2 gap-6">
                    {historico.filter(i => i.mermaid).length === 0 && <p className="text-slate-500">Nenhum mapa mental gerado.</p>}
                    {historico.filter(i => i.mermaid).map((item) => (
                        <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-purple-500 transition">
                            <h4 className="font-bold text-white mb-2">{item.title}</h4>
                            <div className="mermaid bg-slate-950 p-4 rounded-lg overflow-x-auto text-sm flex justify-center">
                                {item.mermaid}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
      
      case "flashcards":
        return (
            <div className="animate-in fade-in slide-in-from-right-10 duration-500 pb-20">
                {!modoJogoAtivo ? (
                    <>
                          {/* --- PROTEÇÃO NO TÍTULO --- */}
                          <h2 className="text-2xl font-bold mb-6">Meus Decks de <span translate="no">Flashcards</span> 🃏</h2>
                          <div className="grid md:grid-cols-3 gap-6">
                            {historico.filter(h => h.flashcards_data).length === 0 && <p className="text-slate-500 col-span-3">Nenhum deck criado ainda.</p>}
                            {historico.filter(h => h.flashcards_data).map((item) => (
                                <div key={item.id} onClick={() => abrirDeckFlashcards(item.flashcards_data)} className="aspect-[3/4] bg-slate-900 border border-slate-800 hover:border-orange-500 rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded-bl-lg">NOVO</div>
                                    <div className="text-4xl">🗂️</div>
                                    <div>
                                        <h4 className="font-bold text-white text-lg leading-tight mb-2 group-hover:text-orange-400 transition">{item.title}</h4>
                                        <p className="text-sm text-slate-500">{item.flashcards_data.length} cartas</p>
                                    </div>
                                    <button className="w-full bg-slate-800 group-hover:bg-orange-600 text-white py-2 rounded-lg font-bold text-sm transition mt-4">Praticar</button>
                                </div>
                            ))}
                          </div>
                    </>
                ) : (
                    <div className="max-w-4xl mx-auto flex flex-col items-center">
                        <div className="w-full flex justify-between items-center mb-6">
                            <button onClick={sairDoJogoFlashcards} className="text-slate-400 hover:text-white flex items-center gap-2">← Voltar para Estante</button>
                            <span className="text-orange-400 font-bold">Carta {cardIndex + 1} / {flashcards.length}</span>
                        </div>
                        {!fimFlashcards ? (
                           <div className="w-full max-w-lg perspective-1000">
                               <div onClick={virarCarta} className={`relative w-full aspect-[16/9] cursor-pointer transition-all duration-500 transform-style-3d ${cardVirado ? "rotate-y-180" : ""}`} style={{ transformStyle: 'preserve-3d', transform: cardVirado ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: 'transform 0.6s' }}>
                                   <div className="absolute inset-0 bg-slate-800 border-2 border-slate-700 rounded-2xl flex items-center justify-center p-8 text-center backface-hidden shadow-2xl" style={{ backfaceVisibility: 'hidden' }}><div><p className="text-slate-400 text-sm uppercase tracking-widest mb-4">Pergunta</p><h3 className="text-2xl font-bold text-white leading-relaxed">{flashcards[cardIndex].pergunta}</h3><p className="text-slate-500 text-xs mt-8">(Clique para virar)</p></div></div>
                                   <div className="absolute inset-0 bg-slate-950 border-2 border-orange-500/50 rounded-2xl flex items-center justify-center p-8 text-center backface-hidden shadow-2xl" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}><div><p className="text-orange-400 text-sm uppercase tracking-widest mb-4">Resposta</p><h3 className="text-xl text-slate-200 leading-relaxed">{flashcards[cardIndex].resposta}</h3></div></div>
                               </div>
                               {cardVirado && (<div className="flex gap-4 mt-8 animate-in slide-in-from-bottom-4"><button onClick={() => proximoCard(false)} className="flex-1 bg-red-900/20 border border-red-900/50 text-red-400 py-3 rounded-xl font-bold hover:bg-red-900/40 transition">Errei</button><button onClick={() => proximoCard(true)} className="flex-1 bg-green-900/20 border border-green-900/50 text-green-400 py-3 rounded-xl font-bold hover:bg-green-900/40 transition">Acertei!</button></div>)}
                           </div>
                        ) : (
                           <div className="text-center animate-in zoom-in"><div className="text-6xl mb-4">🎉</div><h3 className="text-2xl font-bold text-white mb-2">Deck Concluído!</h3><div className="flex gap-4 justify-center mt-6"><button onClick={reiniciarFlashcards} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-bold transition">Revisar Novamente</button><button onClick={sairDoJogoFlashcards} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold transition">Escolher Outro Deck</button></div></div>
                        )}
                    </div>
                )}
            </div>
        );

      case "desempenho": 
        return (
            <div className="animate-in fade-in slide-in-from-right-10 duration-500 pb-20">
                <h2 className="text-2xl font-bold mb-6">Meu Desempenho 📈</h2>
                
                {/* Métricas Principais */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">📝</div>
                        <h4 className="text-slate-400 mb-2 font-bold">Questões Resolvidas</h4>
                        <div className="text-4xl font-bold text-white">{stats.questoesFeitas}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🎯</div>
                        <h4 className="text-slate-400 mb-2 font-bold">Taxa de Acerto</h4>
                        <div className={`text-4xl font-bold ${stats.questoesFeitas > 0 && (stats.acertos/stats.questoesFeitas) > 0.7 ? "text-green-400" : "text-orange-400"}`}>
                            {stats.questoesFeitas > 0 ? Math.round((stats.acertos / stats.questoesFeitas) * 100) : 0}%
                        </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">⏳</div>
                        <h4 className="text-slate-400 mb-2 font-bold">Tempo de Foco</h4>
                        <div className="text-4xl font-bold text-white">{formatarTempo(stats.segundosEstudados)}</div>
                    </div>
                </div>

                {/* GRÁFICO E SELETOR DE SEMANA */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl">
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2">⚠️ Pontos de Atenção <span className="text-xs text-slate-500 font-normal">(Baseado nos seus erros no Chat)</span></h3>
                        {stats.assuntosFracos.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">
                                <p>Tudo certo por enquanto! 🎉</p>
                                <p className="text-xs mt-2">Continue praticando no Tutor IA.</p>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {stats.assuntosFracos.map((assunto, i) => (
                                    <li key={i} className="bg-red-900/10 border border-red-900/30 p-4 rounded-lg flex justify-between items-center text-red-200">
                                        <span>{assunto}</span>
                                        <button onClick={() => setMenuAtivo("tutor_ia")} className="text-xs bg-red-900/30 px-2 py-1 rounded hover:bg-red-900/50 transition">Praticar</button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Gráfico Simples com Seletor */}
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl flex flex-col justify-center items-center relative">
                        <div className="flex items-center gap-4 mb-6 self-start">
                            <h3 className="font-bold text-lg">Progresso</h3>
                            <div className="flex bg-slate-800 rounded-lg p-1">
                                <button className="px-2 text-slate-400 hover:text-white" onClick={() => setSemanaSelecionada("Semana Passada")}>←</button>
                                <span className="px-3 text-sm font-bold text-white">{semanaSelecionada}</span>
                                <button className="px-2 text-slate-400 hover:text-white" onClick={() => setSemanaSelecionada("Esta Semana")}>→</button>
                            </div>
                        </div>
                        
                        <div className="flex items-end gap-4 h-48 w-full px-4 border-b border-slate-800 pb-2">
                            {progressoSemanal.map((h, i) => (
                                <div key={i} className="flex-1 bg-blue-900/30 rounded-t-lg relative group hover:bg-blue-600 transition-all duration-300" style={{ height: `${Math.min(h, 100)}%` }}>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">{h}% Acertos</div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between w-full mt-2 text-xs text-slate-500 font-bold uppercase">
                            <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span><span>Dom</span>
                        </div>
                    </div>
                </div>
            </div>
        );

      case "perfil": return (
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-5 pb-20">
                <h2 className="text-2xl font-bold mb-6">Minha Conta</h2>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-8">
                    <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-800">
                        <div className="h-24 w-24 rounded-full flex items-center justify-center text-4xl font-bold text-white border-4 border-slate-950 shadow-lg overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 relative">
                            {/* --- MOSTRA A FOTO CARREGADA OU A INICIAL --- */}
                            {fotoPreview ? <img src={fotoPreview} className="w-full h-full object-cover" /> : usuario?.email?.charAt(0).toUpperCase()}
                            {uploadingFoto && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div></div>}
                        </div>
                        <div>
                            {/* --- INPUT DE ARQUIVO ESCONDIDO --- */}
                            <input type="file" ref={fileInputRef} onChange={trocarFotoLocalmente} className="hidden" accept="image/*" />
                            <button onClick={acionarInputFoto} disabled={uploadingFoto} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition border border-slate-700">
                                {uploadingFoto ? "Enviando..." : "📷 Alterar Foto"}
                            </button>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Nome</label>
                            <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white" defaultValue={usuario?.user_metadata?.display_name || ""} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Email</label>
                            <input type="email" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-500" value={usuario?.email} disabled />
                        </div>

                        {/* --- SEGURANÇA E PLANO --- */}
                        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                            <h4 className="text-sm font-bold text-white mb-3">Segurança</h4>
                            <div className="flex gap-2">
                                <input type="password" placeholder="Nova senha" className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
                                <button onClick={atualizarSenha} disabled={loadingSenha} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm border border-slate-700">{loadingSenha ? "..." : "Mudar"}</button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Plano</label>
                            <div className="flex items-center justify-between bg-blue-900/20 border border-blue-900/50 p-4 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🎓</span>
                                    <div><p className="font-bold text-blue-400 capitalize">{PLANO_ATUAL}</p></div>
                                </div>
                                <button onClick={gerenciarPlano} className="text-xs text-blue-400 hover:underline">Gerenciar</button>
                            </div>
                        </div>

                        {/* --- BOTÃO DE SAIR --- */}
                        <div className="pt-6 mt-6 border-t border-slate-800">
                            <button onClick={sairDaConta} className="w-full py-3 rounded-xl border border-red-900/30 text-red-400 hover:bg-red-900/10 transition flex items-center justify-center gap-2">
                                🚪 Sair da Conta
                            </button>
                        </div>
                    </div>
                </div>
            </div>
      );
      
      default: return <div>Carregando...</div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white font-sans">
      {/* --- MUDANÇA AQUI: Adicionei overflow-y-auto e custom-scrollbar PARA A BARRA DE ROLAGEM --- */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 hidden md:flex flex-col p-6 fixed h-full z-10 overflow-y-auto custom-scrollbar">
        
        {/* --- PROTEÇÃO NO TÍTULO FOCALAB DA BARRA LATERAL --- */}
        <div translate="no" className="notranslate flex items-center gap-2 mb-10 text-xl font-bold tracking-tighter cursor-pointer hover:opacity-80 transition" onClick={() => setMenuAtivo("inicio")}><span>🦭</span> Foca<span className="text-blue-500">Lab</span></div>
        
        <nav className="flex-1 space-y-2">
          <BotaoMenu icone="🏠" texto="Visão Geral" ativo={menuAtivo === "inicio"} onClick={() => setMenuAtivo("inicio")} />
          <BotaoMenu icone="🚀" texto="Novo Projeto" ativo={menuAtivo === "upload"} onClick={() => {setMenuAtivo("upload"); setFase("upload"); setArquivo(null);}} />
          
          <BotaoMenu icone="🖥️" texto="Apresentações" ativo={menuAtivo === "apresentacao"} onClick={() => setMenuAtivo("apresentacao")} />
          
          <BotaoMenu icone="🎧" texto="Podcasts" ativo={menuAtivo === "podcasts"} onClick={() => setMenuAtivo("podcasts")} />
          <BotaoMenu icone="📂" texto="Meus Arquivos" ativo={menuAtivo === "arquivos"} onClick={() => setMenuAtivo("arquivos")} />
          
          {/* --- PROTEÇÃO NO MENU FLASHCARDS --- */}
          <BotaoMenu icone="🃏" texto={<span translate="no">Flashcards</span>} ativo={menuAtivo === "flashcards"} onClick={() => setMenuAtivo("flashcards")} />
          
          <BotaoMenu icone="🧠" texto="Mapas Mentais" ativo={menuAtivo === "mapas"} onClick={() => setMenuAtivo("mapas")} />
          <BotaoMenu icone="💬" texto="Tutor IA" ativo={menuAtivo === "tutor_ia"} onClick={() => setMenuAtivo("tutor_ia")} />
          <BotaoMenu icone="📈" texto="Desempenho" ativo={menuAtivo === "desempenho"} onClick={() => setMenuAtivo("desempenho")} />
          <div className="pt-4 border-t border-slate-800 mt-4"><BotaoMenu icone="⚙️" texto="Configurações" ativo={menuAtivo === "perfil"} onClick={() => setMenuAtivo("perfil")} /></div>
        </nav>
      </aside>

      <main className="flex-1 p-8 md:ml-64 min-h-screen relative flex flex-col">
        <header className="flex justify-between items-center mb-10">
          
          {/* --- PROTEÇÃO NO TÍTULO DASHBOARD --- */}
          <div><h1 className="text-2xl font-bold" translate="no">Dashboard</h1><p className="text-slate-400 text-sm">Foco total, {usuario?.user_metadata?.display_name || "Mestre"}.</p></div>
          
          <div className="flex items-center gap-4 relative">
            <div className="relative">
                <button onClick={() => setMenuPerfilAberto(!menuPerfilAberto)} className="h-10 w-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center font-bold text-white shadow-lg border-2 border-slate-900 cursor-pointer overflow-hidden">{fotoPreview ? <img src={fotoPreview} className="w-full h-full object-cover" /> : usuario?.email?.charAt(0).toUpperCase()}</button>
                {menuPerfilAberto && <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50"><button onClick={sairDaConta} className="w-full text-left px-4 py-3 text-sm hover:bg-red-900/20 text-red-400 transition">Sair</button></div>}
            </div>
          </div>
        </header>

        {/* --- CONTEÚDO PRINCIPAL --- */}
        <div className="flex-1">
            {renderizarConteudo()}
        </div>

        {/* --- RODAPÉ FOI REMOVIDO DAQUI E ESTÁ NA PÁGINA INICIAL --- */}
      </main>

      {podcastTocando && (
          <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-slate-900 border-t border-slate-800 p-4 shadow-2xl z-50 animate-in slide-in-from-bottom-5">
              <button onClick={fecharPodcast} className="absolute -top-4 right-4 bg-red-600 hover:bg-red-700 text-white rounded-full h-8 w-8 flex items-center justify-center shadow-lg transition border-2 border-slate-900" title="Fechar Player">✖</button>
              <audio ref={audioRef} src={podcastTocando.url} onEnded={() => setIsPlaying(false)} className="hidden"></audio>
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                  <div className="flex items-center gap-4"><div className="h-12 w-12 bg-purple-600 rounded-lg flex items-center justify-center text-2xl animate-pulse">🎧</div><div><p className="font-bold text-white text-sm">{podcastTocando.titulo}</p><p className="text-xs text-purple-400">Tocando agora • FocaLab Audio</p></div></div>
                  <div className="flex items-center gap-4"><button className="text-slate-400 hover:text-white">⏮</button><button onClick={() => tocarPodcast(podcastTocando)} className="h-10 w-10 bg-white text-slate-900 rounded-full flex items-center justify-center font-bold hover:scale-105 transition">{isPlaying ? "⏸" : "▶"}</button><button className="text-slate-400 hover:text-white">⏭</button></div>
              </div>
          </div>
      )}
    </div>
  );
}

// Componentes
function BotaoMenu({ icone, texto, ativo, onClick }: any) { return <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${ativo ? "bg-blue-600/10 text-blue-400 border border-blue-600/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}><span>{icone}</span> {texto}</button>; }
function CardStat({ icone, numero, texto, cor }: any) { 
    const cores: any = { blue: "bg-blue-500/10 text-blue-400 border-blue-500/20", purple: "bg-purple-500/10 text-purple-400 border-purple-500/20", orange: "bg-orange-500/10 text-orange-400 border-orange-500/20" }; 
    return <div className={`p-6 rounded-2xl border ${cores[cor] || cores.blue} flex items-center gap-4`}><div className="text-3xl">{icone}</div><div><div className="text-2xl font-bold text-white">{numero}</div><div className="text-xs opacity-80">{texto}</div></div></div>; 
}
function ServicoCard({ id, icon, titulo, desc, selecionado, onClick, disabled }: any) { return <div onClick={disabled ? undefined : onClick} className={`p-4 rounded-xl border-2 transition cursor-pointer flex items-center gap-4 ${disabled ? "opacity-50 cursor-not-allowed border-slate-800 bg-slate-900" : selecionado ? "border-blue-500 bg-blue-500/10" : "border-slate-800 bg-slate-900 hover:border-slate-600"}`}><div className="text-3xl">{icon}</div><div><h4 className={`font-bold ${selecionado ? "text-blue-400" : "text-white"}`}>{titulo}</h4><p className="text-xs text-slate-400">{desc}</p></div>{selecionado && <div className="ml-auto text-blue-500">✅</div>}</div>; }