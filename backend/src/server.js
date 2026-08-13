import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { Server as SocketServer } from 'socket.io';
import { fileURLToPath } from 'url';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import authRoutes from './routes/authRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import { seedProductsIfEmpty } from './utils/seedDatabase.js';
import upsertAdmin from '../scripts/upsert-admin.js';
import { initInventoryRealtime, STOCK_UPDATE_EVENT } from './realtime/inventoryRealtime.js';
import { initAdminRealtime, ADMIN_EVENTS } from './realtime/adminRealtime.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsRoot = path.join(__dirname, '../uploads');
const productsUploadDir = path.join(uploadsRoot, 'products');
fs.mkdirSync(productsUploadDir, { recursive: true });

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;

// Configure allowed origins for CORS and Socket.IO from environment variables.
// If CUSTOMER_URL and ADMIN_URL are not set, default to permissive behavior for development.
const allowedOrigins = [];
if (process.env.CUSTOMER_URL) allowedOrigins.push(process.env.CUSTOMER_URL);
if (process.env.ADMIN_URL) allowedOrigins.push(process.env.ADMIN_URL);

const socketCorsConfig = {
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Accept', 'Pragma'],
};

const io = new SocketServer(server, {
  cors: socketCorsConfig,
  path: '/socket.io',
});

initInventoryRealtime(io);
initAdminRealtime(io);

io.on('connection', (socket) => {
  socket.emit('stock:connected', { event: STOCK_UPDATE_EVENT });
  socket.emit('admin:connected', { events: Object.values(ADMIN_EVENTS) });
});

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests like curl/postman
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error('Not allowed by CORS'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Accept', 'Pragma'],
  credentials: true,
};

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// Use express cors with dynamic origin checking: allow requests with no origin (server-to-server)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));
// Prevent browsers/proxies from serving a cached product list after stock changes
app.set('etag', false);

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use('/uploads', express.static(uploadsRoot));
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/', (req, res) => res.json({ message: 'Heritage Hog Co. API' }));

app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'ZodError') {
    return res.status(400).json({ message: err.errors.map((e) => e.message).join(', ') });
  }
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size exceeds the limit of 5MB.' });
    }
    return res.status(400).json({ message: err.message || 'File upload failed' });
  }
  if (err.message && /Invalid file type/i.test(err.message)) {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: err.message || 'Internal server error' });
});

(async function startup() {
  try {
    await seedProductsIfEmpty();
  } catch (err) {
    console.warn('Seeding skipped:', err.message || err);
  }

  // Provision admin account if both ADMIN_EMAIL and ADMIN_PASSWORD are provided in the environment.
  // Do NOT fail startup if they are absent; just skip provisioning.
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    try {
      // upsert-admin.js is implemented as a safe upsert; call it and await completion.
      await upsertAdmin();
    } catch (err) {
      // Do not expose secrets. Log concise error and continue startup.
      console.warn('Admin provisioning encountered an error:', err && err.message ? err.message : String(err));
    }
  } else {
    // No admin env provided; skip provisioning silently.
  }

  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
})();
