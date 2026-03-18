import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useConversationStore, useMessageStore } from '../store';
import toast from 'react-hot-toast';

export let socketInstance = null;

export const useSocket = (user) => {
  const socketRef = useRef(null);
  const { upsertConversation } = useConversationStore();
  const { addMessage, updateMessageStatus } = useMessageStore();
  const activeConvRef = useRef(null);

  useEffect(() => {
    const unsub = useConversationStore.subscribe(
      (s) => { activeConvRef.current = s.activeConversation; }
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || window.location.origin;
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    socketRef.current = socket;
    socketInstance = socket;
    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id, '| transport:', socket.io.engine.transport.name);
    });
    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
    });
    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });
    socket.on('new_message', ({ message, conversation, conversationId }) => {
      const convId = conversationId || conversation?.id || message?.conversation_id;
      if (!convId) return;
      addMessage(message, convId);
      if (conversation) {
        upsertConversation({
          ...conversation,
          last_message: message.content,
          last_message_at: message.timestamp || message.created_at,
          unread_count:
            activeConvRef.current?.id === convId
              ? 0
              : (conversation.unread_count || 0) + (message.direction === 'incoming' ? 1 : 0),
        });
      }
      if (message.direction === 'incoming' && activeConvRef.current?.id !== convId) {
        const name = conversation?.contact?.name || conversation?.contact_name || conversation?.phone_number || 'Unknown';
        toast('New message from ' + name, {
          duration: 4000,
          style: { background: '#1a1f2e', color: '#e2e8f0', border: '1px solid #2d3748' },
        });
      }
    });
    socket.on('message_status_update', ({ messageId, conversationId, status }) => {
      updateMessageStatus(messageId, conversationId, status);
    });
    socket.on('conversation_updated', (conv) => {
      upsertConversation(conv);
    });
    return () => {
      socket.disconnect();
      socketInstance = null;
    };
  }, [user]);

  return socketRef.current;
};

export const joinConversationRoom = (convId) => { socketInstance?.emit('join_conversation', convId); };
export const leaveConversationRoom = (convId) => { socketInstance?.emit('leave_conversation', convId); };
