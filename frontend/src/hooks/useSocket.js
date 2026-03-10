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

  // Keep track of active conversation for notifications
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

    const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:4000', {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;
    socketInstance    = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    // New incoming or outgoing message
    socket.on('new_message', ({ message, conversation, conversationId }) => {
      const convId = conversationId || conversation?.id || message?.conversation_id;
      if (!convId) return;

      addMessage(message, convId);

      // Update conversation list
      if (conversation) {
        upsertConversation({
          ...conversation,
          last_message: message.content,
          last_message_at: message.timestamp,
          unread_count:
            activeConvRef.current?.id === convId
              ? 0
              : (conversation.unread_count || 0) + (message.direction === 'incoming' ? 1 : 0),
        });
      }

      // Desktop notification for incoming messages when not in that conversation
      if (
        message.direction === 'incoming' &&
        activeConvRef.current?.id !== convId
      ) {
        toast(`💬 New message from ${conversation?.contact_name || conversation?.phone_number}`, {
          duration: 4000,
          style: { background: '#1a1f2e', color: '#e2e8f0', border: '1px solid #2d3748' },
        });
      }
    });

    // Message delivery/read status
    socket.on('message_status_update', ({ messageId, conversationId, status }) => {
      updateMessageStatus(messageId, conversationId, status);
    });

    // Conversation metadata update
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

// Utility to join/leave conversation rooms
export const joinConversationRoom = (convId) => {
  socketInstance?.emit('join_conversation', convId);
};

export const leaveConversationRoom = (convId) => {
  socketInstance?.emit('leave_conversation', convId);
};
