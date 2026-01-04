import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Carrega as chaves
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    
    // Define a URL do site (Vercel ou Local)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://focalab-site.vercel.app'; 

    if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseKey || !resendKey) {
      console.error("❌ ERRO: Faltam chaves no .env.local");
      return new NextResponse("Erro de Configuração", { status: 500 });
    }

    // 2. Inicializa
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' as any });
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendKey);

    // 3. Validação do Webhook do Stripe
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) return new NextResponse("Sem assinatura", { status: 400 });

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`⚠️ Webhook Signature Error: ${err.message}`);
      return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // 4. Processa a Compra Aprovada
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const emailUsuario = session.customer_details?.email;
      const nomeUsuario = session.customer_details?.name || "Estudante";

      if (emailUsuario) {
        console.log(`💰 Pagamento recebido de: ${emailUsuario}`);

        // Verifica se o usuário JÁ existe na autenticação do Supabase
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const usuarioExiste = users.find(u => u.email === emailUsuario);

        if (!usuarioExiste) {
          // --- CRIAÇÃO DE CONTA ---
          const senhaAleatoria = Math.random().toString(36).slice(-8) + "Foca!";
          
          const { error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: emailUsuario,
            password: senhaAleatoria,
            email_confirm: true,
            user_metadata: { display_name: nomeUsuario }
          });

          if (!createError) {
            console.log("✅ Usuário criado no Supabase. Enviando e-mail...");

            // --- ENVIO DO E-MAIL ---
            // IMPORTANTE: Enquanto não verificar domínio, só chega no seu e-mail de admin!
            try {
                await resend.emails.send({
                  from: 'onboarding@resend.dev', 
                  to: emailUsuario, 
                  subject: '🚀 Acesso Liberado: Bem-vindo ao FocaLab!',
                  html: `
                    <div style="font-family: sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h1 style="color: #2563eb;">Bem-vindo ao FocaLab! 🦭</h1>
                      <p>Olá <strong>${nomeUsuario}</strong>, parabéns pela decisão, será um prazer ter você conosco!</p>
                      <p>Sua conta foi criada automaticamente. Aqui estão seus dados:</p>
                      
                      <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e7eb;">
                        <p style="margin: 5px 0;"><strong>📧 Login:</strong> ${emailUsuario}</p>
                        <p style="margin: 5px 0;"><strong>🔑 Senha:</strong> <span style="font-size: 18px; color: #2563eb; font-weight: bold;">${senhaAleatoria}</span></p>
                      </div>

                      <p>Clique abaixo para acessar a plataforma:</p>
                      
                      <a href="${siteUrl}/login" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                        👉 Acessar FocaLab Agora
                      </a>

                      <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">Dica: Você pode alterar sua senha depois no menu "Configurações".</p>
                    </div>
                  `
                });
                console.log("📧 E-mail enviado com sucesso (Verifique a caixa de Spam)!");
            } catch (emailErr) {
                console.error("❌ Erro ao enviar e-mail:", emailErr);
            }

          } else {
            console.error("❌ Erro ao criar usuário no Supabase:", createError.message);
          }
        } else {
          console.log("ℹ️ O usuário já possui conta. Nenhuma ação tomada.");
        }
      }
    }

    return new NextResponse("Webhook Recebido", { status: 200 });

  } catch (error: any) {
    console.error("❌ Erro Fatal no Webhook:", error.message);
    return new NextResponse(`Erro Servidor: ${error.message}`, { status: 500 });
  }
}