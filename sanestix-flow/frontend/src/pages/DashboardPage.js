import React, { useEffect } from 'react';
import { useAuthStore, useConversationStore, useMessageStore } from '../store';
import { useSocket, joinConversationRoom, leaveConversationRoom } from '../hooks/useSocket';
import Sidebar from '../components/layout/Sidebar';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import { EmptyState } from '../components/chat/EmptyState';

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const { conversations, activeConversation, setActiveConversation, fetchConversations } = useConversationStore();
  const { fetchMessages } = useMessageStore();
  const [activeTab, setActiveTab] = React.useState('chats');

  useSocket(user);

  useEffect(() => {
    fetchConversations({ status: 'open' });
  }, []);

  const handleSelect = async (conv) => {
    if (activeConversation) leaveConversationRoom(activeConversation.id);
    setActiveConversation(conv);
    joinConversationRoom(conv.id);
    fetchMessages(conv.id);
  };

  return (
    <div style={s.root}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <ConversationList
        conversations={conversations}
        activeId={activeConversation?.id}
        onSelect={handleSelect}
      />
      <div style={s.main}>
        {activeConversation
          ? <ChatWindow conversation={activeConversation} />
          : <EmptyState />
        }
      </div>
    </div>
  );
}

const s = {
  root:{
    display:'flex', height:'100vh', background:'#0b0e14',
    overflow:'hidden', color:'#e2e8f0',
  },
  main:{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
};
