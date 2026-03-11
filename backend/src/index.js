require('dotenv').config();
const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const { Server } = require('socket.io');

const { pool }          = require('./config/database');
const authRoutes        = require('./routes/auth');
const webhookRoutes     = require('./routes/webhook');
const messageRoutes     = require('./routes/messages');
const contactRoutes     = require('./routes/contacts');
const convRoutes        = require('./routes/conversations');
const { authenticateToken } = require('./middleware/auth');
const { limiter }       = require('./middleware/rateLimiter');
const { initSocket }    = require('./services/socketService');
const errorHandler      = require('./middleware/errorHandler');
const aiRoutes          = require('./routes/ai');
const { runAutoResume } = require('./routes/ai');

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
initSocket(io);
app.set('io', io);

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/webhook', express.raw({ type: 'application/json' }));
app.use('/uploads', require('express').static('/app/uploads'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/', limiter);

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', message: 'DB unavailable' });
  }
});

app.use('/webhook',           webhookRoutes);
app.use('/api/auth',          authRoutes);
app.use('/api/conversations', authenticateToken, convRoutes);
app.use('/api/messages',      authenticateToken, messageRoutes);
app.use('/api/contacts',      authenticateToken, contactRoutes);
app.use('/api/media',         authenticateToken, require('./routes/media'));
app.use('/api/messages/send-media',     authenticateToken, require('./routes/sendmedia'));
app.use('/api/messages/send-template',  authenticateToken, require('./routes/sendtemplate'));
app.use('/api/team',          require('./routes/team'));
app.use('/api/templates',     authenticateToken, require('./routes/templates'));
app.use('/api/messages/send-sticker', authenticateToken, require('./routes/sendsticker'));
app.use('/api/notes',         authenticateToken, require('./routes/notes'));
app.use('/api/canned',        authenticateToken, require('./routes/canned'));
app.use('/api/ai',            authenticateToken, aiRoutes);
app.use('/api/analytics',     authenticateToken, require('./routes/analytics'));
app.use('/api/segments',      authenticateToken, require('./routes/segments'));
app.use('/api/broadcasts',    authenticateToken, require('./routes/broadcasts'));

app.use(errorHandler);

setInterval(runAutoResume, 5 * 60 * 1000);
runAutoResume();

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🚀 Sanestix Flow backend running on port ${PORT}`);
  console.log(`   ENV: ${process.env.NODE_ENV}`);
  console.log(`   DB:  ${process.env.DB_NAME}@${process.env.DB_HOST}\n`);
});

module.exports = { app, server };
