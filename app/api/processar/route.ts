import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { extrairTextoDoBuffer } from '@/lib/extrator';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

export async function POST(req: Request) {
  try {
    // Aumentamos o limite de leitura do JSON para evitar erros em arquivos grandes
    const body = await req.json(); 
    const { fileBase64, mimeType, servicos, textoLink } = body;

    console.log("🧠 Processando serviço:", servicos);

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
        // --- AQUI ESTA A CORREÇÃO PRINCIPAL ---
        // 1. Remove cabeçalho (data:application...)
        // 2. Remove TODOS os espaços em branco, quebras de linha e tabs (\s no regex)
        const base64Limpo = fileBase64.replace(/^data:.*;base64,/, "").replace(/[\s\n\r]/g, "");
        
        try {
            const buffer = Buffer.from(base64Limpo, 'base64');
            conteudoParaIA = await extrairTextoDoBuffer(buffer);
        } catch (e) {
            console.error("Erro ao converter base64:", e);
            return NextResponse.json({ error: "O arquivo está corrompido ou ilegível." }, { status: 400 });
        }
    }

    // --- PROMPT E CHAMADA OPENAI ---
    const systemPrompt = `
      Você é um Tutor IA. Responda ESTRITAMENTE em JSON.
      Baseie-se neste texto:
      "${conteudoParaIA ? conteudoParaIA.substring(0, 20000) : 'Conteúdo visual/vazio'}"
      
      FORMATO:
      {
        ${servicos.includes('resumo') ? '"resumo": "Resumo rico em HTML (<p>, <b>).",' : ''}
        ${servicos.includes('flashcards') ? '"flashcards": [{ "frente": "...", "verso": "..." }],' : ''}
        ${servicos.includes('questoes') ? `"questoes": [{ "enunciado": "...", "alternativas": ["A)..."], "correta": 0, "explicacao": "..." }],` : ''}
        ${servicos.includes('mapa') ? '"mermaid": "graph TD; A-->B;",' : ''}
        ${servicos.includes('podcast') ? '"podcast_script": "Olá estudantes...",' : ''}
        ${servicos.includes('apresentacao') ? '"roteiro_estruturado": { "introducao": "...", "desenvolvimento": "...", "conclusao": "..." }, "referencia_abnt_arquivo": "..." ' : ''}
      }
    `;

    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (ehImagem) {
       messages.push({
         role: "user",
         content: [
           { type: "text", text: "Analise a imagem." },
           { type: "image_url", image_url: { url: fileBase64 } } 
         ]
       });
    } else {
        // Se for PDF mas não saiu texto
        if (!conteudoParaIA || conteudoParaIA.length < 50) {
            return NextResponse.json({ error: "Não foi possível ler texto deste PDF. Tente um arquivo com texto selecionável (não imagem)." }, { status: 400 });
        }
        messages.push({ role: "user", content: "Analise o texto extraído acima." });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      response_format: { type: "json_object" },
    });

    const dadosProcessados = JSON.parse(completion.choices[0].message.content || "{}");

    // Gerar Áudio se necessário
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

  } catch (error: any) {
    console.error('❌ ERRO FATAL:', error);
    return NextResponse.json({ error: 'Erro no servidor: ' + error.message }, { status: 500 });
  }
}