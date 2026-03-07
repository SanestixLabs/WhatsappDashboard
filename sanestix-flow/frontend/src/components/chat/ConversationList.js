import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useConversationStore } from '../../store';

export default function ConversationList({ conversations, activeId, onSelect }) {
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('open');
  const { fetchConversations, total } = useConversationStore();

  const handleFilter = (f) => {
    setFilter(f);
    fetchConversations({ status: f });
  };

  const filtered = search
    ? conversations.filter(c =>
        c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone_number?.includes(search))
    : conversations;

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerTop}>
          <h2 style={s.title}>Chats</h2>
          <span style={s.count}>{total}</span>
        </div>

        {/* Search */}
        <div style={s.searchWrap}>
          <SearchIcon />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search or start new chat"
            style={s.searchInput}
          />
          {search && (
            <button onClick={() => setSearch('')} style={s.clearBtn}>
              <ClearIcon />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div style={s.tabs}>
          {['open','pending','closed'].map(f => (
            <button
              key={f}
              onClick={() => handleFilter(f)}
              style={{ ...s.tab, ...(filter === f ? s.tabActive : {}) }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {filter === f && <div style={s.tabUnderline} />}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={s.list}>
        {filtered.length === 0 ? (
          <div style={s.empty}>
            <EmptyIcon />
            <p>No {filter} conversations</p>
          </div>
        ) : (
          filtered.map((conv, i) => (
            <ConvItem
              key={conv.id}
              conv={conv}
              active={conv.id === activeId}
              onClick={() => onSelect(conv)}
              index={i}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConvItem({ conv, active, onClick, index }) {
  const name = conv.contact_name || conv.phone_number;
  const initials = conv.contact_name
    ? conv.contact_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : conv.phone_number?.slice(-2);

  const timeAgo = conv.last_message_at
    ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })
        .replace('about ', '').replace(' minutes', 'm').replace(' minute', 'm')
        .replace(' hours', 'h').replace(' hour', 'h').replace(' days', 'd')
        .replace(' day', 'd').replace('less than a m', '1m')
    : '';

  const preview = conv.last_message
    ? (conv.last_message_direction === 'outgoing' ? '✓ ' : '') + conv.last_message
    : 'No messages yet';

  const isExpired = conv.session_expires_at
    ? new Date(conv.session_expires_at) <= new Date()
    : true;

  // Avatar color based on name
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444'];
  const colorIdx = name ? name.charCodeAt(0) % colors.length : 0;

  return (
    <button
      className="conv-appear"
      onClick={onClick}
      style={{
        ...s.item,
        ...(active ? s.itemActive : {}),
        animationDelay: `${index * 0.03}s`,
      }}
    >
      {/* Avatar */}
      <div style={{ position:'relative', flexShrink:0 }}>
        <div style={{ ...s.avatar, background: colors[colorIdx] }}>
          {initials}
        </div>
        {conv.automation_enabled && !isExpired && (
          <div style={s.aiDot} title="AI Active" />
        )}
      </div>

      {/* Content */}
      <div style={s.itemContent}>
        <div style={s.itemRow}>
          <span style={s.itemName}>{name}</span>
          <span style={s.itemTime}>{timeAgo}</span>
        </div>
        <div style={s.itemRow}>
          <span style={s.itemPreview}>{preview}</span>
          {conv.unread_count > 0 && (
            <span style={s.badge}>
              {conv.unread_count > 99 ? '99+' : conv.unread_count}
            </span>
          )}
          {conv.automation_enabled && conv.unread_count === 0 && (
            <span style={s.aiBadge} title="AI ON">AI</span>
          )}
        </div>
      </div>
    </button>
  );
}

const SearchIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{position:'absolute',left:'12px',color:'#3d5068'}}><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/><path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const ClearIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const EmptyIcon = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{color:'#1e293b',marginBottom:'8px'}}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5"/></svg>;

const s = {
  root:{
    width:'320px', flexShrink:0,
    background:'#111827', borderRight:'1px solid #151f2e',
    display:'flex', flexDirection:'column', overflow:'hidden',
  },
  header:{ padding:'16px 16px 0', flexShrink:0 },
  headerTop:{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' },
  title:{ fontSize:'20px', fontWeight:'700', color:'#f1f5f9', letterSpacing:'-0.02em' },
  count:{
    background:'rgba(34,211,238,0.1)', color:'#22d3ee',
    fontSize:'11px', fontWeight:'700', padding:'2px 8px', borderRadius:'10px',
  },
  searchWrap:{
    position:'relative', display:'flex', alignItems:'center', marginBottom:'12px',
  },
  searchInput:{
    width:'100%', background:'#0f1623', border:'1px solid #1e293b',
    borderRadius:'10px', padding:'9px 36px', fontSize:'13px', color:'#94a3b8',
    outline:'none', transition:'border-color 0.15s',
    boxSizing:'border-box',
  },
  clearBtn:{
    position:'absolute', right:'10px', background:'none', border:'none',
    cursor:'pointer', color:'#3d5068', display:'flex', alignItems:'center',
  },
  tabs:{ display:'flex', borderBottom:'1px solid #151f2e' },
  tab:{
    flex:1, padding:'8px 0', background:'none', border:'none',
    fontSize:'13px', fontWeight:'500', color:'#3d5068',
    cursor:'pointer', position:'relative', transition:'color 0.15s',
  },
  tabActive:{ color:'#22d3ee' },
  tabUnderline:{
    position:'absolute', bottom:'-1px', left:'20%', right:'20%',
    height:'2px', background:'#22d3ee', borderRadius:'2px 2px 0 0',
  },
  list:{ flex:1, overflowY:'auto' },
  empty:{
    display:'flex', flexDirection:'column', alignItems:'center',
    justifyContent:'center', height:'200px', color:'#1e293b', fontSize:'13px',
  },
  item:{
    width:'100%', background:'transparent', border:'none', borderBottom:'1px solid #0f1623',
    padding:'12px 16px', display:'flex', alignItems:'center', gap:'12px',
    cursor:'pointer', transition:'background 0.1s', textAlign:'left',
  },
  itemActive:{ background:'#1a2535' },
  avatar:{
    width:'46px', height:'46px', borderRadius:'50%',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:'14px', fontWeight:'700', color:'white', flexShrink:0,
  },
  aiDot:{
    position:'absolute', bottom:'1px', right:'1px',
    width:'10px', height:'10px', borderRadius:'50%',
    background:'#22d3ee', border:'2px solid #111827',
  },
  itemContent:{ flex:1, minWidth:0 },
  itemRow:{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' },
  itemName:{ fontSize:'14px', fontWeight:'600', color:'#e2e8f0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  itemTime:{ fontSize:'11px', color:'#334155', flexShrink:0 },
  itemPreview:{ fontSize:'13px', color:'#475569', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', flex:1 },
  badge:{
    background:'#22d3ee', color:'#020617', fontSize:'10px', fontWeight:'800',
    borderRadius:'10px', minWidth:'18px', height:'18px', padding:'0 5px',
    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
  },
  aiBadge:{
    background:'rgba(34,211,238,0.1)', color:'#22d3ee', border:'1px solid rgba(34,211,238,0.2)',
    fontSize:'9px', fontWeight:'700', borderRadius:'4px', padding:'1px 4px', flexShrink:0,
  },
};
