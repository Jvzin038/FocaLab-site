import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { texto, emailUsuario, nomeUsuario } = await req.json();

    console.log(`📝 Processando mensagem de: ${nomeUsuario} (${emailUsuario})`);

    // Verifica credenciais do FocaLab (O Carteiro)
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return NextResponse.json({ error: 'Erro interno de servidor.' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // focalab020@gmail.com (Autenticação)
        pass: process.env.EMAIL_PASS, // Senha de App
      },
    });

    const mailOptions = {
      // O 'From' TEM que ser o FocaLab, senão o Google bloqueia (Anti-Spam)
      from: `"FocaLab - Contato via Site" <${process.env.EMAIL_USER}>`,
      
      // O 'To' é você mesmo (para você ler a mensagem)
      to: 'focalab020@gmail.com',
      
      // O PULO DO GATO:
      // Quando clicar em responder, vai para o João (emailUsuario)
      replyTo: emailUsuario, 
      
      subject: `💡 Nova Mensagem de: ${nomeUsuario}`,
      html: `
        <div style="font-family: Arial, color: #333; max-width: 600px; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
          <h2 style="color: #2563eb;">🔔 Nova Sugestão do Site</h2>
          <p>Você recebeu uma mensagem através do formulário.</p>
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          
          <p><strong>👤 Quem enviou:</strong> ${nomeUsuario}</p>
          <p><strong>📧 E-mail do Aluno:</strong> ${emailUsuario}</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <p style="margin: 0; font-style: italic;">"${texto}"</p>
          </div>

          <p style="font-size: 12px; color: #888;">
            Dica: Clique em "Responder" para enviar um e-mail direto para o aluno.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Mensagem entregue na caixa do FocaLab!");

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ ERRO:', error);
    return NextResponse.json({ error: 'Erro ao enviar.' }, { status: 500 });
  }
}