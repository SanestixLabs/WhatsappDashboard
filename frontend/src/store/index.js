import { create } from 'zustand';
import api from '../services/api';

// ── Auth Store ────────────────────────────────────────────────
export const useAuthStore = create((set) => ({
  user:    JSON.parse(localStorage.getItem('user') || 'null'),
  loading: false,
  error:   null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { accessToken, refreshToken, user } = res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, loading: false });
      return true;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Login failed', loading: false });
      return false;
    }
  },

  logout: async () => {
    try { await api.post('/api/auth/logout'); } catch {}
    localStorage.clear();
    set({ user: null });
  },
}));

// ── Conversations Store ───────────────────────────────────────
export const useConversationStore = create((set, get) => ({
  conversations:      [],
  activeConversation: null,
  loading:            false,
  total:              0,

  fetchConversations: async (params = {}) => {
    set({ loading: true });
    try {
      const res = await api.get('/api/conversations', { params: { limit: 30, ...params } });
      set({ conversations: res.data.conversations, total: res.data.total, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setActiveConversation: async (conv) => {
    set({ activeConversation: conv });
    if (conv) {
      // Mark as read
      await api.get(`/api/conversations/${conv.id}`).catch(() => {});
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === conv.id ? { ...c, unread_count: 0 } : c
        ),
      }));
    }
  },

  toggleAutomation: async (convId, enabled) => {
    await api.patch(`/api/conversations/${convId}`, { automation_enabled: enabled });
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId ? { ...c, automation_enabled: enabled } : c
      ),
      activeConversation:
        s.activeConversation?.id === convId
          ? { ...s.activeConversation, automation_enabled: enabled }
          : s.activeConversation,
    }));
  },

  closeConversation: async (convId) => {
    await api.patch(`/api/conversations/${convId}`, { status: 'closed' });
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== convId),
      activeConversation: s.activeConversation?.id === convId ? null : s.activeConversation,
    }));
  },

  // Called by socket events
  upsertConversation: (conv) => {
    set((s) => {
      const idx = s.conversations.findIndex((c) => c.id === conv.id);
      if (idx === -1) {
        return { conversations: [conv, ...s.conversations] };
      }
      const updated = [...s.conversations];
      updated[idx] = { ...updated[idx], ...conv };
      // Re-sort by last message
      updated.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
      return { conversations: updated };
    });
  },
}));

// ── Messages Store ────────────────────────────────────────────
export const useMessageStore = create((set, get) => ({
  messagesByConv: {}, // { [convId]: Message[] }
  loading:        false,
  sending:        false,

  fetchMessages: async (conversationId) => {
    set({ loading: true });
    try {
      const res = await api.get(`/api/messages/${conversationId}`, { params: { limit: 50 } });
      set((s) => ({
        messagesByConv: { ...s.messagesByConv, [conversationId]: res.data.messages },
        loading: false,
      }));
    } catch {
      set({ loading: false });
    }
  },

  sendMessage: async (conversationId, text) => {
    set({ sending: true });
    try {
      const res = await api.post('/api/messages/send', { conversationId, text });
      set((s) => ({
        messagesByConv: {
          ...s.messagesByConv,
          [conversationId]: [...(s.messagesByConv[conversationId] || []), res.data],
        },
        sending: false,
      }));
      return { ok: true };
    } catch (err) {
      set({ sending: false });
      return { ok: false, error: err.response?.data?.error || 'Failed to send' };
    }
  },

  addMessage: (message, conversationId) => {
    const convId = conversationId || message.conversation_id;
    set((s) => ({
      messagesByConv: {
        ...s.messagesByConv,
        [convId]: [...(s.messagesByConv[convId] || []), message],
      },
    }));
  },

  updateMessageStatus: (messageId, conversationId, status) => {
    set((s) => {
      const msgs = s.messagesByConv[conversationId];
      if (!msgs) return {};
      return {
        messagesByConv: {
          ...s.messagesByConv,
          [conversationId]: msgs.map((m) =>
            m.id === messageId ? { ...m, status } : m
          ),
        },
      };
    });
  },
}));
