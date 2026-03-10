import React, { useEffect, useState } from 'react';
import { useTeamStore, useAuthStore } from '../store';
import toast from 'react-hot-toast';

const ROLE_COLORS = {
  super_admin: { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa', label: 'Super Admin' },
  admin:       { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', label: 'Admin' },
  agent:       { bg: 'rgba(16,185,129,0.15)', color: '#34d399', label: 'Agent' },
  viewer:      { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af', label: 'Viewer' },
};
const STATUS = {
  online:  { color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: 'Online' },
  away:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  label: 'Away' },
  offline: { color: '#6b7280', bg: 'rgba(107,114,128,0.15)', label: 'Offline' },
};

export default function TeamPage() {
  const { team, queue, loading, fetchTeam, fetchQueue, inviteMember, changeRole, deactivateMember, claimConversation, assignConversation } = useTeamStore();
  const { user } = useAuthStore();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('agent');
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [tab, setTab] = useState('team');

  useEffect(() => { fetchTeam(); fetchQueue(); }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const res = await inviteMember(inviteEmail, inviteRole);
      setInviteLink(res.inviteUrl);
      toast.success('Invite created!');
      setInviteEmail('');
    } catch (err) { toast.error(err.response?.data?.error || 'Invite failed'); }
    setInviting(false);
  };

  const handleRoleChange = async (userId, role) => {
    try { await changeRole(userId, role); toast.success('Role updated'); }
    catch { toast.error('Failed'); }
  };

  const handleDeactivate = async (userId, name) => {
    if (!window.confirm(`Deactivate ${name}?`)) return;
    try { await deactivateMember(userId); toast.success('Deactivated'); }
    catch { toast.error('Failed'); }
  };

  const handleClaim = async (convId) => {
    try { await claimConversation(convId); toast.success('Claimed!'); }
    catch (err) { toast.error(err.response?.data?.error || 'Already claimed'); }
  };

  const handleAssign = async (convId) => {
    const agents = team.filter(m => ['admin','agent'].includes(m.role) && m.is_active);
    const names = agents.map((a, i) => `${i+1}. ${a.name} (${a.role})`).join('\n');
    const pick = window.prompt(`Assign to:\n${names}\n\nEnter number:`);
    if (!pick) return;
    const agent = agents[parseInt(pick) - 1];
    if (!agent) return toast.error('Invalid');
    try { await assignConversation(convId, agent.id); toast.success(`Assigned to ${agent.name}`); }
    catch { toast.error('Failed'); }
  };

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Team Management</h1>
          <p style={s.subtitle}>{team.length} members · {queue.length} in queue</p>
        </div>
        {['super_admin','admin'].includes(user?.role) && (
          <button onClick={() => setShowInvite(!showInvite)} style={s.inviteBtn}>
            + Invite Member
          </button>
        )}
      </div>

      {/* Invite Panel */}
      {showInvite && (
        <div style={s.invitePanel}>
          <p style={s.inviteTitle}>Send Invite Link</p>
          <div style={s.inviteRow}>
            <input type="email" placeholder="Email address" value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              style={s.input} />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={s.select}>
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            <button onClick={handleInvite} disabled={inviting} style={s.sendBtn}>
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
          {inviteLink && (
            <div style={s.linkBox}>
              <span style={s.linkText}>{inviteLink}</span>
              <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copied!'); }}
                style={s.copyBtn}>Copy</button>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={s.tabs}>
        <button onClick={() => setTab('team')} style={{...s.tab, ...(tab==='team' ? s.tabActive : {})}}>
          👥 Team Members
        </button>
        <button onClick={() => setTab('queue')} style={{...s.tab, ...(tab==='queue' ? s.tabActive : {})}}>
          📨 Queue
          {queue.length > 0 && <span style={s.tabBadge}>{queue.length}</span>}
        </button>
      </div>

      {/* Team Members Tab */}
      {tab === 'team' && (
        <div style={s.card}>
          {loading ? (
            <div style={s.empty}>Loading...</div>
          ) : team.length === 0 ? (
            <div style={s.empty}>No team members yet</div>
          ) : (
            team.map((member, i) => (
              <div key={member.id} style={{...s.memberRow, ...(i < team.length-1 ? s.memberBorder : {})}}>
                <div style={{...s.avatar, background: ROLE_COLORS[member.role]?.bg || 'rgba(99,102,241,0.2)'}}>
                  <span style={{color: ROLE_COLORS[member.role]?.color || '#818cf8', fontWeight: 700, fontSize: 16}}>
                    {member.name?.[0]?.toUpperCase() || '?'}
                  </span>
                  <div style={{...s.statusDot, background: STATUS[member.status]?.color || '#6b7280'}} />
                </div>
                <div style={s.memberInfo}>
                  <div style={s.memberName}>
                    {member.name}
                    {member.id === user?.id && <span style={s.youBadge}>You</span>}
                  </div>
                  <div style={s.memberEmail}>{member.email}</div>
                </div>
                <div style={s.memberMeta}>
                  <span style={{...s.roleBadge, background: ROLE_COLORS[member.role]?.bg, color: ROLE_COLORS[member.role]?.color}}>
                    {ROLE_COLORS[member.role]?.label || member.role}
                  </span>
                  <span style={{...s.statusBadge, background: STATUS[member.status]?.bg, color: STATUS[member.status]?.color}}>
                    {STATUS[member.status]?.label || member.status}
                  </span>
                </div>
                {user?.role === 'super_admin' && member.id !== user?.id && (
                  <div style={s.actions}>
                    <select value={member.role} onChange={e => handleRoleChange(member.id, e.target.value)} style={s.roleSelect}>
                      <option value="admin">Admin</option>
                      <option value="agent">Agent</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button onClick={() => handleDeactivate(member.id, member.name)} style={s.deactivateBtn}>
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Queue Tab */}
      {tab === 'queue' && (
        <div style={s.card}>
          {queue.length === 0 ? (
            <div style={s.empty}>🎉 Queue is empty</div>
          ) : (
            queue.map((conv, i) => (
              <div key={conv.id} style={{...s.memberRow, ...(i < queue.length-1 ? s.memberBorder : {})}}>
                <div style={{...s.avatar, background:'rgba(249,115,22,0.1)'}}>
                  <span style={{color:'#fb923c', fontWeight:700, fontSize:16}}>
                    {(conv.contact_name || conv.phone_number)?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <div style={s.memberInfo}>
                  <div style={s.memberName}>{conv.contact_name || 'Unknown'}</div>
                  <div style={s.memberEmail}>{conv.phone_number}</div>
                </div>
                <div style={s.memberMeta}>
                  <span style={{...s.statusBadge, background:'rgba(249,115,22,0.1)', color:'#fb923c'}}>
                    Waiting since {new Date(conv.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div style={s.actions}>
                  {['super_admin','admin','agent'].includes(user?.role) && (
                    <button onClick={() => handleClaim(conv.id)} style={s.claimBtn}>Claim</button>
                  )}
                  {['super_admin','admin'].includes(user?.role) && (
                    <button onClick={() => handleAssign(conv.id)} style={s.assignBtn}>Assign</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  root:{ padding:'24px', overflowY:'auto', height:'100%', background:'#0b1117' },
  header:{ display:'flex', flexDirection:'column', gap:'12px', marginBottom:'20px' },
  title:{ fontSize:'20px', fontWeight:700, color:'#e2e8f0', margin:0 },
  subtitle:{ fontSize:'13px', color:'#4a6278', marginTop:'4px' },
  inviteBtn:{ background:'linear-gradient(135deg,#00d4b8,#00a884)', color:'white', border:'none', borderRadius:'10px', padding:'9px 18px', fontSize:'13px', fontWeight:600, cursor:'pointer' },
  invitePanel:{ background:'#111b21', border:'1px solid rgba(0,212,184,0.2)', borderRadius:'12px', padding:'16px', marginBottom:'20px' },
  inviteTitle:{ color:'#00d4b8', fontWeight:600, fontSize:'13px', marginBottom:'12px' },
  inviteRow:{ display:'flex', gap:'10px', flexWrap:'wrap' },
  input:{ flex:1, minWidth:'200px', background:'#1e2d38', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'9px 12px', color:'#e2e8f0', fontSize:'13px', outline:'none' },
  select:{ background:'#1e2d38', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'9px 12px', color:'#e2e8f0', fontSize:'13px', outline:'none' },
  sendBtn:{ background:'#00a884', color:'white', border:'none', borderRadius:'8px', padding:'9px 16px', fontSize:'13px', fontWeight:600, cursor:'pointer' },
  linkBox:{ marginTop:'12px', background:'#1e2d38', borderRadius:'8px', padding:'10px 12px', display:'flex', alignItems:'center', gap:'10px' },
  linkText:{ flex:1, fontSize:'11px', color:'#00d4b8', wordBreak:'break-all' },
  copyBtn:{ background:'#00a884', color:'white', border:'none', borderRadius:'6px', padding:'4px 10px', fontSize:'11px', cursor:'pointer', flexShrink:0 },
  tabs:{ display:'flex', gap:'4px', marginBottom:'16px', background:'#111b21', borderRadius:'10px', padding:'4px' },
  tab:{ flex:1, padding:'8px', border:'none', background:'transparent', color:'#4a6278', borderRadius:'8px', fontSize:'13px', fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' },
  tabActive:{ background:'rgba(0,212,184,0.1)', color:'#00d4b8' },
  tabBadge:{ background:'#ef4444', color:'white', borderRadius:'99px', fontSize:'10px', fontWeight:700, padding:'1px 6px' },
  card:{ background:'#111b21', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'12px', overflow:'hidden' },
  memberRow:{ display:'flex', alignItems:'center', gap:'14px', padding:'14px 16px' },
  memberBorder:{ borderBottom:'1px solid rgba(255,255,255,0.04)' },
  avatar:{ width:'42px', height:'42px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative' },
  statusDot:{ position:'absolute', bottom:'1px', right:'1px', width:'10px', height:'10px', borderRadius:'50%', border:'2px solid #111b21' },
  memberInfo:{ flex:1, minWidth:0 },
  memberName:{ fontSize:'14px', fontWeight:600, color:'#e2e8f0', display:'flex', alignItems:'center', gap:'8px' },
  memberEmail:{ fontSize:'12px', color:'#4a6278', marginTop:'2px' },
  youBadge:{ fontSize:'10px', background:'rgba(0,212,184,0.1)', color:'#00d4b8', borderRadius:'4px', padding:'1px 6px', fontWeight:500 },
  memberMeta:{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'5px' },
  roleBadge:{ fontSize:'11px', fontWeight:600, borderRadius:'6px', padding:'2px 8px' },
  statusBadge:{ fontSize:'11px', fontWeight:500, borderRadius:'6px', padding:'2px 8px' },
  actions:{ display:'flex', gap:'8px', alignItems:'center' },
  roleSelect:{ background:'#1e2d38', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'6px', padding:'5px 8px', color:'#e2e8f0', fontSize:'12px', cursor:'pointer' },
  deactivateBtn:{ background:'rgba(239,68,68,0.1)', color:'#f87171', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'6px', padding:'5px 10px', fontSize:'12px', cursor:'pointer' },
  claimBtn:{ background:'rgba(16,185,129,0.1)', color:'#34d399', border:'1px solid rgba(16,185,129,0.2)', borderRadius:'6px', padding:'5px 10px', fontSize:'12px', cursor:'pointer', fontWeight:600 },
  assignBtn:{ background:'rgba(59,130,246,0.1)', color:'#60a5fa', border:'1px solid rgba(59,130,246,0.2)', borderRadius:'6px', padding:'5px 10px', fontSize:'12px', cursor:'pointer', fontWeight:600 },
  empty:{ padding:'40px', textAlign:'center', color:'#4a6278', fontSize:'14px' },
};
