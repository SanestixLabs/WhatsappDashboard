import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store';
import api from '../services/api';
import toast from 'react-hot-toast';

const PERIODS = [
  { label: '7 days',  value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
];

const ROLE_COLORS = {
  super_admin: { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa', label: 'Super Admin' },
  manager:     { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa', label: 'Manager' },
  agent:       { bg: 'rgba(16,185,129,0.15)',  color: '#34d399', label: 'Agent' },
  viewer:      { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af', label: 'Viewer' },
  owner:       { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24', label: 'Owner' },
};

const Icons = {
  chat: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
  open: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4l3 3"/></svg>,
  closed: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  ai: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-2"/></svg>,
  reply: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
  resolve: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>,
  download: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>,
  refresh: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>,
  medal1: <svg width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>,
  medal2: <svg width="16" height="16" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>,
  medal3: <svg width="16" height="16" viewBox="0 0 24 24" fill="#b45309"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>,
  star: <svg width="13" height="13" viewBox="0 0 24 24" fill="#fbbf24"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>,
};

function StatCard({ icon, label, value, sub, color = '#25d366' }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'18px 20px', display:'flex', flexDirection:'column', gap:6, minWidth:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ color:'#6b7280' }}>{icon}</span>
        <span style={{ fontSize:12, color:'#6b7280', fontWeight:500 }}>{label}</span>
      </div>
      <div style={{ fontSize:28, fontWeight:700, color, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'#6b7280' }}>{sub}</div>}
    </div>
  );
}

function MiniBarChart({ data }) {
  if (!data || data.length === 0) return (
    <div style={{ color:'#6b7280', fontSize:13, textAlign:'center', padding:'32px 0' }}>No data for this period</div>
  );
  const max = Math.max(...data.map(d => parseInt(d.total) || 0), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:100, padding:'0 4px' }}>
      {data.map((d, i) => {
        const total = parseInt(d.total) || 0;
        const ai = parseInt(d.ai_count) || 0;
        const height = Math.max((total / max) * 72, total > 0 ? 4 : 0);
        const aiH = total > 0 ? (ai / total) * height : 0;
        const agentH = height - aiH;
        const date = new Date(d.date);
        const label = date.toLocaleDateString('en', { month:'short', day:'numeric' });
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{ width:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', height:72 }}>
              {aiH > 0 && <div style={{ width:'100%', height:aiH, background:'#25d366', opacity:0.9 }} />}
              {agentH > 0 && <div style={{ width:'100%', height:agentH, background:'#60a5fa', borderRadius:'3px 3px 0 0', opacity:0.9 }} />}
              {total === 0 && <div style={{ width:'100%', height:2, background:'rgba(255,255,255,0.05)' }} />}
            </div>
            <div style={{ fontSize:10, color:'#6b7280', whiteSpace:'nowrap', marginTop:6, textAlign:'center' }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const user = useAuthStore(s => s.user);
  const [period, setPeriod] = useState('30d');
  const [kpi, setKpi] = useState(null);
  const [volume, setVolume] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiRes, volRes, agentRes] = await Promise.all([
        api.get(`/api/analytics/kpi?period=${period}`),
        api.get(`/api/analytics/volume?period=${period}`),
        api.get(`/api/analytics/agents?period=${period}`),
      ]);
      setKpi(kpiRes.data);
      setVolume(volRes.data);
      setAgents(agentRes.data);
    } catch { toast.error('Failed to load analytics'); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/api/analytics/export?period=${period}`, { responseType:'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `analytics-${period}-${new Date().toISOString().slice(0,10)}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported!');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const roleInfo = (role) => ROLE_COLORS[role] || ROLE_COLORS.agent;
  const fmt = (mins) => { if (!mins || mins === 0) return '—'; if (mins < 60) return `${mins}m`; return `${Math.floor(mins/60)}h ${mins%60}m`; };
  const medalIcon = (i) => i === 0 ? Icons.medal1 : i === 1 ? Icons.medal2 : i === 2 ? Icons.medal3 : <span style={{ color:'#4b5563', fontSize:12, fontWeight:700 }}>{i+1}</span>;

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#0f1117', minHeight:0, overflow:'hidden' }}>

      {/* Header */}
      <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'#f9fafb' }}>Analytics</h2>
            <p style={{ margin:'2px 0 0', fontSize:13, color:'#6b7280' }}>Conversation performance & agent stats</p>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div style={{ display:'flex', background:'rgba(255,255,255,0.05)', borderRadius:8, padding:3, gap:2 }}>
              {PERIODS.map(p => (
                <button key={p.value} onClick={() => setPeriod(p.value)} style={{
                  padding:'5px 12px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
                  background: period===p.value ? 'rgba(37,211,102,0.15)' : 'transparent',
                  color: period===p.value ? '#25d366' : '#6b7280', transition:'all 0.15s',
                }}>{p.label}</button>
              ))}
            </div>
            <button onClick={handleExport} disabled={exporting} style={{
              padding:'7px 14px', borderRadius:8, border:'1px solid rgba(37,211,102,0.3)',
              background:'rgba(37,211,102,0.08)', color:'#25d366', fontSize:12, fontWeight:600,
              cursor: exporting?'not-allowed':'pointer', opacity: exporting?0.6:1,
              display:'flex', alignItems:'center', gap:6,
            }}>
              {Icons.download} {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button onClick={fetchAll} title="Refresh" style={{
              padding:'7px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)',
              background:'rgba(255,255,255,0.04)', color:'#9ca3af', fontSize:14,
              cursor:'pointer', display:'flex', alignItems:'center',
            }}>{Icons.refresh}</button>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:20 }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', flex:1, color:'#6b7280', fontSize:14 }}>
            Loading analytics...
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            {kpi && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:12 }}>
                <StatCard icon={Icons.chat}    label="Total Conversations" value={kpi.total_conversations} color="#f9fafb" />
                <StatCard icon={Icons.open}    label="Open Now"            value={kpi.open_now}            color="#25d366" />
                <StatCard icon={Icons.closed}  label="Closed"              value={kpi.closed}              color="#60a5fa" />
                <StatCard icon={Icons.ai}      label="AI Resolved %"       value={`${kpi.ai_resolved_pct}%`} color="#a78bfa" sub={`${kpi.ai_resolved_count} of ${kpi.total_conversations}`} />
                <StatCard icon={Icons.reply}   label="Avg First Reply"     value={fmt(kpi.avg_first_resp_mins)} color="#fbbf24" sub="from conversation start" />
                <StatCard icon={Icons.resolve} label="Avg Resolution"      value={fmt(kpi.avg_resolution_mins)} color="#fb923c" sub="from open to closed" />
              </div>
            )}

            {/* Volume Chart */}
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'18px 20px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:'#f9fafb' }}>Conversation Volume</div>
                  <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>Daily breakdown — last {period}</div>
                </div>
                <div style={{ display:'flex', gap:12, fontSize:11 }}>
                  <span style={{ display:'flex', alignItems:'center', gap:4, color:'#9ca3af' }}>
                    <span style={{ width:10, height:10, background:'#25d366', borderRadius:2, display:'inline-block' }} /> AI Resolved
                  </span>
                  <span style={{ display:'flex', alignItems:'center', gap:4, color:'#9ca3af' }}>
                    <span style={{ width:10, height:10, background:'#60a5fa', borderRadius:2, display:'inline-block' }} /> Agent Handled
                  </span>
                </div>
              </div>
              <MiniBarChart data={volume} />
            </div>

            {/* Agent Leaderboard */}
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, display:'flex', flexDirection:'column', minHeight:0 }}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#f9fafb' }}>Agent Leaderboard</div>
                <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>Performance — last {period}</div>
              </div>
              {agents.length === 0 ? (
                <div style={{ padding:'32px 20px', textAlign:'center', color:'#6b7280', fontSize:13 }}>No agent data available</div>
              ) : (
                <div style={{ overflowX:'auto', overflowY:'auto', maxHeight:320 }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:600 }}>
                    <thead style={{ position:'sticky', top:0, zIndex:1 }}>
                      <tr style={{ background:'#161b22' }}>
                        {['#','Agent','Role','Chats','Avg First Reply','Avg Resolution','CSAT'].map((h,i) => (
                          <th key={i} style={{
                            padding:'10px 16px', textAlign:i<=1?'left':'center',
                            fontSize:11, fontWeight:600, color:'#6b7280',
                            textTransform:'uppercase', letterSpacing:'0.05em',
                            whiteSpace:'nowrap', borderBottom:'1px solid rgba(255,255,255,0.06)',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {agents.map((a, i) => {
                        const rc = roleInfo(a.role);
                        const isMe = a.id === user?.id;
                        return (
                          <tr key={a.id} style={{ background: isMe?'rgba(37,211,102,0.04)':'transparent', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding:'12px 16px', textAlign:'center' }}>{medalIcon(i)}</td>
                            <td style={{ padding:'12px 16px' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                <div style={{ width:32, height:32, borderRadius:'50%', background:`linear-gradient(135deg, ${rc.color}33, ${rc.color}11)`, border:`1px solid ${rc.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:rc.color, flexShrink:0 }}>
                                  {(a.name||'?')[0].toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight:600, color:'#f9fafb', fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
                                    {a.name||'Unknown'}
                                    {isMe && <span style={{ fontSize:10, color:'#25d366', background:'rgba(37,211,102,0.15)', padding:'1px 6px', borderRadius:4 }}>You</span>}
                                  </div>
                                  <div style={{ fontSize:11, color:'#6b7280' }}>{a.email}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding:'12px 16px', textAlign:'center' }}>
                              <span style={{ padding:'3px 8px', borderRadius:6, fontSize:11, fontWeight:600, background:rc.bg, color:rc.color }}>{rc.label}</span>
                            </td>
                            <td style={{ padding:'12px 16px', textAlign:'center', fontWeight:700, color:'#f9fafb', fontSize:15 }}>{a.chats_handled||0}</td>
                            <td style={{ padding:'12px 16px', textAlign:'center', color:a.avg_resp_mins?'#fbbf24':'#4b5563' }}>{fmt(a.avg_resp_mins)}</td>
                            <td style={{ padding:'12px 16px', textAlign:'center', color:a.avg_resolution_mins?'#fb923c':'#4b5563' }}>{fmt(a.avg_resolution_mins)}</td>
                            <td style={{ padding:'12px 16px', textAlign:'center' }}>
                              {a.csat_score
                                ? <span style={{ color:'#fbbf24', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:3 }}>{Icons.star} {parseFloat(a.csat_score).toFixed(1)}</span>
                                : <span style={{ color:'#4b5563', fontSize:12 }}>No data</span>
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Summary bar */}
            <div style={{ display:'flex', gap:16, flexWrap:'wrap', padding:'12px 16px', background:'rgba(37,211,102,0.04)', border:'1px solid rgba(37,211,102,0.12)', borderRadius:10, fontSize:12, color:'#6b7280' }}>
              <span>Period: <strong style={{ color:'#9ca3af' }}>{PERIODS.find(p=>p.value===period)?.label}</strong></span>
              <span style={{ color:'#374151' }}>·</span>
              <span>Active agents: <strong style={{ color:'#9ca3af' }}>{agents.length}</strong></span>
              <span style={{ color:'#374151' }}>·</span>
              <span>Total conversations: <strong style={{ color:'#9ca3af' }}>{kpi?.total_conversations||0}</strong></span>
              <span style={{ color:'#374151' }}>·</span>
              <span>AI rate: <strong style={{ color:'#25d366' }}>{kpi?.ai_resolved_pct||0}%</strong></span>
            </div>
          </>
        )}
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
