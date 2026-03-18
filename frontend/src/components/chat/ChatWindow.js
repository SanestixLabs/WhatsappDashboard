import { socketInstance, useSocket } from '../../hooks/useSocket';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import ContactPanel from './ContactPanel';
import { useMessageStore, useConversationStore } from '../../store';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || '';

const EMOJIS = ['😀','😂','😍','🥰','😎','🤔','😅','😭','😱','🎉','👍','👎','❤️','🔥','✅','💯','🙏','😊','🤣','😘','😤','🥳','😴','🤯','👀','💪','🎯','🚀','💡','⚡','😆','😋','😜','🤩','🥺','😏','😒','😔','😪','🤗','🤭','🤫','🤨','😐','😑','😶','😇','🥱','🤤','😵','🤪','😳','🥴','😠','😡','🤬','😈','💀','💩','🤡','👻','👽','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾','🙈','🙉','🙊','💋','💌','💘','💝','💖','💗','💓','💞','💕','💟','❣️','💔','🖤','💜','💙','💚','💛','🧡','🤍','🤎','💢','💥','💫','💦','💨','🕳️','💬','💭','🗯️','💤','💮','♨️','🌸','💐','🌹','🥀','🌺','🌻','🌼','🌷','🌱','🌿','🍀','🎍','🎋','🍃','🍂','🍁','🍄','🌾','💧','🌊','🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐈','🐓','🦃','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦦','🦥','🐁','🐀','🐿️','🦔','🐾','🐉','🐲','🌵','🎄','🌲','🌳','🌴','🌾','🌱','🌿','☘️','🍀','🎍','🎋','🍃','🍂','🍁','🍄','🌰','🦔','🌏','🌍','🌎','🌐','🗺️','🧭','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️','🏞️','🏟️','🏛️','🏗️','🏘️','🏙️','🏚️','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕','🕍','⛩️','🕋','⛲','⛺','🌁','🌃','🌄','🌅','🌆','🌇','🌉','♨️','🌌','🌠','🎇','🎆','🌈','🌤️','⛅','🌥️','☁️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️','💨','💧','💦','🌊','🌀','🌪️','🌫️','🌈'];

