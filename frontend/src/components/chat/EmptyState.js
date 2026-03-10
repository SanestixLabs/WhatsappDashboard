import React from 'react';
export function EmptyState() {
  return (
    <div style={s.root}>
      <div style={s.iconWrap}>
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <circle cx="30" cy="30" r="30" fill="rgba(0,168,132,0.1)"/>
          <path d="M30 12C20.06 12 12 20.06 12 30c0 3.18.84 6.16 2.3 8.74L12 48l9.52-2.26A17.9 17.9 0 0030 48c9.94 0 18-8.06 18-18S39.94 12 30 12z" fill="#00a884" opacity="0.9"/>
          <path d="M24 31c0-.55.45-1 1-1h10c.55 0 1 .45 1 1v5c0 .55-.45 1-1 1H25c-.55 0-1-.45-1-1v-5z" fill="white" opacity="0.9"/>
          <path d="M27 30v-2a3 3 0 016 0v2" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.9"/>
          <circle cx="30" cy="33.5" r="1" fill="#00a884"/>
        </svg>
      </div>
      <h2 style={s.title}>Sanestix Flow</h2>
      <p style={s.sub}>Select a conversation to start chatting</p>
      <div style={s.encryptNote}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#536471" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        <span>Your personal messages are end-to-end encrypted</span>
      </div>
    </div>
  );
}
export default EmptyState;
const s={
  root:{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#0b141a',gap:'10px'},
  iconWrap:{marginBottom:'4px'},
  title:{fontSize:'20px',fontWeight:'700',color:'#e9edef',letterSpacing:'-.3px'},
  sub:{fontSize:'13px',color:'#8696a0'},
  encryptNote:{display:'flex',alignItems:'center',gap:'5px',fontSize:'11px',color:'#536471',marginTop:'8px'},
};
