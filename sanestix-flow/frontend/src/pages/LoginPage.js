import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) navigate('/');
  };

  return (
    <div style={s.root}>
      {/* Left branding panel */}
      <div style={s.left}>
        <div style={s.glow} />
        <div style={s.leftContent}>
          <div style={s.brandRow}>
            <div style={s.brandIcon}>
              <WaIcon />
            </div>
            <span style={s.brandName}>Sanestix Flow</span>
          </div>
          <h1 style={s.headline}>Every conversation.<br />Under control.</h1>
          <p style={s.sub}>Manage WhatsApp at scale — AI automation, real-time inbox, full message history.</p>
          <div style={s.pills}>
            {['AI Agent Toggle','Real-time Updates','Message History','Contact Management'].map(p => (
              <span key={p} style={s.pill}>{p}</span>
            ))}
          </div>
          <div style={s.statsRow}>
            {[['∞','Conversations'],['AI','Powered'],['24/7','Uptime']].map(([v,l]) => (
              <div key={l} style={s.stat}>
                <span style={s.statVal}>{v}</span>
                <span style={s.statLabel}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div style={s.right}>
        <div style={s.card}>
          <div style={s.cardTop}>
            <div style={s.cardIcon}><WaIcon size={22} /></div>
            <div>
              <h2 style={s.cardTitle}>Sign in</h2>
              <p style={s.cardSub}>Access your dashboard</p>
            </div>
          </div>

          {error && <div style={s.err}><ErrIcon />{error}</div>}

          <form onSubmit={handleSubmit} style={s.form}>
            <Field label="Email" icon={<MailIcon />}>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                required placeholder="admin@sanestix.com" style={s.input}
                onFocus={e=>e.target.style.borderColor='#22d3ee'}
                onBlur={e=>e.target.style.borderColor='#1e293b'} />
            </Field>

            <Field label="Password" icon={<LockIcon />}>
              <input type={showPass?'text':'password'} value={password}
                onChange={e=>setPassword(e.target.value)} required
                placeholder="••••••••" style={{...s.input, paddingRight:'42px'}}
                onFocus={e=>e.target.style.borderColor='#22d3ee'}
                onBlur={e=>e.target.style.borderColor='#1e293b'} />
              <button type="button" onClick={()=>setShowPass(!showPass)} style={s.eyeBtn}>
                {showPass ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </Field>

            <button type="submit" disabled={loading} style={{
              ...s.btn, opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}>
              {loading ? <><Spinner />Signing in...</> : 'Sign in →'}
            </button>
          </form>

          <p style={s.copy}>© {new Date().getFullYear()} Sanestix · Internal use only</p>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, icon, children }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
    <label style={s.label}>{label}</label>
    <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
      <span style={s.fieldIcon}>{icon}</span>
      {children}
    </div>
  </div>
);

const WaIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="white"/>
    <path d="M5.077 18.347l.892-3.244a8.357 8.357 0 01-1.12-4.232C4.852 6.26 8.113 3 12.124 3c1.948.001 3.778.76 5.151 2.138a7.247 7.247 0 012.124 5.155c-.002 4.012-3.263 7.272-7.272 7.272a7.266 7.266 0 01-3.475-.883l-3.575.865z" stroke="white" strokeWidth="1.5" fill="none"/>
  </svg>
);
const MailIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z" stroke="#475569" strokeWidth="1.5"/><path d="M2 6l10 7 10-7" stroke="#475569" strokeWidth="1.5"/></svg>;
const LockIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#475569" strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#475569" strokeWidth="1.5"/></svg>;
const EyeIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#475569" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="#475569" strokeWidth="1.5"/></svg>;
const EyeOffIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="#475569" strokeWidth="1.5" strokeLinecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="#475569" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const ErrIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}><circle cx="12" cy="12" r="10" stroke="#f87171" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="#f87171" strokeWidth="2" strokeLinecap="round"/></svg>;
const Spinner = () => <span style={{width:'14px',height:'14px',border:'2px solid rgba(0,0,0,0.2)',borderTopColor:'#0b0e14',borderRadius:'50%',display:'inline-block',animation:'spin 0.8s linear infinite',marginRight:'8px'}} />;

const s = {
  root:{ display:'flex', height:'100vh', background:'#0b0e14', overflow:'hidden' },
  left:{
    flex:1, position:'relative', overflow:'hidden',
    background:'linear-gradient(145deg,#060910 0%,#0d1520 60%,#091018 100%)',
    display:'flex', alignItems:'center', justifyContent:'center', padding:'60px',
    borderRight:'1px solid #0f1923',
  },
  glow:{
    position:'absolute', width:'600px', height:'600px', borderRadius:'50%',
    background:'radial-gradient(circle,rgba(34,211,238,0.07) 0%,transparent 65%)',
    top:'50%', left:'50%', transform:'translate(-50%,-50%)', pointerEvents:'none',
  },
  leftContent:{ position:'relative', zIndex:1, maxWidth:'440px' },
  brandRow:{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'44px' },
  brandIcon:{
    width:'44px', height:'44px', borderRadius:'12px',
    background:'linear-gradient(135deg,#22d3ee,#06b6d4)',
    display:'flex', alignItems:'center', justifyContent:'center',
  },
  brandName:{ fontSize:'18px', fontWeight:'700', color:'#f1f5f9', letterSpacing:'-0.01em' },
  headline:{
    fontSize:'38px', fontWeight:'800', color:'#f8fafc', lineHeight:1.15,
    letterSpacing:'-0.03em', marginBottom:'18px',
  },
  sub:{ fontSize:'15px', color:'#4b6076', lineHeight:1.7, marginBottom:'32px' },
  pills:{ display:'flex', flexWrap:'wrap', gap:'8px', marginBottom:'40px' },
  pill:{
    background:'rgba(34,211,238,0.07)', border:'1px solid rgba(34,211,238,0.15)',
    borderRadius:'20px', padding:'5px 12px', fontSize:'12px', fontWeight:'500', color:'#22d3ee',
  },
  statsRow:{ display:'flex', gap:'32px' },
  stat:{ display:'flex', flexDirection:'column', gap:'2px' },
  statVal:{ fontSize:'22px', fontWeight:'800', color:'#22d3ee' },
  statLabel:{ fontSize:'11px', color:'#334155', textTransform:'uppercase', letterSpacing:'0.06em' },
  right:{
    width:'460px', flexShrink:0, display:'flex', alignItems:'center',
    justifyContent:'center', padding:'40px', background:'#0b0e14',
  },
  card:{ width:'100%', maxWidth:'360px' },
  cardTop:{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'32px' },
  cardIcon:{
    width:'50px', height:'50px', borderRadius:'13px',
    background:'linear-gradient(135deg,#22d3ee,#0891b2)',
    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
  },
  cardTitle:{ fontSize:'22px', fontWeight:'700', color:'#f1f5f9', letterSpacing:'-0.02em', margin:0 },
  cardSub:{ fontSize:'13px', color:'#334155', margin:0, marginTop:'2px' },
  err:{
    display:'flex', alignItems:'center', gap:'8px',
    background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
    borderRadius:'10px', padding:'10px 14px', fontSize:'13px', color:'#f87171',
    marginBottom:'20px',
  },
  form:{ display:'flex', flexDirection:'column', gap:'18px' },
  label:{ fontSize:'11px', fontWeight:'600', color:'#475569', textTransform:'uppercase', letterSpacing:'0.06em' },
  fieldIcon:{ position:'absolute', left:'13px', display:'flex', alignItems:'center', pointerEvents:'none', zIndex:1 },
  input:{
    width:'100%', background:'#0f1623', border:'1px solid #1e293b',
    borderRadius:'10px', padding:'11px 14px 11px 38px',
    fontSize:'14px', color:'#f1f5f9', outline:'none',
    transition:'border-color 0.15s', boxSizing:'border-box',
  },
  eyeBtn:{
    position:'absolute', right:'12px', background:'none', border:'none',
    cursor:'pointer', padding:'4px', display:'flex', alignItems:'center',
  },
  btn:{
    width:'100%', background:'linear-gradient(135deg,#22d3ee,#0891b2)',
    border:'none', borderRadius:'10px', padding:'13px',
    fontSize:'15px', fontWeight:'600', color:'#020617',
    display:'flex', alignItems:'center', justifyContent:'center',
    transition:'opacity 0.15s', marginTop:'4px',
  },
  copy:{ fontSize:'11px', color:'#1e293b', textAlign:'center', marginTop:'28px' },
};
