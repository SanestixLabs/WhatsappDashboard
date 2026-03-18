import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const PlusIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>;
const EditIcon   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
const ZapIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const SearchIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>;
const CloseIcon  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>;

export default function CannedResponsesSettings() {
  const [list, setList]         = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState({ shortcut: '', content: '' });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/canned?q=');
      setList(res.data.canned || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = list.filter(c =>
    c.shortcut.toLowerCase().includes(search.toLowerCase()) ||
    c.content.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditing(null); setForm({ shortcut: '', content: '' }); setError(''); setShowModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ shortcut: c.shortcut, content: c.content }); setError(''); setShowModal(true); };

  const save = async () => {
    if (!form.shortcut.trim() || !form.content.trim()) { setError('Both fields are required.'); return; }
    setSaving(true); setError('');
    try {
      if (editing) await api.put(`/canned/${editing.id}`, form);
      else await api.post('/canned', form);
      await load();
      setShowModal(false);
    } catch (err) { setError(err.response?.data?.error || 'Failed to save.'); }
    setSaving(false);
  };

  const remove = async (id) => {
    setDeleting(id);
    try { await api.delete(`/canned/${id}`); setList(prev => prev.filter(c => c.id !== id)); } catch {}
    setDeleting(null);
  };

  return (
    <div style={{padding:'32px 36px', maxWidth:'880px', overflowY:'auto', height:'100%', boxSizing:'border-box'}}>
      {/* Header */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'28px'}}>
        <div>
          <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px'}}>
            <div style={{width:'36px', height:'36px', borderRadius:'10px', background:'rgba(0,212,184,0.12)', border:'1px solid rgba(0,212,184,0.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#00d4b8'}}>
              <ZapIcon/>
            </div>
            <h2 style={{margin:0, fontSize:'20px', fontWeight:'700', color:'#e9edef'}}>Canned Responses</h2>
          </div>
          <p style={{margin:0, fontSize:'12px', color:'#536471', paddingLeft:'46px'}}>
            Type <span style={{color:'#00d4b8', fontFamily:'monospace', fontWeight:'700', background:'rgba(0,212,184,0.08)', padding:'1px 6px', borderRadius:'4px'}}>/shortcut</span> in any chat to instantly insert a saved reply
          </p>
        </div>
        <button onClick={openAdd}
          style={{display:'flex', alignItems:'center', gap:'7px', padding:'9px 16px', background:'linear-gradient(135deg,#00d4b8,#00b8a0)', border:'none', borderRadius:'9px', color:'#070b11', fontSize:'13px', fontWeight:'700', cursor:'pointer', whiteSpace:'nowrap'}}>
          <PlusIcon/> New Response
        </button>
      </div>

      {/* Stats bar */}
      <div style={{display:'flex', gap:'12px', marginBottom:'22px'}}>
        {[
          { label: 'Total', value: list.length, color: '#00d4b8' },
          { label: 'Results', value: filtered.length, color: '#8696a0' },
        ].map(stat => (
          <div key={stat.label} style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'9px', padding:'10px 16px', display:'flex', alignItems:'center', gap:'8px'}}>
            <span style={{fontSize:'18px', fontWeight:'800', color: stat.color}}>{stat.value}</span>
            <span style={{fontSize:'11px', color:'#536471', fontWeight:'600'}}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{position:'relative', marginBottom:'20px'}}>
        <span style={{position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#536471', pointerEvents:'none', display:'flex'}}>
          <SearchIcon/>
        </span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search shortcuts or content..."
          style={{width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'9px', padding:'10px 12px 10px 36px', color:'#e9edef', fontSize:'13px', outline:'none', boxSizing:'border-box'}}
          onFocus={e => e.target.style.borderColor='rgba(0,212,184,0.4)'}
          onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{textAlign:'center', padding:'60px', color:'#536471', fontSize:'13px'}}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{textAlign:'center', padding:'60px 20px', background:'rgba(255,255,255,0.02)', borderRadius:'14px', border:'1px dashed rgba(255,255,255,0.07)'}}>
          <div style={{width:'52px', height:'52px', borderRadius:'14px', background:'rgba(0,212,184,0.08)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', color:'#00d4b8'}}>
            <ZapIcon/>
          </div>
          <div style={{fontSize:'15px', fontWeight:'600', color:'#536471', marginBottom:'6px'}}>
            {search ? 'No matches found' : 'No canned responses yet'}
          </div>
          <div style={{fontSize:'12px', color:'#3a5068', marginBottom:'20px'}}>
            {search ? 'Try a different search term' : 'Create your first response to speed up replies'}
          </div>
          {!search && (
            <button onClick={openAdd}
              style={{display:'inline-flex', alignItems:'center', gap:'7px', padding:'9px 18px', background:'rgba(0,212,184,0.1)', border:'1px solid rgba(0,212,184,0.3)', borderRadius:'9px', color:'#00d4b8', fontSize:'13px', fontWeight:'600', cursor:'pointer'}}>
              <PlusIcon/> Create First Response
            </button>
          )}
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
          {filtered.map(c => (
            <div key={c.id}
              style={{background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'16px 18px', display:'flex', alignItems:'flex-start', gap:'14px', transition:'border-color 0.15s, background 0.15s'}}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; }}>
              {/* Shortcut badge */}
              <div style={{flexShrink:0, display:'inline-flex', alignItems:'center', gap:'4px', background:'rgba(0,212,184,0.1)', border:'1px solid rgba(0,212,184,0.25)', borderRadius:'7px', padding:'4px 10px', fontSize:'12px', fontWeight:'700', color:'#00d4b8', fontFamily:'monospace', marginTop:'1px'}}>
                <span style={{opacity:0.5, fontSize:'14px'}}>/</span>{c.shortcut}
              </div>
              {/* Content */}
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:'13px', color:'#c9d6df', lineHeight:'1.6', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical'}}>
                  {c.content}
                </div>
              </div>
              {/* Actions */}
              <div style={{display:'flex', gap:'6px', flexShrink:0}}>
                <button onClick={() => openEdit(c)}
                  style={{display:'flex', alignItems:'center', gap:'5px', padding:'6px 11px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'7px', color:'#8696a0', fontSize:'12px', cursor:'pointer', transition:'all 0.15s'}}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.09)'; e.currentTarget.style.color='#e9edef'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#8696a0'; }}>
                  <EditIcon/> Edit
                </button>
                <button onClick={() => remove(c.id)} disabled={deleting === c.id}
                  style={{display:'flex', alignItems:'center', gap:'5px', padding:'6px 11px', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.18)', borderRadius:'7px', color:'#ef4444', fontSize:'12px', cursor:'pointer', opacity: deleting===c.id ? 0.5 : 1, transition:'all 0.15s'}}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(239,68,68,0.06)'; }}>
                  <TrashIcon/> {deleting===c.id ? '...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
          <div style={{background:'#0c1219', borderRadius:'16px', border:'1px solid rgba(255,255,255,0.1)', width:'500px', padding:'26px', boxShadow:'0 24px 64px rgba(0,0,0,0.6)'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'22px'}}>
              <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <div style={{width:'30px', height:'30px', borderRadius:'8px', background:'rgba(0,212,184,0.12)', display:'flex', alignItems:'center', justifyContent:'center', color:'#00d4b8'}}>
                  <ZapIcon/>
                </div>
                <span style={{fontSize:'15px', fontWeight:'700', color:'#e9edef'}}>{editing ? 'Edit Response' : 'New Canned Response'}</span>
              </div>
              <button onClick={() => setShowModal(false)}
                style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'7px', color:'#536471', cursor:'pointer', padding:'5px', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <CloseIcon/>
              </button>
            </div>

            <div style={{marginBottom:'16px'}}>
              <label style={{fontSize:'11px', fontWeight:'700', color:'#536471', letterSpacing:'0.07em', display:'block', marginBottom:'7px'}}>SHORTCUT</label>
              <div style={{position:'relative'}}>
                <span style={{position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#3a5068', fontFamily:'monospace', fontSize:'15px', fontWeight:'700', pointerEvents:'none'}}>/</span>
                <input value={form.shortcut}
                  onChange={e => setForm(f => ({...f, shortcut: e.target.value.replace(/^\//, '').replace(/\s/g,'')}))}
                  placeholder="hello"
                  style={{width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'10px 12px 10px 26px', color:'#e9edef', fontSize:'13px', outline:'none', boxSizing:'border-box', fontFamily:'monospace'}}
                  onFocus={e => e.target.style.borderColor='rgba(0,212,184,0.4)'}
                  onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>
              <div style={{fontSize:'11px', color:'#3a5068', marginTop:'5px'}}>
                Agents type <span style={{color:'#00d4b8', fontFamily:'monospace', background:'rgba(0,212,184,0.08)', padding:'1px 5px', borderRadius:'3px'}}>/hello</span> in chat to trigger this
              </div>
            </div>

            <div style={{marginBottom:'8px'}}>
              <label style={{fontSize:'11px', fontWeight:'700', color:'#536471', letterSpacing:'0.07em', display:'block', marginBottom:'7px'}}>RESPONSE CONTENT</label>
              <textarea value={form.content} rows={5}
                onChange={e => setForm(f => ({...f, content: e.target.value}))}
                placeholder="Hello! How can I help you today?"
                style={{width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'10px 12px', color:'#e9edef', fontSize:'13px', outline:'none', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit', lineHeight:'1.6'}}
                onFocus={e => e.target.style.borderColor='rgba(0,212,184,0.4)'}
                onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
              <div style={{fontSize:'11px', color:'#3a5068', marginTop:'5px', textAlign:'right'}}>{form.content.length} chars</div>
            </div>

            {error && <div style={{fontSize:'12px', color:'#ef4444', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'7px', padding:'8px 12px', marginBottom:'10px'}}>{error}</div>}

            <div style={{display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'18px'}}>
              <button onClick={() => setShowModal(false)}
                style={{padding:'9px 18px', background:'transparent', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', color:'#8696a0', fontSize:'13px', cursor:'pointer'}}>
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                style={{padding:'9px 20px', background: saving ? '#1a2e42' : 'linear-gradient(135deg,#00d4b8,#00b8a0)', border:'none', borderRadius:'8px', color: saving ? '#3a5068' : '#070b11', fontSize:'13px', fontWeight:'700', cursor: saving ? 'not-allowed' : 'pointer'}}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Response'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
