import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useConversationStore } from '../../store';

export default function ConversationList({ conversations, activeId, onSelect }) {
  const [search, setSearch] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [tplVars, setTplVars] = useState({});
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [sending, setSending] = useState(false);

  const openTemplates = async () => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch((process.env.REACT_APP_API_URL||'') + '/api/templates', {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();
    setTemplates(data);
    setShowTemplates(true);
  };

  const sendTemplate = async () => {
    if (!selectedTpl || !activeId) return;
    setSending(true);
    try {
      const token = localStorage.getItem('accessToken');
      const conv = conversations.find(c => c.id === activeId);
      if (!conv) return alert('Select a conversation first');
      // Replace variables in body
      let body = selectedTpl.body;
      (selectedTpl.variables||[]).forEach((v,i) => {
        body = body.replace('{{' + (i+1) + '}}', tplVars[i]||'');
      });
      const res = await fetch((process.env.REACT_APP_API_URL||'') + '/api/messages/send-template', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeId, templateId: selectedTpl.id, variables: tplVars }),
      });
      if (!res.ok) { const e = await res.json(); alert(e.error||'Failed'); return; }
      setShowTemplates(false);
      setSelectedTpl(null);
      setTplVars({});
    } finally { setSending(false); }
  };
  const [filter, setFilter] = useState('open');
  const { fetchConversations, total } = useConversationStore();

  const handleFilter = (f) => { setFilter(f); fetchConversations({ status: f }); };

  const getName = (conv) => conv.contact_name || conv.phone_number;
  const getInitials = (conv) => {
    if (conv.contact_name) return conv.contact_name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
    return conv.phone_number?.slice(-2);
  };

  const filtered = search
    ? conversations.filter(c => getName(c)?.toLowerCase().includes(search.toLowerCase()) || c.phone_number?.includes(search))
    : conversations;

  const avatarColors = [
    'linear-gradient(135deg,#6366f1,#8b5cf6)',
    'linear-gradient(135deg,#f97316,#fbbf24)',
    'linear-gradient(135deg,#ec4899,#f43f5e)',
    'linear-gradient(135deg,#14b8a6,#00d4b8)',
    'linear-gradient(135deg,#10b981,#059669)',
    'linear-gradient(135deg,#3b82f6,#6366f1)',
  ];
  const getColor = (name) => avatarColors[(name||'').charCodeAt(0) % avatarColors.length];

  const timeAgo = (t) => {
    if (!t) return '';
    try {
      return formatDistanceToNow(new Date(t), {addSuffix:false})
        .replace('about ','').replace(' minutes','m').replace(' minute','m')
        .replace(' hours','h').replace(' hour','h').replace(' days','d').replace(' day','d')
        .replace('less than a m','1m');
    } catch { return ''; }
  };

  const getStatusRing = (conv) => {
    if (conv.automation_enabled) return { background:'#10b981' }; // AI = green
    if (conv.status === 'closed') return { background:'#3a5068' };
    return { background:'#f43f5e' }; // human/manual = red
  };

  const filterTabs = [
    { key:'open', label:'Open' },
    { key:'pending', label:'Pending' },
    { key:'closed', label:'Closed' },
  ];

  return (
    <>
    <div style={s.root}>
      <div style={s.head}>
        {/* Brand */}
        <div style={s.brand}>
          <div style={s.brandLogo}>
            <div style={s.brandLogoInner}>
              <span style={s.brandS}>S</span>
              <div style={s.brandLine}/>
            </div>
          </div>
          <div>
            <div style={s.brandName}>Sanestix Flow</div>
            <div style={s.brandSub}>WhatsApp AI Platform</div>
          </div>
        </div>

        {/* Search */}
        <div style={s.searchWrap}>
          <SearchIcon/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search conversations…" style={s.search}
            onFocus={e=>{e.target.style.borderColor='#00d4b8';e.target.style.boxShadow='0 0 0 3px rgba(0,212,184,0.1)'}}
            onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,0.07)';e.target.style.boxShadow='none'}}/>
          {search && <button onClick={()=>setSearch('')} style={s.clearBtn}><ClearIcon/></button>}
        </div>

        {/* Filter tabs (pill style) */}
        <div style={s.filterTabs}>
          {filterTabs.map(f=>(
            <button key={f.key} onClick={()=>handleFilter(f.key)}
              style={{...s.ftab,...(filter===f.key?s.ftabActive:{})}}>
              {f.label}
              {filter===f.key && <span style={s.ftabCount}>{total}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={s.list}>
        {filtered.length===0 ? (
          <div style={s.empty}><EmptyIcon/><p>No {filter} conversations</p></div>
        ) : filtered.map((conv, i) => {
          const name = getName(conv);
          const isActive = conv.id === activeId;
          const preview = conv.last_message ? (conv.last_message_direction==='outgoing'?'✓ ':'')+conv.last_message : 'No messages yet';
          const ringStyle = getStatusRing(conv);
          return (
            <button key={conv.id} className="conv-appear" onClick={()=>onSelect(conv)}
              style={{...s.item,...(isActive?s.itemActive:{}),animationDelay:`${i*0.03}s`}}>
              {isActive && <div style={s.activeBar}/>}
              <div style={{position:'relative',flexShrink:0}}>
                <div style={{...s.av,background:getColor(name)}}>{getInitials(conv)}</div>
                <div style={{...s.statusRing,...ringStyle}}/>
              </div>
              <div style={s.body}>
                <div style={s.itemTop}>
                  <span style={s.itemName}>{name}</span>
                  <span style={s.time}>{timeAgo(conv.last_message_at)}</span>
                </div>
                <div style={s.itemBottom}>
                  <span style={s.preview}>{preview}</span>
                  <div style={s.badges}>
                    {conv.unread_count > 0 && (
                      <span style={s.unread}>{conv.unread_count > 99 ? '99+' : conv.unread_count}</span>
                    )}
                  </div>
                </div>
                <div style={{marginTop:'3px'}}>
                  {conv.automation_enabled
                    ? <span style={s.aiChip}>AI</span>
                    : conv.status === 'pending'
                      ? <span style={s.waitChip}>Waiting</span>
                      : null
                  }
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer: Send Template */}
      <div style={s.footer}>
        <button style={s.templateBtn} onClick={openTemplates}>
          <TemplateIcon/>
          Send Template Message
          <ChevronIcon/>
        </button>
      </div>
    </div>

    {showTemplates && (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
        <div style={{background:'#0c1219',borderRadius:'16px',border:'1px solid rgba(255,255,255,0.1)',width:'520px',maxHeight:'80vh',display:'flex',flexDirection:'column'}}>
          <div style={{padding:'18px 22px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:'15px',fontWeight:'700',color:'#e9edef'}}>Send Template Message</span>
            <button onClick={()=>{setShowTemplates(false);setSelectedTpl(null);}} style={{background:'none',border:'none',color:'#536471',cursor:'pointer',fontSize:'18px'}}>✕</button>
          </div>
          <div style={{overflowY:'auto',flex:1,padding:'16px'}}>
            {templates.length===0 && <div style={{textAlign:'center',color:'#536471',padding:'40px'}}>No templates yet. Create templates first.</div>}
            {templates.map(t=>(
              <div key={t.id} onClick={()=>{setSelectedTpl(t);setTplVars({});}}
                style={{padding:'14px',borderRadius:'12px',border:'1px solid '+(selectedTpl?.id===t.id?'rgba(0,212,184,0.4)':'rgba(255,255,255,0.07)'),background:selectedTpl?.id===t.id?'rgba(0,212,184,0.06)':'#0d1424',marginBottom:'10px',cursor:'pointer'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                  <span style={{fontSize:'13px',fontWeight:'700',color:'#e9edef'}}>{t.name}</span>
                  <span style={{fontSize:'10px',padding:'2px 8px',borderRadius:'20px',background:'rgba(0,212,184,0.1)',color:'#00a884',border:'1px solid rgba(0,212,184,0.2)'}}>{t.status}</span>
                </div>
                <div style={{fontSize:'12px',color:'#8696a0',lineHeight:'1.5'}}>{t.body}</div>
                {selectedTpl?.id===t.id && (t.variables||[]).length>0 && (
                  <div style={{marginTop:'12px',borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:'12px'}}>
                    <div style={{fontSize:'11px',color:'#536471',marginBottom:'8px',fontWeight:'600'}}>FILL IN VARIABLES</div>
                    {(t.variables||[]).map((v,i)=>(
                      <div key={i} style={{marginBottom:'8px'}}>
                        <div style={{fontSize:'11px',color:'#536471',marginBottom:'3px'}}>{'Variable {{' + (i+1) + '}}'}</div>
                        <input value={tplVars[i]||''} onChange={e=>setTplVars(prev=>({...prev,[i]:e.target.value}))}
                          placeholder={'Value for {{' + (i+1) + '}}'}
                          style={{width:'100%',background:'#202c33',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'7px 10px',color:'#e9edef',fontSize:'12px',outline:'none',boxSizing:'border-box'}}/>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{padding:'14px 22px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:'11px',color:'#536471'}}>Only approved templates work outside 24hr window</span>
            <button onClick={sendTemplate} disabled={!selectedTpl||sending}
              style={{background:selectedTpl?'linear-gradient(135deg,#00d4b8,#00b8a0)':'#1a2e42',border:'none',color:selectedTpl?'#070b11':'#3a5068',borderRadius:'8px',padding:'9px 20px',fontSize:'13px',fontWeight:'700',cursor:selectedTpl?'pointer':'not-allowed'}}>
              {sending?'Sending...':'📤 Send'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

const SearchIcon=()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3a5068" strokeWidth="2" style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>;
const ClearIcon=()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>;
const EmptyIcon=()=><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1a2e42" strokeWidth="1.5" style={{marginBottom:'8px'}}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
const TemplateIcon=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
const ChevronIcon=()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>;

const s={
  root:{width:'300px',flexShrink:0,background:'#111b21',borderRight:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',overflow:'hidden'},
  head:{padding:'16px 14px 0',flexShrink:0,borderBottom:'1px solid rgba(255,255,255,0.06)'},
  brand:{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'},
  brandLogo:{width:'40px',height:'40px',borderRadius:'10px',background:'#202c33',border:'1px solid rgba(0,212,184,.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden',boxShadow:'0 0 14px rgba(0,212,184,.1)'},
  brandLogoInner:{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'},
  brandS:{fontFamily:"'Urbanist',sans-serif",fontWeight:900,fontSize:'22px',color:'white',letterSpacing:'-1px',lineHeight:1},
  brandLine:{width:'16px',height:'2.5px',background:'linear-gradient(90deg,#00d4b8,#00b8a0)',borderRadius:'2px'},
  brandName:{fontWeight:900,fontSize:'15px',letterSpacing:'-.5px',color:'#e9edef'},
  brandSub:{fontSize:'10px',color:'#536471',fontFamily:"'JetBrains Mono',monospace",letterSpacing:'.02em'},
  searchWrap:{position:'relative',marginBottom:'10px'},
  search:{width:'100%',background:'#202c33',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'10px',padding:'8px 12px 8px 32px',color:'#e9edef',fontSize:'12px',outline:'none',transition:'border-color .2s, box-shadow .2s',boxSizing:'border-box'},
  clearBtn:{position:'absolute',right:'10px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#536471',display:'flex',alignItems:'center'},
  filterTabs:{display:'flex',gap:'4px',paddingBottom:'12px',overflowX:'auto'},
  ftab:{padding:'5px 10px',borderRadius:'20px',border:'1px solid rgba(255,255,255,0.07)',background:'transparent',color:'#536471',fontSize:'11px',fontWeight:'600',cursor:'pointer',whiteSpace:'nowrap',transition:'all .15s',display:'flex',alignItems:'center',gap:'4px'},
  ftabActive:{background:'rgba(0,212,184,0.1)',borderColor:'rgba(0,212,184,.3)',color:'#00a884'},
  ftabCount:{display:'inline-flex',alignItems:'center',justifyContent:'center',background:'#00d4b8',color:'#070b11',fontSize:'9px',fontWeight:'800',minWidth:'16px',height:'16px',padding:'0 4px',borderRadius:'8px'},
  list:{flex:1,overflowY:'auto',padding:'6px'},
  empty:{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'180px',color:'#1a2e42',fontSize:'13px'},
  item:{width:'100%',background:'transparent',border:'none',borderRadius:'14px',padding:'10px',display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',transition:'background .12s',textAlign:'left',marginBottom:'2px',position:'relative'},
  itemActive:{background:'#141f2e'},
  activeBar:{position:'absolute',left:0,top:'18%',bottom:'18%',width:'3px',background:'#00d4b8',borderRadius:'0 3px 3px 0'},
  av:{width:'42px',height:'42px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:'700',color:'white',flexShrink:0},
  statusRing:{position:'absolute',bottom:0,right:0,width:'12px',height:'12px',borderRadius:'50%',border:'2px solid #0c1219'},
  body:{flex:1,minWidth:0},
  itemTop:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'6px',marginBottom:'3px'},
  itemName:{fontSize:'13px',fontWeight:'600',color:'#e9edef',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  time:{fontSize:'10px',color:'#536471',fontFamily:"'JetBrains Mono',monospace",flexShrink:0},
  itemBottom:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'6px'},
  preview:{fontSize:'11.5px',color:'#8696a0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',flex:1},
  badges:{display:'flex',alignItems:'center',gap:'4px',flexShrink:0},
  unread:{background:'#00d4b8',color:'#070b11',fontSize:'9px',fontWeight:'800',minWidth:'17px',height:'17px',padding:'0 4px',borderRadius:'9px',display:'flex',alignItems:'center',justifyContent:'center'},
  aiChip:{fontSize:'9px',padding:'1px 6px',borderRadius:'4px',fontWeight:'700',background:'rgba(0,212,184,.1)',color:'#00a884',border:'1px solid rgba(0,212,184,.2)'},
  waitChip:{fontSize:'9px',padding:'1px 6px',borderRadius:'4px',fontWeight:'700',background:'rgba(245,158,11,.1)',color:'#f59e0b',border:'1px solid rgba(245,158,11,.2)'},
  footer:{padding:'10px 14px',borderTop:'1px solid rgba(255,255,255,0.07)',flexShrink:0},
  templateBtn:{width:'100%',padding:'9px',background:'#202c33',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'10px',color:'#8696a0',fontSize:'12px',fontWeight:'600',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',transition:'all .15s'},
};
