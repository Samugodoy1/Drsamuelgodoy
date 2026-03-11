import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

// Import serverless handlers
import loginHandler from './api/auth/login.js';
import registerHandler from './api/auth/register.js';
import patientsHandler from './api/patients/index.js';
import dentistsHandler from './api/dentists/index.js';
import appointmentsHandler from './api/appointments/index.js';
import adminUsersHandler from './api/admin/users.js';
import profileHandler from './api/profile/index.js';
import financeHandler from './api/finance/index.js';
import updateSchemaHandler from './api/admin/update-schema.js';
import filesHandler from './api/files.js';
import healthHandler from './api/health.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  
  // Security headers - Configured for AI Studio iframe environment
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "https://picsum.photos", "https://*.run.app"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "connect-src": ["'self'", "https://*.run.app", "wss://*.run.app"],
        "frame-ancestors": ["'self'", "https://*.run.app", "https://*.google.com", "https://ai.studio"],
      },
    },
    crossOriginEmbedderPolicy: false,
    frameguard: false, // Allow iframe embedding
  }));

  app.use(cookieParser());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Helper to convert Vercel handler to Express handler
  const vercelToExpress = (handler: any) => async (req: any, res: any) => {
    try {
      console.log(`Executing handler for ${req.method} ${req.originalUrl}`);
      // Merge params into query for Vercel compatibility
      req.query = { ...req.query, ...req.params };
      await handler(req, res);
    } catch (error: any) {
      console.error('Serverless handler error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  // API Routes (matching vercel.json rewrites)
  const apiRouter = express.Router();
  
  apiRouter.use((req, res, next) => {
    console.log(`API Request: ${req.method} ${req.url}`);
    next();
  });

  apiRouter.post('/auth/login', vercelToExpress(loginHandler));
  apiRouter.post('/auth/register', vercelToExpress(registerHandler));
  apiRouter.get('/health', vercelToExpress(healthHandler));
  
  apiRouter.all(['/patients', '/patients/:id*'], vercelToExpress(patientsHandler));
  apiRouter.all(['/dentists', '/dentists/:id*'], vercelToExpress(dentistsHandler));
  apiRouter.all(['/appointments', '/appointments/:id*'], vercelToExpress(appointmentsHandler));
  apiRouter.all('/admin/users*', vercelToExpress(adminUsersHandler));
  apiRouter.all(['/profile', '/profile/:id*'], vercelToExpress(profileHandler));
  apiRouter.all(['/finance', '/finance/:id*'], vercelToExpress(financeHandler));
  apiRouter.all('/admin/update-schema', vercelToExpress(updateSchemaHandler));
  apiRouter.all(['/files', '/files/:id*'], vercelToExpress(filesHandler));

  apiRouter.all('*', (req, res) => {
    res.status(404).json({ error: `API Route ${req.method} ${req.url} not found` });
  });

  app.use('/api', apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
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

startServer().catch(err => {
  console.error('CRITICAL: Failed to start server:', err);
  process.exit(1);
});
