const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const commerce = require('../services/commerceService');
const { sendProductMessage } = require('../services/whatsappService');
const { query } = require('../config/database');

router.use(authenticateToken);

// ── STATS ──
router.get('/stats', async (req, res) => {
  try {
    const stats = await commerce.getOrderStats(req.workspaceId);
    res.json(stats);
  } catch (err) {
    console.error('[Commerce] stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── PRODUCTS ──
router.get('/products', async (req, res) => {
  try {
    const products = await commerce.listProducts(req.workspaceId);
    res.json(products);
  } catch (err) {
    console.error('[Commerce] list products error:', err.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/products', async (req, res) => {
  try {
    const { name, price } = req.body;
    if (!name || price === undefined) return res.status(400).json({ error: 'name and price are required' });
    const product = await commerce.createProduct(req.workspaceId, req.body);
    res.status(201).json(product);
  } catch (err) {
    console.error('[Commerce] create product error:', err.message);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const product = await commerce.updateProduct(req.params.id, req.workspaceId, req.body);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error('[Commerce] update product error:', err.message);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const product = await commerce.getProduct(req.params.id, req.workspaceId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    await commerce.deleteProduct(req.params.id, req.workspaceId);
    res.json({ success: true });
  } catch (err) {
    console.error('[Commerce] delete product error:', err.message);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ── ORDERS ──
router.get('/orders', async (req, res) => {
  try {
    const { status, contact_id, limit } = req.query;
    const orders = await commerce.listOrders(req.workspaceId, { status, contact_id, limit });
    res.json(orders);
  } catch (err) {
    console.error('[Commerce] list orders error:', err.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const order = await commerce.getOrder(req.params.id, req.workspaceId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error('[Commerce] get order error:', err.message);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const { items, total_amount } = req.body;
    if (!items || !total_amount) return res.status(400).json({ error: 'items and total_amount are required' });
    const order = await commerce.createOrder(req.workspaceId, req.body);
    res.status(201).json(order);
  } catch (err) {
    console.error('[Commerce] create order error:', err.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

router.patch('/orders/:id', async (req, res) => {
  try {
    const order = await commerce.updateOrder(req.params.id, req.workspaceId, req.body);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error('[Commerce] update order error:', err.message);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

router.post('/orders/:id/notify', async (req, res) => {
  try {
    const order = await commerce.getOrder(req.params.id, req.workspaceId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const result = await commerce.sendOrderNotification(req.params.id, req.workspaceId, req.app.get('io'));
    res.json(result);
  } catch (err) {
    console.error('[Commerce] notify error:', err.message);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// ── PAYMENT LINKS ──
router.post('/orders/:id/payment-link', async (req, res) => {
  try {
    const order = await commerce.getOrder(req.params.id, req.workspaceId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const { url, amount } = req.body;
    if (!url || !amount) return res.status(400).json({ error: 'url and amount are required' });
    const link = await commerce.createPaymentLink(req.params.id, req.body);
    res.status(201).json(link);
  } catch (err) {
    console.error('[Commerce] payment link error:', err.message);
    res.status(500).json({ error: 'Failed to create payment link' });
  }
});

module.exports = router;

// ── SEND PRODUCT TO CONVERSATION ──
router.post('/products/:id/send', async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) return res.status(400).json({ error: 'conversationId required' });

    const product = await commerce.getProduct(req.params.id, req.workspaceId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const convResult = await query(
      'SELECT c.*, ct.phone_number FROM conversations c JOIN contacts ct ON ct.id = c.contact_id WHERE c.id = $1 AND c.workspace_id = $2',
      [conversationId, req.workspaceId]
    );
    const conv = convResult.rows[0];
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });

    await sendProductMessage(conv.phone_number, product, conversationId, null);
    res.json({ success: true });
  } catch (err) {
    console.error('[Commerce] send product error:', err.message);
    res.status(500).json({ error: 'Failed to send product' });
  }
});

// ── IMAGE UPLOAD ──
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const imgStore = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = '/app/uploads/products';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random()*1e6) + path.extname(file.originalname));
  },
});
const imgUpload = multer({ storage: imgStore, limits: { fileSize: 5*1024*1024 } });

router.post('/upload-image', imgUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = '/uploads/products/' + req.file.filename;
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});
