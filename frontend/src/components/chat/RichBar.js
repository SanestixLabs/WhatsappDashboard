import { useState, useRef } from 'react';
const API = process.env.REACT_APP_API_URL || '';

const TYPES = [
  { key:'image',               label:'Photo',    color:'#25D366', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="24" height="24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M21 15l-5-5L5 21"/></svg> },
  { key:'video',               label:'Video',    color:'#FF6B6B', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="24" height="24"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-4v12l-6-4V10z" fill="currentColor" stroke="none"/></svg> },
  { key:'document',            label:'Document', color:'#4ECDC4', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="24" height="24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg> },
  { key:'interactive_buttons', label:'Buttons',  color:'#A29BFE', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="24" height="24"><rect x="2" y="5" width="20" height="4" rx="2"/><rect x="2" y="11" width="20" height="4" rx="2"/><rect x="2" y="17" width="12" height="4" rx="2"/></svg> },
  { key:'interactive_list',    label:'List',     color:'#FDCB6E', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="24" height="24"><circle cx="4" cy="6" r="1.5" fill="currentColor"/><line x1="8" y1="6" x2="22" y2="6"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><line x1="8" y1="12" x2="22" y2="12"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/><line x1="8" y1="18" x2="22" y2="18"/></svg> },
  { key:'template',            label:'Template', color:'#74B9FF', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="24" height="24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg> },
  { key:'location',            label:'Location', color:'#FF7675', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="24" height="24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="currentColor" stroke="none"/></svg> },
];

const inp = { width:'100%', background:'#2a3942', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', color:'#e9edf0', padding:'10px 14px', fontSize:'13px', outline:'none', boxSizing:'border-box', fontFamily:'inherit' };
const token = () => localStorage.getItem('accessToken');

function TplVars({ selTpl, tplVars, setTplVars, inp }) {
  const body = selTpl ? (selTpl.body || selTpl.body_text || '') : '';
  const matches = body.match(/\{\{\d+\}\}/g);
  if (!matches) return null;
  const nums = [...new Set(matches.map(v => parseInt(v.replace(/[{}]/g, ''))))].sort();
  return (
    <div style={{marginTop:'12px',padding:'12px',background:'rgba(0,212,184,0.06)',borderRadius:'10px',border:'1px solid rgba(0,212,184,0.2)'}}>
      <div style={{fontSize:'11px',color:'#00d4b8',fontWeight:'700',marginBottom:'10px',letterSpacing:'0.05em'}}>FILL IN TEMPLATE VARIABLES</div>
      {nums.map(n => (
        <div key={n} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
          <span style={{fontSize:'12px',color:'#536471',flexShrink:0,minWidth:'36px'}}>{`{{${n}}}`}</span>
          <input value={tplVars[n]||''} onChange={e => setTplVars(v => ({...v,[n]:e.target.value}))}
            placeholder={`Value for {{${n}}}`} style={{...inp,flex:1,margin:0}}/>
        </div>
      ))}
    </div>
  );
}

export default function RichBar({ conversationId, onSent }) {
  const [open,      setOpen]      = useState(false);
  const [type,      setType]      = useState('image');
  const [sending,   setSending]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');
  const [mediaUrl,  setMediaUrl]  = useState('');
  const [mediaId,   setMediaId]   = useState('');
  const [localUrl,  setLocalUrl]  = useState('');
  const [caption,   setCaption]   = useState('');
  const [bodyText,  setBodyText]  = useState('');
  const [header,    setHeader]    = useState('');
  const [footer,    setFooter]    = useState('');
  const [buttons,   setButtons]   = useState([{id:'b0',title:''}]);
  const [btnLabel,  setBtnLabel]  = useState('Choose option');
  const [rows,      setRows]      = useState([{id:'r0',title:'',desc:''}]);
  const [templates, setTemplates] = useState([]);
  const [tplLoaded, setTplLoaded] = useState(false);
  const [selTpl,    setSelTpl]    = useState(null);
  const [tplVars,   setTplVars]   = useState({});
  const [lat,       setLat]       = useState('');
  const [lng,       setLng]       = useState('');
  const [locName,   setLocName]   = useState('');
  const [mapSearch, setMapSearch] = useState('');
  const fileRef = useRef();

  const reset = () => {
    setMediaUrl(''); setMediaId(''); setLocalUrl(''); setCaption('');
    setBodyText(''); setHeader(''); setFooter('');
    setButtons([{id:'b0',title:''}]); setRows([{id:'r0',title:'',desc:''}]);
    setBtnLabel('Choose option'); setSelTpl(null); setTplVars({});
    setLat(''); setLng(''); setLocName(''); setMapSearch(''); setError('');
  };

  const pick = t => { setType(t); reset(); if (t==='template' && !tplLoaded) loadTpl(); };

  const loadTpl = async () => {
    try {
      const r = await fetch(`${API}/api/templates`, { headers:{ Authorization:`Bearer ${token()}` }});
      const d = await r.json();
      setTemplates(Array.isArray(d) ? d.filter(t => ['approved','APPROVED'].includes(t.status)) : []);
    } catch { setTemplates([]); }
    setTplLoaded(true);
  };

  const handleUpload = async file => {
    setUploading(true); setError(''); setMediaId(''); setMediaUrl(''); setLocalUrl('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const r = await fetch(`${API}/api/rich/media/upload`, { method:'POST', headers:{ Authorization:`Bearer ${token()}` }, body:fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Upload failed');
      if (d.wa_media_id) setMediaId(d.wa_media_id);
      if (d.local_url)   setLocalUrl(d.local_url);
    } catch(e) { setError(e.message); }
    setUploading(false);
  };

  const searchLocation = async () => {
    if (!mapSearch.trim()) return;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(mapSearch)}&format=json&limit=1`);
      const d = await r.json();
      if (d.length) {
        setLat(parseFloat(d[0].lat).toFixed(6));
        setLng(parseFloat(d[0].lon).toFixed(6));
        setLocName(d[0].display_name.split(',').slice(0,2).join(','));
        setError('');
      } else setError('Location not found. Try different keywords.');
    } catch { setError('Search failed. Enter coordinates manually.'); }
  };

  const canSend = () => {
    if (sending || uploading) return false;
    if (['image','video','document'].includes(type)) return !!(mediaId || mediaUrl || localUrl);
    if (type==='interactive_buttons') return !!(bodyText.trim() && buttons.some(b => b.title.trim()));
    if (type==='interactive_list')    return !!(bodyText.trim() && rows[0]?.title.trim());
    if (type==='template')            return !!selTpl;
    if (type==='location')            return !!(lat && lng);
    return false;
  };

  const send = async () => {
    setSending(true); setError('');
    try {
      let body = { type };
      if (['image','video','document'].includes(type)) {
        if (mediaId)       body.media_id  = mediaId;
        if (localUrl)      body.local_url = localUrl;
        if (!mediaId && !localUrl) body.media_url = mediaUrl;
        if (caption)       body.caption   = caption;
      } else if (type==='interactive_buttons') {
        body = { type, text:bodyText, buttons:buttons.filter(b => b.title.trim()) };
        if (header) body.header = header;
        if (footer) body.footer = footer;
      } else if (type==='interactive_list') {
        body = { type, text:bodyText, button_label:btnLabel,
          sections:[{ title:'Options', rows:rows.filter(r=>r.title.trim()).map((r,i)=>({id:r.id||`row_${i}`,title:r.title,description:r.desc})) }] };
        if (header) body.header = header;
      } else if (type==='template') {
        const tplBody = selTpl.body || selTpl.body_text || '';
        const varMatches = tplBody.match(/\{\{\d+\}\}/g) || [];
        const components = varMatches.length > 0 ? [{
          type:'body',
          parameters: [...new Set(varMatches.map(v=>parseInt(v.replace(/[{}]/g,''))))].sort().map(n => ({ type:'text', text:tplVars[n]||'' }))
        }] : [];
        body = { type, template_name:selTpl.name, language:selTpl.language||'en_US', components };
      } else if (type==='location') {
        body = { type, latitude:parseFloat(lat), longitude:parseFloat(lng), name:locName, address:locName };
      }
      const r = await fetch(`${API}/api/rich/send/${conversationId}`, {
        method:'POST', headers:{ Authorization:`Bearer ${token()}`, 'Content-Type':'application/json' },
        body: JSON.stringify(body)
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Send failed');
      reset(); setOpen(false); onSent && onSent();
    } catch(e) { setError(e.message); }
    setSending(false);
  };

  const activeType = TYPES.find(t => t.key===type);

  if (!open) return (
    <button onClick={() => setOpen(true)} title="Send photo, video, document, buttons & more"
      style={{width:'34px',height:'34px',borderRadius:'9px',border:'1px solid rgba(255,255,255,0.07)',background:'transparent',color:'#3a5068',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>
  );

  return (
    <div style={{position:'absolute',bottom:'100%',left:0,right:0,zIndex:300,background:'#111b21',borderTop:`2px solid ${activeType.color}`,boxShadow:'0 -12px 48px rgba(0,0,0,.6)',borderRadius:'16px 16px 0 0'}}>

      {/* Tabs */}
      <div style={{display:'flex',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.06)',overflowX:'auto',scrollbarWidth:'none'}}>
        {TYPES.map(({key,label,color,icon}) => (
          <button key={key} onClick={() => pick(key)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',padding:'12px 14px',background:'none',border:'none',cursor:'pointer',borderBottom:`2px solid ${type===key?color:'transparent'}`,transition:'all .2s',flexShrink:0}}>
            <span style={{color:type===key?color:'#536471'}}>{icon}</span>
            <span style={{fontSize:'10px',fontWeight:'700',color:type===key?color:'#536471'}}>{label}</span>
          </button>
        ))}
        <button onClick={() => { setOpen(false); reset(); }} style={{marginLeft:'auto',padding:'12px 16px',background:'none',border:'none',cursor:'pointer',color:'#536471',flexShrink:0}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Body */}
      <div style={{padding:'16px',maxHeight:'400px',overflowY:'auto'}}>

        {error && (
          <div style={{background:'rgba(244,63,94,0.1)',border:'1px solid rgba(244,63,94,0.3)',borderRadius:'10px',padding:'10px 14px',color:'#f43f5e',fontSize:'12.5px',marginBottom:'14px',display:'flex',gap:'8px',alignItems:'center'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        {/* MEDIA */}
        {['image','video','document'].includes(type) && (
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div onClick={() => fileRef.current && fileRef.current.click()}
              style={{border:`2px dashed ${mediaId||localUrl||mediaUrl ? activeType.color : 'rgba(255,255,255,0.1)'}`,borderRadius:'14px',padding:'28px 20px',textAlign:'center',cursor:'pointer',background:mediaId||localUrl?`${activeType.color}11`:'rgba(255,255,255,0.02)'}}>
              {uploading ? (
                <div style={{color:activeType.color,fontSize:'13px',fontWeight:'600'}}>⏳ Uploading...</div>
              ) : (mediaId||localUrl||mediaUrl) ? (
                <div>
                  <div style={{fontSize:'28px',marginBottom:'6px'}}>✅</div>
                  <div style={{color:activeType.color,fontWeight:'700',fontSize:'13px'}}>{mediaId ? 'Uploaded to WhatsApp' : 'File ready'}</div>
                  <div style={{color:'#536471',fontSize:'11px',marginTop:'4px'}}>Click to replace</div>
                </div>
              ) : (
                <div>
                  <div style={{color:activeType.color,display:'flex',justifyContent:'center',marginBottom:'10px'}}>{activeType.icon}</div>
                  <div style={{color:'#e9edf0',fontWeight:'700',fontSize:'14px',marginBottom:'4px'}}>Tap to upload {activeType.label}</div>
                  <div style={{color:'#536471',fontSize:'12px'}}>Max 25MB · or paste a URL below</div>
                </div>
              )}
            </div>
            <input type="file" ref={fileRef} style={{display:'none'}}
              accept={type==='image'?'image/*':type==='video'?'video/*':'*'}
              onChange={e => e.target.files[0] && handleUpload(e.target.files[0])}/>
            <input value={mediaId ? '' : mediaUrl} onChange={e => { setMediaUrl(e.target.value); setMediaId(''); setLocalUrl(''); }}
              placeholder={`Or paste ${activeType.label.toLowerCase()} URL...`} style={inp}/>
            <input value={caption} onChange={e => setCaption(e.target.value)}
              placeholder="Add a caption... (optional)" style={inp}/>
          </div>
        )}

        {/* BUTTONS */}
        {type==='interactive_buttons' && (
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <input value={header} onChange={e=>setHeader(e.target.value)} placeholder="Header text (optional)" style={inp}/>
            <textarea value={bodyText} onChange={e=>setBodyText(e.target.value)} placeholder="Message body *" rows={3} style={{...inp,resize:'vertical',lineHeight:'1.6'}}/>
            <input value={footer} onChange={e=>setFooter(e.target.value)} placeholder="Footer text (optional)" style={inp}/>
            <div style={{fontSize:'11px',color:'#536471',fontWeight:'700',letterSpacing:'0.08em'}}>REPLY BUTTONS (max 3)</div>
            {buttons.map((b,i) => (
              <div key={i} style={{display:'flex',gap:'8px',alignItems:'center'}}>
                <div style={{width:'26px',height:'26px',borderRadius:'50%',background:`${activeType.color}22`,color:activeType.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'800',flexShrink:0}}>{i+1}</div>
                <input value={b.title} onChange={e=>{const nb=[...buttons];nb[i].title=e.target.value;setButtons(nb);}} placeholder={`Button ${i+1} text`} style={{...inp,flex:1,margin:0}}/>
                {buttons.length>1 && <button onClick={()=>setButtons(buttons.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:'#f43f5e',cursor:'pointer',padding:'4px',display:'flex'}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>}
              </div>
            ))}
            {buttons.length < 3 && (
              <button onClick={()=>setButtons([...buttons,{id:`b${Date.now()}`,title:''}])}
                style={{alignSelf:'flex-start',background:`${activeType.color}11`,border:`1px dashed ${activeType.color}55`,borderRadius:'8px',color:activeType.color,padding:'7px 16px',cursor:'pointer',fontSize:'12px',fontWeight:'700',display:'flex',alignItems:'center',gap:'6px'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add button
              </button>
            )}
          </div>
        )}

        {/* LIST */}
        {type==='interactive_list' && (
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <input value={header} onChange={e=>setHeader(e.target.value)} placeholder="Header text (optional)" style={inp}/>
            <textarea value={bodyText} onChange={e=>setBodyText(e.target.value)} placeholder="Message body *" rows={3} style={{...inp,resize:'vertical',lineHeight:'1.6'}}/>
            <input value={btnLabel} onChange={e=>setBtnLabel(e.target.value)} placeholder="Button label (e.g. View Options)" style={inp}/>
            <div style={{fontSize:'11px',color:'#536471',fontWeight:'700',letterSpacing:'0.08em'}}>LIST ITEMS (max 10)</div>
            {rows.map((r,i) => (
              <div key={i} style={{display:'flex',gap:'8px',alignItems:'flex-start'}}>
                <div style={{width:'26px',height:'26px',borderRadius:'50%',background:`${activeType.color}22`,color:activeType.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'800',flexShrink:0,marginTop:'10px'}}>{i+1}</div>
                <div style={{flex:1,display:'flex',flexDirection:'column',gap:'6px'}}>
                  <input value={r.title} onChange={e=>{const nr=[...rows];nr[i].title=e.target.value;setRows(nr);}} placeholder={`Item ${i+1} title *`} style={{...inp,margin:0}}/>
                  <input value={r.desc}  onChange={e=>{const nr=[...rows];nr[i].desc=e.target.value;setRows(nr);}}  placeholder="Description (optional)" style={{...inp,margin:0,fontSize:'12px'}}/>
                </div>
                {rows.length>1 && <button onClick={()=>setRows(rows.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:'#f43f5e',cursor:'pointer',padding:'4px',marginTop:'10px',display:'flex'}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>}
              </div>
            ))}
            {rows.length < 10 && (
              <button onClick={()=>setRows([...rows,{id:`r${Date.now()}`,title:'',desc:''}])}
                style={{alignSelf:'flex-start',background:`${activeType.color}11`,border:`1px dashed ${activeType.color}55`,borderRadius:'8px',color:activeType.color,padding:'7px 16px',cursor:'pointer',fontSize:'12px',fontWeight:'700',display:'flex',alignItems:'center',gap:'6px'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add item
              </button>
            )}
          </div>
        )}

        {/* TEMPLATE */}
        {type==='template' && (
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            {!tplLoaded && <div style={{textAlign:'center',padding:'30px',color:'#536471'}}>Loading templates...</div>}
            {tplLoaded && templates.length===0 && (
              <div style={{textAlign:'center',padding:'30px',color:'#536471'}}>
                <div style={{fontSize:'28px',marginBottom:'8px'}}>📭</div>
                No approved templates found.
              </div>
            )}
            {templates.map(t => (
              <div key={t.id} onClick={() => { setSelTpl(t); setTplVars({}); }}
                style={{padding:'14px',borderRadius:'12px',border:`2px solid ${selTpl&&selTpl.id===t.id?activeType.color:'rgba(255,255,255,0.07)'}`,cursor:'pointer',background:selTpl&&selTpl.id===t.id?`${activeType.color}0d`:'#1f2c34',transition:'all .2s'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                  <span style={{fontWeight:'700',fontSize:'13px',color:selTpl&&selTpl.id===t.id?activeType.color:'#e9edf0'}}>{t.name}</span>
                  <div style={{display:'flex',gap:'6px'}}>
                    <span style={{fontSize:'10px',background:`${activeType.color}22`,color:activeType.color,padding:'2px 8px',borderRadius:'20px',fontWeight:'700'}}>{t.language||'en'}</span>
                    <span style={{fontSize:'10px',background:'rgba(37,211,102,0.15)',color:'#25d366',padding:'2px 8px',borderRadius:'20px',fontWeight:'700'}}>✓ Approved</span>
                  </div>
                </div>
                <div style={{fontSize:'12px',color:'#8696a0',lineHeight:'1.6'}}>{(t.body||t.body_text||'').slice(0,100)}</div>
              </div>
            ))}
            <TplVars selTpl={selTpl} tplVars={tplVars} setTplVars={setTplVars} inp={inp}/>
          </div>
        )}

        {/* LOCATION */}
        {type==='location' && (
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{display:'flex',gap:'8px'}}>
              <div style={{flex:1,position:'relative'}}>
                <input value={mapSearch} onChange={e=>setMapSearch(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&searchLocation()}
                  placeholder="Search a place (e.g. Johar Town, Lahore)" style={{...inp,paddingLeft:'40px'}}/>
                <div style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)',color:'#536471'}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
              </div>
              <button onClick={searchLocation} style={{padding:'10px 18px',background:activeType.color,border:'none',borderRadius:'10px',color:'#111',fontWeight:'700',cursor:'pointer',fontSize:'13px',flexShrink:0}}>Search</button>
            </div>
            {lat && lng ? (
              <div style={{borderRadius:'14px',overflow:'hidden',border:'2px solid rgba(255,118,117,0.3)',position:'relative'}}>
                <iframe title="map" width="100%" height="200" style={{border:'none',display:'block'}}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(lng)-.01},${parseFloat(lat)-.01},${parseFloat(lng)+.01},${parseFloat(lat)+.01}&layer=mapnik&marker=${lat},${lng}`}/>
                <div style={{position:'absolute',bottom:'8px',right:'8px',background:'rgba(0,0,0,.7)',borderRadius:'6px',padding:'4px 8px',fontSize:'11px',color:'#fff'}}>
                  📍 {parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)}
                </div>
              </div>
            ) : (
              <div style={{background:'#1f2c34',borderRadius:'14px',height:'140px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',border:'2px dashed rgba(255,255,255,0.08)',gap:'8px',padding:'16px',textAlign:'center'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#FF7675" strokeWidth="1.5" width="36" height="36" opacity=".5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                <span style={{color:'#536471',fontSize:'12px'}}>Search above or paste coordinates below</span>
              </div>
            )}
            <div style={{display:'flex',gap:'10px'}}>
              <input value={lat} onChange={e=>setLat(e.target.value)} placeholder="Latitude *" style={{...inp,flex:1}}/>
              <input value={lng} onChange={e=>setLng(e.target.value)} placeholder="Longitude *" style={{...inp,flex:1}}/>
            </div>
            <input value={locName} onChange={e=>setLocName(e.target.value)} placeholder="Location name (e.g. Our Office, Johar Town)" style={inp}/>
            <div style={{fontSize:'11px',color:'#536471'}}>
              💡 Get coords: <a href="https://maps.google.com" target="_blank" rel="noreferrer" style={{color:activeType.color}}>Google Maps</a> → right-click any point → copy lat/lng
            </div>
          </div>
        )}

        {/* Send button */}
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:'16px',paddingTop:'14px',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
          <button onClick={send} disabled={!canSend()}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 24px',borderRadius:'10px',border:'none',fontWeight:'700',fontSize:'13px',cursor:canSend()?'pointer':'not-allowed',background:canSend()?activeType.color:'#2a3942',color:canSend()?'#111b21':'#536471',transition:'all .2s'}}>
            {sending
              ? <span>⏳ Sending...</span>
              : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send {activeType.label}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
