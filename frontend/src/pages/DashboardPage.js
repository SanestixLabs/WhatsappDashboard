import React, { useEffect } from 'react';
import { useAuthStore, useConversationStore, useMessageStore } from '../store';
import { useSocket, joinConversationRoom, leaveConversationRoom } from '../hooks/useSocket';
import Sidebar from '../components/layout/Sidebar';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import EmptyState from '../components/chat/EmptyState';

export default function DashboardPage() {
  const user                = useAuthStore((s) => s.user);
  const { conversations, activeConversation, setActiveConversation, fetchConversations } = useConversationStore();
  const { fetchMessages }   = useMessageStore();

  useSocket(user);

  useEffect(() => {
    fetchConversations({ status: 'open' });
  }, []);

  const handleSelectConversation = async (conv) => {
    // Leave previous room
    if (activeConversation) leaveConversationRoom(activeConversation.id);

    setActiveConversation(conv);

    // Join new room + load messages
    joinConversationRoom(conv.id);
    fetchMessages(conv.id);
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Left sidebar */}
      <Sidebar />

      {/* Conversation list */}
      <ConversationList
        conversations={conversations}
        activeId={activeConversation?.id}
        onSelect={handleSelectConversation}
      />

      {/* Chat window */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeConversation
          ? <ChatWindow conversation={activeConversation} />
          : <EmptyState />
        }
      </div>
    </div>
  );
}
