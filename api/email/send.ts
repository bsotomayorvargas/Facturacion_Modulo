import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { docNum, projectName, totalAmount, clientName, comments, isBatch, destinatario } = req.body;

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

    const subject = isBatch 
      ? `Aviso Facturación Masiva SAP - Módulo Portal` 
      : `Aviso Generación Factura SAP - OV ${docNum} - ${projectName || "Sin Proyecto"}`;
    
    let textBody = `Estimados,\n\nSe ha instruido la generación de facturación desde el portal para los siguientes datos:\n\n`;
    let htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #002870; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">Aviso de Operación SAP</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Copec Flux - Módulo de Facturación</p>
        </div>
        <div style="padding: 20px;">
          <p>Estimados,</p>
          <p>Se ha instruido la generación de facturación desde el portal para los siguientes datos:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px;">
    `;

    if (!isBatch) {
      textBody += `- OV Origen: ${docNum}\n`;
      textBody += `- Proyecto: ${projectName || "N/A"}\n`;
      textBody += `- Cliente: ${clientName || "N/A"}\n`;
      textBody += `- Monto a Facturar: $${totalAmount.toLocaleString('es-CL')}\n\n`;

      htmlBody += `
        <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px; font-weight: bold; width: 40%;">OV Origen</td><td style="padding: 10px;">${docNum}</td></tr>
        <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px; font-weight: bold;">Proyecto</td><td style="padding: 10px;">${projectName || "N/A"}</td></tr>
        <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px; font-weight: bold;">Cliente</td><td style="padding: 10px;">${clientName || "N/A"}</td></tr>
        <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px; font-weight: bold;">Monto a Facturar</td><td style="padding: 10px; font-weight: bold; color: #002870;">$${totalAmount.toLocaleString('es-CL')}</td></tr>
      `;
    } else {
      textBody += `- Cantidad de Documentos (OVs): ${docNum}\n`;
      textBody += `- Monto Total Neto de la operación: $${totalAmount.toLocaleString('es-CL')}\n\n`;

      htmlBody += `
        <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px; font-weight: bold; width: 40%;">Cant. Documentos (OVs)</td><td style="padding: 10px;">${docNum}</td></tr>
        <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px; font-weight: bold;">Monto Total Neto</td><td style="padding: 10px; font-weight: bold; color: #002870;">$${totalAmount.toLocaleString('es-CL')}</td></tr>
      `;
    }
    
    textBody += `Justificación / Comentario del emisor:\n`;
    textBody += `"${comments || 'Sin comentarios adicionales.'}"\n\n`;
    textBody += `Saludos cordiales,\nSistema de Facturación y Pagos Copec Flux`;

    htmlBody += `
          </table>
          <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #0ea5e9; border-radius: 4px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">Justificación / Comentario del emisor</p>
            <p style="margin: 8px 0 0 0; font-style: italic; color: #334155;">"${comments || 'Sin comentarios adicionales.'}"</p>
          </div>
          <p style="margin: 0; font-size: 14px;">Saludos cordiales,<br/><strong>Sistema de Facturación y Pagos Copec Flux</strong></p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"Portal Facturación Copec Flux" <${user}>`,
      to: destinatario || 'cdg@fluxsolar.cl',
      subject,
      text: textBody,
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: %s", info.messageId);

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return res.status(500).json({ error: error.message });
  }
}
