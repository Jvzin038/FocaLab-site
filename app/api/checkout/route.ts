import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// --- CORREÇÃO AQUI: Usamos 'as any' para evitar o erro de versão vermelha ---
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16', // Usando uma versão estável
  typescript: true,
} as any);

export async function POST(req: Request) {
  try {
    const { email, userId } = await req.json();

    if (!email || !userId) {
        return NextResponse.json({ error: 'Dados do usuário faltando.' }, { status: 400 });
    }

    // Cria a sessão de pagamento no Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], 
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'FocaLab Pro - Assinatura Mensal',
              description: 'Acesso ilimitado a IA, Podcasts e Resumos.',
            },
            unit_amount: 1990, // R$ 19,90
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?sucesso=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/planos`,
      customer_email: email, 
      metadata: {
        userId: userId, 
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Erro no Checkout Stripe:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}