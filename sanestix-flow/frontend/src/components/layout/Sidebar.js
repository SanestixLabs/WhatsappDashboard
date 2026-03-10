import React from 'react';
import { useAuthStore } from '../../store';

export default function Sidebar({ activeTab, onTabChange }) {
  const { user, logout } = useAuthStore();
  const nav = [
    { id:'chats',       label:'Chats',       icon:<ChatsIcon/> },
    { id:'contacts',    label:'Contacts',    icon:<ContactsIcon/> },
    { id:'stats',       label:'Stats',       icon:<StatsIcon/> },
    { id:'automations', label:'Automations', icon:<BotIcon/> },
  ];
  return (
    <div style={s.root}>
      <div style={s.logo}>
        <div style={s.logoS}>
          S
          <div style={s.logoLine}/>
        </div>
      </div>
      <nav style={s.nav}>
        {nav.map(item=>(
          <button key={item.id} title={item.label} onClick={()=>onTabChange(item.id)}
            style={{...s.btn,...(activeTab===item.id?s.btnActive:{})}}>
            {item.icon}
            {activeTab===item.id&&<div style={s.bar}/>}
          </button>
        ))}
      </nav>
      <div style={s.bottom}>
        <button title="Settings" style={s.btn}><SettingsIcon/></button>
        <div style={s.onlineDot}/>
        <div style={s.avatar} title={user?.name}>{user?.name?.[0]?.toUpperCase()||'A'}</div>
        <button onClick={logout} title="Sign out" style={s.logoutBtn}><LogoutIcon/></button>
      </div>
    </div>
  );
}

const WaIcon=()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a6.08 6.08 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="white"/><path d="M5.077 18.347l.892-3.244a8.357 8.357 0 01-1.12-4.232C4.852 6.26 8.113 3 12.124 3c1.948.001 3.778.76 5.151 2.138a7.247 7.247 0 012.124 5.155c-.002 4.012-3.263 7.272-7.272 7.272a7.266 7.266 0 01-3.475-.883l-3.575.865z" stroke="white" strokeWidth="1.5" fill="none"/></svg>;
const ChatsIcon=()=><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
const ContactsIcon=()=><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
const StatsIcon=()=><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const BotIcon=()=><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V6a3 3 0 016 0v2"/><path d="M9 14h.01M15 14h.01" strokeLinecap="round"/></svg>;
const SettingsIcon=()=><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
const LogoutIcon=()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>;

const s={
  root:{width:'58px',background:'#0c1219',borderRight:'1px solid rgba(255,255,255,0.07)',display:'flex',flexDirection:'column',alignItems:'center',padding:'14px 0',flexShrink:0},
  logo:{width:'40px',height:'40px',borderRadius:'10px',background:'#070b11',border:'1px solid rgba(0,212,184,.25)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'14px',boxShadow:'0 0 14px rgba(0,212,184,.1)',flexDirection:'column',gap:'2px',overflow:'hidden'},
  logoS:{fontFamily:"'Urbanist',sans-serif",fontWeight:900,fontSize:'22px',color:'white',letterSpacing:'-1px',lineHeight:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'},
  logoLine:{width:'16px',height:'2.5px',background:'linear-gradient(90deg,#00d4b8,#00b8a0)',borderRadius:'2px'},
  nav:{display:'flex',flexDirection:'column',gap:'4px',flex:1,alignItems:'center'},
  btn:{width:'40px',height:'40px',borderRadius:'11px',border:'none',background:'transparent',color:'#3a5068',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',position:'relative'},
  btnActive:{background:'rgba(0,212,184,0.1)',color:'#00d4b8'},
  bar:{position:'absolute',left:'-1px',top:'25%',bottom:'25%',width:'3px',background:'#00d4b8',borderRadius:'0 3px 3px 0'},
  bottom:{display:'flex',flexDirection:'column',alignItems:'center',gap:'10px'},
  onlineDot:{width:'7px',height:'7px',borderRadius:'50%',background:'#10b981',boxShadow:'0 0 8px rgba(16,185,129,.6)'},
  avatar:{width:'34px',height:'34px',borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'700',cursor:'default'},
  logoutBtn:{width:'36px',height:'36px',borderRadius:'10px',border:'none',background:'transparent',color:'#1a2e42',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s'},
};
