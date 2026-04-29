import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subject, body, destinatario } = req.body;

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      return res.status(500).json({ error: 'Configuración de correo no encontrada en el servidor' });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // Use SSL
      auth: {
        user,
        pass,
      },
    });

    const mailOptions = {
      from: `"Portal Pagos Copec Flux" <${user}>`,
      to: destinatario,
      subject,
      text: body,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Nomina Email sent: %s", info.messageId);

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("Error sending nomina email:", error);
    return res.status(500).json({ error: error.message });
  }
}
