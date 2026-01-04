import { NextResponse } from 'next/server';
import OpenAI from 'openai';
// CORREÇÃO: Caminho relativo para garantir que encontre o arquivo na pasta lib
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
            // CORREÇÃO: Enviamos APENAS o buffer (1 argumento)
            conteudoParaIA = await extrairTextoDoBuffer(buffer);
        } catch (e) {
            console.error("Erro ao converter base64:", e);
            return NextResponse.json({ error: "O arquivo está corrompido ou ilegível." }, { status: 400 });
        }
    }

    // --- PROMPT DINÂMICO ---
    let instrucoesSistema = `
      Você é o "FocaLab IA", um tutor especialista.
      Analise o texto e gere o JSON solicitado.
      Responda em Português do Brasil.
    `;

    if (servicos.includes('flashcards')) {
      instrucoesSistema += `\n[FLASHCARDS]: Crie 10 flashcards. JSON: "flashcards": [{ "pergunta": "...", "resposta": "..." }]`;
    }

    if (servicos.includes('mapa')) {
      instrucoesSistema += `\n[MAPA MENTAL]: Use sintaxe Mermaid "graph TD". Use colchetes [] para temas e parenteses () para subtemas. JSON: "mermaid": "graph TD; A[Tema]-->B(Sub)..."`;
    }

    if (servicos.includes('questoes')) {
      const tipo = configQuestao?.tipo || 'mista';
      const nivel = configQuestao?.dificuldade || 'medio';
      instrucoesSistema += `\n[QUESTÕES]: 5 questões nível ${nivel}, estilo ${tipo}. JSON: "questoes": [{ "enunciado": "...", "alternativas": ["A..", "B.."], "correta": 0, "explicacao": "..." }]`;
    }

    if (servicos.includes('resumo')) instrucoesSistema += `\n[RESUMO]: "resumo": "Texto em HTML (<p>, <b>)."`;
    if (servicos.includes('apresentacao')) instrucoesSistema += `\n[APRESENTAÇÃO]: "roteiro_estruturado": { "introducao": "...", "desenvolvimento": "...", "conclusao": "..." }, "referencia_abnt_arquivo": "..."`;
    if (servicos.includes('podcast')) instrucoesSistema += `\n[PODCAST]: "podcast_script": "Roteiro falado..."`;

    // --- CHAMADA OPENAI ---
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{ role: "system", content: instrucoesSistema }];

    if (ehImagem) {
       messages.push({
         role: "user",
         content: [
           { type: "text", text: "Analise esta imagem acadêmica e gere o JSON." },
           { type: "image_url", image_url: { url: fileBase64 } } 
         ]
       });
    } else {
       if (!conteudoParaIA || conteudoParaIA.length < 50) {
           return NextResponse.json({ error: "Texto insuficiente no arquivo." }, { status: 400 });
       }
       messages.push({ role: "user", content: `Analise este texto:\n\n"${conteudoParaIA.substring(0, 25000)}"` });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const dadosProcessados = JSON.parse(completion.choices[0].message.content || "{}");

    // --- GERAR AUDIO ---
    if (servicos.includes('podcast') && dadosProcessados.podcast_script) {
        try {
            const mp3 = await openai.audio.speech.create({
                model: "tts-1", voice: "alloy", input: dadosProcessados.podcast_script.substring(0, 4000),
            });
            const buffer = Buffer.from(await mp3.arrayBuffer());
            dadosProcessados.audio_base64 = "data:audio/mp3;base64," + buffer.toString('base64');
        } catch (e) { console.error("Erro audio", e); }
    }

    return NextResponse.json(dadosProcessados);

  } catch (error: unknown) {
    console.error('❌ ERRO:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: 'Erro no servidor: ' + errorMessage }, { status: 500 });
  }
}