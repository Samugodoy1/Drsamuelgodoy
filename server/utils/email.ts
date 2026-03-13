import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export const sendEmail = async (options: EmailOptions) => {
  // Se não houver configuração de e-mail, apenas loga no console (fallback)
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('--------------------------------------------------');
    console.log('AVISO: Configurações de e-mail ausentes. Simulando envio.');
    console.log(`PARA: ${options.to}`);
    console.log(`ASSUNTO: ${options.subject}`);
    console.log(`CONTEÚDO: ${options.text}`);
    console.log('--------------------------------------------------');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"OdontoHub" <noreply@odontohub.app.br>',
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`E-mail enviado com sucesso: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    throw error;
  }
};
