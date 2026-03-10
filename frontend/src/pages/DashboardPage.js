import React, { useEffect } from 'react';
import { useAuthStore, useConversationStore, useMessageStore, useTeamStore } from '../store';
import { useSocket, joinConversationRoom, leaveConversationRoom } from '../hooks/useSocket';
import Sidebar from '../components/layout/Sidebar';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import { EmptyState } from '../components/chat/EmptyState';
import TemplatesPage from './TemplatesPage';
import TeamPage from './TeamPage';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const { conversations, activeConversation, setActiveConversation, fetchConversations } = useConversationStore();
  const { fetchMessages } = useMessageStore();
  const { fetchQueue } = useTeamStore();
  const [activeTab, setActiveTab] = React.useState('chats');

  const socket = useSocket(user);

  useEffect(() => {
    fetchConversations({ status: 'open' });
    fetchQueue();
  }, []);

  // Real-time queue notification
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      fetchQueue();
      toast((t) => (
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <span>📨 New conversation from <strong>{data.contactName}</strong></span>
          <button onClick={() => { setActiveTab('team'); toast.dismiss(t.id); }}
            style={{background:'#00a884',color:'white',border:'none',borderRadius:'6px',padding:'4px 10px',cursor:'pointer',fontSize:'12px'}}>
            View
          </button>
        </div>
      ), { duration: 6000 });
    };
    socket.on('queue_new_conversation', handler);
    return () => socket.off('queue_new_conversation', handler);
  }, [socket]);

  const handleSelect = async (conv) => {
    if (activeConversation) leaveConversationRoom(activeConversation.id);
    setActiveConversation(conv);
    joinConversationRoom(conv.id);
    fetchMessages(conv.id);
  };

  const renderMain = () => {
    if (activeTab === 'templates') return <TemplatesPage />;
    if (activeTab === 'team') return <TeamPage />;
    return activeConversation ? <ChatWindow conversation={activeConversation} /> : <EmptyState />;
  };

  const isMobile = window.innerWidth <= 768;

  return (
    <div style={{display:'flex', height:'100vh', background:'#0b0e14', overflow:'hidden', color:'#e2e8f0', flexDirection:'row'}}>
      {!isMobile && <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />}
      {(!isMobile || (isMobile && activeTab === 'chats' && !activeConversation)) && activeTab !== 'team' && activeTab !== 'templates' && (
        <ConversationList
          conversations={conversations}
          activeId={activeConversation?.id}
          onSelect={handleSelect}
        />
      )}
      <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden', paddingBottom: isMobile ? '64px' : '0'}}>
        {renderMain()}
      </div>
      {isMobile && <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />}
    </div>
  );
}

const s = {
  root:{ display:'flex', height:'100vh', background:'#0b0e14', overflow:'hidden', color:'#e2e8f0' },
  main:{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
};
