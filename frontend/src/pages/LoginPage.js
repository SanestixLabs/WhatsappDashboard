import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';

const SanestixLogo = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
    <rect width="56" height="56" rx="14" fill="url(#loginLg1)"/>
    <rect width="56" height="56" rx="14" fill="url(#loginLg2)" opacity="0.6"/>
    <text x="28" y="38" textAnchor="middle" fontFamily="'Arial Black',sans-serif"
      fontWeight="900" fontSize="28" fill="white" letterSpacing="-1">S</text>
    <rect x="14" y="42" width="28" height="2.5" rx="1.25" fill="white" opacity="0.35"/>
    <defs>
      <linearGradient id="loginLg1" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00d4b8"/>
        <stop offset="1" stopColor="#0099a8"/>
      </linearGradient>
      <linearGradient id="loginLg2" x1="56" y1="0" x2="0" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#007a8c" stopOpacity="0"/>
        <stop offset="1" stopColor="#003d46" stopOpacity="0.5"/>
      </linearGradient>
    </defs>
  </svg>
);

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
        <div style={s.glow}/>
        <div style={s.glow2}/>
        <div style={s.leftContent}>
          <div style={s.brandRow}>
            <SanestixLogo size={48}/>
            <div>
              <div style={s.brandName}>Sanestix Flow</div>
              <div style={s.brandTag}>WhatsApp Business Platform</div>
            </div>
          </div>
          <h1 style={s.headline}>Every conversation.<br/>Under control.</h1>
          <p style={s.sub}>Manage WhatsApp at scale — AI automation, real-time inbox, full message history and team collaboration.</p>
          <div style={s.pills}>
            {['AI Agent','Team Inbox','Canned Replies','Analytics','Transfer & Notes'].map(p => (
              <span key={p} style={s.pill}>
                <span style={{color:'#00d4b8',marginRight:'5px'}}>✓</span>{p}
              </span>
            ))}
          </div>
          <div style={s.statsRow}>
            {[['∞','Messages'],['AI','Powered'],['24/7','Uptime']].map(([v,l]) => (
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
            <SanestixLogo size={42}/>
            <div>
              <h2 style={s.cardTitle}>Welcome back</h2>
              <p style={s.cardSub}>Sign in to your workspace</p>
            </div>
          </div>

          {error && <div style={s.err}><ErrIcon/>{error}</div>}

          <form onSubmit={handleSubmit} style={s.form}>
            <Field label="Email" icon={<MailIcon/>}>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                required placeholder="you@company.com" style={s.input}
                onFocus={e=>e.target.style.borderColor='rgba(0,212,184,0.5)'}
                onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.07)'}/>
            </Field>
            <Field label="Password" icon={<LockIcon/>}>
              <input type={showPass?'text':'password'} value={password}
                onChange={e=>setPassword(e.target.value)} required
                placeholder="••••••••" style={{...s.input,paddingRight:'42px'}}
                onFocus={e=>e.target.style.borderColor='rgba(0,212,184,0.5)'}
                onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.07)'}/>
              <button type="button" onClick={()=>setShowPass(!showPass)} style={s.eyeBtn}>
                {showPass ? <EyeOffIcon/> : <EyeIcon/>}
              </button>
            </Field>
            <button type="submit" disabled={loading}
              style={{...s.btn, opacity:loading?0.7:1, cursor:loading?'not-allowed':'pointer'}}>
              {loading ? <><Spinner/>Signing in...</> : 'Sign in →'}
            </button>
          </form>
          <p style={s.signupLink}>Don't have a workspace? <Link to="/signup" style={{color:'#00d4b8',textDecoration:'none',fontWeight:600}}>Create one free →</Link></p>
          <p style={s.copy}>© {new Date().getFullYear()} Sanestix · Internal use only</p>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, icon, children }) => (
  <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
    <label style={s.label}>{label}</label>
    <div style={{position:'relative',display:'flex',alignItems:'center'}}>
      <span style={s.fieldIcon}>{icon}</span>
      {children}
    </div>
  </div>
);

const MailIcon  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z" stroke="#3a5068" strokeWidth="1.5"/><path d="M2 6l10 7 10-7" stroke="#3a5068" strokeWidth="1.5"/></svg>;
const LockIcon  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#3a5068" strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#3a5068" strokeWidth="1.5"/></svg>;
const EyeIcon   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#3a5068" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="#3a5068" strokeWidth="1.5"/></svg>;
const EyeOffIcon= () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="#3a5068" strokeWidth="1.5" strokeLinecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="#3a5068" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const ErrIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}><circle cx="12" cy="12" r="10" stroke="#f87171" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="#f87171" strokeWidth="2" strokeLinecap="round"/></svg>;
const Spinner   = () => <span style={{width:'14px',height:'14px',border:'2px solid rgba(0,0,0,0.15)',borderTopColor:'#070b11',borderRadius:'50%',display:'inline-block',animation:'spin 0.8s linear infinite',marginRight:'8px'}}/>;

