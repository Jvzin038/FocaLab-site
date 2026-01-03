import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Força o código a ser dinâmico (Obrigatório para Webhooks)
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Carrega as chaves
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY;

    if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseKey || !resendKey) {
      console.error("❌ ERRO: Faltam chaves no .env.local");
      return new NextResponse("Erro de Configuração", { status: 500 });
    }

    // 2. Inicializa as ferramentas
    // @ts-ignore
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia', typescript: true });
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendKey);

    // 3. Validação do Webhook
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) return new NextResponse("Sem assinatura", { status: 400 });

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // 4. Se o pagamento foi aprovado
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const emailUsuario = session.customer_details?.email;
      const nomeUsuario = session.customer_details?.name || "Estudante";

      if (emailUsuario) {
        console.log(`💰 Pagamento de: ${emailUsuario}`);

        // Gera senha e verifica usuário
        const senhaAleatoria = Math.random().toString(36).slice(-8) + "Foca!";
        
        const { data: userExists } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('email', emailUsuario)
          .single();

        if (!userExists) {
          // A. Cria o usuário no Banco
          const { error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: emailUsuario,
            password: senhaAleatoria,
            email_confirm: true,
            user_metadata: { display_name: nomeUsuario }
          });

          if (!createError) {
            console.log("✅ Usuário criado. Enviando e-mail...");

            // B. Envia o E-mail com a Senha (USANDO O RESEND)
            await resend.emails.send({
              from: 'onboarding@resend.dev',
              to: emailUsuario,
              subject: '🚀 Seu Acesso ao FocaLab Chegou!',
              html: `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                  <h1>Bem-vindo ao FocaLab! 🦭</h1>
                  <p>Olá <strong>${nomeUsuario}</strong>, seu pagamento foi confirmado com sucesso.</p>
                  <p>Aqui estão seus dados de acesso:</p>
                  
                  <div style="background: #f4f4f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>📧 Login:</strong> ${emailUsuario}</p>
                    <p style="margin: 5px 0;"><strong>🔑 Senha:</strong> <span style="font-size: 18px; color: #2563eb; font-weight: bold;">${senhaAleatoria}</span></p>
                  </div>

                  <p>Clique no botão abaixo para entrar:</p>
                  
                  <a href="http://localhost:3000/login" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                    👉 Acessar Agora
                  </a>

                  <p style="margin-top: 30px; font-size: 12px; color: #666;">Se o botão não funcionar, copie este link: http://localhost:3000/login</p>
                </div>
              `
            });
            
            console.log("📧 E-mail enviado com sucesso!");

          } else {
            console.error("❌ Erro ao criar usuário:", createError.message);
          }
        } else {
            console.log("ℹ️ Usuário já existia.");
        }
      }
    }

    return new NextResponse("Recebido", { status: 200 });

  } catch (error: any) {
    console.error("Erro Geral:", error.message);
    return new NextResponse(`Erro: ${error.message}`, { status: 500 });
  }
}
