import React, { useState } from 'react';
import { useAuthStore, useTeamStore } from '../../store';

export default function Sidebar({ activeTab, onTabChange }) {
  const { user, logout } = useAuthStore();
  const { queue, updateMyStatus } = useTeamStore();
  const [status, setStatus] = useState(user?.status || 'online');
  const [showStatus, setShowStatus] = useState(false);

  const nav = [
    { id:'chats',       label:'Chats',     icon:<ChatsIcon/> },
    { id:'contacts',    label:'Contacts',  icon:<ContactsIcon/> },
    { id:'team',        label:'Team',      icon:<TeamIcon/>,  badge: queue.length },
    { id:'stats',       label:'Stats',     icon:<StatsIcon/> },
    { id:'automations', label:'Automations', icon:<BotIcon/> },
    { id:'templates',   label:'Templates', icon:<TemplatesIcon/> },
  ];

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    setShowStatus(false);
    try { await updateMyStatus(user.id, newStatus); } catch {}
  };

  const statusColors = { online: '#10b981', away: '#f59e0b', offline: '#6b7280' };
  const statusLabels = { online: 'Online', away: 'Away', offline: 'Offline' };

  return (
    <div style={s.root}>
      <div style={s.logo}>
        <div style={s.logoS}>S<div style={s.logoLine}/></div>
      </div>
      <nav style={s.nav}>
        {nav.map(item=>(
          <button key={item.id} title={item.label} onClick={()=>onTabChange(item.id)}
            style={{...s.btn,...(activeTab===item.id?s.btnActive:{})}}>
            {item.icon}
            {item.badge > 0 && (
              <div style={s.badge}>{item.badge > 9 ? '9+' : item.badge}</div>
            )}
            {activeTab===item.id&&<div style={s.bar}/>}
          </button>
        ))}
      </nav>
      <div style={s.bottom}>
        <button title="Settings" style={s.btn}><SettingsIcon/></button>

        {/* Status switcher */}
        <div style={{position:'relative'}}>
          <button onClick={() => setShowStatus(!showStatus)}
            style={{...s.btn, flexDirection:'column', gap:'2px'}}
            title={`Status: ${statusLabels[status]}`}>
            <div style={{...s.onlineDot, background: statusColors[status],
              boxShadow: `0 0 8px ${statusColors[status]}99`}}/>
          </button>
          {showStatus && (
            <div style={s.statusMenu}>
              {Object.entries(statusLabels).map(([k, v]) => (
                <button key={k} onClick={() => handleStatusChange(k)}
                  style={{...s.statusItem, ...(status===k ? s.statusItemActive : {})}}>
                  <div style={{...s.statusDot, background: statusColors[k]}}/>
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={s.avatar} title={user?.name}>{user?.name?.[0]?.toUpperCase()||'A'}</div>
        <button onClick={logout} title="Sign out" style={s.logoutBtn}><LogoutIcon/></button>
      </div>
    </div>
  );
}

const TeamIcon=()=><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
const TemplatesIcon=()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 8h10M7 12h10M7 16h6" strokeLinecap="round"/></svg>;
const ChatsIcon=()=><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
const ContactsIcon=()=><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
const StatsIcon=()=><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const BotIcon=()=><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V6a3 3 0 016 0v2"/><path d="M9 14h.01M15 14h.01" strokeLinecap="round"/></svg>;
const SettingsIcon=()=><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
const LogoutIcon=()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>;

const s={
  root:{width:'58px',background:'#111b21',borderRight:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',alignItems:'center',padding:'14px 0',flexShrink:0},
  logo:{width:'40px',height:'40px',borderRadius:'10px',background:'#202c33',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'14px',boxShadow:'0 0 14px rgba(0,212,184,.1)',flexDirection:'column',gap:'2px',overflow:'hidden'},
  logoS:{fontFamily:"'Urbanist',sans-serif",fontWeight:900,fontSize:'22px',color:'white',letterSpacing:'-1px',lineHeight:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'},
  logoLine:{width:'16px',height:'2.5px',background:'linear-gradient(90deg,#00d4b8,#00b8a0)',borderRadius:'2px'},
  nav:{display:'flex',flexDirection:'column',gap:'4px',flex:1,alignItems:'center'},
  btn:{width:'40px',height:'40px',borderRadius:'11px',border:'none',background:'transparent',color:'#3a5068',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',position:'relative'},
  btnActive:{background:'rgba(0,212,184,0.12)',color:'#00a884'},
  bar:{position:'absolute',left:'-1px',top:'25%',bottom:'25%',width:'3px',background:'#00a884',borderRadius:'0 3px 3px 0'},
  badge:{position:'absolute',top:'-2px',right:'-2px',background:'#ef4444',color:'white',fontSize:'9px',fontWeight:'700',borderRadius:'99px',minWidth:'16px',height:'16px',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 3px'},
  bottom:{display:'flex',flexDirection:'column',alignItems:'center',gap:'10px'},
  onlineDot:{width:'10px',height:'10px',borderRadius:'50%',background:'#10b981',boxShadow:'0 0 8px rgba(16,185,129,.6)',cursor:'pointer'},
  statusMenu:{position:'absolute',left:'48px',bottom:'0',background:'#1e2d38',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'6px',zIndex:100,minWidth:'110px',boxShadow:'0 4px 20px rgba(0,0,0,0.4)'},
  statusItem:{display:'flex',alignItems:'center',gap:'8px',width:'100%',padding:'7px 10px',borderRadius:'7px',border:'none',background:'transparent',color:'#8fa8b8',cursor:'pointer',fontSize:'12px',fontWeight:'500'},
  statusItemActive:{background:'rgba(0,212,184,0.1)',color:'#00d4b8'},
  statusDot:{width:'8px',height:'8px',borderRadius:'50%',flexShrink:0},
  avatar:{width:'34px',height:'34px',borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'700',cursor:'default',color:'white'},
  logoutBtn:{width:'36px',height:'36px',borderRadius:'10px',border:'none',background:'transparent',color:'#1a2e42',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s'},
};
