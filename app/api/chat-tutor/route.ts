import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, contexto } = await req.json();

    // Limitamos o contexto para não estourar o limite da IA (aprox 15 mil caracteres)
    // Se o PDF for um livro inteiro, ele pega o começo/resumo.
    const contextoLimpo = contexto ? contexto.substring(0, 15000) : "Tópicos gerais de estudo.";

    // AQUI ESTÁ O SEGREDO: A PERSONALIDADE DA IA
    const systemPrompt = `
      Você é o "FocaLab Tutor", um assistente de estudos inteligente e amigável.
      
      INFORMAÇÃO BASE (O QUE O ALUNO ESTÁ ESTUDANDO):
      """
      ${contextoLimpo}
      """
      
      SUAS REGRAS:
      1. Responda baseando-se EXCLUSIVAMENTE no texto acima. Se não estiver no texto, diga que não encontrou no material.
      2. Aja como um professor particular socrático: Ao invés de dar a resposta, faça o aluno pensar.
      3. Se o aluno pedir "Crie uma questão", faça UMA questão por vez.
      4. Se o aluno pedir "Questão Aberta", faça uma pergunta dissertativa.
      5. Se o aluno pedir "Questão Fechada", faça múltipla escolha (A,B,C,D).
      6. Mantenha o tom conversacional, use emojis e seja encorajador.
      7. Se o aluno errar, explique o porquê com paciência.
    `;

    // Montamos o histórico para a IA lembrar do que foi falado antes
    const listaDeMensagens = [
      { role: "system", content: systemPrompt },
      ...messages // Inclui tudo o que vocês já conversaram
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Rápido e inteligente
      messages: listaDeMensagens,
      temperature: 0.7, // Criativo mas preciso
    });

    return NextResponse.json({ reply: response.choices[0].message.content });

  } catch (error) {
    console.error("Erro no chat:", error);
    return NextResponse.json({ error: "Erro ao falar com a IA." }, { status: 500 });
  }
}