const s = {
  root:{ display:'flex', height:'100vh', background:'#070b11', overflow:'hidden' },
  left:{ flex:1, position:'relative', overflow:'hidden', background:'linear-gradient(145deg,#060910 0%,#0b1520 60%,#071018 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'60px', borderRight:'1px solid rgba(255,255,255,0.04)' },
  glow:{ position:'absolute', width:'700px', height:'700px', borderRadius:'50%', background:'radial-gradient(circle,rgba(0,212,184,0.07) 0%,transparent 60%)', top:'50%', left:'40%', transform:'translate(-50%,-50%)', pointerEvents:'none' },
  glow2:{ position:'absolute', width:'400px', height:'400px', borderRadius:'50%', background:'radial-gradient(circle,rgba(0,153,168,0.05) 0%,transparent 65%)', top:'30%', left:'60%', transform:'translate(-50%,-50%)', pointerEvents:'none' },
  leftContent:{ position:'relative', zIndex:1, maxWidth:'440px' },
  brandRow:{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'44px' },
  brandName:{ fontSize:'20px', fontWeight:'800', color:'#e9edef', letterSpacing:'-0.3px', lineHeight:1.2 },
  brandTag:{ fontSize:'12px', color:'#00d4b8', fontWeight:'500', opacity:0.8, marginTop:'2px' },
  headline:{ fontSize:'40px', fontWeight:'800', color:'#e9edef', lineHeight:1.15, letterSpacing:'-0.04em', marginBottom:'18px' },
  sub:{ fontSize:'14px', color:'#3a5068', lineHeight:1.75, marginBottom:'32px' },
  pills:{ display:'flex', flexWrap:'wrap', gap:'8px', marginBottom:'40px' },
  pill:{ background:'rgba(0,212,184,0.06)', border:'1px solid rgba(0,212,184,0.15)', borderRadius:'20px', padding:'5px 12px', fontSize:'12px', fontWeight:'500', color:'#8696a0' },
  statsRow:{ display:'flex', gap:'36px' },
  stat:{ display:'flex', flexDirection:'column', gap:'2px' },
  statVal:{ fontSize:'24px', fontWeight:'800', color:'#00d4b8' },
  statLabel:{ fontSize:'10px', color:'#2a3a44', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:'600' },
  right:{ width:'460px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px', background:'#070b11' },
  card:{ width:'100%', maxWidth:'360px' },
  cardTop:{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'32px' },
  cardTitle:{ fontSize:'22px', fontWeight:'700', color:'#e9edef', letterSpacing:'-0.02em', margin:0 },
  cardSub:{ fontSize:'13px', color:'#3a5068', margin:0, marginTop:'3px' },
  err:{ display:'flex', alignItems:'center', gap:'8px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'10px', padding:'10px 14px', fontSize:'13px', color:'#f87171', marginBottom:'20px' },
  form:{ display:'flex', flexDirection:'column', gap:'18px' },
  label:{ fontSize:'11px', fontWeight:'700', color:'#3a5068', textTransform:'uppercase', letterSpacing:'0.07em' },
  fieldIcon:{ position:'absolute', left:'13px', display:'flex', alignItems:'center', pointerEvents:'none', zIndex:1 },
  input:{ width:'100%', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'10px', padding:'11px 14px 11px 38px', fontSize:'14px', color:'#e9edef', outline:'none', transition:'border-color 0.15s', boxSizing:'border-box' },
  eyeBtn:{ position:'absolute', right:'12px', background:'none', border:'none', cursor:'pointer', padding:'4px', display:'flex', alignItems:'center' },
  btn:{ width:'100%', background:'linear-gradient(135deg,#00d4b8,#00a898)', border:'none', borderRadius:'10px', padding:'13px', fontSize:'15px', fontWeight:'700', color:'#070b11', display:'flex', alignItems:'center', justifyContent:'center', transition:'opacity 0.15s', marginTop:'4px' },
  copy:{ fontSize:'11px', color:'#1a2e42', textAlign:'center', marginTop:'28px' },
  signupLink:{ fontSize:'13px', color:'#3a5068', textAlign:'center', marginTop:'16px' },
};
