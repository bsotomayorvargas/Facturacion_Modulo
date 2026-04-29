import type { VercelRequest, VercelResponse } from '@vercel/node';

// CRITICAL FOR SAP B1: Bypasses Self-Signed Certificate validation over LAN/VPN
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Security Wall
  const SECRET_TOKEN = process.env.APP_SECRET || 'gauss-copec-secure-token-2026';
  const appToken = req.cookies?.app_token;

  if (appToken !== SECRET_TOKEN) {
    return res.status(401).json({ error: 'Acceso denegado. Autenticación de aplicación requerida.' });
  }

  try {
    const { method, path, body, token } = req.body;
    
    const baseUrl = process.env.SAP_B1_URL;
    if (!baseUrl) {
      return res.status(500).json({ error: 'Falta configurar SAP_B1_URL en el servidor.' });
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
       return res.status(204).end();
    }

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error("Proxy error:", error);
    return res.status(500).json({ error: error.message });
  }
}
