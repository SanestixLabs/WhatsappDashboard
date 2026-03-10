import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { useMessageStore, useConversationStore } from '../../store';
import toast from 'react-hot-toast';

export default function ChatWindow({ conversation }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const { messagesByConv, sending, sendMessage } = useMessageStore();
  const { toggleAutomation, closeConversation } = useConversationStore();
  const messages = messagesByConv[conversation.id] || [];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages.length]);
  useEffect(() => { inputRef.current?.focus(); setText(''); }, [conversation.id]);

  const handleSend = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setText('');
    const r = await sendMessage(conversation.id, t);
    if (!r?.ok) { toast.error(r?.error || 'Failed to send'); setText(t); }
  };

  const handleKey = (e) => { if (e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); handleSend(); } };
  const autoResize = (e) => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,110)+'px'; };

  const isExpired = conversation.session_expires_at ? new Date(conversation.session_expires_at)<=new Date() : true;
  const aiOn = conversation.automation_enabled;

  const name = conversation.contact_name || conversation.phone_number;
  const initials = conversation.contact_name
    ? conversation.contact_name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)
    : conversation.phone_number?.slice(-2);

  const avatarColors = [
    'linear-gradient(135deg,#6366f1,#8b5cf6)',
    'linear-gradient(135deg,#f97316,#fbbf24)',
    'linear-gradient(135deg,#ec4899,#f43f5e)',
    'linear-gradient(135deg,#14b8a6,#00d4b8)',
    'linear-gradient(135deg,#10b981,#059669)',
    'linear-gradient(135deg,#3b82f6,#6366f1)',
  ];
  const avatarColor = avatarColors[(name||'').charCodeAt(0) % avatarColors.length];

  const grouped = messages.reduce((acc, msg) => {
    const d = new Date(msg.timestamp||msg.created_at);
    const today = new Date(); const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
    let label = d.toDateString()===today.toDateString()?'Today':d.toDateString()===yesterday.toDateString()?'Yesterday':format(d,'MMMM d, yyyy');
    if (!acc[label]) acc[label]=[];
    acc[label].push(msg); return acc;
  }, {});

  return (
    <div style={s.root}>
      {/* AI Control Bar */}
      <div style={{...s.aiBar,...(aiOn?s.aiBarOn:{})}}>
        <div style={{...s.aiToggleGroup,...(aiOn?s.aiToggleGroupOn:{})}}>
          <div style={s.aiIconWrap}><BotIcon/></div>
          <span style={{...s.aiToggleLabel,...(aiOn?{color:'#00d4b8'}:{})}}>AI Agent</span>
          <button style={{...s.toggleSw,...(aiOn?s.toggleSwOn:{})}}
            onClick={()=>toggleAutomation(conversation.id,!aiOn)}>
            <div style={{...s.toggleKnob,...(aiOn?{left:'16px'}:{left:'2px'})}}/>
          </button>
          <span style={{...s.aiStatusText,...(aiOn?{color:'#00d4b8'}:{})}}>{aiOn?'ON':'OFF'}</span>
        </div>
        <div style={s.ctrlDivider}/>
        <button style={{...s.ctrlBtn,color:'#f59e0b',borderColor:'rgba(245,158,11,.2)',background:'rgba(245,158,11,.05)'}}>
          <PauseIcon/><span>Pause AI</span>
        </button>
        <button style={{...s.ctrlBtn,color:'#3b82f6',borderColor:'rgba(59,130,246,.2)',background:'rgba(59,130,246,.05)'}}>
          <TakeoverIcon/><span>Take Over</span>
        </button>
        <div style={{flex:1}}/>
        <div style={s.intentDisplay}>
          <span style={{fontSize:'14px'}}>🛒</span>
          <span style={{fontSize:'11.5px',fontWeight:'600',color:'#60a5fa'}}>Order Intent</span>
        </div>
      </div>

      {/* Header */}
      <div style={s.head}>
        <div style={{...s.av,background:avatarColor,width:'38px',height:'38px',fontSize:'12px',flexShrink:0}}>{initials}</div>
        <div style={s.info}>
          <div style={s.name}>{name}</div>
          <div style={s.sub}>
            <span style={{width:'6px',height:'6px',borderRadius:'50%',background:isExpired?'#f43f5e':aiOn?'#10b981':'#f59e0b',animation:isExpired?'none':'pulse 2s infinite',display:'inline-block',flexShrink:0}}/>
            <span style={{color:isExpired?'#f43f5e':aiOn?'#10b981':'#f59e0b',fontSize:'11px'}}>
              {isExpired?'Session expired':aiOn?'AI Handling':'Manual mode'}
            </span>
            <span style={{color:'rgba(255,255,255,0.12)',fontSize:'11px'}}>·</span>
            <span style={{fontSize:'11px',color:'#7d95b0'}}>{conversation.phone_number}</span>
            <span style={{background:'rgba(0,212,184,.1)',color:'#00d4b8',padding:'1px 7px',borderRadius:'4px',fontSize:'10px',fontWeight:'700'}}>Open</span>
          </div>
        </div>
        <div style={s.actions}>
          <HdrBtn title="Search messages"><SearchIcon/></HdrBtn>
          <HdrBtn title="Contact info"><ContactIcon/></HdrBtn>
          <HdrBtn title="More options" onClick={()=>closeConversation(conversation.id)}><MoreIcon/></HdrBtn>
        </div>
      </div>

      {/* Messages */}
      <div style={s.msgs}>
        <div style={s.watermark}>
          <WaWatermark/>
          <p style={{fontSize:'14px',fontWeight:'700',color:'#1a2e42',marginTop:'8px'}}>Sanestix Flow</p>
          <p style={{fontSize:'12px',color:'#1a2e42'}}>WhatsApp automation</p>
        </div>
        {messages.length===0 && <div style={s.noMsg}>No messages yet</div>}
        {Object.entries(grouped).map(([date,msgs])=>(
          <div key={date}>
            <div style={s.dateSep}>
              <div style={s.dateLine}/>
              <span style={s.dateLbl}>{date}</span>
              <div style={s.dateLine}/>
            </div>
            {msgs.map(msg=><Bubble key={msg.id} msg={msg} initials={initials} avatarColor={avatarColor}/>)}
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Suggested replies */}
      <div style={s.suggestions}>
        <span style={s.suggLabel}>✨ Suggested:</span>
        {['Sure, your order will be arranged','Please share your delivery address','Our team will contact you shortly'].map(r=>(
          <button key={r} style={s.suggChip}
            onClick={()=>{setText(r);inputRef.current?.focus();}}>
            {r}
          </button>
        ))}
      </div>

      {/* Composer */}
      <div style={s.composer}>
        <div style={s.composerInner}>
          <button style={s.toolBtn} title="Emoji"><EmojiIcon/></button>
          <div style={s.inputWrap}
            onFocus={e=>e.currentTarget.style.borderColor='#00d4b8'}
            onBlur={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'}>
            <textarea ref={inputRef} value={text}
              onChange={e=>{setText(e.target.value);autoResize(e);}}
              onKeyDown={handleKey} disabled={isExpired} rows={1}
              placeholder={isExpired?'Session expired…':'Type a message…'}
              style={{...s.textarea,opacity:isExpired?.4:1,cursor:isExpired?'not-allowed':'text'}}/>
          </div>
          <button style={s.toolBtn} title="Attach"><AttachIcon/></button>
          <button onClick={handleSend} disabled={!text.trim()||sending||isExpired} style={{
            ...s.sendBtn,
            background:text.trim()&&!isExpired?'linear-gradient(135deg,#00d4b8,#00b8a0)':'#1a2e42',
            boxShadow:text.trim()&&!isExpired?'0 0 14px rgba(0,212,184,.3)':'none',
            cursor:text.trim()&&!isExpired?'pointer':'not-allowed',
          }}>
            {sending?<Spinner/>:<SendIcon active={!!text.trim()&&!isExpired}/>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg, initials, avatarColor }) {
  const out = msg.direction==='outgoing';
  const isAI = msg.is_ai || msg.source === 'ai';
  const time = format(new Date(msg.timestamp||msg.created_at),'HH:mm');
  const bubbleStyle = out
    ? isAI
      ? {...s.bubbleBase,background:'linear-gradient(135deg,#0a3d5c,#0c4a6e)',borderBottomRightRadius:'3px',boxShadow:'0 2px 12px rgba(59,130,246,.15)'}
      : {...s.bubbleBase,background:'linear-gradient(135deg,#0c4a40,#0a5c4e)',borderBottomRightRadius:'3px',boxShadow:'0 2px 12px rgba(0,212,184,.15)'}
    : {...s.bubbleBase,background:'#101924',border:'1px solid rgba(255,255,255,0.07)',borderBottomLeftRadius:'3px',color:'#edf2f8'};

  return (
    <div className="msg-appear" style={{...s.msgRow,justifyContent:out?'flex-end':'flex-start',flexDirection:out?'row-reverse':'row'}}>
      {!out && <div style={{...s.av,background:avatarColor,width:'28px',height:'28px',fontSize:'10px',flexShrink:0,alignSelf:'flex-end'}}>{initials}</div>}
      <div style={{display:'flex',flexDirection:'column',gap:'2px',maxWidth:'100%'}}>
        <div style={bubbleStyle}>{msg.content}</div>
        <div style={{...s.meta,justifyContent:'flex-end',padding:'0 2px'}}>
          {out && isAI && <span style={{fontSize:'9px',color:'rgba(255,255,255,.4)',fontWeight:'600'}}>AI</span>}
          {out && !isAI && <span style={{fontSize:'9px',color:'rgba(255,255,255,.4)',fontWeight:'600'}}>You</span>}
          <span style={{fontSize:'9.5px',color:out?'rgba(255,255,255,.3)':'#3a5068',fontFamily:"'JetBrains Mono',monospace"}}>{time}</span>
          {out && <TickIcon status={msg.status}/>}
        </div>
      </div>
      {out && <div style={{width:'28px',flexShrink:0}}/>}
    </div>
  );
}

const TickIcon=({status})=>{
  if(status==='read') return <svg width="16" height="10" viewBox="0 0 24 11" fill="none"><path d="M1 5.5L5 9.5L15 1.5" stroke="#00d4b8" strokeWidth="2" strokeLinecap="round"/><path d="M5 5.5L9 9.5L15 3.5" stroke="#00d4b8" strokeWidth="2" strokeLinecap="round"/></svg>;
  if(status==='delivered') return <svg width="16" height="10" viewBox="0 0 24 11" fill="none"><path d="M1 5.5L5 9.5L15 1.5" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round"/><path d="M5 5.5L9 9.5L15 3.5" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round"/></svg>;
  return <svg width="14" height="10" viewBox="0 0 14 11" fill="none"><path d="M1 5L5 9L13 1" stroke="rgba(255,255,255,.3)" strokeWidth="2" strokeLinecap="round"/></svg>;
};

const HdrBtn=({children,onClick,title})=><button onClick={onClick} title={title} style={s.hdrBtn}>{children}</button>;
const SearchIcon=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>;
const ContactIcon=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const MoreIcon=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>;
const BotIcon=()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0,color:'#00d4b8'}}><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V6a3 3 0 016 0v2"/><path d="M9 14h.01M15 14h.01" strokeLinecap="round"/></svg>;
const PauseIcon=()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
const TakeoverIcon=()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const EmojiIcon=()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
const AttachIcon=()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>;
const SendIcon=({active})=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={active?'#070b11':'#3a5068'} strokeWidth="2.2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const WaWatermark=()=><svg width="44" height="44" viewBox="0 0 24 24" fill="none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a6.08 6.08 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#1a2e42"/><path d="M5.077 18.347l.892-3.244a8.357 8.357 0 01-1.12-4.232C4.852 6.26 8.113 3 12.124 3c1.948.001 3.778.76 5.151 2.138a7.247 7.247 0 012.124 5.155c-.002 4.012-3.263 7.272-7.272 7.272a7.266 7.266 0 01-3.475-.883l-3.575.865z" stroke="#1a2e42" strokeWidth="1.5" fill="none"/></svg>;
const Spinner=()=><span style={{width:'18px',height:'18px',border:'2px solid rgba(255,255,255,.2)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin .7s linear infinite'}}/>;

const s={
  root:{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'#070b11'},
  aiBar:{display:'flex',alignItems:'center',gap:'8px',padding:'10px 18px',background:'#0c1219',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0,flexWrap:'wrap'},
  aiBarOn:{},
  aiToggleGroup:{display:'flex',alignItems:'center',gap:'8px',padding:'6px 12px',background:'#101924',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'20px'},
  aiToggleGroupOn:{background:'rgba(0,212,184,.08)',borderColor:'rgba(0,212,184,.25)'},
  aiIconWrap:{width:'26px',height:'26px',borderRadius:'7px',background:'rgba(0,212,184,.15)',display:'flex',alignItems:'center',justifyContent:'center'},
  aiToggleLabel:{fontSize:'12px',fontWeight:'700',color:'#7d95b0'},
  toggleSw:{width:'32px',height:'18px',borderRadius:'9px',background:'#1a2e42',position:'relative',cursor:'pointer',transition:'background .2s',flexShrink:0,border:'none'},
  toggleSwOn:{background:'#00d4b8'},
  toggleKnob:{width:'14px',height:'14px',background:'white',borderRadius:'50%',position:'absolute',top:'2px',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.3)'},
  aiStatusText:{fontSize:'10px',fontWeight:'700',color:'#3a5068',fontFamily:"'JetBrains Mono',monospace"},
  ctrlDivider:{width:'1px',height:'24px',background:'rgba(255,255,255,0.07)',margin:'0 2px'},
  ctrlBtn:{display:'flex',alignItems:'center',gap:'6px',padding:'7px 12px',borderRadius:'10px',border:'1px solid rgba(255,255,255,0.07)',background:'transparent',fontSize:'11.5px',fontWeight:'600',cursor:'pointer',transition:'all .15s',whiteSpace:'nowrap'},
  intentDisplay:{display:'flex',alignItems:'center',gap:'6px',padding:'5px 12px',borderRadius:'20px',background:'#101924',border:'1px solid rgba(255,255,255,0.07)'},
  head:{display:'flex',alignItems:'center',gap:'12px',padding:'10px 18px',background:'#0c1219',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0},
  av:{borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'700',color:'white'},
  info:{flex:1,minWidth:0},
  name:{fontSize:'14px',fontWeight:'700',letterSpacing:'-.2px',color:'#edf2f8',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  sub:{display:'flex',alignItems:'center',gap:'6px',marginTop:'2px',flexWrap:'wrap'},
  actions:{display:'flex',alignItems:'center',gap:'6px',flexShrink:0},
  hdrBtn:{width:'32px',height:'32px',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.07)',background:'transparent',color:'#3a5068',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s'},
  msgs:{flex:1,overflowY:'auto',padding:'20px 24px',display:'flex',flexDirection:'column',gap:'3px',position:'relative',background:'#070b11',backgroundImage:'radial-gradient(ellipse at 10% 20%,rgba(0,212,184,.025) 0%,transparent 50%),radial-gradient(ellipse at 90% 80%,rgba(59,130,246,.02) 0%,transparent 50%)'},
  watermark:{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',display:'flex',flexDirection:'column',alignItems:'center',opacity:.6,pointerEvents:'none',userSelect:'none'},
  noMsg:{textAlign:'center',color:'#1a2e42',fontSize:'13px',marginTop:'60px'},
  dateSep:{display:'flex',alignItems:'center',gap:'10px',margin:'12px 0 8px'},
  dateLine:{flex:1,height:'1px',background:'rgba(255,255,255,0.07)'},
  dateLbl:{fontSize:'10px',color:'#3a5068',background:'#101924',border:'1px solid rgba(255,255,255,0.07)',padding:'3px 12px',borderRadius:'20px',fontFamily:"'JetBrains Mono',monospace",whiteSpace:'nowrap'},
  msgRow:{display:'flex',gap:'8px',maxWidth:'68%',marginBottom:'2px'},
  bubbleBase:{padding:'9px 13px',borderRadius:'14px',fontSize:'13px',lineHeight:'1.6',wordBreak:'break-word',whiteSpace:'pre-wrap',color:'#fff'},
  meta:{display:'flex',alignItems:'center',gap:'4px'},
  suggestions:{padding:'10px 18px 0',display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',flexShrink:0},
  suggLabel:{fontSize:'10.5px',color:'#3a5068',fontWeight:'600',whiteSpace:'nowrap'},
  suggChip:{padding:'6px 12px',borderRadius:'20px',border:'1px solid rgba(0,212,184,.25)',background:'rgba(0,212,184,.06)',color:'#00d4b8',fontSize:'11.5px',fontWeight:'600',cursor:'pointer',transition:'all .15s',whiteSpace:'nowrap'},
  composer:{padding:'12px 18px 14px',background:'#0c1219',borderTop:'1px solid rgba(255,255,255,0.07)',flexShrink:0},
  composerInner:{display:'flex',alignItems:'flex-end',gap:'8px'},
  toolBtn:{width:'34px',height:'34px',borderRadius:'9px',border:'1px solid rgba(255,255,255,0.07)',background:'transparent',color:'#3a5068',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',flexShrink:0},
  inputWrap:{flex:1,background:'#101924',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'10px 14px',transition:'border-color .2s,box-shadow .2s'},
  textarea:{width:'100%',background:'transparent',border:'none',outline:'none',color:'#edf2f8',fontSize:'13px',lineHeight:'1.5',minHeight:'22px',maxHeight:'110px',overflowY:'auto'},
  sendBtn:{width:'40px',height:'40px',borderRadius:'50%',border:'none',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',flexShrink:0},
};
