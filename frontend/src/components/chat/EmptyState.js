import React from 'react';

const SanestixLogo = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
    <rect width="56" height="56" rx="14" fill="url(#lg1)"/>
    <rect width="56" height="56" rx="14" fill="url(#lg2)" opacity="0.6"/>
    <text x="28" y="38" textAnchor="middle" fontFamily="'Arial Black',sans-serif"
      fontWeight="900" fontSize="28" fill="white" letterSpacing="-1">S</text>
    <rect x="14" y="42" width="28" height="2.5" rx="1.25" fill="white" opacity="0.35"/>
    <defs>
      <linearGradient id="lg1" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00d4b8"/>
        <stop offset="1" stopColor="#0099a8"/>
      </linearGradient>
      <linearGradient id="lg2" x1="56" y1="0" x2="0" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#007a8c" stopOpacity="0"/>
        <stop offset="1" stopColor="#003d46" stopOpacity="0.5"/>
      </linearGradient>
    </defs>
  </svg>
);

export function EmptyState() {
  return (
    <div style={s.root}>
      <div style={s.bgGlow}/>
      <div style={s.bgGlow2}/>
      <div style={s.content}>
        <div style={s.logoWrap}>
          <SanestixLogo size={64}/>
          <div style={s.logoPulse}/>
        </div>
        <h2 style={s.title}>Sanestix Flow</h2>
        <p style={s.sub}>WhatsApp Business Platform</p>
        <div style={s.divider}/>
        <p style={s.hint}>Select a conversation to start messaging</p>
        <div style={s.encryptNote}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3a5068" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          <span>End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
}

export default EmptyState;

const s = {
  root:{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0b141a', position:'relative', overflow:'hidden' },
  bgGlow:{ position:'absolute', width:'500px', height:'500px', borderRadius:'50%', background:'radial-gradient(circle,rgba(0,212,184,0.05) 0%,transparent 65%)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', pointerEvents:'none' },
  bgGlow2:{ position:'absolute', width:'300px', height:'300px', borderRadius:'50%', background:'radial-gradient(circle,rgba(0,212,184,0.04) 0%,transparent 70%)', top:'40%', left:'45%', transform:'translate(-50%,-50%)', pointerEvents:'none' },
  content:{ display:'flex', flexDirection:'column', alignItems:'center', position:'relative', zIndex:1 },
  logoWrap:{ position:'relative', marginBottom:'20px' },
  logoPulse:{ position:'absolute', inset:'-8px', borderRadius:'22px', background:'rgba(0,212,184,0.06)', border:'1px solid rgba(0,212,184,0.12)', animation:'pulse 3s ease-in-out infinite' },
  title:{ fontSize:'22px', fontWeight:'800', color:'#e9edef', letterSpacing:'-0.5px', margin:'0 0 6px' },
  sub:{ fontSize:'13px', color:'#00d4b8', fontWeight:'500', letterSpacing:'0.02em', margin:'0 0 20px', opacity:0.8 },
  divider:{ width:'32px', height:'2px', background:'linear-gradient(90deg,transparent,rgba(0,212,184,0.3),transparent)', marginBottom:'16px' },
  hint:{ fontSize:'13px', color:'#536471', margin:'0 0 20px' },
  encryptNote:{ display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', color:'#3a5068' },
};
