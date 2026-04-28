import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body || {};

  const VALID_USER = process.env.APP_USER || 'fluxadmins';
  const VALID_PASS = process.env.APP_PASSWORD || 'FluxCopec26!!';
  const SECRET_TOKEN = process.env.APP_SECRET || 'gauss-copec-secure-token-2026';

  if (username === VALID_USER && password === VALID_PASS) {
    res.setHeader('Set-Cookie', `app_token=${SECRET_TOKEN}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
    return res.status(200).json({ success: true });
  }

  return res.status(401).json({ error: 'Credenciales inválidas' });
}
