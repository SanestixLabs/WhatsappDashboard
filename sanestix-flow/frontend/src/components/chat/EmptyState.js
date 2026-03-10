import React from 'react';

export default function EmptyState() {
  return (
    <div style={s.root}>
      <div style={s.logoWrap}>
        <div style={s.logo}>
          <span style={s.logoS}>S</span>
          <div style={s.logoLine}/>
        </div>
      </div>
      <h2 style={s.title}>Sanestix Flow</h2>
      <p style={s.sub}>Select a conversation to start chatting</p>
      <div style={s.pills}>
        <span style={{...s.pill,color:'#00d4b8',borderColor:'rgba(0,212,184,.25)',background:'rgba(0,212,184,.06)'}}>⚡ AI-Powered</span>
        <span style={{...s.pill,color:'#3b82f6',borderColor:'rgba(59,130,246,.25)',background:'rgba(59,130,246,.06)'}}>💬 WhatsApp</span>
        <span style={{...s.pill,color:'#10b981',borderColor:'rgba(16,185,129,.25)',background:'rgba(16,185,129,.06)'}}>🤖 Automation</span>
      </div>
    </div>
  );
}

const s={
  root:{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#070b11',gap:'12px'},
  logoWrap:{marginBottom:'8px'},
  logo:{width:'60px',height:'60px',borderRadius:'16px',background:'#070b11',border:'1px solid rgba(0,212,184,.25)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'4px',boxShadow:'0 0 30px rgba(0,212,184,.12)'},
  logoS:{fontFamily:"'Urbanist',sans-serif",fontWeight:900,fontSize:'30px',color:'white',letterSpacing:'-1px',lineHeight:1},
  logoLine:{width:'22px',height:'3px',background:'linear-gradient(90deg,#00d4b8,#00b8a0)',borderRadius:'2px'},
  title:{fontSize:'22px',fontWeight:'800',color:'#edf2f8',letterSpacing:'-.5px'},
  sub:{fontSize:'13px',color:'#3a5068'},
  pills:{display:'flex',gap:'8px',flexWrap:'wrap',justifyContent:'center',marginTop:'4px'},
  pill:{fontSize:'11px',fontWeight:'600',padding:'5px 12px',borderRadius:'20px',border:'1px solid'},
};
