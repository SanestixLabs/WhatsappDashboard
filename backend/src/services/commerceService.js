const { query } = require('../config/database');
const whatsappService = require('./whatsappService');

// ── ORDER STATUS LABELS ──
const STATUS_MESSAGES = {
  pending:   'Your order has been received and is pending confirmation.',
  confirmed: 'Your order has been confirmed and is being prepared.',
  shipped:   'Great news! Your order has been shipped.',
  delivered: 'Your order has been delivered. Thank you!',
  cancelled: 'Your order has been cancelled.'
};

// ── PRODUCTS ──
const listProducts = async (workspaceId) => {
  const result = await query(
    `SELECT * FROM products WHERE workspace_id = $1 ORDER BY created_at DESC`,
    [workspaceId]
  );
  return result.rows;
};

const getProduct = async (id, workspaceId) => {
  const result = await query(
    `SELECT * FROM products WHERE id = $1 AND workspace_id = $2`,
    [id, workspaceId]
  );
  return result.rows[0] || null;
};

const createProduct = async (workspaceId, data) => {
  const { name, description, price, currency, image_url, meta_product_id, stock } = data;
  const result = await query(
    `INSERT INTO products (workspace_id, name, description, price, currency, image_url, meta_product_id, stock)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [workspaceId, name, description || null, price, currency || 'PKR', image_url || null, meta_product_id || null, stock ?? null]
  );
  return result.rows[0];
};

const updateProduct = async (id, workspaceId, data) => {
  const { name, description, price, currency, image_url, meta_product_id, is_active, stock } = data;
  const result = await query(
    `UPDATE products SET
      name = COALESCE($1, name),
      description = COALESCE($2, description),
      price = COALESCE($3, price),
      currency = COALESCE($4, currency),
      image_url = COALESCE($5, image_url),
      meta_product_id = COALESCE($6, meta_product_id),
      is_active = COALESCE($7, is_active),
      stock = COALESCE($8, stock),
      updated_at = NOW()
     WHERE id = $9 AND workspace_id = $10 RETURNING *`,
    [name, description, price, currency, image_url, meta_product_id, is_active, stock, id, workspaceId]
  );
  return result.rows[0] || null;
};

const deleteProduct = async (id, workspaceId) => {
  await query(`DELETE FROM products WHERE id = $1 AND workspace_id = $2`, [id, workspaceId]);
};

// ── ORDERS ──
const listOrders = async (workspaceId, filters = {}) => {
  let sql = `
    SELECT o.*, c.name as contact_name, c.phone_number as contact_phone
    FROM orders o
    LEFT JOIN contacts c ON c.id = o.contact_id
    WHERE o.workspace_id = $1
  `;
  const params = [workspaceId];

  if (filters.status) {
    params.push(filters.status);
    sql += ` AND o.status = $${params.length}`;
  }
  if (filters.contact_id) {
    params.push(filters.contact_id);
    sql += ` AND o.contact_id = $${params.length}`;
  }

  sql += ` ORDER BY o.created_at DESC`;

  if (filters.limit) {
    params.push(parseInt(filters.limit));
    sql += ` LIMIT $${params.length}`;
  }

  const result = await query(sql, params);
  return result.rows;
};

const getOrder = async (id, workspaceId) => {
  const result = await query(
    `SELECT o.*, c.name as contact_name, c.phone_number as contact_phone
     FROM orders o
     LEFT JOIN contacts c ON c.id = o.contact_id
     WHERE o.id = $1 AND o.workspace_id = $2`,
    [id, workspaceId]
  );
  return result.rows[0] || null;
};

const createOrder = async (workspaceId, data) => {
  const { contact_id, items, total_amount, currency, notes, payment_provider, payment_link_url } = data;
  const result = await query(
    `INSERT INTO orders (workspace_id, contact_id, items, total_amount, currency, notes, payment_provider, payment_link_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [workspaceId, contact_id || null, JSON.stringify(items || []), total_amount || 0, currency || 'PKR', notes || null, payment_provider || null, payment_link_url || null]
  );
  return result.rows[0];
};

const updateOrderStatus = async (id, workspaceId, status) => {
  const result = await query(
    `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND workspace_id = $3 RETURNING *`,
    [status, id, workspaceId]
  );
  return result.rows[0] || null;
};

const updateOrder = async (id, workspaceId, data) => {
  const { status, payment_status, payment_link_url, payment_provider, notes } = data;
  const result = await query(
    `UPDATE orders SET
      status = COALESCE($1, status),
      payment_status = COALESCE($2, payment_status),
      payment_link_url = COALESCE($3, payment_link_url),
      payment_provider = COALESCE($4, payment_provider),
      notes = COALESCE($5, notes),
      updated_at = NOW()
     WHERE id = $6 AND workspace_id = $7 RETURNING *`,
    [status, payment_status, payment_link_url, payment_provider, notes, id, workspaceId]
  );
  return result.rows[0] || null;
};

// ── SEND ORDER NOTIFICATION VIA WHATSAPP ──
const sendOrderNotification = async (orderId, workspaceId, io) => {
  const order = await getOrder(orderId, workspaceId);
  if (!order || !order.contact_phone) return { sent: false, reason: 'No contact phone' };

  const statusMsg = STATUS_MESSAGES[order.status] || `Order status updated to: ${order.status}`;
  const itemLines = (order.items || []).map(i => `- ${i.name} x${i.qty} @ ${order.currency} ${i.price}`).join('\n');
  const paymentLine = order.payment_link_url ? `\nPay here: ${order.payment_link_url}` : '';

  const message = `Order #${order.order_number}\n${statusMsg}\n\n${itemLines}\n\nTotal: ${order.currency} ${order.total_amount}${paymentLine}`;

  const convResult = await query(
    `SELECT id FROM conversations WHERE contact_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [order.contact_id]
  );
  const conversationId = convResult.rows[0]?.id || null;

  await whatsappService.sendTextMessage(order.contact_phone, message, conversationId, io);
  return { sent: true };
};

// ── PAYMENT LINKS ──
const createPaymentLink = async (orderId, data) => {
  const { provider, external_id, amount, url, expires_at } = data;
  const result = await query(
    `INSERT INTO payment_links (order_id, provider, external_id, amount, url, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [orderId, provider || 'manual', external_id || null, amount, url, expires_at || null]
  );
  // Also update order with the payment link url
  await query(
    `UPDATE orders SET payment_link_url = $1, payment_provider = $2, updated_at = NOW() WHERE id = $3`,
    [url, provider || 'manual', orderId]
  );
  return result.rows[0];
};

const getOrderStats = async (workspaceId) => {
  const result = await query(
    `SELECT
      COUNT(*) FILTER (WHERE status = 'pending')   as pending,
      COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
      COUNT(*) FILTER (WHERE status = 'shipped')   as shipped,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
      COUNT(*) as total,
      COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'paid'), 0) as total_revenue
     FROM orders WHERE workspace_id = $1`,
    [workspaceId]
  );
  return result.rows[0];
};

module.exports = {
  listProducts, getProduct, createProduct, updateProduct, deleteProduct,
  listOrders, getOrder, createOrder, updateOrderStatus, updateOrder,
  sendOrderNotification, createPaymentLink, getOrderStats
};
