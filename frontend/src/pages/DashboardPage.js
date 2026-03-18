import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useConversationStore, useMessageStore, useTeamStore } from '../store';
import { useSocket, joinConversationRoom, leaveConversationRoom } from '../hooks/useSocket';
import Sidebar from '../components/layout/Sidebar';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import { EmptyState } from '../components/chat/EmptyState';
import TemplatesPage from './TemplatesPage';
import SettingsPage from './SettingsPage';
import TeamPage from './TeamPage';
import AnalyticsPage from './AnalyticsPage';
import ContactsPage from './ContactsPage';
import SuperAdminPage from './SuperAdminPage';
import FlowsPage       from './FlowsPage';
import BroadcastsPage from './BroadcastsPage';
import CommercePage   from './CommercePage';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore(s => s.user);
  const { conversations, activeConversation, setActiveConversation, fetchConversations } = useConversationStore();
  const { fetchMessages } = useMessageStore();
  const { fetchQueue } = useTeamStore();
  const [activeTab, setActiveTab] = React.useState(useLocation().state?.tab || 'chats');

  const socket = useSocket(user);

  // Sync tab with URL
  useEffect(() => {
    if (location.pathname === '/super-admin') {
      setActiveTab('super-admin');
    } else {
      if (activeTab === 'super-admin') setActiveTab('chats');
    }
  }, [location.pathname]);

  useEffect(() => {
    fetchConversations({ status: 'open' });
    fetchQueue();
  }, []);

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

  const handleTabChange = (tab) => {
    if (tab === 'super-admin') {
      navigate('/super-admin');
    } else {
      if (location.pathname === '/super-admin') navigate('/');
      setActiveTab(tab);
    }
  };

  const handleSelect = async (conv) => {
    if (activeConversation) leaveConversationRoom(activeConversation.id);
    setActiveConversation(conv);
    joinConversationRoom(conv.id);
    fetchMessages(conv.id);
  };

  const renderMain = () => {
    if (activeTab === 'super-admin') return <SuperAdminPage />;
    if (activeTab === 'templates')   return <TemplatesPage />;
    if (activeTab === 'settings')    return <SettingsPage />;
    if (activeTab === 'team')        return <TeamPage />;
    if (activeTab === 'analytics')   return <AnalyticsPage />;
    if (activeTab === 'contacts')    return <ContactsPage />;
    if (activeTab === 'broadcasts')  return <BroadcastsPage />;
    if (activeTab === 'flows')       return <FlowsPage />;
    if (activeTab === 'commerce')    return <CommercePage />;
    return activeConversation ? <ChatWindow conversation={activeConversation} /> : <EmptyState />;
  };

  const isMobile = window.innerWidth <= 768;

  return (
    <div style={{display:'flex', height:'100vh', background:'#0b0e14', overflow:'hidden', color:'#e2e8f0', flexDirection:'row'}}>
      {!isMobile && <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />}
      {activeTab === 'chats' && (
        <ConversationList
          conversations={conversations}
          activeId={activeConversation?.id}
          onSelect={handleSelect}
        />
      )}
      <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden', paddingBottom: isMobile ? '64px' : '0'}}>
        {renderMain()}
      </div>
      {isMobile && <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />}
    </div>
  );
}
