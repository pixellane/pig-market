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
import { initInventoryRealtime, STOCK_UPDATE_EVENT } from './realtime/inventoryRealtime.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsRoot = path.join(__dirname, '../uploads');
const productsUploadDir = path.join(uploadsRoot, 'products');
fs.mkdirSync(productsUploadDir, { recursive: true });

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;

const io = new SocketServer(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
  },
  path: '/socket.io',
});

initInventoryRealtime(io);

io.on('connection', (socket) => {
  socket.emit('stock:connected', { event: STOCK_UPDATE_EVENT });
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
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

app.get('/', (req, res) => res.json({ message: 'Pig Market API' }));

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

seedProductsIfEmpty()
  .catch((err) => { console.warn('Seeding skipped:', err.message || err); })
  .finally(() => {
    server.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  });
