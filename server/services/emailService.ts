import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

const mailersend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_TOKEN || '',
});

const sentFrom = new Sender("noreply@odontohub.app", "OdontoHub");

export const sendPasswordResetEmail = async (email: string, resetLink: string) => {
  // Fallback para desenvolvimento ou se o token estiver ausente
  if (!process.env.MAILERSEND_API_TOKEN || process.env.MAILERSEND_API_TOKEN === 'seu_token_aqui') {
    console.log('--------------------------------------------------');
    console.log('AVISO: MAILERSEND_API_TOKEN ausente ou padrão. Simulando envio de e-mail.');
    console.log(`PARA: ${email}`);
    console.log(`LINK: ${resetLink}`);
    console.log('--------------------------------------------------');
    return;
  }

  const recipients = [
    new Recipient(email, "")
  ];

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setReplyTo(sentFrom)
    .setSubject("Redefinição de senha – OdontoHub")
    .setHtml(`
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <p>Olá,</p>
        <p>Você solicitou a redefinição de senha da sua conta no OdontoHub.</p>
        <p>Clique no link abaixo para redefinir sua senha:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Redefinir Senha</a>
        </div>
        <p>Se você não solicitou essa alteração, pode ignorar este e-mail.</p>
        <p>Equipe OdontoHub</p>
      </div>
    `)
    .setText(`Olá,\n\nVocê solicitou a redefinição de senha da sua conta no OdontoHub.\n\nClique no link abaixo para redefinir sua senha:\n\n${resetLink}\n\nSe você não solicitou essa alteração, pode ignorar este e-mail.\n\nEquipe OdontoHub`);

  try {
    await mailersend.email.send(emailParams);
    console.log(`E-mail de redefinição enviado para ${email} via MailerSend`);
  } catch (error: any) {
    console.error("Error sending email via MailerSend:");
    if (error.response && error.response.body) {
      console.error(JSON.stringify(error.response.body, null, 2));
    } else {
      console.error(error);
    }
    throw error;
  }
};
