import React, { useState, useEffect, useRef } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '';

export default function ContactPanel({ conversation, onClose }) {
  const [contact, setContact] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', address:'', notes:'', tags:'' });
  const avatarRef = useRef(null);

  useEffect(() => {
    if (!conversation?.id) return;
    const token = localStorage.getItem('accessToken');
    fetch(API_BASE + '/conversations/' + conversation.id + '/contact', {
      headers: { Authorization: 'Bearer ' + token }
    }).then(r => r.json()).then(data => {
      setContact(data);
      setForm({
        name: data.name || '',
        email: data.email || '',
        address: data.address || '',
        notes: data.notes || '',
        tags: (data.tags || []).join(', '),
      });
    });
  }, [conversation]);

  const save = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(API_BASE + '/contacts/' + contact.id, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          address: form.address,
          notes: form.notes,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      const updated = await res.json();
      setContact(updated);
      setEditing(false);
    } finally { setSaving(false); }
  };

  const uploadAvatar = async (file) => {
    const token = localStorage.getItem('accessToken');
    const fd = new FormData();
    fd.append('avatar', file);
    const res = await fetch(API_BASE + '/contacts/' + contact.id + '/avatar', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: fd,
    });
    const updated = await res.json();
    setContact(updated);
  };

  const initials = (contact?.name || contact?.phone_number || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  const avatarUrl = contact?.profile_pic_url ? API_BASE + contact.profile_pic_url : null;

  return (
    <div style={s.panel}>
      {/* Header */}
      <div style={s.header}>
        <span style={s.headerTitle}>Contact Info</span>
        <button onClick={onClose} style={s.closeBtn}>✕</button>
      </div>

      {!contact ? (
        <div style={s.loading}>Loading...</div>
      ) : (
        <div style={s.body}>
          {/* Avatar */}
          <div style={s.avatarSection}>
            <div style={s.avatarWrap} onClick={() => avatarRef.current?.click()}>
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={s.avatarImg}/>
                : <div style={s.avatarFallback}>{initials}</div>
              }
              <div style={s.avatarOverlay}>📷</div>
            </div>
            <input ref={avatarRef} type="file" accept="image/*" style={{display:'none'}}
              onChange={e => { if(e.target.files[0]) uploadAvatar(e.target.files[0]); }}/>
            <div style={s.contactName}>{contact.name || contact.phone_number}</div>
            <div style={s.contactPhone}>{contact.phone_number}</div>
            <div style={s.onlineTag}>WhatsApp</div>
          </div>

          {/* Info Fields */}
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <span style={s.sectionTitle}>Details</span>
              <button onClick={() => editing ? save() : setEditing(true)} style={s.editBtn} disabled={saving}>
                {saving ? '...' : editing ? '✓ Save' : '✏️ Edit'}
              </button>
            </div>

            {[
              { label:'Name', key:'name', icon:'👤' },
              { label:'Phone', key:'phone_number', icon:'📱', readonly: true },
              { label:'Email', key:'email', icon:'📧' },
              { label:'Address', key:'address', icon:'📍' },
            ].map(({ label, key, icon, readonly }) => (
              <div key={key} style={s.field}>
                <div style={s.fieldLabel}>{icon} {label}</div>
                {editing && !readonly
                  ? <input value={form[key]||''} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} style={s.input}/>
                  : <div style={s.fieldValue}>{contact[key] || <span style={{color:'#1a2e42'}}>Not set</span>}</div>
                }
              </div>
            ))}

            <div style={s.field}>
              <div style={s.fieldLabel}>🏷️ Tags</div>
              {editing
                ? <input value={form.tags} onChange={e => setForm(f => ({...f, tags: e.target.value}))} placeholder="tag1, tag2" style={s.input}/>
                : <div style={{display:'flex',flexWrap:'wrap',gap:'4px',marginTop:'4px'}}>
                    {(contact.tags||[]).length > 0
                      ? contact.tags.map(t => <span key={t} style={s.tag}>{t}</span>)
                      : <span style={{color:'#1a2e42',fontSize:'12px'}}>No tags</span>
                    }
                  </div>
              }
            </div>
          </div>

          {/* Notes */}
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <span style={s.sectionTitle}>Notes</span>
            </div>
            {editing
              ? <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                  placeholder="Add notes about this contact..." style={s.textarea}/>
              : <div style={s.notes}>{contact.notes || <span style={{color:'#1a2e42'}}>No notes</span>}</div>
            }
          </div>

          {/* Stats */}
          <div style={s.section}>
            <div style={s.sectionTitle}>Stats</div>
            <div style={s.statsRow}>
              <div style={s.stat}>
                <div style={s.statNum}>–</div>
                <div style={s.statLabel}>Messages</div>
              </div>
              <div style={s.stat}>
                <div style={s.statNum}>–</div>
                <div style={s.statLabel}>Conversations</div>
              </div>
              <div style={s.stat}>
                <div style={s.statNum}>{new Date(contact.created_at).toLocaleDateString()}</div>
                <div style={s.statLabel}>First seen</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  panel:{position:'fixed',top:0,right:0,width:'320px',height:'100vh',background:'#0c1219',borderLeft:'1px solid rgba(255,255,255,0.1)',display:'flex',flexDirection:'column',overflow:'hidden',zIndex:500,boxShadow:'-4px 0 20px rgba(0,0,0,0.5)'},
  header:{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'center'},
  headerTitle:{fontSize:'14px',fontWeight:'700',color:'#edf2f8'},
  closeBtn:{background:'none',border:'none',color:'#3a5068',cursor:'pointer',fontSize:'16px',padding:'2px 6px',borderRadius:'6px'},
  loading:{padding:'40px',textAlign:'center',color:'#3a5068'},
  body:{flex:1,overflowY:'auto',padding:'0 0 20px'},
  avatarSection:{display:'flex',flexDirection:'column',alignItems:'center',padding:'24px 20px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)'},
  avatarWrap:{position:'relative',cursor:'pointer',marginBottom:'12px'},
  avatarImg:{width:'80px',height:'80px',borderRadius:'50%',objectFit:'cover',border:'3px solid rgba(0,212,184,0.3)'},
  avatarFallback:{width:'80px',height:'80px',borderRadius:'50%',background:'linear-gradient(135deg,#00d4b8,#00b8a0)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',fontWeight:'700',color:'#070b11',border:'3px solid rgba(0,212,184,0.3)'},
  avatarOverlay:{position:'absolute',bottom:0,right:0,background:'rgba(0,0,0,0.7)',borderRadius:'50%',width:'26px',height:'26px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px'},
  contactName:{fontSize:'16px',fontWeight:'700',color:'#edf2f8',marginBottom:'2px'},
  contactPhone:{fontSize:'12px',color:'#3a5068',marginBottom:'8px'},
  onlineTag:{fontSize:'10px',background:'rgba(0,212,184,0.1)',color:'#00d4b8',padding:'2px 10px',borderRadius:'20px',border:'1px solid rgba(0,212,184,0.2)'},
  section:{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.05)'},
  sectionHeader:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'},
  sectionTitle:{fontSize:'11px',fontWeight:'700',color:'#3a5068',textTransform:'uppercase',letterSpacing:'0.06em'},
  editBtn:{background:'rgba(0,212,184,0.1)',border:'1px solid rgba(0,212,184,0.2)',color:'#00d4b8',borderRadius:'6px',padding:'3px 10px',fontSize:'11px',cursor:'pointer',fontWeight:'600'},
  field:{marginBottom:'12px'},
  fieldLabel:{fontSize:'10.5px',color:'#3a5068',marginBottom:'3px',fontWeight:'600'},
  fieldValue:{fontSize:'13px',color:'#edf2f8',padding:'6px 0'},
  input:{width:'100%',background:'#0d1424',border:'1px solid rgba(0,212,184,0.3)',borderRadius:'8px',padding:'7px 10px',color:'#edf2f8',fontSize:'13px',outline:'none',boxSizing:'border-box'},
  tag:{background:'rgba(0,212,184,0.1)',color:'#00d4b8',fontSize:'10px',padding:'2px 8px',borderRadius:'12px',border:'1px solid rgba(0,212,184,0.2)'},
  textarea:{width:'100%',background:'#0d1424',border:'1px solid rgba(0,212,184,0.3)',borderRadius:'8px',padding:'8px 10px',color:'#edf2f8',fontSize:'13px',outline:'none',minHeight:'80px',resize:'vertical',boxSizing:'border-box'},
  notes:{fontSize:'13px',color:'#edf2f8',lineHeight:'1.6',whiteSpace:'pre-wrap'},
  statsRow:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginTop:'8px'},
  stat:{background:'#0d1424',borderRadius:'10px',padding:'10px 8px',textAlign:'center',border:'1px solid rgba(255,255,255,0.05)'},
  statNum:{fontSize:'13px',fontWeight:'700',color:'#00d4b8',marginBottom:'2px'},
  statLabel:{fontSize:'9px',color:'#3a5068',textTransform:'uppercase'},
};
