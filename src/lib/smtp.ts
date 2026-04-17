import nodemailer from 'nodemailer';

export async function sendMagicLink(email: string, token: string) {
  // Имитация отправки для проверки
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${baseUrl}/api/auth/verify?token=${token}`;

  console.log('------------ MAGIC LINK ------------');
  console.log(`To: ${email}`);
  console.log(`Link: ${link}`);
  console.log('------------------------------------');

  if (!process.env.SMTP_HOST) {
    console.warn('⚠️ SMTP_HOST is not set. Magic link printed to console only.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e4e4e7;">
      <h2 style="color: #18181b;">Вход в SMMplan Lite</h2>
      <p style="color: #71717a; line-height: 1.5;">Вы запросили ссылку для входа. Нажмите на кнопку ниже, чтобы войти в аккаунт. Ссылка действительна 15 минут.</p>
      <div style="margin-top: 32px; text-align: center;">
        <a href="${link}" style="background-color: #18181b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
          Войти в панель
        </a>
      </div>
      <p style="margin-top: 32px; font-size: 12px; color: #a1a1aa;">Если вы не запрашивали письмо, проигнорируйте его.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"SMMplan Support" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Ваша ссылка для входа',
    html: htmlContent,
  });
}

export async function sendMail(email: string, subject: string, htmlContent: string) {
  if (!process.env.SMTP_HOST) {
    console.warn('⚠️ SMTP_HOST is not set. Email printed to console only.');
    console.log(`[EMAIL to ${email}] ${subject}:`);
    console.log(htmlContent);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"SMMplan Support" <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    html: htmlContent,
  });
}
