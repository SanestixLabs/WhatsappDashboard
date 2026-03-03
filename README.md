# Sanestix Flow

**Internal WhatsApp Automation Dashboard** — single-tenant MVP, architected for SaaS scale.

```
Customer → WhatsApp → Meta Cloud API → Backend Webhook
  Backend: Store → Trigger n8n → Receive Reply → Send → Emit Socket
  Frontend: Real-time dashboard with conversation management
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        NGINX (SSL)                       │
│  /webhook → backend   /api → backend   / → frontend     │
│  /socket.io → backend (WebSocket upgrade)               │
└────────────┬───────────────────┬────────────────────────┘
             │                   │
     ┌───────▼───────┐   ┌───────▼───────┐
     │    Backend     │   │   Frontend    │
     │   Node/Express │   │  React + TS  │
     │   Socket.io    │   │  Socket.io   │
     │   Port 4000    │   │  Port 80     │
     └───────┬───────┘   └───────────────┘
             │
     ┌───────▼───────┐
     │  PostgreSQL   │
     │  Port 5432    │
     └───────────────┘
             │
     ┌───────▼───────┐
     │   n8n Webhook │
     │  (external)   │
     └───────────────┘
```

---

## Prerequisites

- Docker + Docker Compose
- Domain with DNS pointing to your VPS
- Meta Developer App with WhatsApp Business API access
- n8n instance with webhook node

---

## Quick Start

### 1. Clone and configure

```bash
git clone <repo> sanestix-flow
cd sanestix-flow

# Copy and fill in environment variables
cp .env.example .env
nano .env
```

### 2. Configure NGINX domain

```bash
# Replace YOUR_DOMAIN.com in nginx config
sed -i 's/YOUR_DOMAIN.com/yourdomain.com/g' nginx/conf.d/sanestix.conf
```

### 3. Obtain SSL certificate

```bash
# First run: HTTP only to get cert
docker compose up nginx certbot -d

certbot certonly --webroot \
  -w /var/www/certbot \
  -d yourdomain.com \
  --email you@email.com \
  --agree-tos --non-interactive
```

### 4. Start all services

```bash
docker compose up -d --build

# Verify all containers are healthy
docker compose ps
docker compose logs -f backend
```

### 5. Configure Meta Webhook

In the [Meta Developer Console](https://developers.facebook.com):

1. Go to your App → WhatsApp → Configuration
2. Set **Callback URL**: `https://yourdomain.com/webhook`
3. Set **Verify Token**: value of `META_VERIFY_TOKEN` in your `.env`
4. Subscribe to: `messages`, `message_deliveries`, `message_reads`

---

## Database

Schema auto-loads from `database/schema.sql` on first run.

```bash
# Manual operations
docker compose exec postgres psql -U postgres -d sanestix_flow

# Backup
docker compose exec postgres pg_dump -U postgres sanestix_flow > backup.sql

# Restore
docker compose exec -T postgres psql -U postgres sanestix_flow < backup.sql
```

**Default admin credentials** (change immediately!):
- Email: `admin@sanestix.com`
- Password: `admin123`

---

## n8n Integration

Your n8n workflow receives this payload:

```json
{
  "phone_number": "+1234567890",
  "contact_name": "John Doe",
  "message_text": "Hello!",
  "message_type": "text",
  "conversation_id": "uuid",
  "message_id": "uuid"
}
```

Your n8n workflow **must return**:

```json
{
  "reply": "Your response message here"
}
```

If `reply` is null/missing, no message is sent.

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login → returns JWT tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Revoke tokens |
| GET  | `/api/auth/me` | Current user |

### Conversations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/conversations` | List (`?status=open&page=1`) |
| GET  | `/api/conversations/:id` | Single conversation |
| PATCH | `/api/conversations/:id` | Update status/automation |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/messages/:convId` | Message history |
| POST | `/api/messages/send` | Send manual message |

### Contacts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/contacts` | List contacts |
| GET  | `/api/contacts/:id` | Single contact |
| PATCH | `/api/contacts/:id` | Update name/tags |

---

## Socket.io Events

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `new_message` | `{ message, conversation }` | New incoming or outgoing message |
| `message_status_update` | `{ messageId, conversationId, status }` | WhatsApp delivery status |
| `conversation_updated` | `conversation` | Conversation metadata change |

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join_conversation` | `conversationId` | Subscribe to conversation updates |
| `leave_conversation` | `conversationId` | Unsubscribe |

---

## 24-Hour Session Rule

WhatsApp only allows free-form messages within 24 hours of the last incoming customer message.

- `conversations.session_expires_at` tracks the window
- Backend enforces this — returns `SESSION_EXPIRED` error if window is closed
- Frontend displays session status and blocks input accordingly
- Outside window: use **Template Messages** (`/api/messages/send-template` — add as needed)

---

## SaaS Migration Checklist

When ready to go multi-tenant:

```sql
-- Add tenant support
ALTER TABLE users          ADD COLUMN tenant_id UUID;
ALTER TABLE contacts       ADD COLUMN tenant_id UUID;
ALTER TABLE conversations  ADD COLUMN tenant_id UUID;
ALTER TABLE messages       ADD COLUMN tenant_id UUID;

-- Add indexes
CREATE INDEX ON contacts(tenant_id);
CREATE INDEX ON conversations(tenant_id);
CREATE INDEX ON messages(tenant_id);
```

Then:
- [ ] Add tenant middleware to all routes
- [ ] Row-level security policies in PostgreSQL
- [ ] Stripe billing integration
- [ ] Role-based access (owner/manager/agent) per tenant
- [ ] Template campaign manager
- [ ] Embedded WhatsApp signup flow
- [ ] Per-tenant n8n webhook URLs

---

## Security Notes

- All routes protected by JWT (except `/webhook` and `/api/auth/login`)
- Meta webhook verified by HMAC-SHA256 signature
- Refresh tokens are hashed (bcrypt) in DB and rotated on use
- Rate limiting on all API routes (stricter on auth)
- NGINX adds security headers and rate limiting
- Input validated with `express-validator`
- No sensitive data logged in production

---

## Monitoring

```bash
# View logs
docker compose logs -f backend
docker compose logs -f nginx

# Check DB
docker compose exec postgres psql -U postgres sanestix_flow -c "SELECT COUNT(*) FROM messages;"

# Webhook event audit
docker compose exec postgres psql -U postgres sanestix_flow \
  -c "SELECT event_type, processed, received_at FROM webhook_events ORDER BY received_at DESC LIMIT 20;"
```

---

## Project Structure

```
sanestix-flow/
├── backend/
│   ├── src/
│   │   ├── config/         # DB connection
│   │   ├── middleware/      # auth, rate limiting, error handling
│   │   ├── routes/          # REST API routes
│   │   └── services/        # webhook, whatsapp, n8n, socket
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── hooks/           # useSocket
│   │   ├── pages/           # Login, Dashboard
│   │   ├── services/        # axios API client
│   │   └── store/           # Zustand state
│   ├── Dockerfile
│   └── package.json
├── database/
│   └── schema.sql           # Full DB schema + triggers
├── nginx/
│   ├── nginx.conf
│   └── conf.d/sanestix.conf
├── docker-compose.yml
└── .env.example
```
