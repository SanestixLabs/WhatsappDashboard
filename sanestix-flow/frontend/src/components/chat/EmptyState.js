import React from 'react';

export function EmptyState() {
  return (
    <div style={s.root}>
      <div style={s.glow} />
      <div style={s.content}>
        <div style={s.iconWrap}>
          <WaIcon />
        </div>
        <h3 style={s.title}>Sanestix Flow</h3>
        <p style={s.sub}>Select a conversation to start chatting,<br />or wait for new incoming messages.</p>
        <div style={s.hints}>
          <Hint icon={<BotIcon />} text="AI Agent auto-replies to customers" />
          <Hint icon={<ToggleIcon />} text="Toggle AI off to reply manually" />
          <Hint icon={<LiveIcon />} text="Messages update in real-time" />
        </div>
      </div>
    </div>
  );
}

const Hint = ({ icon, text }) => (
  <div style={s.hint}>
    <span style={s.hintIcon}>{icon}</span>
    <span style={s.hintText}>{text}</span>
  </div>
);

const WaIcon    = () => <svg width="52" height="52" viewBox="0 0 24 24" fill="none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#22d3ee"/><path d="M5.077 18.347l.892-3.244a8.357 8.357 0 01-1.12-4.232C4.852 6.26 8.113 3 12.124 3c1.948.001 3.778.76 5.151 2.138a7.247 7.247 0 012.124 5.155c-.002 4.012-3.263 7.272-7.272 7.272a7.266 7.266 0 01-3.475-.883l-3.575.865z" stroke="#22d3ee" strokeWidth="1.5" fill="none"/></svg>;
const BotIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M9 8V6a3 3 0 016 0v2M9 14h.01M15 14h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const ToggleIcon= () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="1" y="7" width="22" height="10" rx="5" stroke="currentColor" strokeWidth="1.5"/><circle cx="16" cy="12" r="3" fill="currentColor"/></svg>;
const LiveIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M6.34 6.34a8 8 0 000 11.32M17.66 6.34a8 8 0 010 11.32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;

const s = {
  root:{
    flex:1, display:'flex', alignItems:'center', justifyContent:'center',
    background:'#0b0f18', position:'relative', overflow:'hidden',
  },
  glow:{
    position:'absolute', width:'400px', height:'400px', borderRadius:'50%',
    background:'radial-gradient(circle,rgba(34,211,238,0.04) 0%,transparent 70%)',
    pointerEvents:'none',
  },
  content:{ textAlign:'center', position:'relative', zIndex:1, maxWidth:'340px' },
  iconWrap:{
    width:'80px', height:'80px', borderRadius:'24px',
    background:'rgba(34,211,238,0.07)', border:'1px solid rgba(34,211,238,0.12)',
    display:'flex', alignItems:'center', justifyContent:'center',
    margin:'0 auto 20px',
  },
  title:{ fontSize:'20px', fontWeight:'700', color:'#1e293b', marginBottom:'8px', letterSpacing:'-0.02em' },
  sub:{ fontSize:'13px', color:'#1e293b', lineHeight:1.7, marginBottom:'28px' },
  hints:{ display:'flex', flexDirection:'column', gap:'10px' },
  hint:{ display:'flex', alignItems:'center', gap:'10px', justifyContent:'center' },
  hintIcon:{ color:'#1e3a4a', display:'flex' },
  hintText:{ fontSize:'12px', color:'#1e3a4a' },
};
