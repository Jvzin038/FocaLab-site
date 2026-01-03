import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

export async function POST(req: Request) {
  try {
    const { fileBase64, mimeType, servicos, textoLink } = await req.json();

    console.log("🧠 GPT Iniciado. Serviço:", servicos);

    // --- MODO ESPECIAL: GERAR ABNT DE UM LINK ---
    if (servicos.includes('abnt_link')) {
        const promptLink = `
            Você é um bibliotecário especialista em normas ABNT (NBR 6023 atualizada).
            O usuário enviou este link ou texto: "${textoLink}".
            
            Tarefa: Crie a referência bibliográfica completa e correta para este link.
            Se faltar data ou autor, use [s.d.] ou autoria institucional conforme a regra.
            
            Retorne APENAS um JSON: { "referencia": "A REFERENCIA FORMATADA AQUI" }
        `;
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: promptLink }],
            response_format: { type: "json_object" },
        });
        
        const resp = JSON.parse(completion.choices[0].message.content || "{}");
        return NextResponse.json(resp);
    }

    // --- MODO PADRÃO: PROCESSAR ARQUIVO (ROTEIRO, RESUMO, ETC) ---
    const systemPrompt = `
      Você é um Tutor IA especialista acadêmico.
      Analise o conteúdo do arquivo e gere uma saída ESTRITAMENTE em JSON.
      
      FORMATO JSON ESPERADO:
      {
        ${servicos.includes('resumo') ? '"resumo": "Resumo didático com HTML (<p>, <strong>, <ul>).",' : ''}
        ${servicos.includes('flashcards') ? '"flashcards": [{ "pergunta": "...", "resposta": "..." }],' : ''}
        ${servicos.includes('questoes') ? `"questoes": [{ "enunciado": "...", "alternativas": ["A)..."], "correta": "A)..." }],` : ''}
        ${servicos.includes('mapa') ? '"mermaid": "graph TD; ...",' : ''}
        ${servicos.includes('podcast') ? '"podcast_script": "Roteiro de podcast fluido.",' : ''}
        
        ${servicos.includes('apresentacao') ? `
        "roteiro_estruturado": {
            "introducao": "Texto coloquial explicando como iniciar a apresentação, saudação e contexto.",
            "desenvolvimento": "O corpo da fala. Divida em parágrafos lógicos. Explique os dados do arquivo como se estivesse apresentando.",
            "conclusao": "Texto de encerramento e síntese final."
        },
        "referencia_abnt_arquivo": "Referência bibliográfica do arquivo enviado (ABNT NBR 6023).",
        ` : ''}
      }
      
      IMPORTANTE:
      - No 'roteiro_estruturado', use linguagem falada (natural), pronta para o aluno ler.
      - Retorne APENAS o JSON puro.
    `;

    const messages: any[] = [{ role: "system", content: systemPrompt }];

    // Adiciona o arquivo
    if (mimeType && mimeType.startsWith('image/')) {
       messages.push({
         role: "user",
         content: [
           { type: "text", text: "Analise esta imagem." },
           { type: "image_url", image_url: { url: fileBase64 } } 
         ]
       });
    } else {
       messages.push({
          role: "user",
          content: `Analise este conteúdo: ${fileBase64 ? fileBase64.substring(0, 30000) : ''}` 
       });
    }

    console.log("🚀 Gerando conteúdo...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const respostaTexto = completion.choices[0].message.content;
    if (!respostaTexto) throw new Error("GPT não retornou nada.");

    const dadosProcessados = JSON.parse(respostaTexto);

    // Geração de Áudio (Podcast)
    if (servicos.includes('podcast') && dadosProcessados.podcast_script) {
        try {
            const mp3 = await openai.audio.speech.create({
                model: "tts-1", voice: "alloy", input: dadosProcessados.podcast_script, 
            });
            const buffer = Buffer.from(await mp3.arrayBuffer());
            dadosProcessados.audio_base64 = "data:audio/mp3;base64," + buffer.toString('base64');
        } catch (e) { console.error("Erro áudio", e); }
    }

    return NextResponse.json(dadosProcessados);

  } catch (error: any) {
    console.error('❌ ERRO:', error);
    return NextResponse.json({ error: 'Falha: ' + error.message }, { status: 500 });
  }
}