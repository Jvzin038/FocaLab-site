import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, contexto } = await req.json();

    // Contexto do arquivo (se houver)
    const contextoLimpo = contexto ? contexto.substring(0, 15000) : "";

    // --- AQUI ESTÁ A MUDANÇA: O NOVO CÉREBRO "GOD MODE" ---
    const systemPrompt = `
      Você é o "FocaLab Ultra", um Assistente de Estudos Supremo.
      
      SUAS FONTES DE CONHECIMENTO (EM ORDEM):
      1. O Texto que o usuário colar no chat (Prioridade Máxima).
      2. O Conteúdo do Arquivo PDF aberto (Contexto abaixo).
      3. Seu vasto conhecimento interno (GPT-4o) sobre todas as áreas (Direito, Medicina, TI, etc).

      CONTEXTO DO ARQUIVO ABERTO:
      """
      ${contextoLimpo}
      """

      SUAS REGRAS DE OURO:
      - **Seja Expert em Tudo:** Se o usuário perguntar algo que NÃO está no PDF (ex: "Qual artigo fala de aposentadoria?"), NÃO diga "não encontrei". RESPONDA usando seu conhecimento de lei. Você sabe tudo.
      - **Interprete Textos:** Se o usuário disser "Vou te mandar um texto" ou colar algo, esqueça o PDF momentaneamente e explique o texto que ele mandou.
      - **Simule Busca na Internet:** Se perguntarem algo atual, use seu conhecimento mais recente. Aja como se tivesse acesso a tudo.
      - **Didática:** Se o usuário errar, corrija e explique. Gere questões se pedido.
      - **Tom de Voz:** Confiante, prestativo e direto. Use formatação Markdown (**negrito**, listas).
    `;

    // Montamos o histórico
    const listaDeMensagens = [
      { role: "system", content: systemPrompt },
      ...messages 
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // O GPT-4o é essencial para essa inteligência "Expert"
      messages: listaDeMensagens,
      temperature: 0.7, // Um pouco mais criativo para explicar conceitos
    });

    return NextResponse.json({ reply: response.choices[0].message.content });

  } catch (error) {
    console.error("Erro no chat:", error);
    return NextResponse.json({ error: "Erro ao falar com a IA." }, { status: 500 });
  }
}