import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// CRITICAL FOR SAP B1: Bypasses Self-Signed Certificate validation over LAN/VPN
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // === AUTHENTICATION ENDPOINT ===
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    const VALID_USER = process.env.APP_USER || 'fluxadmins';
    const VALID_PASS = process.env.APP_PASSWORD || 'FluxCopec26!!';
    const SECRET_TOKEN = process.env.APP_SECRET || 'gauss-copec-secure-token-2026';

    if (username === VALID_USER && password === VALID_PASS) {
      res.setHeader('Set-Cookie', `app_token=${SECRET_TOKEN}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
      return res.status(200).json({ success: true });
    }
    return res.status(401).json({ error: 'Credenciales inválidas' });
  });

  // Helper to parse cookies
  const parseCookies = (req: express.Request) => {
    const list: Record<string, string> = {};
    const rc = req.headers.cookie;
    if (rc) {
      rc.split(';').forEach((cookie) => {
        const parts = cookie.split('=');
        list[parts.shift()?.trim() || ''] = decodeURI(parts.join('='));
      });
    }
    return list;
  };

  // === SAP B1 SERVICE LAYER PROXY ===
  // This proxy allows the frontend to hit SAP B1 endpoints without being 
  // blocked by CORS restrictions or Self-Signed SSL issues in the browser.
  app.post('/api/sap/proxy', async (req, res) => {
    try {
      // Security Wall
      const SECRET_TOKEN = process.env.APP_SECRET || 'gauss-copec-secure-token-2026';
      const cookies = parseCookies(req);
      if (cookies.app_token !== SECRET_TOKEN) {
        return res.status(401).json({ error: 'Acceso denegado. Autenticación de aplicación requerida.' });
      }

      const { method, path, body, token } = req.body;
      
      const baseUrl = process.env.SAP_B1_URL;
      if (!baseUrl) {
        return res.status(500).json({ error: 'Falta configurar SAP_B1_URL en el servidor local.' });
      }

      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      const url = `${cleanBaseUrl}${cleanPath}`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Inject B1SESSION cookie if the user is already authenticated
      if (token) {
        headers['Cookie'] = `B1SESSION=${token}`;
      }

      const fetchOptions: RequestInit = {
        method,
        headers,
      };
      
      if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      
      // Handle "204 No Content" (common in SAP updates/cancellations)
      if (response.status === 204) {
         return res.status(204).send();
      }

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error: any) {
      console.error("Proxy error:", error);
      console.error("Proxy error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // === EMAIL SEND PROXY (MOCK FOR VERCEL SERVERLESS) ===
  app.post('/api/email/send', async (req, res) => {
    try {
      const { docNum, projectName, totalAmount, clientName, comments, isBatch, destinatario } = req.body;

      const user = process.env.GMAIL_USER;
      const pass = process.env.GMAIL_APP_PASSWORD;

      if (!user || !pass) {
        console.warn("No se configuraron GMAIL_USER o GMAIL_APP_PASSWORD en .env. Simulando envío de correo local.");
        return res.status(200).json({ success: true, messageId: 'simulated-local-mail', warning: 'No env vars set' });
      }

      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass },
      });

      const subject = isBatch 
        ? `Aviso Facturación Masiva SAP - Módulo Portal` 
        : `Aviso Generación Factura SAP - OV ${docNum} - ${projectName || "Sin Proyecto"}`;
      
      let textBody = `Estimados,\n\nSe ha instruido la generación de facturación desde el portal para los siguientes datos:\n\n`;
      if (!isBatch) {
        textBody += `- OV Origen: ${docNum}\n- Proyecto: ${projectName || "N/A"}\n- Cliente: ${clientName || "N/A"}\n- Monto a Facturar: $${Number(totalAmount).toLocaleString('es-CL')}\n\n`;
      } else {
        textBody += `- Cantidad de Documentos (OVs): ${docNum}\n- Monto Total Neto de la operación: $${Number(totalAmount).toLocaleString('es-CL')}\n\n`;
      }
      
      textBody += `Justificación / Comentario del emisor:\n"${comments || 'Sin comentarios adicionales.'}"\n\nSaludos cordiales,\nSistema de Facturación y Pagos Copec Flux`;

      const mailOptions = {
        from: `"Portal Facturación Copec Flux" <${user}>`,
        to: destinatario || 'cdg@fluxsolar.cl',
        subject,
        text: textBody,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("Local Server: Email sent: %s", info.messageId);

      return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("Local Server: Error sending email:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/email/nomina', async (req, res) => {
    try {
      const { subject, body, destinatario } = req.body;
      const user = process.env.GMAIL_USER;
      const pass = process.env.GMAIL_APP_PASSWORD;

      if (!user || !pass) {
        console.warn("No se configuraron GMAIL_USER o GMAIL_APP_PASSWORD en .env. Simulando envío de correo local.");
        return res.status(200).json({ success: true, messageId: 'simulated-local-mail', warning: 'No env vars set' });
      }

      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass },
      });

      const mailOptions = {
        from: `"Portal Pagos Copec Flux" <${user}>`,
        to: destinatario,
        subject,
        text: body,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("Local Server: Nómina Email sent: %s", info.messageId);

      return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("Local Server: Error sending nómina email:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // === VITE MIDDLEWARE ===
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Since Express 5 is expected if recently updated, use *all if not working, but standard 4/5 * works mostly except strictly router contexts.
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
