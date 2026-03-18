import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store';
import api from '../services/api';
import toast from 'react-hot-toast';

// ── Icons ──────────────────────────────────────────────
const ShieldIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const RefreshIcon   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>;
const PlusIcon      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const WAIcon        = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
const EditIcon      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const XIcon         = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const CheckIcon     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const BookIcon      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>;
const UsersIcon     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
const ChatIcon      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;

export default function SuperAdminPage() {
  const user = useAuthStore(s => s.user);
  const [workspaces, setWorkspaces]   = useState([]);
  const [stats, setStats]             = useState({});
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [waModal, setWaModal]         = useState(null); // workspace object
  const [editModal, setEditModal]     = useState(null); // workspace object
  const [showGuide, setShowGuide]     = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/workspaces');
      const ws = res.data.workspaces;
      setWorkspaces(ws);
      const statsMap = {};
      await Promise.all(ws.map(async (w) => {
        try {
          const s = await api.get(`/workspaces/${w.id}/stats`);
          statsMap[w.id] = s.data;
        } catch { statsMap[w.id] = {}; }
      }));
      setStats(statsMap);
    } catch { toast.error('Failed to load workspaces'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  const handleSuspend = async (id, isActive) => {
    const action = isActive ? 'suspend' : 'activate';
    if (!window.confirm(`${isActive ? 'Suspend' : 'Activate'} this workspace?`)) return;
    try {
      await api.post(`/workspaces/${id}/${action}`);
      toast.success(`Workspace ${action}d`);
      setWorkspaces(ws => ws.map(w => w.id === id ? { ...w, is_active: !isActive } : w));
    } catch { toast.error(`Failed to ${action}`); }
  };

  const filtered = workspaces.filter(w => {
    const matchSearch = w.name.toLowerCase().includes(search.toLowerCase()) || w.slug.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' ? true : filter === 'active' ? w.is_active : filter === 'suspended' ? !w.is_active : filter === 'trial' ? w.plan === 'trial' : true;
    return matchSearch && matchFilter;
  });

  const totalStats = {
    workspaces:    workspaces.length,
    active:        workspaces.filter(w => w.is_active).length,
    members:       Object.values(stats).reduce((a, s) => a + (s.members || 0), 0),
    conversations: Object.values(stats).reduce((a, s) => a + (s.conversations || 0), 0),
  };

  const trialDaysLeft = (trial_ends_at) => {
    if (!trial_ends_at) return null;
    return Math.ceil((new Date(trial_ends_at) - new Date()) / 86400000);
  };

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.headerIcon}><ShieldIcon/></div>
          <div>
            <div style={s.headerTitle}>Super Admin Panel</div>
            <div style={s.headerSub}>Manage all workspaces across the platform</div>
          </div>
        </div>
        <div style={{display:'flex',gap:'10px'}}>
          <button onClick={() => setShowGuide(true)} style={{...s.refreshBtn, color:'#00d4b8', borderColor:'rgba(0,212,184,0.3)'}}><BookIcon/> Onboarding Guide</button>
          <button onClick={() => setShowCreateModal(true)} style={s.createBtn}><PlusIcon/> New Workspace</button>
          <button onClick={fetchWorkspaces} style={s.refreshBtn} disabled={loading}><RefreshIcon/> Refresh</button>
        </div>
      </div>

      {/* Summary */}
      <div style={s.summaryRow}>
        {[
          { label:'Total Workspaces', value: totalStats.workspaces, color:'#00d4b8' },
          { label:'Active',           value: totalStats.active,      color:'#34d399' },
          { label:'Total Members',    value: totalStats.members,     color:'#60a5fa' },
          { label:'Conversations',    value: totalStats.conversations,color:'#a78bfa' },
        ].map(({label,value,color}) => (
          <div key={label} style={s.summaryCard}>
            <div style={{...s.summaryVal, color}}>{loading ? '—' : value}</div>
            <div style={s.summaryLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={s.toolbar}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workspaces..." style={s.searchInput}/>
        <div style={s.filterTabs}>
          {['all','active','suspended','trial'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{...s.filterTab,...(filter===f?s.filterTabActive:{})}}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={s.tableWrap}>
        {loading ? <div style={s.empty}>Loading workspaces...</div> : filtered.length === 0 ? <div style={s.empty}>No workspaces found</div> : (
          <table style={s.table}>
            <thead>
              <tr>{['Workspace','Plan','Status','WhatsApp','Members','Convos','Trial','Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(w => {
                const ws = stats[w.id] || {};
                const days = trialDaysLeft(w.trial_ends_at);
                const waConnected = !!(w.wa_phone_id && w.wa_access_token && w.phone_number);
                return (
                  <tr key={w.id} style={s.tr}>
                    <td style={s.td}>
                      <div style={s.wsName}>{w.name}</div>
                      <div style={s.wsSlug}>/{w.slug}</div>
                    </td>
                    <td style={s.td}>
                      <span style={{...s.badge,...planBadge(w.plan)}}>{w.plan}</span>
                    </td>
                    <td style={s.td}>
                      <span style={{...s.badge,...(w.is_active ? s.badgeGreen : s.badgeRed)}}>
                        {w.is_active ? '● Active' : '○ Suspended'}
                      </span>
                    </td>
                    <td style={s.td}>
                      {waConnected ? (
                        <div style={s.waConnected}>
                          <WAIcon/>
                          <span style={{color:'#34d399',fontSize:'12px',fontWeight:'600'}}>{w.phone_number}</span>
                          <button onClick={() => setWaModal(w)} style={s.waEditBtn} title="Edit WhatsApp"><EditIcon/></button>
                        </div>
                      ) : (
                        <button onClick={() => setWaModal(w)} style={s.waConnectBtn}>
                          <WAIcon/> Connect WA
                        </button>
                      )}
                    </td>
                    <td style={s.tdStat}><UsersIcon/> {ws.members ?? '—'}</td>
                    <td style={s.tdStat}><ChatIcon/> {ws.conversations ?? '—'}</td>
                    <td style={s.td}>
                      {days !== null ? (
                        <span style={{fontSize:'12px',color: days < 3 ? '#f87171' : days < 7 ? '#fbbf24' : '#8696a0'}}>
                          {days > 0 ? `${days}d left` : 'Expired'}
                        </span>
                      ) : <span style={{fontSize:'12px',color:'#3a5068'}}>—</span>}
                    </td>
                    <td style={s.td}>
                      <div style={{display:'flex',gap:'6px'}}>
                        <button onClick={() => setEditModal(w)} style={s.actionBtnBlue}>Edit</button>
                        <button onClick={() => handleSuspend(w.id, w.is_active)} style={{...s.actionBtn,...(w.is_active ? s.actionBtnRed : s.actionBtnGreen)}}>
                          {w.is_active ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* WhatsApp Modal */}
      {waModal && <WAModal workspace={waModal} onClose={() => setWaModal(null)} onSaved={(updated) => {
        setWorkspaces(ws => ws.map(w => w.id === updated.id ? updated : w));
        setWaModal(null);
        toast.success('WhatsApp settings saved!');
      }}/>}

      {/* Edit Workspace Modal */}
      {editModal && <EditModal workspace={editModal} onClose={() => setEditModal(null)} onSaved={(updated) => {
        setWorkspaces(ws => ws.map(w => w.id === updated.id ? updated : w));
        setEditModal(null);
        toast.success('Workspace updated!');
      }}/>}

      {/* Create Workspace Modal */}
      {showGuide && <OnboardingGuideDrawer onClose={() => setShowGuide(false)} />}
      {showCreateModal && <CreateModal onClose={() => setShowCreateModal(false)} onCreated={(newWs) => {
        setWorkspaces(ws => [newWs, ...ws]);
        setShowCreateModal(false);
        toast.success('Workspace created!');
      }}/>}
    </div>
  );
}

// ── WhatsApp Connect Modal ─────────────────────────────

// ── Onboarding Guide Drawer ────────────────────────────
function OnboardingGuideDrawer({ onClose }) {
  const [tab, setTab] = React.useState('guide');

  const guideSteps = [
    {
      num: '1', title: 'Allow Popups in Browser', time: '30 sec',
      desc: 'Client must allow popups for flow.sanestix.com in Chrome before anything else.',
      items: [
        'Look for popup blocked icon 🚫 in Chrome address bar',
        'Click it → select "Always allow popups from flow.sanestix.com"',
        'Click Done and refresh the page',
      ],
      tip: 'If no icon: Chrome Settings → Privacy → Site Settings → Pop-ups → Allow flow.sanestix.com',
      tipType: 'info',
    },
    {
      num: '2', title: 'Open WhatsApp Connection', time: '1 min',
      desc: 'Guide the client to the connection screen inside their dashboard.',
      items: [
        'Log in to flow.sanestix.com',
        'Find "Connect WhatsApp" in the onboarding checklist',
        'Click it — a modal window will appear',
        'Make sure "One-Click Setup" tab is selected',
      ],
      tip: null,
    },
    {
      num: '3', title: 'Click "Connect via Meta"', time: '30 sec',
      desc: 'Click the green button. A secure Facebook popup will open.',
      items: [
        'Click the green "Connect via Meta" button',
        'A popup from Facebook will appear — this is normal and secure',
        'Log in with Facebook account',
        'Click "Continue as [Your Name]"',
      ],
      tip: 'Popup not opening? Repeat Step 1. Use Chrome, not Safari or Firefox.',
      tipType: 'warn',
    },
    {
      num: '4', title: 'Complete WhatsApp Setup', time: '2–3 min',
      desc: "Follow Meta's guided steps inside the popup window.",
      items: [
        'Select or create a WhatsApp Business Account',
        'Enter business name as it should appear on WhatsApp',
        'Enter the business phone number',
        'Enter the OTP code sent via SMS',
        'Click "Finish" — do NOT close popup manually',
      ],
      tip: 'No SMS? Click "Call me instead". VoIP numbers are not supported by Meta.',
      tipType: 'info',
    },
    {
      num: '5', title: 'Wait for Auto-Connection', time: '10 sec',
      desc: 'System handles everything automatically after popup closes.',
      items: [
        'Popup closes automatically',
        'Brief "Saving WhatsApp connection..." message appears',
        'Green "WhatsApp Connected!" confirmation appears',
        'Dashboard is now ready for WhatsApp messages',
      ],
      tip: null,
    },
  ];

  const faqs = [
    { q: 'Can client use existing WhatsApp Business number?', a: 'Yes. But the regular WhatsApp Business app will stop working on that number once connected to the API. Make sure they understand this first.' },
    { q: 'Popup not opening after allowing it?', a: 'Hard refresh (Ctrl+Shift+R). If still stuck, open Incognito window, log in again, and try. Also check they are on Chrome not Safari.' },
    { q: 'Connection failed after popup completed?', a: 'Check backend logs: docker logs sanestix_backend --tail 50. Look for /connect-whatsapp route. Wait 2 min and retry.' },
    { q: "OTP not received?", a: "Click \"Call me instead\" inside the Meta popup. If using a VoIP number (e.g. Google Voice), it won't work — they need a real SIM number." },
    { q: 'Phone number already registered error?', a: 'Client must release the number from their previous provider via Meta Business Manager first. This is a Meta restriction.' },
  ];

  return (
    <div style={{position:'fixed',inset:0,zIndex:2000,display:'flex'}}>
      {/* Backdrop */}
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}/>
      {/* Drawer */}
      <div style={{position:'absolute',right:0,top:0,bottom:0,width:'min(680px,95vw)',background:'#0d1b22',borderLeft:'1px solid rgba(255,255,255,0.08)',display:'flex',flexDirection:'column',boxShadow:'-20px 0 60px rgba(0,0,0,0.5)'}}>
        {/* Header */}
        <div style={{padding:'20px 24px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#111b21',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(37,211,102,0.12)',border:'1px solid rgba(37,211,102,0.2)',display:'flex',alignItems:'center',justifyContent:'center',color:'#25d366',fontSize:'16px'}}>📋</div>
            <div>
              <div style={{fontSize:'15px',fontWeight:'700',color:'#fff'}}>Client Onboarding Guide</div>
              <div style={{fontSize:'12px',color:'#8696a0',marginTop:'2px'}}>Share with clients · WhatsApp setup in 5 min</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#8696a0',cursor:'pointer',padding:'6px',borderRadius:'6px',display:'flex',alignItems:'center',justifyContent:'center'}}><XIcon/></button>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:'0',padding:'0 24px',borderBottom:'1px solid rgba(255,255,255,0.06)',background:'#111b21',flexShrink:0}}>
          {[{id:'guide',label:'📖 Step-by-Step Guide'},{id:'faq',label:'❓ FAQ & Troubleshooting'}].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{padding:'12px 16px',border:'none',background:'transparent',cursor:'pointer',fontSize:'13px',fontWeight:tab===t.id?'700':'400',color:tab===t.id?'#00d4b8':'#536471',borderBottom:tab===t.id?'2px solid #00d4b8':'2px solid transparent',marginBottom:'-1px'}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Time badge */}
        <div style={{padding:'12px 24px',background:'rgba(37,211,102,0.04)',borderBottom:'1px solid rgba(255,255,255,0.04)',flexShrink:0}}>
          <span style={{fontSize:'12px',color:'#8696a0'}}>⏱ Average setup time: </span>
          <span style={{fontSize:'12px',fontWeight:'700',color:'#25d366'}}>4–5 minutes</span>
          <span style={{fontSize:'12px',color:'#8696a0'}}> · </span>
          <span style={{fontSize:'12px',color:'#8696a0'}}>No technical knowledge required</span>
        </div>

        {/* Scrollable content */}
        <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>

          {tab === 'guide' && (
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {guideSteps.map((step) => (
                <div key={step.num} style={{background:'#111b21',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'14px',overflow:'hidden'}}>
                  {/* Step header */}
                  <div style={{display:'flex',alignItems:'center',gap:'14px',padding:'16px 20px'}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'10px',background:'rgba(37,211,102,0.1)',border:'1px solid rgba(37,211,102,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',fontWeight:'800',color:'#25d366',flexShrink:0,fontFamily:'monospace'}}>{step.num}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'14px',fontWeight:'700',color:'#fff'}}>{step.title}</div>
                      <div style={{fontSize:'11px',color:'#8696a0',marginTop:'2px'}}>{step.desc}</div>
                    </div>
                    <div style={{fontSize:'11px',color:'#536471',background:'rgba(255,255,255,0.04)',padding:'3px 8px',borderRadius:'6px',whiteSpace:'nowrap'}}>⏱ {step.time}</div>
                  </div>
                  {/* Step items */}
                  <div style={{padding:'0 20px 16px',borderTop:'1px solid rgba(255,255,255,0.04)',paddingTop:'12px'}}>
                    <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                      {step.items.map((item, i) => (
                        <div key={i} style={{display:'flex',gap:'10px',alignItems:'flex-start',fontSize:'13px',color:'#aab8c2',lineHeight:'1.5'}}>
                          <div style={{width:'20px',height:'20px',borderRadius:'50%',background:'#25d366',color:'#000',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:'700',flexShrink:0,marginTop:'1px'}}>{i+1}</div>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                    {step.tip && (
                      <div style={{marginTop:'10px',display:'flex',gap:'8px',padding:'10px 12px',borderRadius:'8px',background: step.tipType==='warn' ? 'rgba(251,191,36,0.06)' : 'rgba(0,212,184,0.05)',border: step.tipType==='warn' ? '1px solid rgba(251,191,36,0.2)' : '1px solid rgba(0,212,184,0.15)',fontSize:'12px',color:'#8696a0',lineHeight:'1.5'}}>
                        <span style={{flexShrink:0}}>{step.tipType==='warn'?'⚠️':'💡'}</span>
                        <span>{step.tip}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Success card */}
              <div style={{background:'linear-gradient(135deg,rgba(37,211,102,0.08),rgba(18,140,126,0.05))',border:'1px solid rgba(37,211,102,0.2)',borderRadius:'14px',padding:'20px',textAlign:'center',marginTop:'4px'}}>
                <div style={{fontSize:'32px',marginBottom:'8px'}}>🎉</div>
                <div style={{fontSize:'15px',fontWeight:'700',color:'#25d366',marginBottom:'6px'}}>Client is now Live on WhatsApp!</div>
                <div style={{fontSize:'13px',color:'#8696a0'}}>All customer messages will route to their Sanestix dashboard in real time.</div>
              </div>
            </div>
          )}

          {tab === 'faq' && (
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {faqs.map((faq, i) => (
                <div key={i} style={{background:'#111b21',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
                  <div style={{padding:'14px 18px',fontSize:'13px',fontWeight:'600',color:'#fff',borderBottom:'1px solid rgba(255,255,255,0.04)',background:'rgba(255,255,255,0.02)'}}>
                    ❓ {faq.q}
                  </div>
                  <div style={{padding:'12px 18px',fontSize:'13px',color:'#8696a0',lineHeight:'1.6'}}>
                    {faq.a}
                  </div>
                </div>
              ))}

              {/* Quick commands */}
              <div style={{background:'#111b21',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden',marginTop:'8px'}}>
                <div style={{padding:'14px 18px',fontSize:'13px',fontWeight:'600',color:'#fff',borderBottom:'1px solid rgba(255,255,255,0.04)',background:'rgba(255,255,255,0.02)'}}>
                  🔧 Quick Debug Commands (VPS)
                </div>
                <div style={{padding:'14px 18px',display:'flex',flexDirection:'column',gap:'10px'}}>
                  {[
                    {label:'Check workspace connection', cmd:'docker exec sanestix_db psql -U postgres -d sanestix_flow -c "SELECT name, phone_number, wa_phone_id FROM workspaces;"'},
                    {label:'Check backend errors', cmd:'docker logs sanestix_backend --tail 50 | grep -i error'},
                    {label:'Restart backend', cmd:'cd /opt/sanestix-flow && docker compose restart backend'},
                  ].map(({label, cmd}) => (
                    <div key={label}>
                      <div style={{fontSize:'11px',color:'#536471',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.05em',fontWeight:'600'}}>{label}</div>
                      <div style={{background:'#0a0f14',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'6px',padding:'8px 12px',fontFamily:'monospace',fontSize:'11px',color:'#34d399',lineHeight:'1.5',wordBreak:'break-all'}}>{cmd}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'16px 24px',borderTop:'1px solid rgba(255,255,255,0.06)',background:'#111b21',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:'12px',color:'#536471'}}>Send to client: <span style={{color:'#00d4b8'}}>flow.sanestix.com/onboarding-guide</span></div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',color:'#8696a0',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>Close</button>
        </div>
      </div>
    </div>
  );
}

function WAModal({ workspace, onClose, onSaved }) {
  const [mode, setMode]   = useState('embedded'); // 'embedded' | 'manual'
  const [form, setForm]   = useState({
    phone_number:    workspace.phone_number    || '',
    wa_phone_id:     workspace.wa_phone_id     || '',
    wa_access_token: workspace.wa_access_token || '',
  });
  const [saving, setSaving]     = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected]   = useState(false);

  const appId = process.env.REACT_APP_META_APP_ID;

  // Load Facebook SDK
  useEffect(() => {
    const initFB = () => {
      window.FB.init({ appId, cookie: true, xfbml: true, version: 'v19.0' });
    };
    if (window.FB) {
      initFB();
      return;
    }
    window.fbAsyncInit = initFB;
    if (!document.getElementById('fb-sdk')) {
      const script = document.createElement('script');
      script.id = 'fb-sdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [appId]);

  const launchEmbeddedSignup = () => {
    if (!window.FB) {
      toast.error('Facebook SDK not loaded yet. Please wait a moment and try again.');
      return;
    }

    // IMPORTANT: FB.login() must be called synchronously in click handler
    // Do NOT call setConnecting before FB.login — it breaks popup trust chain
    window.FB.login((response) => {
      if (response.authResponse && response.authResponse.code) {
        setConnecting(true);
        const code = response.authResponse.code;
        toast.loading('Saving WhatsApp connection...', { id: 'wa-connect' });
        api.post(`/workspaces/${workspace.id}/connect-whatsapp`, { code })
          .then(res => {
            toast.success('WhatsApp connected!', { id: 'wa-connect' });
            setConnecting(false);
            setConnected(true);
            setTimeout(() => onSaved(res.data.workspace), 1500);
          })
          .catch(err => {
            setConnecting(false);
            toast.error(err.response?.data?.error || 'Connection failed', { id: 'wa-connect' });
          });
      } else {
        toast.error('Meta login was cancelled or popup was blocked. Please allow popups and try again.');
        setConnecting(false);
      }
    }, {
      config_id: '929983876223341',
      response_type: 'code',
      override_default_response_type: true,
      scope: 'whatsapp_business_management,whatsapp_business_messaging,business_management',
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        setup: {},
        featureType: '',
        sessionInfoVersion: '3',
      }
    });
  };

  const handleManualSave = async () => {
    if (!form.phone_number || !form.wa_phone_id || !form.wa_access_token) {
      toast.error('All fields are required'); return;
    }
    setSaving(true);
    try {
      const res = await api.patch(`/workspaces/${workspace.id}`, form);
      onSaved(res.data.workspace);
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect WhatsApp from this workspace?')) return;
    setSaving(true);
    try {
      const res = await api.patch(`/workspaces/${workspace.id}`, {
        phone_number: null, wa_phone_id: null, wa_access_token: null
      });
      onSaved(res.data.workspace);
    } catch { toast.error('Failed to disconnect'); }
    finally { setSaving(false); }
  };

  return (
    <div style={m.overlay}>
      <div style={m.modal}>
        <div style={m.modalHeader}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{...m.modalIcon,background:"rgba(37,211,102,0.1)",border:"1px solid rgba(37,211,102,0.2)",color:"#25d366"}}><WAIcon/></div>
            <div>
              <div style={m.modalTitle}>WhatsApp Connection</div>
              <div style={m.modalSub}>{workspace.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={m.closeBtn}><XIcon/></button>
        </div>

        {/* Mode toggle */}
        <div style={{display:"flex",gap:"0",padding:"16px 24px 0",borderBottom:"1px solid rgba(255,255,255,0.06)",position:"relative",zIndex:1}}>
          {[{id:"embedded",label:"🚀 One-Click Setup"},{id:"manual",label:"⚙️ Manual Setup"}].map(tab => (
            <button key={tab.id} onClick={() => setMode(tab.id)}
              style={{padding:"8px 16px",border:"none",background:"transparent",cursor:"pointer",fontSize:"13px",fontWeight:mode===tab.id?"700":"400",color:mode===tab.id?"#00d4b8":"#536471",borderBottom:mode===tab.id?"2px solid #00d4b8":"2px solid transparent",marginBottom:"0px",position:"relative",zIndex:1}}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={m.modalBody}>
          {mode === "embedded" ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"20px",padding:"10px 0"}}>
              {connected ? (
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:"48px",marginBottom:"10px"}}>✅</div>
                  <div style={{fontSize:"16px",fontWeight:"700",color:"#34d399"}}>WhatsApp Connected!</div>
                  <div style={{fontSize:"13px",color:"#8696a0",marginTop:"6px"}}>The workspace is now ready to send and receive messages.</div>
                </div>
              ) : (
                <>
                  <div style={{...m.infoBox,width:"100%",boxSizing:"border-box"}}>
                    <div style={{fontSize:"13px",color:"#8696a0",lineHeight:"1.7"}}>
                      Click the button below to connect WhatsApp in <strong style={{color:"#00d4b8"}}>one click</strong>.
                      A Meta popup will open — log in with the client's Facebook account and select their WhatsApp Business number.
                      Everything saves automatically.
                    </div>
                  </div>
                  <button
                    onClick={launchEmbeddedSignup}
                    disabled={connecting}
                    style={{display:"flex",alignItems:"center",gap:"10px",background:"#25d366",border:"none",borderRadius:"12px",padding:"14px 28px",fontSize:"15px",fontWeight:"700",color:"white",cursor:connecting?"not-allowed":"pointer",opacity:connecting?0.7:1,boxShadow:"0 4px 20px rgba(37,211,102,0.3)"}}>
                    <WAIcon/>
                    {connecting ? "Opening Meta popup..." : "Connect via Meta"}
                  </button>
                  <div style={{fontSize:"11px",color:"#3a5068",textAlign:"center",lineHeight:"1.6"}}>
                    ⚠️ Make sure popups are <strong style={{color:"#fbbf24"}}>allowed</strong> for this site in your browser
                  </div>
                  <div style={{fontSize:"11px",color:"#3a5068",textAlign:"center"}}>
                    Requires the client's Facebook Business account with WhatsApp Business API access
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <div style={m.infoBox}>
                <div style={{fontSize:"12px",color:"#8696a0",lineHeight:"1.6"}}>
                  Get these values from <strong style={{color:"#00d4b8"}}>Meta Business Manager</strong> → WhatsApp → API Setup.
                </div>
              </div>
              {[
                { key:"phone_number",    label:"Phone Number",    placeholder:"+92XXXXXXXXXX", hint:"Full number with country code" },
                { key:"wa_phone_id",     label:"Phone Number ID", placeholder:"123456789012345", hint:"From Meta WhatsApp API Setup" },
                { key:"wa_access_token", label:"Access Token",    placeholder:"EAAxxxxxxxx...", hint:"Permanent token from Meta System User" },
              ].map(({key,label,placeholder,hint}) => (
                <div key={key} style={m.field}>
                  <label style={m.label}>{label}</label>
                  <input
                    value={form[key]}
                    onChange={e => setForm(f => ({...f,[key]:e.target.value}))}
                    placeholder={placeholder}
                    style={{...m.input, fontFamily: key==="wa_access_token" ? "monospace" : "inherit", fontSize: key==="wa_access_token" ? "11px" : "13px"}}
                  />
                  <div style={m.hint}>{hint}</div>
                </div>
              ))}
            </>
          )}
        </div>

        <div style={m.modalFooter}>
          {workspace.wa_phone_id && (
            <button onClick={handleDisconnect} disabled={saving} style={m.disconnectBtn}>Disconnect</button>
          )}
          <div style={{display:"flex",gap:"8px",marginLeft:"auto"}}>
            <button onClick={onClose} style={m.cancelBtn}>Cancel</button>
            {mode === "manual" && (
              <button onClick={handleManualSave} disabled={saving} style={m.saveBtn}>
                {saving ? "Saving..." : <><CheckIcon/> Save Connection</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Edit Workspace Modal ───────────────────────────────
function EditModal({ workspace, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:   workspace.name   || '',
    plan:   workspace.plan   || 'trial',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      const res = await api.patch(`/workspaces/${workspace.id}`, form);
      onSaved(res.data.workspace);
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  return (
    <div style={m.overlay}>
      <div style={{...m.modal,maxWidth:'420px'}}>
        <div style={m.modalHeader}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={m.modalIcon}><EditIcon/></div>
            <div>
              <div style={m.modalTitle}>Edit Workspace</div>
              <div style={m.modalSub}>/{workspace.slug}</div>
            </div>
          </div>
          <button onClick={onClose} style={m.closeBtn}><XIcon/></button>
        </div>
        <div style={m.modalBody}>
          <div style={m.field}>
            <label style={m.label}>Workspace Name</label>
            <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} style={m.input} placeholder="My Company"/>
          </div>
          <div style={m.field}>
            <label style={m.label}>Plan</label>
            <select value={form.plan} onChange={e => setForm(f=>({...f,plan:e.target.value}))} style={m.input}>
              {['trial','starter','growth','pro','enterprise'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div style={m.modalFooter}>
          <button onClick={onClose} style={m.cancelBtn}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={m.saveBtn}>{saving ? 'Saving...' : <><CheckIcon/> Save</>}</button>
        </div>
      </div>
    </div>
  );
}

// ── Create Workspace Modal ─────────────────────────────
function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name:'', slug:'', plan:'trial', phone_number:'', wa_phone_id:'', wa_access_token:'' });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.name || !form.slug) { toast.error('Name and slug required'); return; }
    setSaving(true);
    try {
      const res = await api.post('/workspaces', form);
      onCreated(res.data.workspace);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create');
    } finally { setSaving(false); }
  };

  return (
    <div style={m.overlay}>
      <div style={{...m.modal,maxWidth:'480px'}}>
        <div style={m.modalHeader}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{...m.modalIcon,background:'rgba(0,212,184,0.1)',border:'1px solid rgba(0,212,184,0.2)',color:'#00d4b8'}}><PlusIcon/></div>
            <div>
              <div style={m.modalTitle}>Create New Workspace</div>
              <div style={m.modalSub}>Set up a new client workspace</div>
            </div>
          </div>
          <button onClick={onClose} style={m.closeBtn}><XIcon/></button>
        </div>
        <div style={m.modalBody}>
          {[
            { key:'name',  label:'Workspace Name', placeholder:'Acme Corp', required:true },
            { key:'slug',  label:'Slug (URL)',      placeholder:'acme-corp', required:true, hint:'Lowercase, no spaces. Used in URLs.' },
          ].map(({key,label,placeholder,required,hint}) => (
            <div key={key} style={m.field}>
              <label style={m.label}>{label}{required && <span style={{color:'#f87171'}}> *</span>}</label>
              <input value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value.toLowerCase().replace(/\s+/g,'-')}))} placeholder={placeholder} style={m.input}/>
              {hint && <div style={m.hint}>{hint}</div>}
            </div>
          ))}
          <div style={m.field}>
            <label style={m.label}>Plan</label>
            <select value={form.plan} onChange={e => setForm(f=>({...f,plan:e.target.value}))} style={m.input}>
              {['trial','starter','growth','pro','enterprise'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
            </select>
          </div>
          <div style={{...m.infoBox,marginTop:'8px'}}>
            <div style={{fontSize:'12px',color:'#8696a0'}}>WhatsApp credentials can be added after creation via the Connect WA button.</div>
          </div>
        </div>
        <div style={m.modalFooter}>
          <button onClick={onClose} style={m.cancelBtn}>Cancel</button>
          <button onClick={handleCreate} disabled={saving} style={m.saveBtn}>{saving ? 'Creating...' : <><PlusIcon/> Create Workspace</>}</button>
        </div>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────
const planBadge = (plan) => ({
  trial:      { background:'rgba(251,191,36,0.1)',  color:'#fbbf24', border:'1px solid rgba(251,191,36,0.2)' },
  starter:    { background:'rgba(96,165,250,0.1)',  color:'#60a5fa', border:'1px solid rgba(96,165,250,0.2)' },
  growth:     { background:'rgba(167,139,250,0.1)', color:'#a78bfa', border:'1px solid rgba(167,139,250,0.2)' },
  pro:        { background:'rgba(0,212,184,0.1)',   color:'#00d4b8', border:'1px solid rgba(0,212,184,0.2)' },
  enterprise: { background:'rgba(251,113,133,0.1)', color:'#fb7185', border:'1px solid rgba(251,113,133,0.2)' },
}[plan] || { background:'rgba(255,255,255,0.05)', color:'#8696a0', border:'1px solid rgba(255,255,255,0.1)' });

const s = {
  root:{ padding:'28px 32px', background:'#070b11', minHeight:'100%', color:'#e9edef', overflowY:'auto', height:'100%', boxSizing:'border-box' },
  header:{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' },
  headerLeft:{ display:'flex', alignItems:'center', gap:'12px' },
  headerIcon:{ width:'38px', height:'38px', borderRadius:'10px', background:'rgba(0,212,184,0.1)', border:'1px solid rgba(0,212,184,0.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#00d4b8' },
  headerTitle:{ fontSize:'20px', fontWeight:'700', color:'#e9edef', letterSpacing:'-0.02em' },
  headerSub:{ fontSize:'13px', color:'#3a5068', marginTop:'2px' },
  createBtn:{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(0,212,184,0.1)', border:'1px solid rgba(0,212,184,0.25)', borderRadius:'8px', padding:'8px 14px', fontSize:'13px', color:'#00d4b8', cursor:'pointer', fontWeight:'600' },
  refreshBtn:{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'8px 14px', fontSize:'13px', color:'#8696a0', cursor:'pointer' },
  summaryRow:{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px', marginBottom:'24px' },
  summaryCard:{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'18px 20px' },
  summaryVal:{ fontSize:'28px', fontWeight:'800', letterSpacing:'-0.03em', marginBottom:'4px' },
  summaryLabel:{ fontSize:'11px', color:'#3a5068', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:'600' },
  toolbar:{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' },
  searchInput:{ flex:1, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', padding:'9px 14px', fontSize:'13px', color:'#e9edef', outline:'none', maxWidth:'280px' },
  filterTabs:{ display:'flex', gap:'4px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'8px', padding:'3px' },
  filterTab:{ padding:'5px 12px', borderRadius:'6px', border:'none', background:'transparent', fontSize:'12px', fontWeight:'500', color:'#536471', cursor:'pointer' },
  filterTabActive:{ background:'rgba(0,212,184,0.1)', color:'#00d4b8' },
  tableWrap:{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', overflow:'hidden' },
  table:{ width:'100%', borderCollapse:'collapse' },
  th:{ padding:'11px 16px', fontSize:'10px', fontWeight:'700', color:'#3a5068', textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'left', borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(255,255,255,0.02)' },
  tr:{ borderBottom:'1px solid rgba(255,255,255,0.04)' },
  td:{ padding:'14px 16px', fontSize:'13px', color:'#8696a0', verticalAlign:'middle' },
  tdStat:{ padding:'14px 16px', fontSize:'13px', color:'#536471', verticalAlign:'middle' },
  wsName:{ fontSize:'14px', fontWeight:'600', color:'#e9edef', marginBottom:'2px' },
  wsSlug:{ fontSize:'11px', color:'#3a5068', fontFamily:'monospace' },
  badge:{ display:'inline-block', padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'600' },
  badgeGreen:{ background:'rgba(52,211,153,0.1)', color:'#34d399', border:'1px solid rgba(52,211,153,0.2)' },
  badgeRed:{ background:'rgba(248,113,113,0.1)', color:'#f87171', border:'1px solid rgba(248,113,113,0.2)' },
  waConnected:{ display:'flex', alignItems:'center', gap:'6px', color:'#25d366' },
  waEditBtn:{ background:'transparent', border:'none', color:'#3a5068', cursor:'pointer', padding:'2px', display:'flex', alignItems:'center' },
  waConnectBtn:{ display:'flex', alignItems:'center', gap:'5px', background:'rgba(37,211,102,0.08)', border:'1px solid rgba(37,211,102,0.2)', borderRadius:'6px', padding:'5px 10px', fontSize:'12px', color:'#25d366', cursor:'pointer', fontWeight:'600' },
  actionBtn:{ padding:'5px 12px', borderRadius:'6px', border:'none', fontSize:'12px', fontWeight:'600', cursor:'pointer' },
  actionBtnBlue:{ padding:'5px 12px', borderRadius:'6px', border:'1px solid rgba(96,165,250,0.2)', background:'rgba(96,165,250,0.08)', fontSize:'12px', fontWeight:'600', cursor:'pointer', color:'#60a5fa' },
  actionBtnRed:{ background:'rgba(248,113,113,0.1)', color:'#f87171', border:'1px solid rgba(248,113,113,0.2)' },
  actionBtnGreen:{ background:'rgba(52,211,153,0.1)', color:'#34d399', border:'1px solid rgba(52,211,153,0.2)' },
  empty:{ padding:'48px', textAlign:'center', color:'#3a5068', fontSize:'14px' },
};

const m = {
  overlay:{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter:'blur(4px)', pointerEvents:'none' },
  modal:{ background:'#111b21', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'16px', width:'90%', maxWidth:'560px', boxShadow:'0 20px 60px rgba(0,0,0,0.5)', pointerEvents:'auto' },
  modalHeader:{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px', borderBottom:'1px solid rgba(255,255,255,0.06)' },
  modalIcon:{ width:'36px', height:'36px', borderRadius:'9px', background:'rgba(0,212,184,0.1)', border:'1px solid rgba(0,212,184,0.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#00d4b8' },
  modalTitle:{ fontSize:'16px', fontWeight:'700', color:'#e9edef' },
  modalSub:{ fontSize:'12px', color:'#3a5068', marginTop:'2px' },
  closeBtn:{ background:'transparent', border:'none', color:'#3a5068', cursor:'pointer', padding:'4px', display:'flex', borderRadius:'6px' },
  modalBody:{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:'16px' },
  modalFooter:{ padding:'16px 24px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:'8px' },
  field:{ display:'flex', flexDirection:'column', gap:'6px' },
  label:{ fontSize:'12px', fontWeight:'600', color:'#8696a0', textTransform:'uppercase', letterSpacing:'0.06em' },
  input:{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'10px 12px', fontSize:'13px', color:'#e9edef', outline:'none', width:'100%', boxSizing:'border-box' },
  hint:{ fontSize:'11px', color:'#3a5068' },
  infoBox:{ background:'rgba(0,212,184,0.04)', border:'1px solid rgba(0,212,184,0.1)', borderRadius:'8px', padding:'12px 14px' },
  saveBtn:{ display:'flex', alignItems:'center', gap:'6px', background:'#00a884', border:'none', borderRadius:'8px', padding:'9px 18px', fontSize:'13px', color:'white', cursor:'pointer', fontWeight:'600' },
  cancelBtn:{ background:'transparent', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'9px 16px', fontSize:'13px', color:'#8696a0', cursor:'pointer' },
  disconnectBtn:{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:'8px', padding:'9px 14px', fontSize:'13px', color:'#f87171', cursor:'pointer', fontWeight:'600' },
};
