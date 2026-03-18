import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '';

const STATUS_COLORS = {
  approved: { bg:'rgba(0,212,184,0.1)', color:'#00d4b8', border:'rgba(0,212,184,0.2)' },
  pending:  { bg:'rgba(245,158,11,0.1)', color:'#f59e0b', border:'rgba(245,158,11,0.2)' },
  rejected: { bg:'rgba(244,63,94,0.1)',  color:'#f43f5e', border:'rgba(244,63,94,0.2)' },
  draft:    { bg:'rgba(100,116,139,0.1)',color:'#64748b', border:'rgba(100,116,139,0.2)' },
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [syncing, setSyncing]     = useState(false);
  const [form, setForm] = useState({
    name:'', category:'MARKETING', language:'en',
    header_text:'', footer:'', body:'', variables:[],
  });
  const [preview, setPreview] = useState('');

  const token = () => localStorage.getItem('accessToken');

  const load = async () => {
    setLoading(true);
    const res = await fetch(API_BASE + '/api/templates', { headers:{ Authorization:'Bearer ' + token() } });
    setTemplates(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    setPreview(form.body);
  }, [form.body]);

  const submit = async () => {
    if (!form.name || !form.body) return alert('Name and Body are required');
    const res = await fetch(API_BASE + '/api/templates', {
      method:'POST',
      headers:{ Authorization:'Bearer ' + token(), 'Content-Type':'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowForm(false); setForm({name:'',category:'MARKETING',language:'en',header_text:'',footer:'',body:'',variables:[]}); load(); }
    else { const e = await res.json(); alert(e.error || 'Failed'); }
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    await fetch(API_BASE + '/templates/' + id, { method:'DELETE', headers:{ Authorization:'Bearer ' + token() } });
    load();
  };

  const sync = async () => {
    setSyncing(true);
    const res = await fetch(API_BASE + '/api/templates/sync', { method:'POST', headers:{ Authorization:'Bearer ' + token() } });
    const data = await res.json();
    if(data.error) { alert('Sync error: ' + data.error); } else { alert('Synced ' + data.total + ' templates (' + data.imported + ' new, ' + data.synced + ' updated)'); }
    load();
    setSyncing(false);
  };

  const addVariable = () => {
    const n = (form.variables.length + 1);
    setForm(f => ({ ...f, body: f.body + ' {{' + n + '}}', variables: [...f.variables, { index: n, example: '' }] }));
  };

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.title}>Message Templates</div>
          <div style={s.subtitle}>Create and manage WhatsApp Business message templates</div>
        </div>
        <div style={{display:'flex',gap:'10px'}}>
          <button onClick={sync} disabled={syncing} style={s.syncBtn}>{syncing ? 'Syncing...' : '🔄 Sync from Meta'}</button>
          <button onClick={() => setShowForm(true)} style={s.createBtn}>+ Create Template</button>
        </div>
      </div>

      {/* Stats */}
      <div style={s.statsRow}>
        {['approved','pending','rejected','draft'].map(status => (
          <div key={status} style={s.statCard}>
            <div style={{...s.statNum, color: STATUS_COLORS[status]?.color}}>
              {templates.filter(t => t.status === status).length}
            </div>
            <div style={s.statLabel}>{status.charAt(0).toUpperCase() + status.slice(1)}</div>
          </div>
        ))}
      </div>

      {/* Template List */}
      {loading ? (
        <div style={s.empty}>Loading templates...</div>
      ) : templates.length === 0 ? (
        <div style={s.empty}>
          <div style={{fontSize:'48px',marginBottom:'12px'}}>📋</div>
          <div style={{fontSize:'16px',fontWeight:'600',color:'#edf2f8',marginBottom:'8px'}}>No templates yet</div>
          <div style={{fontSize:'13px',color:'#3a5068'}}>Create your first template to start sending WhatsApp messages</div>
        </div>
      ) : (
        <div style={s.grid}>
          {templates.map(t => {
            const sc = STATUS_COLORS[t.status] || STATUS_COLORS.draft;
            return (
              <div key={t.id} style={s.card}>
                <div style={s.cardHeader}>
                  <div style={{flex:1}}>
                    <div style={s.cardName}>{t.name}</div>
                    <div style={s.cardMeta}>{t.category} · {t.language}</div>
                  </div>
                  <span style={{...s.statusBadge, background:sc.bg, color:sc.color, border:'1px solid ' + sc.border}}>
                    {t.status}
                  </span>
                </div>
                {t.header_text && <div style={s.cardSection}>
                  <div style={s.cardSectionLabel}>Header</div>
                  <div style={s.cardSectionText}>{t.header_text}</div>
                </div>}
                <div style={s.cardSection}>
                  <div style={s.cardSectionLabel}>Body</div>
                  <div style={s.cardBody}>{t.body}</div>
                </div>
                {t.footer && <div style={s.cardSection}>
                  <div style={s.cardSectionLabel}>Footer</div>
                  <div style={s.cardSectionText}>{t.footer}</div>
                </div>}
                <div style={s.cardFooter}>
                  <span style={{fontSize:'10px',color:'#1a2e42'}}>{new Date(t.created_at).toLocaleDateString()}</span>
                  <button onClick={() => deleteTemplate(t.id)} style={s.deleteBtn}>🗑️ Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showForm && (
        <div style={s.overlay} onClick={() => setShowForm(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>Create Template</span>
              <button onClick={() => setShowForm(false)} style={s.closeBtn}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div style={s.twoCol}>
                <div style={s.formGroup}>
                  <label style={s.label}>Template Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                    placeholder="e.g. order_confirmation" style={s.input}/>
                  <div style={s.hint}>Lowercase, underscores only</div>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} style={s.select}>
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility</option>
                    <option value="AUTHENTICATION">Authentication</option>
                  </select>
                </div>
              </div>

              <div style={s.twoCol}>
                <div style={s.formGroup}>
                  <label style={s.label}>Language</label>
                  <select value={form.language} onChange={e => setForm(f => ({...f, language: e.target.value}))} style={s.select}>
                    <option value="en">English</option>
                    <option value="en_US">English (US)</option>
                    <option value="ur">Urdu</option>
                    <option value="ar">Arabic</option>
                    <option value="hi">Hindi</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Header (optional)</label>
                  <input value={form.header_text} onChange={e => setForm(f => ({...f, header_text: e.target.value}))}
                    placeholder="Header text..." style={s.input}/>
                </div>
              </div>

              <div style={s.formGroup}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                  <label style={s.label}>Body *</label>
                  <button onClick={addVariable} style={s.varBtn}>+ Add Variable</button>
                </div>
                <textarea value={form.body} onChange={e => setForm(f => ({...f, body: e.target.value}))}
                  placeholder="Hello {{1}}, your order {{2}} has been confirmed!" style={s.textarea} rows={4}/>
                <div style={s.hint}>Use {"{{1}}"}, {"{{2}}"} for variables</div>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Footer (optional)</label>
                <input value={form.footer} onChange={e => setForm(f => ({...f, footer: e.target.value}))}
                  placeholder="Reply STOP to unsubscribe" style={s.input}/>
              </div>

              {/* Live Preview */}
              <div style={s.formGroup}>
                <label style={s.label}>Preview</label>
                <div style={s.previewBubble}>
                  {form.header_text && <div style={s.previewHeader}>{form.header_text}</div>}
                  <div style={s.previewBody}>{form.body || 'Your message will appear here...'}</div>
                  {form.footer && <div style={s.previewFooter}>{form.footer}</div>}
                  <div style={s.previewTime}>10:30 ✓✓</div>
                </div>
              </div>
            </div>
            <div style={s.modalFooter}>
              <button onClick={() => setShowForm(false)} style={s.cancelBtn}>Cancel</button>
              <button onClick={submit} style={s.submitBtn}>📤 Submit to Meta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  root:{flex:1,display:'flex',flexDirection:'column',background:'#070b11',overflow:'hidden'},
  header:{padding:'28px 32px 20px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'flex-start'},
  title:{fontSize:'22px',fontWeight:'800',color:'#edf2f8',marginBottom:'4px'},
  subtitle:{fontSize:'13px',color:'#3a5068'},
  syncBtn:{background:'transparent',border:'1px solid rgba(255,255,255,0.1)',color:'#7d95b0',borderRadius:'10px',padding:'9px 18px',fontSize:'13px',cursor:'pointer',fontWeight:'600'},
  createBtn:{background:'linear-gradient(135deg,#00d4b8,#00b8a0)',border:'none',color:'#070b11',borderRadius:'10px',padding:'9px 20px',fontSize:'13px',cursor:'pointer',fontWeight:'700'},
  statsRow:{display:'flex',gap:'16px',padding:'20px 32px',borderBottom:'1px solid rgba(255,255,255,0.07)'},
  statCard:{flex:1,background:'#0c1219',borderRadius:'12px',padding:'16px',textAlign:'center',border:'1px solid rgba(255,255,255,0.07)'},
  statNum:{fontSize:'28px',fontWeight:'800',marginBottom:'4px'},
  statLabel:{fontSize:'11px',color:'#3a5068',textTransform:'uppercase',letterSpacing:'0.06em'},
  empty:{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'#3a5068',padding:'60px'},
  grid:{flex:1,overflowY:'auto',padding:'24px 32px',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:'16px',alignContent:'start'},
  card:{background:'#0c1219',borderRadius:'14px',border:'1px solid rgba(255,255,255,0.07)',overflow:'hidden'},
  cardHeader:{padding:'16px 20px 12px',display:'flex',alignItems:'flex-start',gap:'10px',borderBottom:'1px solid rgba(255,255,255,0.05)'},
  cardName:{fontSize:'14px',fontWeight:'700',color:'#edf2f8',marginBottom:'2px'},
  cardMeta:{fontSize:'11px',color:'#3a5068',textTransform:'uppercase'},
  statusBadge:{fontSize:'10px',fontWeight:'700',padding:'3px 10px',borderRadius:'20px',textTransform:'uppercase',flexShrink:0},
  cardSection:{padding:'10px 20px'},
  cardSectionLabel:{fontSize:'9.5px',color:'#3a5068',fontWeight:'700',textTransform:'uppercase',marginBottom:'3px'},
  cardSectionText:{fontSize:'12px',color:'#7d95b0'},
  cardBody:{fontSize:'13px',color:'#edf2f8',lineHeight:'1.6',whiteSpace:'pre-wrap'},
  cardFooter:{padding:'10px 20px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'1px solid rgba(255,255,255,0.05)'},
  deleteBtn:{background:'rgba(244,63,94,0.1)',border:'1px solid rgba(244,63,94,0.2)',color:'#f43f5e',borderRadius:'6px',padding:'4px 10px',fontSize:'11px',cursor:'pointer'},
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'},
  modal:{background:'#0c1219',borderRadius:'18px',border:'1px solid rgba(255,255,255,0.1)',width:'640px',maxWidth:'100%',maxHeight:'90vh',display:'flex',flexDirection:'column'},
  modalHeader:{padding:'20px 24px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'center'},
  modalTitle:{fontSize:'16px',fontWeight:'700',color:'#edf2f8'},
  closeBtn:{background:'none',border:'none',color:'#3a5068',cursor:'pointer',fontSize:'18px'},
  modalBody:{padding:'24px',overflowY:'auto',flex:1},
  modalFooter:{padding:'16px 24px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'flex-end',gap:'10px'},
  twoCol:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'},
  formGroup:{marginBottom:'16px'},
  label:{display:'block',fontSize:'11px',fontWeight:'700',color:'#3a5068',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'6px'},
  input:{width:'100%',background:'#070b11',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'9px 12px',color:'#edf2f8',fontSize:'13px',outline:'none',boxSizing:'border-box'},
  select:{width:'100%',background:'#070b11',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'9px 12px',color:'#edf2f8',fontSize:'13px',outline:'none',boxSizing:'border-box'},
  textarea:{width:'100%',background:'#070b11',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'9px 12px',color:'#edf2f8',fontSize:'13px',outline:'none',resize:'vertical',boxSizing:'border-box',fontFamily:'inherit'},
  hint:{fontSize:'10px',color:'#1a2e42',marginTop:'4px'},
  varBtn:{background:'rgba(0,212,184,0.1)',border:'1px solid rgba(0,212,184,0.2)',color:'#00d4b8',borderRadius:'6px',padding:'3px 10px',fontSize:'11px',cursor:'pointer'},
  previewBubble:{background:'linear-gradient(135deg,#0c4a40,#0a5c4e)',borderRadius:'14px 14px 4px 14px',padding:'12px 16px 8px',maxWidth:'300px',position:'relative'},
  previewHeader:{fontSize:'14px',fontWeight:'700',color:'#fff',marginBottom:'6px'},
  previewBody:{fontSize:'13px',color:'#fff',lineHeight:'1.6',whiteSpace:'pre-wrap',paddingRight:'40px'},
  previewFooter:{fontSize:'11px',color:'rgba(255,255,255,0.5)',marginTop:'6px'},
  previewTime:{fontSize:'10px',color:'rgba(255,255,255,0.4)',textAlign:'right',marginTop:'4px'},
  cancelBtn:{background:'transparent',border:'1px solid rgba(255,255,255,0.1)',color:'#7d95b0',borderRadius:'8px',padding:'9px 20px',fontSize:'13px',cursor:'pointer'},
  submitBtn:{background:'linear-gradient(135deg,#00d4b8,#00b8a0)',border:'none',color:'#070b11',borderRadius:'8px',padding:'9px 24px',fontSize:'13px',fontWeight:'700',cursor:'pointer'},
};
