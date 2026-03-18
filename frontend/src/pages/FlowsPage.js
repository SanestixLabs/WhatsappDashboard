import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const FlowIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M5 8v2a4 4 0 004 4h6a4 4 0 004-4V8M12 14v2" strokeLinecap="round"/></svg>;
const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const PlayIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>;
const PauseIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
const EditIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;

const TriggerKeywordIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
const TriggerFirstIcon  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
const TriggerButtonIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="17" cy="12" r="2" fill="currentColor"/></svg>;

const TRIGGER_LABELS = {
  keyword:       { label: 'Keyword',       Icon: TriggerKeywordIcon },
  first_message: { label: 'First Message', Icon: TriggerFirstIcon   },
  button_reply:  { label: 'Button Reply',  Icon: TriggerButtonIcon  },
};

export default function FlowsPage() {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', trigger_type: 'keyword', trigger_value: '' });
  const navigate = useNavigate();
  const handleBack = () => navigate(-1);

  useEffect(() => { fetchFlows(); }, []);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const res = await api.get('/flows');
      setFlows(res.data.flows || []);
    } catch { toast.error('Failed to load flows'); }
    finally { setLoading(false); }
  };

  const createFlow = async () => {
    if (!form.name.trim()) return toast.error('Flow name is required');
    try {
      const res = await api.post('/flows', form);
      toast.success('Flow created!');
      setShowCreate(false);
      setForm({ name: '', description: '', trigger_type: 'keyword', trigger_value: '' });
      navigate(`/flows/${res.data.flow.id}`);
    } catch { toast.error('Failed to create flow'); }
  };

  const toggleFlow = async (flow) => {
    try {
      await api.post(`/flows/${flow.id}/activate`, { is_active: !flow.is_active });
      toast.success(flow.is_active ? 'Flow paused' : 'Flow activated!');
      fetchFlows();
    } catch { toast.error('Failed to toggle flow'); }
  };

  const deleteFlow = async (id) => {
    if (!window.confirm('Delete this flow?')) return;
    try {
      await api.delete(`/flows/${id}`);
      toast.success('Flow deleted');
      fetchFlows();
    } catch { toast.error('Failed to delete flow'); }
  };

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <button onClick={() => { window.history.replaceState({}, '', '/'); window.location.href = '/'; }} style={s.backBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={s.headerIcon}><FlowIcon /></div>
          <div>
            <div style={s.headerTitle}>Chatbot Flows</div>
            <div style={s.headerSub}>Build WhatsApp automations without code</div>
          </div>
        </div>
        <button style={s.createBtn} onClick={() => setShowCreate(true)}>
          <PlusIcon /> New Flow
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalTitle}>Create New Flow</div>
            <div style={s.field}>
              <label style={s.label}>Flow Name *</label>
              <input style={s.input} placeholder="e.g. Order Status Bot"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Description</label>
              <input style={s.input} placeholder="What does this flow do?"
                value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Trigger Type *</label>
              <select style={s.input} value={form.trigger_type}
                onChange={e => setForm({...form, trigger_type: e.target.value})}>
                <option value="keyword">Keyword Match</option>
                <option value="first_message">First Message</option>
                <option value="button_reply">Button Reply</option>
              </select>
            </div>
            {form.trigger_type === 'keyword' && (
              <div style={s.field}>
                <label style={s.label}>Keyword</label>
                <input style={s.input} placeholder='e.g. "order" or "help"'
                  value={form.trigger_value} onChange={e => setForm({...form, trigger_value: e.target.value})} />
              </div>
            )}
            <div style={s.modalBtns}>
              <button style={s.cancelBtn} onClick={() => setShowCreate(false)}>Cancel</button>
              <button style={s.saveBtn} onClick={createFlow}>Create Flow</button>
            </div>
          </div>
        </div>
      )}

      {/* Flow List */}
      {loading ? (
        <div style={s.empty}>Loading flows...</div>
      ) : flows.length === 0 ? (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.2"><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M5 8v2a4 4 0 004 4h6a4 4 0 004-4V8M12 14v2" strokeLinecap="round"/></svg></div>
          <div style={s.emptyTitle}>No flows yet</div>
          <div style={s.emptySub}>Create your first chatbot flow to automate WhatsApp responses</div>
          <button style={s.createBtn} onClick={() => setShowCreate(true)}><PlusIcon /> Create First Flow</button>
        </div>
      ) : (
        <div style={s.grid}>
          {flows.map(flow => (
            <div key={flow.id} style={s.card}>
              <div style={s.cardTop}>
                <div style={{...s.statusDot, background: flow.is_active ? '#10b981' : '#374151'}}/>
                <div style={s.triggerBadge}>
                  {TRIGGER_LABELS[flow.trigger_type]
                    ? <>{React.createElement(TRIGGER_LABELS[flow.trigger_type].Icon)}&nbsp;{TRIGGER_LABELS[flow.trigger_type].label}</>
                    : flow.trigger_type}
                </div>
              </div>
              <div style={s.cardName}>{flow.name}</div>
              {flow.description && <div style={s.cardDesc}>{flow.description}</div>}
              {flow.trigger_value && (
                <div style={s.keywordTag}>keyword: "{flow.trigger_value}"</div>
              )}
              <div style={s.cardStats}>
                <span style={s.stat}>{flow.node_count || 0} nodes</span>
                <span style={s.stat}>{flow.active_sessions || 0} active sessions</span>
              </div>
              <div style={s.cardActions}>
                <button style={s.actionBtn} title="Edit flow" onClick={() => navigate(`/flows/${flow.id}`)}>
                  <EditIcon />
                </button>
                <button style={{...s.actionBtn, color: flow.is_active ? '#f59e0b' : '#10b981'}}
                  title={flow.is_active ? 'Pause flow' : 'Activate flow'}
                  onClick={() => toggleFlow(flow)}>
                  {flow.is_active ? <PauseIcon /> : <PlayIcon />}
                </button>
                <button style={{...s.actionBtn, color:'#ef4444'}} title="Delete flow"
                  onClick={() => deleteFlow(flow.id)}>
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  backBtn:{width:'34px',height:'34px',borderRadius:'10px',border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.04)',color:'#8fa8b8',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',marginRight:'8px',flexShrink:0,transition:'all .15s'},
  root:{flex:1,background:'#0b1117',minHeight:'100vh',padding:'28px',overflowY:'auto'},
  header:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'28px'},
  headerLeft:{display:'flex',alignItems:'center',gap:'14px'},
  headerIcon:{width:'42px',height:'42px',borderRadius:'12px',background:'rgba(167,139,250,0.12)',border:'1px solid rgba(167,139,250,0.2)',display:'flex',alignItems:'center',justifyContent:'center',color:'#a78bfa'},
  headerTitle:{fontSize:'20px',fontWeight:'700',color:'#e2e8f0'},
  headerSub:{fontSize:'13px',color:'#4a6580',marginTop:'2px'},
  createBtn:{display:'flex',alignItems:'center',gap:'7px',padding:'9px 18px',background:'linear-gradient(135deg,#a78bfa,#7c3aed)',border:'none',borderRadius:'10px',color:'white',fontSize:'13px',fontWeight:'600',cursor:'pointer'},
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000},
  modal:{background:'#1a2535',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'16px',padding:'28px',width:'440px',maxWidth:'95vw'},
  modalTitle:{fontSize:'18px',fontWeight:'700',color:'#e2e8f0',marginBottom:'20px'},
  field:{marginBottom:'16px'},
  label:{display:'block',fontSize:'12px',fontWeight:'600',color:'#8fa8b8',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.04em'},
  input:{width:'100%',background:'#0d1520',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'9px',padding:'10px 13px',color:'#e2e8f0',fontSize:'14px',outline:'none',boxSizing:'border-box'},
  modalBtns:{display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'24px'},
  cancelBtn:{padding:'9px 18px',background:'transparent',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'9px',color:'#8fa8b8',fontSize:'13px',cursor:'pointer'},
  saveBtn:{padding:'9px 20px',background:'linear-gradient(135deg,#a78bfa,#7c3aed)',border:'none',borderRadius:'9px',color:'white',fontSize:'13px',fontWeight:'600',cursor:'pointer'},
  empty:{color:'#4a6580',textAlign:'center',padding:'60px'},
  emptyState:{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'80px 20px',gap:'14px'},
  emptyIcon:{color:'#a78bfa',opacity:0.6,marginBottom:'16px'},
  emptyTitle:{fontSize:'18px',fontWeight:'700',color:'#e2e8f0'},
  emptySub:{fontSize:'14px',color:'#4a6580',textAlign:'center',maxWidth:'340px'},
  grid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'16px'},
  card:{background:'#111b27',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'14px',padding:'20px',display:'flex',flexDirection:'column',gap:'10px',transition:'border-color .2s'},
  cardTop:{display:'flex',alignItems:'center',justifyContent:'space-between'},
  statusDot:{width:'8px',height:'8px',borderRadius:'50%'},
  triggerBadge:{fontSize:'11px',fontWeight:'600',color:'#a78bfa',background:'rgba(167,139,250,0.1)',padding:'3px 9px',borderRadius:'99px'},
  cardName:{fontSize:'16px',fontWeight:'700',color:'#e2e8f0'},
  cardDesc:{fontSize:'13px',color:'#4a6580'},
  keywordTag:{fontSize:'11px',color:'#00d4b8',background:'rgba(0,212,184,0.08)',padding:'3px 9px',borderRadius:'6px',display:'inline-block'},
  cardStats:{display:'flex',gap:'14px'},
  stat:{fontSize:'12px',color:'#4a6580'},
  cardActions:{display:'flex',gap:'8px',marginTop:'4px'},
  actionBtn:{width:'32px',height:'32px',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.07)',background:'transparent',color:'#8fa8b8',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'},
};
