import React from 'react';
import { useAuthStore } from '../../store';

export default function Sidebar({ activeTab, onTabChange, stats }) {
  const { user, logout } = useAuthStore();

  const navItems = [
    { id: 'chats',    icon: <ChatsIcon />,    label: 'Chats' },
    { id: 'contacts', icon: <ContactsIcon />, label: 'Contacts' },
    { id: 'stats',    icon: <StatsIcon />,    label: 'Stats' },
    { id: 'settings', icon: <SettingsIcon />, label: 'Settings' },
  ];

  return (
    <div style={s.root}>
      {/* Logo */}
      <div style={s.logoWrap}>
        <div style={s.logoIcon}>
          <WaIcon />
        </div>
      </div>

      {/* Nav */}
      <nav style={s.nav}>
        {navItems.map(item => (
          <button
            key={item.id}
            title={item.label}
            onClick={() => onTabChange(item.id)}
            style={{
              ...s.navBtn,
              ...(activeTab === item.id ? s.navBtnActive : {}),
            }}
          >
            {item.icon}
            {activeTab === item.id && <div style={s.activeBar} />}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div style={s.bottom}>
        {/* Online indicator */}
        <div style={s.onlineDot} title="Connected" />

        {/* Avatar */}
        <div style={s.avatar} title={user?.name}>
          {user?.name?.[0]?.toUpperCase() || 'A'}
        </div>

        {/* Logout */}
        <button onClick={logout} title="Sign out" style={s.logoutBtn}>
          <LogoutIcon />
        </button>
      </div>
    </div>
  );
}

const WaIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="white"/>
    <path d="M5.077 18.347l.892-3.244a8.357 8.357 0 01-1.12-4.232C4.852 6.26 8.113 3 12.124 3c1.948.001 3.778.76 5.151 2.138a7.247 7.247 0 012.124 5.155c-.002 4.012-3.263 7.272-7.272 7.272a7.266 7.266 0 01-3.475-.883l-3.575.865z" stroke="white" strokeWidth="1.5" fill="none"/>
  </svg>
);
const ChatsIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>;
const ContactsIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const StatsIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const SettingsIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.8"/></svg>;
const LogoutIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;

const s = {
  root:{
    width:'62px', background:'#0f1623', borderRight:'1px solid #151f2e',
    display:'flex', flexDirection:'column', alignItems:'center',
    padding:'16px 0', flexShrink:0,
  },
  logoWrap:{ marginBottom:'24px' },
  logoIcon:{
    width:'40px', height:'40px', borderRadius:'11px',
    background:'linear-gradient(135deg,#22d3ee,#0891b2)',
    display:'flex', alignItems:'center', justifyContent:'center',
  },
  nav:{ display:'flex', flexDirection:'column', gap:'4px', flex:1, alignItems:'center' },
  navBtn:{
    width:'44px', height:'44px', borderRadius:'12px', border:'none',
    background:'transparent', color:'#3d5068', cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'center',
    transition:'all 0.15s', position:'relative',
  },
  navBtnActive:{
    background:'rgba(34,211,238,0.1)', color:'#22d3ee',
  },
  activeBar:{
    position:'absolute', left:'-1px', top:'50%', transform:'translateY(-50%)',
    width:'3px', height:'20px', background:'#22d3ee', borderRadius:'0 3px 3px 0',
  },
  bottom:{
    display:'flex', flexDirection:'column', alignItems:'center', gap:'12px',
  },
  onlineDot:{
    width:'8px', height:'8px', borderRadius:'50%', background:'#22c55e',
    boxShadow:'0 0 6px rgba(34,197,94,0.5)',
  },
  avatar:{
    width:'32px', height:'32px', borderRadius:'50%',
    background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:'12px', fontWeight:'700', color:'white', cursor:'default',
  },
  logoutBtn:{
    width:'36px', height:'36px', borderRadius:'10px', border:'none',
    background:'transparent', color:'#2d3f52', cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'center',
    transition:'all 0.15s',
  },
};