import RichBar from './RichBar';
import api from '../../services/api';
export default function ChatWindow({ conversation }) {
  const [text, setText]               = useState('');
  const [showEmoji, setShowEmoji]     = useState(false);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIdx, setSearchIdx] = useState(0);
  const searchRef = useRef(null);
  const [attachment, setAttachment]   = useState(null);
  const [sending, setSending]         = useState(false);
  const [showProfile, setShowProfile]   = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showNotes, setShowNotes]       = useState(false);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [agents, setAgents]             = useState([]);
  const [transferNote, setTransferNote] = useState('');
  const [transferTarget, setTransferTarget] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [notes, setNotes]               = useState([]);
  const [noteText, setNoteText]         = useState('');
  const [addingNote, setAddingNote]     = useState(false);
  const [showCanned, setShowCanned]     = useState(false);
  const [cannedList, setCannedList]     = useState([]);
  const [cannedSearch, setCannedSearch] = useState('');

  // ── Voice recording state ──────────────────────────────────
  const [recording, setRecording]         = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob]         = useState(null);  // recorded blob ready to send
  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const timerRef         = useRef(null);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const fileRef       = useRef(null);

  const messages = useMessageStore((s) => s.messagesByConv[conversation.id] || []);
  const sendMessage = useMessageStore((s) => s.sendMessage);
  const { toggleAutomation, closeConversation } = useConversationStore();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages.length]);
  useEffect(() => {
    inputRef.current?.focus();
    setText('');
    setAttachment(null);
    setAudioBlob(null);
    stopRecording();
    setNotes([]);
    setShowNotes(false);
  }, [conversation.id]);

  // Realtime messages are handled globally in useSocket hook via addMessage → store
  // No local socket listener needed here

  // Realtime notes via socket
  useEffect(() => {
    const handler = (data) => {
      if (data.conversationId === conversation.id) {
        setNotes(prev => {
          const exists = prev.find(n => n.id === data.note.id);
          if (exists) return prev;
          return [...prev, data.note];
        });
        // If notes panel is closed, show a toast hint
        if (!showNotes) {
          import('react-hot-toast').then(({default: toast}) => {
            toast('🔒 New internal note added', {
              duration: 3000,
              style: { background: '#1a1f2e', color: '#e2e8f0', border: '1px solid rgba(245,158,11,0.3)' },
            });
          });
        }
      }
    };
    if (socketInstance) {
      socketInstance.on('new_note', handler);
      return () => socketInstance.off('new_note', handler);
    }
  }, [conversation.id, showNotes]);

  // ── Voice recording functions ──────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/ogg;codecs=opus') ? 'audio/ogg;codecs=opus' : 'audio/webm;codecs=opus' });
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: MediaRecorder.isTypeSupported('audio/ogg;codecs=opus') ? 'audio/ogg;codecs=opus' : 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(100);
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch (err) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
    setRecording(false);
    setRecordSeconds(0);
  }, []);

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
    chunksRef.current = [];
    setRecording(false);
    setRecordSeconds(0);
    setAudioBlob(null);
  };

  const sendVoice = async () => {
    if (!audioBlob) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, `voice_${Date.now()}.ogg`);
      formData.append('conversationId', conversation.id);
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/api/messages/send-media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      setAudioBlob(null);
      toast.success('Voice message sent!');
    } catch (err) {
      toast.error(err.message || 'Failed to send voice message');
    } finally {
      setSending(false);
    }
  };

  const fmtSecs = s => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  // ── Load agents for transfer ──────────────────────────────
  const openTransfer = async () => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch((process.env.REACT_APP_API_URL||'') + '/team', {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();
    setAgents(data.team || data.agents || data || []);
    setShowTransfer(true);
  };

  const doTransfer = async () => {
    if (!transferTarget) return;
    setTransferring(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch((process.env.REACT_APP_API_URL||'') + '/conversations/' + conversation.id + '/transfer', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: transferTarget, note: transferNote })
      });
      if (res.ok) { setShowTransfer(false); setTransferNote(''); setTransferTarget(''); }
      else { const e = await res.json(); alert(e.error || 'Transfer failed'); }
    } finally { setTransferring(false); }
  };

  // ── Load notes ─────────────────────────────────────────────
  const openNotes = async () => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch((process.env.REACT_APP_API_URL||'') + '/notes/' + conversation.id, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();
    setNotes(data.notes || []);
    setShowNotes(true);
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch((process.env.REACT_APP_API_URL||'') + '/notes/' + conversation.id, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteText })
      });
      if (res.ok) { const d = await res.json(); setNotes(n => [...n, d.note]); setNoteText(''); }
    } finally { setAddingNote(false); }
  };

  // ── Load canned responses ──────────────────────────────────
  const openCanned = async (q = '') => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch((process.env.REACT_APP_API_URL||'') + '/api/canned?q=' + encodeURIComponent(q), {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();
    setCannedList(data.canned || []);
    setShowCanned(true);
  };

  // ── Regular send ───────────────────────────────────────────
  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    try {
      if (attachment) {
        const formData = new FormData();
        formData.append('file', attachment.file);
        formData.append('conversationId', conversation.id);
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`${API_BASE}/api/messages/send-media`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
        setAttachment(null);
      } else {
        const t = text.trim();
        if (!t) return;
        setText('');
        const r = await sendMessage(conversation.id, t);
        if (!r?.ok) { toast.error(r?.error || 'Failed to send'); setText(t); }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => { if (e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); handleSend(); } };
  const autoResize = (e) => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,110)+'px'; };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const preview = isImage ? URL.createObjectURL(file) : null;
    setAttachment({ file, preview, type: isImage ? 'image' : 'file' });
    e.target.value = '';
  };

  const filteredEmojis = emojiSearch ? EMOJIS.filter(e => e.includes(emojiSearch)) : EMOJIS;



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
    <>
    <div style={s.root} onClick={()=>{ if(showEmoji) setShowEmoji(false); }}>
      {/* AI Control Bar */}
      <div style={{...s.aiBar,...(aiOn?s.aiBarOn:{})}}>
        <div style={{...s.aiToggleGroup,...(aiOn?s.aiToggleGroupOn:{})}}>
          <div style={s.aiIconWrap}><BotIcon/></div>
          <span style={{...s.aiToggleLabel,...(aiOn?{color:'#00d4b8'}:{})}}>AI Agent</span>
          <button style={{...s.toggleSw,...(aiOn?s.toggleSwOn:{})}} onClick={()=>toggleAutomation(conversation.id,!aiOn)}>
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

      {/* Search Bar */}
      {showSearch && (
        <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 16px',background:'#0a1520',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
          <SearchIcon/>
          <input ref={searchRef} value={searchQuery} onChange={e=>{setSearchQuery(e.target.value);setSearchIdx(0);}}
            placeholder="Search in conversation..." autoFocus
            style={{flex:1,background:'none',border:'none',outline:'none',color:'#edf2f8',fontSize:'13px'}}/>
          {searchQuery && (
            <span style={{fontSize:'11px',color:'#3a5068'}}>
              {messages.filter(m=>m.content?.toLowerCase().includes(searchQuery.toLowerCase())).length} results
            </span>
          )}
          <button onClick={()=>{setShowSearch(false);setSearchQuery('');}} style={{background:'none',border:'none',color:'#3a5068',cursor:'pointer',fontSize:'16px'}}>✕</button>
        </div>
      )}
      {/* Header */}
      <div style={s.head}>
        <div style={{...s.av,background:avatarColor,width:'38px',height:'38px',fontSize:'12px',flexShrink:0}}>{initials}</div>
        <div style={s.info}>
          <div style={s.name}>{name}</div>
          <div style={s.sub}>
            <span style={{width:'6px',height:'6px',borderRadius:'50%',background:isExpired?'#f43f5e':aiOn?'#10b981':'#f59e0b',display:'inline-block',flexShrink:0}}/>
            <span style={{color:isExpired?'#f43f5e':aiOn?'#10b981':'#f59e0b',fontSize:'11px'}}>
              {isExpired?'Session expired':aiOn?'AI Handling':'Manual mode'}
            </span>
            <span style={{color:'rgba(255,255,255,0.12)',fontSize:'11px'}}>·</span>
            <span style={{fontSize:'11px',color:'#7d95b0'}}>{conversation.phone_number}</span>
            <span style={{background:'rgba(0,212,184,.1)',color:'#00d4b8',padding:'1px 7px',borderRadius:'4px',fontSize:'10px',fontWeight:'700'}}>Open</span>
          </div>
        </div>
        <div style={s.actions}>
          <HdrBtn title="Search" onClick={()=>{setShowSearch(v=>!v);setSearchQuery('');setTimeout(()=>searchRef.current?.focus(),100);}}><SearchIcon/></HdrBtn>
          <HdrBtn title="Internal Notes" onClick={openNotes}><NotesIcon/></HdrBtn>
          <HdrBtn title="Transfer Chat" onClick={openTransfer}><TransferIcon/></HdrBtn>
          <HdrBtn title="Contact info" onClick={()=>setShowProfile(v=>!v)}><ContactIcon/></HdrBtn>
          <HdrBtn title="Close" onClick={()=>closeConversation(conversation.id)}><MoreIcon/></HdrBtn>
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
          <div key={date} style={{display:'flex',flexDirection:'column',width:'100%'}}> 
            <div style={s.dateSep}>
              <div style={s.dateLine}/><span style={s.dateLbl}>{date}</span><div style={s.dateLine}/>
            </div>
            {msgs.map(msg=><Bubble key={msg.id} msg={msg} initials={initials} avatarColor={avatarColor} searchQuery={searchQuery}/>)}
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Suggested replies */}
      <div style={s.suggestions}>
        <span style={s.suggLabel}>✨ Suggested:</span>
        {['Sure, your order will be arranged','Please share your delivery address','Our team will contact you shortly'].map(r=>(
          <button key={r} style={s.suggChip} onClick={()=>{setText(r);inputRef.current?.focus();}}>{r}</button>
        ))}
      </div>

      {/* Attachment preview */}
      {attachment && (
        <div style={s.attachPreview}>
          {attachment.type==='image'
            ? <img src={attachment.preview} alt="preview" style={{height:'60px',borderRadius:'8px',objectFit:'cover'}}/>
            : <div style={s.fileChip}><FileIcon/><span style={{fontSize:'12px',color:'#edf2f8',maxWidth:'180px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{attachment.file.name}</span></div>
          }
          <button onClick={()=>setAttachment(null)} style={{background:'rgba(244,63,94,.15)',border:'1px solid rgba(244,63,94,.3)',color:'#f43f5e',borderRadius:'6px',padding:'4px 8px',fontSize:'11px',cursor:'pointer'}}>Remove</button>
        </div>
      )}

      {/* Voice recording preview — shown after stopping, before sending */}
      {audioBlob && !recording && (
        <div style={s.attachPreview}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',flex:1}}>
            <div style={{width:'34px',height:'34px',borderRadius:'50%',background:'rgba(0,212,184,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <MicActiveIcon/>
            </div>
            <div>
              <div style={{fontSize:'12px',fontWeight:'700',color:'#edf2f8'}}>Voice message ready</div>
              <div style={{fontSize:'10px',color:'#3a5068',marginTop:'1px'}}>{(audioBlob.size/1024).toFixed(1)} KB · webm</div>
            </div>
          </div>
          <button onClick={cancelRecording} style={{background:'rgba(244,63,94,.15)',border:'1px solid rgba(244,63,94,.3)',color:'#f43f5e',borderRadius:'6px',padding:'4px 10px',fontSize:'11px',cursor:'pointer',marginRight:'4px'}}>Discard</button>
          <button onClick={sendVoice} disabled={sending} style={{background:'linear-gradient(135deg,#00d4b8,#00b8a0)',border:'none',color:'#070b11',borderRadius:'6px',padding:'5px 14px',fontSize:'11px',fontWeight:'700',cursor:'pointer',display:'flex',alignItems:'center',gap:'5px'}}>
            {sending ? <Spinner/> : <><SendIcon active={true}/>&nbsp;Send</>}
          </button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div style={s.emojiPicker} onClick={e=>e.stopPropagation()}>
          <input
            value={emojiSearch}
            onChange={e=>setEmojiSearch(e.target.value)}
            placeholder="Search emoji..."
            style={{width:'100%',background:'#0d1424',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'6px 10px',color:'#edf2f8',fontSize:'12px',outline:'none',marginBottom:'8px'}}
          />
          <div style={{display:'flex',flexWrap:'wrap',gap:'2px',maxHeight:'200px',overflowY:'auto'}}>
            {filteredEmojis.map((em,i)=>(
              <button key={i} style={s.emojiBtn} onClick={()=>{ setText(t=>t+em); inputRef.current?.focus(); }}>
                {em}
              </button>
            ))}
            {filteredEmojis.length===0 && <div style={{fontSize:'12px',color:'#3a5068',padding:'8px'}}>No results</div>}
          </div>
        </div>
      )}


      {/* Composer */}
      <div style={s.composer}>
        <div style={s.composerInner}>

          {/* ── Recording mode UI ── */}
          {recording ? (
            <>
              {/* Cancel button */}
              <button onClick={cancelRecording} style={{...s.toolBtn,color:'#f43f5e',borderColor:'rgba(244,63,94,.25)',background:'rgba(244,63,94,.08)'}}>
                <TrashIcon/>
              </button>

              {/* Recording indicator bar */}
              <div style={{flex:1,display:'flex',alignItems:'center',gap:'10px',background:'rgba(244,63,94,.06)',border:'1px solid rgba(244,63,94,.2)',borderRadius:'14px',padding:'10px 14px'}}>
                <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#f43f5e',flexShrink:0,animation:'recPulse 1s ease-in-out infinite'}}/>
                <span style={{fontSize:'12px',fontWeight:'700',color:'#f43f5e',fontFamily:"'JetBrains Mono',monospace"}}>Recording…</span>
                <div style={{flex:1,display:'flex',alignItems:'center',gap:'2px',height:'24px'}}>
                  {Array.from({length:20}).map((_,i)=>(
                    <div key={i} style={{flex:1,borderRadius:'2px',background:'rgba(244,63,94,.4)',animation:`wave ${0.4+Math.random()*0.6}s ease-in-out infinite alternate`,animationDelay:`${i*0.05}s`}}/>
                  ))}
                </div>
                <span style={{fontSize:'12px',fontWeight:'700',color:'#f43f5e',fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{fmtSecs(recordSeconds)}</span>
              </div>

              {/* Stop button */}
              <button onClick={stopRecording} style={{width:'40px',height:'40px',borderRadius:'50%',border:'none',background:'linear-gradient(135deg,#f43f5e,#e11d48)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
                <StopIcon/>
              </button>
            </>
          ) : (
            <>
              {/* Normal compose mode */}
              <button style={s.toolBtn} title="Emoji" onClick={e=>{e.stopPropagation();setShowEmoji(v=>!v);}}>
                <EmojiIcon/>
              </button>
              <input ref={fileRef} type="file" style={{display:'none'}} onChange={handleFile}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"/>
              <RichBar conversationId={conversation.id} onSent={()=>{}} />
              <button style={s.toolBtn} title="Attach file" onClick={()=>fileRef.current?.click()} disabled={isExpired||!!audioBlob}>
                <AttachIcon/>
              </button>
              <button style={{...s.toolBtn, fontSize:'13px', fontWeight:'700'}}
                title="Canned Responses (or type /)" onClick={()=>{ setCannedSearch(''); openCanned(''); }}>
                /
              </button>
              <button style={{...s.toolBtn}} title="Product Catalogue"
                onClick={()=>setShowCatalogue(true)} disabled={isExpired}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
              </button>
              <div style={s.inputWrap}
                onFocus={e=>e.currentTarget.style.borderColor='#00d4b8'}
                onBlur={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'}>
                <textarea ref={inputRef} value={text}
                  onChange={e=>{ const v=e.target.value; setText(v); autoResize(e); if(v=='/'){setCannedSearch('');openCanned('');} else if(v.startsWith('/')&&v.length>1){setCannedSearch(v.slice(1));openCanned(v.slice(1));} else {setShowCanned(false);} }}
                  onKeyDown={handleKey} disabled={isExpired||!!attachment||!!audioBlob} rows={1}
                  placeholder={isExpired?'Session expired…':attachment?'File ready to send…':audioBlob?'Voice message ready…':'Type a message…'}
                  style={{...s.textarea,opacity:isExpired?.4:1,cursor:isExpired?'not-allowed':'text'}}/>
              </div>

              {/* Mic button — shown when no text typed and no attachment */}
              {!text.trim() && !attachment && !audioBlob && !isExpired ? (
                <button
                  onMouseDown={startRecording}
                  title="Hold to record voice message"
                  style={{
                    width:'40px',height:'40px',borderRadius:'50%',border:'1px solid rgba(0,212,184,.25)',
                    background:'rgba(0,212,184,.08)',display:'flex',alignItems:'center',
                    justifyContent:'center',cursor:'pointer',flexShrink:0,transition:'all .15s',
                  }}>
                  <MicIcon/>
                </button>
              ) : (
                /* Send button — shown when text or attachment present */
                <button onClick={handleSend}
                  disabled={(!text.trim()&&!attachment)||sending||isExpired}
                  style={{
                    ...s.sendBtn,
                    background:(text.trim()||attachment)&&!isExpired?'linear-gradient(135deg,#00d4b8,#00b8a0)':'#1a2e42',
                    boxShadow:(text.trim()||attachment)&&!isExpired?'0 0 14px rgba(0,212,184,.3)':'none',
                    cursor:(text.trim()||attachment)&&!isExpired?'pointer':'not-allowed',
                  }}>
                  {sending?<Spinner/>:<SendIcon active={!!(text.trim()||attachment)&&!isExpired}/>}
                </button>
              )}
            </>
          )}
        </div>

        {/* Recording hint */}
        {!recording && !audioBlob && !isExpired && !text.trim() && !attachment && (
          <div style={{textAlign:'center',fontSize:'9.5px',color:'#1a2e42',marginTop:'6px',fontWeight:'500'}}>
            🎙 Click mic to start recording
          </div>
        )}
      </div>

      {/* Inline CSS for animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes recPulse { 0%,100% { opacity:1; } 50% { opacity:.3; } }
        @keyframes wave { from { height: 20%; } to { height: 80%; } }
        @keyframes msg-appear { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        .msg-appear { animation: msg-appear .18s ease; }
      `}</style>
    </div>
    {showProfile && <ContactPanel conversation={conversation} onClose={()=>setShowProfile(false)}/>}

    {/* ── Transfer Modal ── */}
    {showTransfer && (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
        <div style={{background:'#0c1219',borderRadius:'16px',border:'1px solid rgba(255,255,255,0.1)',width:'420px',padding:'24px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px'}}>
            <span style={{fontSize:'15px',fontWeight:'700',color:'#e9edef'}}>Transfer Conversation</span>
            <button onClick={()=>setShowTransfer(false)} style={{background:'none',border:'none',color:'#536471',cursor:'pointer',fontSize:'18px'}}>✕</button>
          </div>
          <div style={{marginBottom:'14px'}}>
            <div style={{fontSize:'11px',color:'#536471',marginBottom:'6px',fontWeight:'600'}}>TRANSFER TO AGENT</div>
            <select value={transferTarget} onChange={e=>setTransferTarget(e.target.value)}
              style={{width:'100%',background:'#202c33',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'9px 12px',color:'#e9edef',fontSize:'13px',outline:'none'}}>
              <option value=''>Select agent...</option>
              {agents.map(a=><option key={a.id} value={a.id}>{a.name} ({a.status||'offline'})</option>)}
            </select>
          </div>
          <div style={{marginBottom:'18px'}}>
            <div style={{fontSize:'11px',color:'#536471',marginBottom:'6px',fontWeight:'600'}}>HANDOFF NOTE (optional)</div>
            <textarea value={transferNote} onChange={e=>setTransferNote(e.target.value)} rows={3}
              placeholder="Add context for the receiving agent..."
              style={{width:'100%',background:'#202c33',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'9px 12px',color:'#e9edef',fontSize:'13px',outline:'none',resize:'none',boxSizing:'border-box'}}/>
          </div>
          <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
            <button onClick={()=>setShowTransfer(false)} style={{padding:'9px 18px',background:'transparent',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'#8696a0',fontSize:'13px',cursor:'pointer'}}>Cancel</button>
            <button onClick={doTransfer} disabled={!transferTarget||transferring}
              style={{padding:'9px 18px',background:transferTarget?'linear-gradient(135deg,#00d4b8,#00b8a0)':'#1a2e42',border:'none',borderRadius:'8px',color:transferTarget?'#070b11':'#3a5068',fontSize:'13px',fontWeight:'700',cursor:transferTarget?'pointer':'not-allowed'}}>
              {transferring?'Transferring...':'Transfer'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Notes Panel ── */}
    {showNotes && (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
        <div style={{background:'#0c1219',borderRadius:'16px',border:'1px solid rgba(255,255,255,0.1)',width:'480px',maxHeight:'70vh',display:'flex',flexDirection:'column'}}>
          <div style={{padding:'18px 22px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <div style={{width:'28px',height:'28px',borderRadius:'7px',background:'rgba(245,158,11,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              </div>
              <div>
                <div style={{fontSize:'14px',fontWeight:'700',color:'#e9edef',lineHeight:'1.2'}}>Internal Notes</div>
                <div style={{fontSize:'10px',color:'#536471',marginTop:'1px'}}>Visible to agents only</div>
              </div>
            </div>
            <button onClick={()=>setShowNotes(false)} style={{background:'none',border:'none',color:'#536471',cursor:'pointer',fontSize:'18px'}}>✕</button>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'10px'}}>
            {notes.length===0 && (
              <div style={{textAlign:'center',padding:'40px 20px'}}>
                <div style={{width:'44px',height:'44px',borderRadius:'12px',background:'rgba(245,158,11,0.1)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </div>
                <div style={{fontSize:'13px',fontWeight:'600',color:'#536471',marginBottom:'4px'}}>No notes yet</div>
                <div style={{fontSize:'11px',color:'#3a5068'}}>Add internal notes for your team below</div>
              </div>
            )}
            {notes.map(n=>(
              <div key={n.id} style={{background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.18)',borderRadius:'10px',padding:'13px 15px',transition:'border-color 0.2s'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(245,158,11,0.4)'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(245,158,11,0.18)'}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'7px'}}>
                    <div style={{width:'24px',height:'24px',borderRadius:'50%',background:'linear-gradient(135deg,#f59e0b,#d97706)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:'800',color:'#070b11'}}>
                      {(n.author_name||'?')[0].toUpperCase()}
                    </div>
                    <span style={{fontSize:'12px',fontWeight:'600',color:'#f59e0b'}}>{n.author_name||'Agent'}</span>
                  </div>
                  <span style={{fontSize:'10px',color:'#3a5068',background:'rgba(255,255,255,0.04)',padding:'2px 7px',borderRadius:'4px'}}>
                    {new Date(n.created_at).toLocaleString('en',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                  </span>
                </div>
                <div style={{fontSize:'13px',color:'#c9d6df',lineHeight:'1.6',paddingLeft:'31px'}}>{n.content}</div>
              </div>
            ))}
          </div>
          <div style={{padding:'14px 22px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:'10px'}}>
            <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} rows={2}
              placeholder="Add internal note (not visible to customer)..."
              style={{flex:1,background:'#202c33',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'9px 12px',color:'#e9edef',fontSize:'13px',outline:'none',resize:'none'}}/>
            <button onClick={addNote} disabled={!noteText.trim()||addingNote}
              style={{padding:'9px 16px',background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:'8px',color:'#f59e0b',fontSize:'13px',fontWeight:'700',cursor:'pointer',alignSelf:'flex-end'}}>
              {addingNote?'...':'Add'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Canned Responses Picker ── */}
    {showCanned && cannedList.length > 0 && (
      <div style={{position:'absolute',bottom:'130px',left:'18px',right:'18px',background:'#101924',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'14px',padding:'8px',zIndex:100,boxShadow:'0 8px 32px rgba(0,0,0,.4)',maxHeight:'220px',overflowY:'auto'}}>
        <div style={{fontSize:'10px',color:'#536471',padding:'4px 8px 8px',fontWeight:'600'}}>CANNED RESPONSES — press / to search</div>
        {cannedList.map(c=>(
          <button key={c.id} onClick={()=>{setText(c.content);setShowCanned(false);inputRef.current?.focus();}}
            style={{width:'100%',background:'transparent',border:'none',borderRadius:'8px',padding:'8px 10px',textAlign:'left',cursor:'pointer',display:'flex',gap:'10px',alignItems:'flex-start'}}>
            <span style={{fontSize:'11px',fontWeight:'700',color:'#00d4b8',background:'rgba(0,212,184,0.1)',padding:'2px 8px',borderRadius:'4px',flexShrink:0,fontFamily:"'JetBrains Mono',monospace"}}>/{c.shortcut}</span>
            <span style={{fontSize:'12px',color:'#8696a0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.content}</span>
          </button>
        ))}
      </div>
    )}
    {showCatalogue && (
      <CatalogueModal
        conversation={conversation}
        onClose={()=>setShowCatalogue(false)}
      />
    )}
    </>
  );
}

// ── Voice Player ─────────────────────────────────────────────────────────────

function VoicePlayer({ mediaId, isOutgoing }) {
  const [audioUrl, setAudioUrl]       = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(false);
  const [playing, setPlaying]         = useState(false);
  const [duration, setDuration]       = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef    = useRef(null);
  const didAutoPlay = useRef(false);

  const fetchAudio = useCallback(async () => {
    if (audioUrl||loading||!mediaId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/api/media/${mediaId}`,{ headers:{ Authorization:`Bearer ${token}` }});
      if (!res.ok) throw new Error('Failed');
      setAudioUrl(URL.createObjectURL(await res.blob()));
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [audioUrl, loading, mediaId]);

  useEffect(()=>{
    const audio = audioRef.current;
    if (!audio||!audioUrl) return;
    const onMeta=()=>setDuration(audio.duration);
    const onTime=()=>setCurrentTime(audio.currentTime);
    const onEnd=()=>{ setPlaying(false); setCurrentTime(0); };
    audio.addEventListener('loadedmetadata',onMeta);
    audio.addEventListener('timeupdate',onTime);
    audio.addEventListener('ended',onEnd);
    return()=>{ audio.removeEventListener('loadedmetadata',onMeta); audio.removeEventListener('timeupdate',onTime); audio.removeEventListener('ended',onEnd); };
  },[audioUrl]);

  useEffect(()=>{
    if (audioUrl&&!didAutoPlay.current&&audioRef.current){
      didAutoPlay.current=true;
      audioRef.current.play().then(()=>setPlaying(true)).catch(()=>{});
    }
  },[audioUrl]);

  useEffect(()=>()=>{ if(audioUrl) URL.revokeObjectURL(audioUrl); },[audioUrl]);

  const togglePlay = async () => {
    if (!audioUrl){ await fetchAudio(); return; }
    if (playing){ audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const seek=(e)=>{
    if (!audioRef.current||!duration) return;
    const r=e.currentTarget.getBoundingClientRect();
    audioRef.current.currentTime=((e.clientX-r.left)/r.width)*duration;
  };

  const fmt=(s)=>{ if(!isFinite(s)||isNaN(s)) return '0:00'; return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`; };
  const progress = duration?(currentTime/duration)*100:0;
  const waveHeights = Array.from({length:28},(_,i)=>{ const seed=mediaId?mediaId.charCodeAt(i%mediaId.length):i; return 20+((seed*7+i*13)%60); });

  return (
    <div style={{display:'flex',alignItems:'center',gap:'10px',minWidth:'210px',maxWidth:'260px'}}>
      {audioUrl&&<audio ref={audioRef} src={audioUrl} preload="metadata"/>}
      <button onClick={togglePlay} disabled={loading||error} style={{width:'34px',height:'34px',borderRadius:'50%',border:'none',flexShrink:0,background:'rgba(0,212,184,.2)',color:'#00d4b8',cursor:loading||error?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
        {loading?<span style={{width:'12px',height:'12px',border:'2px solid #00d4b8',borderTopColor:'transparent',borderRadius:'50%',display:'inline-block',animation:'spin .7s linear infinite'}}/>:error?<span>✕</span>:playing?<PauseSmIcon/>:<PlaySmIcon/>}
      </button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'1.5px',height:'28px',cursor:'pointer'}} onClick={seek}>
          {waveHeights.map((h,i)=><div key={i} style={{flex:1,height:`${h}%`,borderRadius:'2px',background:(i/28)*100<=progress?'#00d4b8':'rgba(255,255,255,0.2)'}}/>)}
        </div>
        <div style={{fontSize:'9.5px',color:'rgba(255,255,255,.4)',fontFamily:"'JetBrains Mono',monospace",marginTop:'2px'}}>{playing||currentTime>0?fmt(currentTime):fmt(duration)}</div>
      </div>
      <MicSmIcon/>
    </div>
  );
}

// ── Image viewer ─────────────────────────────────────────────────────────────

function ImageMessage({ mediaId }) {
  const [url, setUrl]         = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(false);
  const [lightbox, setLightbox] = useState(false);

  useEffect(()=>{
    if (!mediaId) return;
    // Local file served directly
    if (mediaId.startsWith('/rich/files/') || mediaId.startsWith('/uploads/') || mediaId.startsWith('http')) {
      const base = (process.env.REACT_APP_API_URL||'').replace(/\/+$/,'');
      setUrl(mediaId.startsWith('http') ? mediaId : base + mediaId);
      return;
    }
    // WA media ID - fetch via our proxy
    setLoading(true);
    const token = localStorage.getItem('accessToken');
    fetch(`${API_BASE}/api/media/${mediaId}`,{ headers:{ Authorization:`Bearer ${token}` }})
      .then(r=>{ if(!r.ok) throw new Error(); return r.blob(); })
      .then(b=>setUrl(URL.createObjectURL(b)))
      .catch(()=>setError(true))
      .finally(()=>setLoading(false));
  },[mediaId]);

  if (loading) return <div style={{width:'180px',height:'120px',background:'rgba(255,255,255,.05)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{width:'16px',height:'16px',border:'2px solid #00d4b8',borderTopColor:'transparent',borderRadius:'50%',display:'inline-block',animation:'spin .7s linear infinite'}}/></div>;
  if (error)   return <div style={{padding:'8px 12px',color:'#f43f5e',fontSize:'12px'}}>⚠ Could not load image</div>;
  if (!url)    return null;

  return (
    <>
      <img src={url} alt="media" onClick={()=>setLightbox(true)} style={{maxWidth:'220px',maxHeight:'180px',borderRadius:'10px',objectFit:'cover',cursor:'pointer',display:'block'}}/>
      {lightbox && (
        <div onClick={()=>setLightbox(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <img src={url} alt="full" style={{maxWidth:'90vw',maxHeight:'90vh',objectFit:'contain',borderRadius:'8px'}}/>
        </div>
      )}
    </>
  );
}

// ── Bubble ────────────────────────────────────────────────────────────────────

function Bubble({ msg, initials, avatarColor, searchQuery }) {
  const highlightText = (text) => {
    if (!searchQuery || !text) return text;
    const parts = text.split(new RegExp('(' + searchQuery.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', 'gi'));
    return parts.map((p,i) => p.toLowerCase()===searchQuery.toLowerCase()
      ? <mark key={i} style={{background:'rgba(0,212,184,0.4)',color:'#fff',borderRadius:'2px',padding:'0 1px'}}>{p}</mark>
      : p);
  };
  const out     = msg.direction==='outgoing';
  const isAI    = msg.is_ai||msg.source==='ai';
  const isVoice = msg.type==='audio';
  const isImage = msg.type==='image';
  const isDoc   = msg.type==='document';
  const isVideo  = msg.type==='video';
  const time    = format(new Date(msg.timestamp||msg.created_at),'HH:mm');

  const bubbleStyle = out
    ? isAI
      ? {...s.bubbleBase,background:'#005c4b',borderRadius:'14px 14px 4px 14px'}
      : {...s.bubbleBase,background:'#005c4b',borderRadius:'14px 14px 4px 14px'}
    : {...s.bubbleBase,background:'#202c33',border:'none',borderRadius:'14px 14px 14px 4px',color:'#e9edef'};

  const mediaStyle = isImage||isVoice ? {...bubbleStyle, padding:'6px'} : bubbleStyle;

  return (
    <div className="msg-appear" style={{display:'flex',width:'100%',marginBottom:'4px',flexDirection:'row',alignItems:'flex-end'}}>
      {!out&&<div style={{...s.av,background:avatarColor,width:'28px',height:'28px',fontSize:'10px',flexShrink:0,marginRight:'6px'}}>{initials}</div>}
      {out&&<div style={{flex:1}}/>}
      <div style={{display:'flex',flexDirection:'column',gap:'2px',maxWidth:'70%'}}>
        <div style={mediaStyle}>
{isVoice && <VoicePlayer mediaId={msg.media_url} isOutgoing={out}/>}
          {isImage && <ImageMessage mediaId={msg.media_url}/>}
          {isVideo && msg.media_url && (
            msg.media_url.startsWith('/rich/files/') || msg.media_url.startsWith('http') ? (
              <video controls style={{maxWidth:'260px',borderRadius:'10px',display:'block'}}
                src={msg.media_url.startsWith('http') ? msg.media_url : (process.env.REACT_APP_API_URL||'') + msg.media_url}/>
            ) : <div style={{padding:'8px 12px',color:'#8696a0',fontSize:'12px'}}>🎬 Video</div>
          )}
          {isDoc   && (
            <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'4px 6px'}}>
              <div style={{width:'36px',height:'36px',borderRadius:'8px',background:'rgba(0,212,184,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><FileIcon/></div>
              <div>
                <div style={{fontSize:'12px',fontWeight:'600',color:'#edf2f8'}}>{msg.content||'Document'}</div>
                <div style={{fontSize:'10px',color:'#3a5068',marginTop:'2px'}}>{msg.type}</div>
              </div>
            </div>
          )}
          {!isVoice&&!isImage&&!isDoc && <span>{highlightText(msg.content)}</span>}
        </div>
        <div style={{...s.meta,justifyContent:'flex-end',padding:'0 2px'}}>
          {out&&isAI  &&<span style={{fontSize:'9px',color:'rgba(255,255,255,.4)',fontWeight:'600'}}>AI</span>}
          {out&&!isAI &&<span style={{fontSize:'9px',color:'rgba(255,255,255,.4)',fontWeight:'600'}}>You</span>}
          <span style={{fontSize:'9.5px',color:out?'rgba(255,255,255,.3)':'#3a5068',fontFamily:"'JetBrains Mono',monospace"}}>{time}</span>
          {out&&<TickIcon status={msg.status}/>}
        </div>
      </div>
      {out&&<div style={{width:'28px',flexShrink:0}}/>}
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const PlaySmIcon   = ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="#00d4b8"><polygon points="5,3 19,12 5,21"/></svg>;
const PauseSmIcon  = ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="#00d4b8"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>;
const MicSmIcon    = ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3a5068" strokeWidth="2"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="19" x2="12" y2="22"/></svg>;
const MicIcon      = ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4b8" strokeWidth="2"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="19" x2="12" y2="22"/></svg>;
const MicActiveIcon= ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="#00d4b8" stroke="#00d4b8" strokeWidth="1"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0" fill="none" strokeWidth="2"/><line x1="12" y1="19" x2="12" y2="22" strokeWidth="2"/></svg>;
const StopIcon     = ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>;
const TrashIcon    = ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const FileIcon     = ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4b8" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const TickIcon=({status})=>{
  if(status==='read') return <svg width="16" height="10" viewBox="0 0 24 11" fill="none"><path d="M1 5.5L5 9.5L15 1.5" stroke="#00d4b8" strokeWidth="2" strokeLinecap="round"/><path d="M5 5.5L9 9.5L15 3.5" stroke="#00d4b8" strokeWidth="2" strokeLinecap="round"/></svg>;
  if(status==='delivered') return <svg width="16" height="10" viewBox="0 0 24 11" fill="none"><path d="M1 5.5L5 9.5L15 1.5" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round"/><path d="M5 5.5L9 9.5L15 3.5" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round"/></svg>;
  return <svg width="14" height="10" viewBox="0 0 14 11" fill="none"><path d="M1 5L5 9L13 1" stroke="rgba(255,255,255,.3)" strokeWidth="2" strokeLinecap="round"/></svg>;
};
const HdrBtn=({children,onClick,title})=><button onClick={onClick} title={title} style={s.hdrBtn}>{children}</button>;
const NotesIcon=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TransferIcon=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>;
const SearchIcon   = ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>;
const ContactIcon  = ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const MoreIcon     = ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>;
const BotIcon      = ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0,color:'#00d4b8'}}><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V6a3 3 0 016 0v2"/><path d="M9 14h.01M15 14h.01" strokeLinecap="round"/></svg>;
const PauseIcon    = ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
const TakeoverIcon = ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const EmojiIcon    = ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
const AttachIcon   = ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>;
const SendIcon=({active})=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={active?'#070b11':'#3a5068'} strokeWidth="2.2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const WaWatermark  = ()=><svg width="44" height="44" viewBox="0 0 24 24" fill="none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a6.08 6.08 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#1a2e42"/><path d="M5.077 18.347l.892-3.244a8.357 8.357 0 01-1.12-4.232C4.852 6.26 8.113 3 12.124 3c1.948.001 3.778.76 5.151 2.138a7.247 7.247 0 012.124 5.155c-.002 4.012-3.263 7.272-7.272 7.272a7.266 7.266 0 01-3.475-.883l-3.575.865z" stroke="#1a2e42" strokeWidth="1.5" fill="none"/></svg>;
const Spinner      = ()=><span style={{width:'18px',height:'18px',border:'2px solid rgba(255,255,255,.2)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin .7s linear infinite'}}/>;

const s={
  root:{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'#0b141a'},
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
  head:{display:'flex',alignItems:'center',gap:'12px',padding:'10px 18px',background:'#202c33',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0},
  av:{borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'700',color:'white'},
  info:{flex:1,minWidth:0},
  name:{fontSize:'14px',fontWeight:'700',letterSpacing:'-.2px',color:'#edf2f8',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  sub:{display:'flex',alignItems:'center',gap:'6px',marginTop:'2px',flexWrap:'wrap'},
  actions:{display:'flex',alignItems:'center',gap:'6px',flexShrink:0,position:'relative',zIndex:10},
  hdrBtn:{width:'32px',height:'32px',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.07)',background:'transparent',color:'#3a5068',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s'},
  msgs:{flex:1,overflowY:'auto',padding:'20px 12px',display:'flex',flexDirection:'column',gap:'3px',position:'relative',alignItems:'stretch',background:'#0b141a'},
  watermark:{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',display:'flex',flexDirection:'column',alignItems:'center',opacity:.6,pointerEvents:'none',userSelect:'none'},
  noMsg:{textAlign:'center',color:'#1a2e42',fontSize:'13px',marginTop:'60px'},
  dateSep:{display:'flex',alignItems:'center',gap:'10px',margin:'12px 0 8px'},
  dateLine:{flex:1,height:'1px',background:'rgba(255,255,255,0.07)'},
  dateLbl:{fontSize:'10px',color:'#3a5068',background:'#101924',border:'1px solid rgba(255,255,255,0.07)',padding:'3px 12px',borderRadius:'20px',fontFamily:"'JetBrains Mono',monospace",whiteSpace:'nowrap'},
  msgRow:{display:'flex',gap:'8px',width:'100%',marginBottom:'2px'},
  bubbleBase:{padding:'9px 13px 20px',borderRadius:'14px',fontSize:'13px',lineHeight:'1.6',wordBreak:'break-word',whiteSpace:'pre-wrap',color:'#fff',position:'relative',minWidth:'80px',maxWidth:'480px'},
  meta:{display:'flex',alignItems:'center',gap:'4px'},
  suggestions:{padding:'10px 18px 0',display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',flexShrink:0},
  suggLabel:{fontSize:'10.5px',color:'#3a5068',fontWeight:'600',whiteSpace:'nowrap'},
  suggChip:{padding:'6px 12px',borderRadius:'20px',border:'1px solid rgba(0,212,184,.25)',background:'rgba(0,212,184,.06)',color:'#00d4b8',fontSize:'11.5px',fontWeight:'600',cursor:'pointer',transition:'all .15s',whiteSpace:'nowrap'},
  attachPreview:{padding:'8px 18px',display:'flex',alignItems:'center',gap:'10px',background:'#0c1219',borderTop:'1px solid rgba(255,255,255,0.07)'},
  fileChip:{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px',background:'#101924',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'10px'},
  emojiPicker:{position:'absolute',bottom:'130px',left:'18px',background:'#101924',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'14px',padding:'10px',width:'280px',zIndex:100,boxShadow:'0 8px 32px rgba(0,0,0,.4)'},
  emojiBtn:{width:'30px',height:'30px',border:'none',background:'transparent',fontSize:'17px',cursor:'pointer',borderRadius:'6px',display:'flex',alignItems:'center',justifyContent:'center'},
  composer:{padding:'12px 18px 14px',background:'#0c1219',borderTop:'1px solid rgba(255,255,255,0.07)',flexShrink:0,position:'relative'},
  composerInner:{display:'flex',alignItems:'flex-end',gap:'8px'},
  toolBtn:{width:'34px',height:'34px',borderRadius:'9px',border:'1px solid rgba(255,255,255,0.07)',background:'transparent',color:'#3a5068',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',flexShrink:0},
  inputWrap:{flex:1,background:'#101924',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'10px 14px',transition:'border-color .2s'},
  textarea:{width:'100%',background:'transparent',border:'none',outline:'none',color:'#edf2f8',fontSize:'13px',lineHeight:'1.5',minHeight:'22px',maxHeight:'110px',overflowY:'auto'},
  sendBtn:{width:'40px',height:'40px',borderRadius:'50%',border:'none',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',flexShrink:0},
};

// ── Catalogue Modal ───────────────────────────────────────────────────────────
function CatalogueModal({ conversation, onClose }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(null);
  const [msg, setMsg]           = useState('');

  useEffect(() => {
    api.get('/commerce/products')
      .then(r => setProducts(r.data))
      .catch(() => setMsg('Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  const sendProduct = async (p) => {
    setSending(p.id);
    try {
      await api.post(`/commerce/products/${p.id}/send`, {
        conversationId: conversation.id,
      });
      setMsg('✅ Product sent!');
      setTimeout(() => { setMsg(''); onClose(); }, 1500);
    } catch {
      setMsg('❌ Failed to send');
    } finally {
      setSending(null);
    }
  };

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#0a1520',border:'1px solid rgba(255,255,255,0.1)',borderRadius:14,width:480,maxHeight:'80vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{color:'#edf2f8',fontWeight:700,fontSize:16,display:'flex',alignItems:'center',gap:8}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            Product Catalogue
          </span>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#7a95af',cursor:'pointer',fontSize:20}}>✕</button>
        </div>
        <div style={{overflowY:'auto',padding:16,display:'flex',flexDirection:'column',gap:10}}>
          {loading && <div style={{color:'#7a95af',textAlign:'center',padding:40}}>Loading products...</div>}
          {!loading && products.length === 0 && <div style={{color:'#7a95af',textAlign:'center',padding:40}}>No products found</div>}
          {products.map(p => (
            <div key={p.id} style={{background:'#0f1e2e',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div style={{flex:1}}>
                <div style={{color:'#edf2f8',fontWeight:600,fontSize:14}}>{p.name}</div>
                {p.description && <div style={{color:'#7a95af',fontSize:12,marginTop:2}}>{p.description}</div>}
                <div style={{color:'#00d4b8',fontWeight:700,fontSize:13,marginTop:4}}>PKR {Number(p.price).toLocaleString()}</div>
              </div>
              <button onClick={()=>sendProduct(p)} disabled={sending===p.id}
                style={{padding:'7px 14px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#00d4b8,#00b8a0)',color:'#070b11',fontWeight:700,fontSize:12,cursor:'pointer',flexShrink:0}}>
                {sending===p.id ? '...' : 'Send'}
              </button>
            </div>
          ))}
        </div>
        {msg && <div style={{padding:'10px 20px',borderTop:'1px solid rgba(255,255,255,0.07)',color:'#00d4b8',fontSize:13,textAlign:'center'}}>{msg}</div>}
      </div>
    </div>
  );
}
