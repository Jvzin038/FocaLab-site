import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { extrairTextoDoBuffer } from '../../../lib/extrator';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fileBase64, mimeType, servicos, textoLink, configQuestao } = body;

    console.log("🧠 Processando serviços:", servicos);

    // --- MODO ABNT LINK ---
    if (servicos.includes('abnt_link')) {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "system", content: `Gere referência ABNT para: "${textoLink}". Retorne JSON: {"referencia": "..."}` }],
            response_format: { type: "json_object" },
        });
        return NextResponse.json(JSON.parse(completion.choices[0].message.content || "{}"));
    }

    // --- PREPARAÇÃO DO CONTEÚDO ---
    let conteudoParaIA = "";
    const ehImagem = mimeType && mimeType.startsWith('image/');
    
    if (!ehImagem && fileBase64) {
        const base64Limpo = fileBase64.replace(/^data:.*;base64,/, "").replace(/[\s\n\r]/g, "");
        try {
            const buffer = Buffer.from(base64Limpo, 'base64');
            conteudoParaIA = await extrairTextoDoBuffer(buffer);
        } catch (e) {
            console.error("Erro extrator:", e);
            return NextResponse.json({ error: "Erro ao ler arquivo." }, { status: 400 });
        }
    }

    // --- PROMPT DINÂMICO (TURBINADO) ---
    let instrucoesSistema = `
      Você é o "FocaLab IA", especialista didático.
      Analise o conteúdo e gere o JSON solicitado.
      Responda em Português do Brasil.
    `;

    if (servicos.includes('flashcards')) {
      instrucoesSistema += `\n[FLASHCARDS]: Crie 10 flashcards (pergunta/resposta) curtos e diretos. JSON: "flashcards": [{"pergunta": "...", "resposta": "..."}]`;
    }

    // --- AQUI ESTÁ A MÁGICA DO MAPA MENTAL ---
    if (servicos.includes('mapa')) {
      instrucoesSistema += `
        \n[MAPA MENTAL]:
        - Crie um código Mermaid.js "graph TD".
        - OBRIGATÓRIO: Use formas diferentes para hierarquia:
          1. Raiz: id((TEXTO)) (Círculo Duplo)
          2. Principais: id{TEXTO} (Losango)
          3. Detalhes: id[TEXTO] (Retângulo)
        - REGRA CRÍTICA: NÃO use parênteses (), colchetes [] ou aspas " DENTRO dos textos dos nós, pois quebra o código.
        - Exemplo: A((Anatomia)) --> B{Ossos} --> C[Fêmur]
        - JSON: "mermaid": "graph TD; A((Tema))..."
      `;
    }

    if (servicos.includes('questoes')) {
      const tipo = configQuestao?.tipo || 'mista';
      const nivel = configQuestao?.dificuldade || 'medio';
      instrucoesSistema += `\n[QUESTÕES]: 5 questões nível ${nivel} do tipo ${tipo}. JSON: "questoes": [{"enunciado": "...", "alternativas": ["A)", "B)"], "correta": 0, "explicacao": "..."}]`;
    }

    if (servicos.includes('resumo')) instrucoesSistema += `\n[RESUMO]: "resumo": "HTML rico com <p>, <b>, <ul>, <li>."`;
    if (servicos.includes('apresentacao')) instrucoesSistema += `\n[APRESENTAÇÃO]: "roteiro_estruturado": { "introducao": "...", "desenvolvimento": "...", "conclusao": "..." }, "referencia_abnt_arquivo": "..."`;
    if (servicos.includes('podcast')) instrucoesSistema += `\n[PODCAST]: "podcast_script": "Roteiro falado..."`;

    const messages: any[] = [{ role: "system", content: instrucoesSistema }];

    if (ehImagem) {
       messages.push({ role: "user", content: [{ type: "text", text: "Analise a imagem e gere o JSON." }, { type: "image_url", image_url: { url: fileBase64 } }] });
    } else {
       messages.push({ role: "user", content: `Analise este texto (extraia conceitos chave):\n\n"${conteudoParaIA.substring(0, 20000)}"` });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const dadosProcessados = JSON.parse(completion.choices[0].message.content || "{}");

    // Audio Podcast
    if (servicos.includes('podcast') && dadosProcessados.podcast_script) {
        try {
            const mp3 = await openai.audio.speech.create({ model: "tts-1", voice: "alloy", input: dadosProcessados.podcast_script.substring(0, 4000) });
            const buffer = Buffer.from(await mp3.arrayBuffer());
            dadosProcessados.audio_base64 = "data:audio/mp3;base64," + buffer.toString('base64');
        } catch (e) { console.error("Erro audio", e); }
    }

    return NextResponse.json(dadosProcessados);

  } catch (error: any) {
    console.error('❌ ERRO:', error);
    return NextResponse.json({ error: 'Erro no servidor.' }, { status: 500 });
  }
}