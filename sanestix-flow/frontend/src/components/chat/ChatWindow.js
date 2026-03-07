import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { useMessageStore, useConversationStore } from '../../store';
import toast from 'react-hot-toast';

export default function ChatWindow({ conversation }) {
  const [text, setText]         = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const bottomRef               = useRef(null);
  const inputRef                = useRef(null);
  const { messagesByConv, sending, sendMessage } = useMessageStore();
  const { toggleAutomation, closeConversation }  = useConversationStore();
  const messages = messagesByConv[conversation.id] || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    inputRef.current?.focus();
    setText('');
  }, [conversation.id]);

  const handleSend = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setText('');
    const r = await sendMessage(conversation.id, t);
    if (!r.ok) {
      toast.error(r.error || 'Failed to send');
      setText(t);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const isExpired = conversation.session_expires_at
    ? new Date(conversation.session_expires_at) <= new Date()
    : true;

  const name = conversation.contact_name || conversation.phone_number;
  const initials = conversation.contact_name
    ? conversation.contact_name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)
    : conversation.phone_number?.slice(-2);

  const grouped = groupByDate(messages);

  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6'];
  const avatarColor = colors[name ? name.charCodeAt(0) % colors.length : 0];

  return (
    <div style={s.root}>
      {/* Top bar */}
      <div style={s.topBar}>
        <div style={s.contactInfo} onClick={() => setShowInfo(!showInfo)}>
          <div style={{ ...s.avatar, background: avatarColor }}>{initials}</div>
          <div>
            <div style={s.contactName}>{name}</div>
            <div style={s.contactSub}>
              {isExpired
                ? <span style={{color:'#ef4444'}}>● Session expired</span>
                : <span style={{color:'#22d3ee'}}>● Active session</span>
              }
              <span style={{color:'#334155', marginLeft:'8px'}}>{conversation.phone_number}</span>
            </div>
          </div>
        </div>

        <div style={s.topActions}>
          {/* AI Toggle */}
          <div style={s.aiToggleWrap}>
            <span style={s.aiLabel}>AI Agent</span>
            <button
              onClick={() => toggleAutomation(conversation.id, !conversation.automation_enabled)}
              style={{
                ...s.toggle,
                background: conversation.automation_enabled ? '#22d3ee' : '#1e293b',
              }}
              title={conversation.automation_enabled ? 'Disable AI — take over manually' : 'Enable AI automation'}
            >
              <div style={{
                ...s.toggleThumb,
                transform: conversation.automation_enabled ? 'translateX(18px)' : 'translateX(2px)',
              }} />
            </button>
            <span style={{
              ...s.aiStatus,
              color: conversation.automation_enabled ? '#22d3ee' : '#3d5068',
            }}>
              {conversation.automation_enabled ? 'ON' : 'OFF'}
            </span>
          </div>

          {/* Search */}
          <ActionBtn title="Search messages"><SearchIcon /></ActionBtn>

          {/* Close */}
          <ActionBtn title="Close conversation" onClick={() => closeConversation(conversation.id)}>
            <CloseIcon />
          </ActionBtn>
        </div>
      </div>

      {/* Contact info panel */}
      {showInfo && (
        <div style={s.infoPanel}>
          <div style={s.infoPanelInner}>
            <div style={{...s.infoAvatar, background: avatarColor}}>{initials}</div>
            <div style={s.infoName}>{name}</div>
            <div style={s.infoPhone}>{conversation.phone_number}</div>
            <div style={s.infoStats}>
              <div style={s.infoStat}>
                <span style={s.infoStatVal}>{messages.length}</span>
                <span style={s.infoStatLabel}>Messages</span>
              </div>
              <div style={s.infoStat}>
                <span style={s.infoStatVal}>{messages.filter(m=>m.direction==='incoming').length}</span>
                <span style={s.infoStatLabel}>Received</span>
              </div>
              <div style={s.infoStat}>
                <span style={s.infoStatVal}>{messages.filter(m=>m.direction==='outgoing').length}</span>
                <span style={s.infoStatLabel}>Sent</span>
              </div>
            </div>
            <div style={s.infoRow}>
              <span style={s.infoKey}>Status</span>
              <span style={{...s.infoVal, color: conversation.status==='open'?'#22c55e':'#94a3b8', textTransform:'capitalize'}}>
                {conversation.status}
              </span>
            </div>
            <div style={s.infoRow}>
              <span style={s.infoKey}>Session</span>
              <span style={{...s.infoVal, color: isExpired?'#ef4444':'#22d3ee'}}>
                {isExpired ? 'Expired' : 'Active (24h)'}
              </span>
            </div>
            <div style={s.infoRow}>
              <span style={s.infoKey}>AI Agent</span>
              <span style={{...s.infoVal, color: conversation.automation_enabled?'#22d3ee':'#475569'}}>
                {conversation.automation_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div style={s.messages}>
        {/* Watermark */}
        <div style={s.watermark}>
          <div style={s.watermarkIcon}><WaIcon /></div>
          <p style={s.watermarkText}>Sanestix Flow</p>
          <p style={s.watermarkSub}>End-to-end WhatsApp automation</p>
        </div>

        {messages.length === 0 ? (
          <div style={s.noMessages}>No messages yet</div>
        ) : (
          Object.entries(grouped).map(([date, msgs]) => (
            <div key={date}>
              <div style={s.dateDivider}>
                <div style={s.dateLine} />
                <span style={s.dateLabel}>{date}</span>
                <div style={s.dateLine} />
              </div>
              {msgs.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={s.inputArea}>
        {isExpired && (
          <div style={s.sessionBanner}>
            <WarnIcon />
            24-hour session expired — you can only send template messages to resume this conversation.
          </div>
        )}

        {!conversation.automation_enabled && !isExpired && (
          <div style={s.manualBanner}>
            <AgentIcon />
            You're in manual mode — AI is paused for this conversation.
          </div>
        )}

        <div style={s.inputRow}>
          <div style={s.inputWrap}>
            <EmojiBtn />
            <textarea
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              disabled={isExpired}
              placeholder={isExpired ? 'Session expired...' : 'Type a message'}
              rows={1}
              style={{
                ...s.textarea,
                opacity: isExpired ? 0.4 : 1,
                cursor: isExpired ? 'not-allowed' : 'text',
              }}
            />
            <AttachBtn />
          </div>

          <button
            onClick={handleSend}
            disabled={!text.trim() || sending || isExpired}
            style={{
              ...s.sendBtn,
              background: text.trim() && !isExpired
                ? 'linear-gradient(135deg,#22d3ee,#0891b2)'
                : '#1e293b',
              cursor: text.trim() && !isExpired ? 'pointer' : 'not-allowed',
            }}
          >
            {sending ? <Spinner /> : <SendIcon active={!!text.trim() && !isExpired} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const out = msg.direction === 'outgoing';
  const time = format(new Date(msg.timestamp || msg.created_at), 'HH:mm');

  return (
    <div className="msg-appear" style={{ ...s.msgRow, justifyContent: out ? 'flex-end' : 'flex-start' }}>
      <div style={{ ...s.bubble, ...(out ? s.bubbleOut : s.bubbleIn) }}>
        <p style={s.bubbleText}>{msg.content}</p>
        <div style={s.bubbleMeta}>
          <span style={s.bubbleTime}>{time}</span>
          {out && <StatusIcon status={msg.status} />}
        </div>
      </div>
    </div>
  );
}

const StatusIcon = ({ status }) => {
  if (status === 'read')      return <svg width="14" height="10" viewBox="0 0 16 11" fill="none"><path d="M1 5.5L5 9.5L15 1.5" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round"/><path d="M5 5.5L9 9.5L15 3.5" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  if (status === 'delivered') return <svg width="14" height="10" viewBox="0 0 16 11" fill="none"><path d="M1 5.5L5 9.5L15 1.5" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round"/><path d="M5 5.5L9 9.5L15 3.5" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  if (status === 'failed')    return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/></svg>;
  return <svg width="12" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5L5 9L13 1" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round"/></svg>;
};

const ActionBtn = ({ children, onClick, title }) => (
  <button onClick={onClick} title={title} style={s.actionBtn}>{children}</button>
);
const SearchIcon   = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/><path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const CloseIcon    = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const WarnIcon     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#f59e0b" strokeWidth="1.5"/><line x1="12" y1="9" x2="12" y2="13" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/></svg>;
const AgentIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}><circle cx="12" cy="8" r="4" stroke="#22d3ee" strokeWidth="1.5"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const EmojiBtn     = () => <button style={s.emojiBtn} title="Emoji"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#3d5068" strokeWidth="1.5"/><path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="#3d5068" strokeWidth="1.5" strokeLinecap="round"/><line x1="9" y1="9" x2="9.01" y2="9" stroke="#3d5068" strokeWidth="2" strokeLinecap="round"/><line x1="15" y1="9" x2="15.01" y2="9" stroke="#3d5068" strokeWidth="2" strokeLinecap="round"/></svg></button>;
const AttachBtn    = () => <button style={s.attachBtn} title="Attach"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="#3d5068" strokeWidth="1.5" strokeLinecap="round"/></svg></button>;
const SendIcon     = ({ active }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><line x1="22" y1="2" x2="11" y2="13" stroke={active?'#020617':'#475569'} strokeWidth="2" strokeLinecap="round"/><polygon points="22 2 15 22 11 13 2 9 22 2" stroke={active?'#020617':'#475569'} strokeWidth="2" strokeLinejoin="round"/></svg>;
const WaIcon       = () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="rgba(34,211,238,0.3)"/><path d="M5.077 18.347l.892-3.244a8.357 8.357 0 01-1.12-4.232C4.852 6.26 8.113 3 12.124 3c1.948.001 3.778.76 5.151 2.138a7.247 7.247 0 012.124 5.155c-.002 4.012-3.263 7.272-7.272 7.272a7.266 7.266 0 01-3.475-.883l-3.575.865z" stroke="rgba(34,211,238,0.3)" strokeWidth="1.5" fill="none"/></svg>;
const Spinner      = () => <span style={{width:'18px',height:'18px',border:'2px solid rgba(255,255,255,0.2)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite'}} />;

function groupByDate(messages) {
  return messages.reduce((acc, msg) => {
    const d = new Date(msg.timestamp || msg.created_at);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    let label;
    if (d.toDateString() === today.toDateString()) label = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    else label = format(d, 'MMMM d, yyyy');
    if (!acc[label]) acc[label] = [];
    acc[label].push(msg);
    return acc;
  }, {});
}

const s = {
  root:{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#0b0f18' },
  topBar:{
    display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'12px 20px', background:'#111827', borderBottom:'1px solid #151f2e',
    flexShrink:0,
  },
  contactInfo:{ display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', flex:1 },
  avatar:{
    width:'42px', height:'42px', borderRadius:'50%',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:'14px', fontWeight:'700', color:'white', flexShrink:0,
  },
  contactName:{ fontSize:'15px', fontWeight:'600', color:'#f1f5f9' },
  contactSub:{ fontSize:'12px', marginTop:'1px' },
  topActions:{ display:'flex', alignItems:'center', gap:'8px' },
  aiToggleWrap:{ display:'flex', alignItems:'center', gap:'8px', marginRight:'8px' },
  aiLabel:{ fontSize:'11px', fontWeight:'600', color:'#475569', textTransform:'uppercase', letterSpacing:'0.05em' },
  toggle:{
    width:'38px', height:'22px', borderRadius:'11px', border:'none',
    cursor:'pointer', position:'relative', transition:'background 0.2s',
    flexShrink:0,
  },
  toggleThumb:{
    position:'absolute', top:'3px', width:'16px', height:'16px',
    borderRadius:'50%', background:'white', transition:'transform 0.2s',
  },
  aiStatus:{ fontSize:'11px', fontWeight:'700', minWidth:'20px' },
  actionBtn:{
    width:'36px', height:'36px', borderRadius:'10px', border:'none',
    background:'transparent', color:'#3d5068', cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'center',
    transition:'all 0.15s',
  },

  /* Info panel */
  infoPanel:{
    background:'#111827', borderBottom:'1px solid #151f2e',
    padding:'20px', flexShrink:0,
  },
  infoPanelInner:{ maxWidth:'400px' },
  infoAvatar:{
    width:'56px', height:'56px', borderRadius:'50%',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:'18px', fontWeight:'700', color:'white', marginBottom:'10px',
  },
  infoName:{ fontSize:'17px', fontWeight:'700', color:'#f1f5f9', marginBottom:'2px' },
  infoPhone:{ fontSize:'13px', color:'#475569', marginBottom:'16px' },
  infoStats:{ display:'flex', gap:'24px', marginBottom:'16px', paddingBottom:'16px', borderBottom:'1px solid #1e293b' },
  infoStat:{ display:'flex', flexDirection:'column', gap:'2px' },
  infoStatVal:{ fontSize:'20px', fontWeight:'800', color:'#22d3ee' },
  infoStatLabel:{ fontSize:'11px', color:'#334155', textTransform:'uppercase', letterSpacing:'0.05em' },
  infoRow:{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #0f1623' },
  infoKey:{ fontSize:'13px', color:'#334155' },
  infoVal:{ fontSize:'13px', fontWeight:'600' },

  /* Messages */
  messages:{ flex:1, overflowY:'auto', padding:'20px 80px', position:'relative' },
  watermark:{
    position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
    display:'flex', flexDirection:'column', alignItems:'center', gap:'8px',
    opacity:0.5, pointerEvents:'none', userSelect:'none',
  },
  watermarkIcon:{ opacity:0.5 },
  watermarkText:{ fontSize:'16px', fontWeight:'700', color:'#1e293b' },
  watermarkSub:{ fontSize:'12px', color:'#1e293b' },
  noMessages:{ textAlign:'center', color:'#1e293b', fontSize:'13px', marginTop:'60px' },
  dateDivider:{ display:'flex', alignItems:'center', gap:'12px', margin:'16px 0' },
  dateLine:{ flex:1, height:'1px', background:'#151f2e' },
  dateLabel:{
    fontSize:'11px', fontWeight:'600', color:'#334155',
    background:'#111827', padding:'3px 12px', borderRadius:'10px',
    border:'1px solid #1e293b', whiteSpace:'nowrap',
  },
  msgRow:{ display:'flex', marginBottom:'2px' },
  bubble:{
    maxWidth:'65%', padding:'8px 12px', borderRadius:'12px',
    position:'relative', wordBreak:'break-word',
  },
  bubbleIn:{
    background:'#1a2535', borderTopLeftRadius:'4px',
  },
  bubbleOut:{
    background:'linear-gradient(135deg,#164e63,#0e7490)', borderTopRightRadius:'4px',
  },
  bubbleText:{ fontSize:'14px', color:'#e2e8f0', lineHeight:1.5, whiteSpace:'pre-wrap' },
  bubbleMeta:{
    display:'flex', alignItems:'center', justifyContent:'flex-end',
    gap:'4px', marginTop:'3px',
  },
  bubbleTime:{ fontSize:'10px', color:'rgba(255,255,255,0.35)' },

  /* Input */
  inputArea:{ background:'#111827', borderTop:'1px solid #151f2e', padding:'12px 20px', flexShrink:0 },
  sessionBanner:{
    display:'flex', alignItems:'center', gap:'8px',
    background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)',
    borderRadius:'8px', padding:'8px 12px', fontSize:'12px', color:'#f59e0b',
    marginBottom:'10px',
  },
  manualBanner:{
    display:'flex', alignItems:'center', gap:'8px',
    background:'rgba(34,211,238,0.05)', border:'1px solid rgba(34,211,238,0.15)',
    borderRadius:'8px', padding:'8px 12px', fontSize:'12px', color:'#22d3ee',
    marginBottom:'10px',
  },
  inputRow:{ display:'flex', alignItems:'flex-end', gap:'10px' },
  inputWrap:{
    flex:1, background:'#0f1623', border:'1px solid #1e293b',
    borderRadius:'12px', display:'flex', alignItems:'center',
    padding:'6px 8px', gap:'4px',
  },
  emojiBtn:{ background:'none', border:'none', cursor:'pointer', padding:'4px', display:'flex', alignItems:'center', flexShrink:0 },
  attachBtn:{ background:'none', border:'none', cursor:'pointer', padding:'4px', display:'flex', alignItems:'center', flexShrink:0 },
  textarea:{
    flex:1, background:'transparent', border:'none', outline:'none',
    fontSize:'14px', color:'#e2e8f0', lineHeight:1.5,
    padding:'4px 4px', maxHeight:'120px', overflowY:'auto',
  },
  sendBtn:{
    width:'46px', height:'46px', borderRadius:'50%', border:'none',
    display:'flex', alignItems:'center', justifyContent:'center',
    transition:'all 0.15s', flexShrink:0,
  },
};
