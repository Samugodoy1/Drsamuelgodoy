import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import serverless handlers
import loginHandler from './api/auth/login.js';
import registerHandler from './api/auth/register.js';
import patientsHandler from './api/patients/index.js';
import dentistsHandler from './api/dentists/index.js';
import appointmentsHandler from './api/appointments/index.js';
import adminUsersHandler from './api/admin/users.js';
import filesHandler from './api/files.js';
import healthHandler from './api/health.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());

  // Helper to convert Vercel handler to Express handler
  const vercelToExpress = (handler: any) => async (req: any, res: any) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      console.error('Serverless handler error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  // API Routes (matching vercel.json rewrites)
  app.post('/api/auth/login', vercelToExpress(loginHandler));
  app.post('/api/auth/register', vercelToExpress(registerHandler));
  app.get('/api/health', vercelToExpress(healthHandler));
  
  app.all('/api/patients/:id*', vercelToExpress(patientsHandler));
  app.all('/api/dentists/:id*', vercelToExpress(dentistsHandler));
  app.all('/api/appointments/:id*', vercelToExpress(appointmentsHandler));
  app.all('/api/admin/users/:id*', vercelToExpress(adminUsersHandler));
  app.all('/api/files/:id*', vercelToExpress(filesHandler));

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Backend converted to Vercel Serverless Functions (Bridge Mode)');
  });
}

startServer();
