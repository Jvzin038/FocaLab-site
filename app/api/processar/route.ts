import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { extrairTextoDoBuffer } from '@/lib/extrator';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

export async function POST(req: Request) {
  try {
    const { fileBase64, mimeType, servicos, textoLink } = await req.json();

    console.log("🧠 Processando...", { servicos, mimeType });

    // --- MODO LINK ABNT (Mantido igual) ---
    if (servicos.includes('abnt_link')) {
        const promptLink = `Você é um bibliotecário especialista ABNT. Crie a referência para: "${textoLink}". Retorne JSON: { "referencia": "..." }`;
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "system", content: promptLink }],
            response_format: { type: "json_object" },
        });
        return NextResponse.json(JSON.parse(completion.choices[0].message.content || "{}"));
    }

    // --- PASSO CRUCIAL: EXTRAÇÃO DO TEXTO DO ARQUIVO ---
    let conteudoParaIA = "";
    
    // Se for Imagem, não extraímos texto (o GPT Vision vê a imagem)
    const ehImagem = mimeType && mimeType.startsWith('image/');
    
    if (!ehImagem && fileBase64) {
        // 1. Limpar o cabeçalho do base64 (ex: "data:application/pdf;base64,...")
        const base64Limpo = fileBase64.replace(/^data:.*;base64,/, "");
        
        // 2. Transformar em Buffer (Arquivo real na memória)
        const buffer = Buffer.from(base64Limpo, 'base64');
        
        // 3. Extrair o texto usando nossa função
        try {
            conteudoParaIA = await extrairTextoDoBuffer(buffer, mimeType);
            console.log("✅ Texto extraído com sucesso! Tamanho:", conteudoParaIA.length);
        } catch (e) {
            console.error("Erro ao extrair:", e);
            return NextResponse.json({ error: "Erro ao ler o arquivo. Certifique-se que o PDF contém texto selecionável." }, { status: 400 });
        }
    }

    // --- PREPARAR O PROMPT ---
    const systemPrompt = `
      Você é um Tutor IA especialista.
      Baseie-se EXCLUSIVAMENTE no conteúdo fornecido abaixo.
      
      FORMATO JSON OBRIGATÓRIO:
      {
        ${servicos.includes('resumo') ? '"resumo": "Resumo rico em HTML (<p>, <b>, <br>).",' : ''}
        ${servicos.includes('flashcards') ? '"flashcards": [{ "frente": "Pergunta curta?", "verso": "Resposta direta." }],' : ''}
        ${servicos.includes('questoes') ? `"questoes": [{ "enunciado": "...", "alternativas": ["A) ...", "B) ...", "C) ...", "D) ..."], "correta": 0, "explicacao": "..." }],` : ''}
        ${servicos.includes('mapa') ? '"mermaid": "graph TD; A[Conceito Central] --> B(Subconceito); B --> C{Detalhe}; style A fill:#f9f,stroke:#333;",' : ''}
        ${servicos.includes('podcast') ? '"podcast_script": "Olá! Vamos estudar este material. Começando por...",' : ''}
        ${servicos.includes('apresentacao') ? '"roteiro_estruturado": { "introducao": "...", "desenvolvimento": "...", "conclusao": "..." }, "referencia_abnt_arquivo": "..." ' : ''}
      }
      
      DICAS:
      - Mapa Mental: Use nós curtos. Deixe colorido.
      - Questões: Crie perguntas desafiadoras sobre o texto lido.
      - Flashcards: Resuma conceitos chave.
    `;

    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (ehImagem) {
       // Se for imagem, manda o base64 direto pro Vision
       messages.push({
         role: "user",
         content: [
           { type: "text", text: "Analise esta imagem didática e gere o conteúdo pedido." },
           { type: "image_url", image_url: { url: fileBase64 } } 
         ]
       });
    } else {
       // Se for PDF, manda o TEXTO EXTRAÍDO
       if (conteudoParaIA.length < 50) {
           return NextResponse.json({ error: "O arquivo parece vazio ou é uma imagem digitalizada sem texto (OCR necessário)." }, { status: 400 });
       }
       messages.push({
         role: "user",
         content: `Conteúdo do Arquivo para Estudo: \n"${conteudoParaIA}"` 
       });
    }

    console.log("🚀 Enviando para OpenAI...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Gpt-4o é ótimo para seguir JSON
      messages: messages,
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const respostaTexto = completion.choices[0].message.content;
    const dadosProcessados = JSON.parse(respostaTexto || "{}");

    // --- GERAR PODCAST (ÁUDIO) ---
    if (servicos.includes('podcast') && dadosProcessados.podcast_script) {
        console.log("🎙️ Gerando áudio...");
        try {
            const mp3 = await openai.audio.speech.create({
                model: "tts-1",
                voice: "alloy",
                input: dadosProcessados.podcast_script.substring(0, 4096), // Limite de segurança
            });
            const buffer = Buffer.from(await mp3.arrayBuffer());
            dadosProcessados.audio_base64 = "data:audio/mp3;base64," + buffer.toString('base64');
        } catch (e) {
            console.error("Erro ao gerar áudio:", e);
            // Não quebramos o resto se o áudio falhar
        }
    }

    return NextResponse.json(dadosProcessados);

  } catch (error: any) {
    console.error('❌ ERRO GERAL:', error);
    return NextResponse.json({ error: 'Falha interna: ' + error.message }, { status: 500 });
  }
}