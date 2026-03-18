import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [invite, setInvite] = useState(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!token) { setError('Invalid invite link'); setLoading(false); return; }
    api.get(`/team/invites/validate/${token}`)
      .then(res => { setInvite(res.data); setLoading(false); })
      .catch(() => { setError('Invite expired or invalid'); setLoading(false); });
  }, [token]);

  const handleSubmit = async () => {
    if (!name || !password) return toast.error('All fields required');
    if (password.length < 6) return toast.error('Password min 6 characters');
    setSubmitting(true);
    try {
      await api.post('/team/invites/accept', { token, name, password });
      toast.success('Account created! Please login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create account');
    }
    setSubmitting(false);
  };

  const s = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050810', fontFamily: "'Urbanist','Segoe UI',sans-serif", padding: '20px', position: 'relative', overflow: 'hidden' },
    bgGrid: { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: 'linear-gradient(rgba(0,212,184,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,184,.018) 1px,transparent 1px)', backgroundSize: '64px 64px' },
    orb1: { position: 'fixed', width: '500px', height: '500px', borderRadius: '50%', background: 'rgba(0,212,184,0.04)', filter: 'blur(100px)', top: '-100px', left: '-100px', pointerEvents: 'none', zIndex: 0 },
    orb2: { position: 'fixed', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(59,130,246,0.03)', filter: 'blur(100px)', bottom: '-100px', right: '-100px', pointerEvents: 'none', zIndex: 0 },
    card: { position: 'relative', zIndex: 1, background: 'rgba(9,14,26,0.95)', border: '1px solid rgba(0,212,184,0.15)', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '420px', boxShadow: '0 0 60px rgba(0,212,184,0.06),0 24px 48px rgba(0,0,0,0.4)' },
    logoRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' },
    logoBox: { width: '38px', height: '38px', borderRadius: '10px', background: '#070b11', border: '1px solid rgba(0,212,184,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', boxShadow: '0 0 16px rgba(0,212,184,0.1)' },
    logoS: { fontSize: '18px', fontWeight: 900, color: '#fff', lineHeight: 1 },
    logoLine: { width: '12px', height: '2px', background: 'linear-gradient(90deg,#00d4b8,#00a884)', borderRadius: '2px' },
    brandName: { fontSize: '14px', fontWeight: 800, color: '#edf2f8', letterSpacing: '-0.3px' },
    brandSub: { fontSize: '9px', color: '#3a5270', letterSpacing: '0.1em', textTransform: 'uppercase' },
    divider: { height: '1px', background: 'linear-gradient(90deg,transparent,rgba(0,212,184,0.15),transparent)', marginBottom: '28px' },
    badge: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '100px', background: 'rgba(0,212,184,0.08)', border: '1px solid rgba(0,212,184,0.2)', fontSize: '10px', fontWeight: 700, color: '#00d4b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' },
    dot: { width: '5px', height: '5px', borderRadius: '50%', background: '#00d4b8' },
    title: { fontSize: '26px', fontWeight: 900, color: '#edf2f8', letterSpacing: '-0.8px', marginBottom: '6px' },
    subtitle: { fontSize: '13px', color: '#7d99b5', marginBottom: '28px', lineHeight: 1.6 },
    roleChip: { display: 'inline-block', padding: '2px 8px', borderRadius: '6px', background: 'rgba(0,212,184,0.12)', color: '#00d4b8', fontSize: '12px', fontWeight: 700, textTransform: 'capitalize' },
    label: { display: 'block', fontSize: '11px', fontWeight: 700, color: '#7d99b5', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '7px' },
    inputWrap: { position: 'relative', marginBottom: '16px' },
    input: { width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '11px 14px', fontSize: '13px', color: '#edf2f8', outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit' },
    eyeBtn: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#3a5270', fontSize: '14px', padding: '0' },
    btn: { width: '100%', padding: '13px', background: 'linear-gradient(135deg,#00d4b8,#00a884)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginTop: '8px', letterSpacing: '0.02em' },
    btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
    backLink: { display: 'block', textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#3a5270', cursor: 'pointer', textDecoration: 'none' },
    errorCard: { position: 'relative', zIndex: 1, background: 'rgba(9,14,26,0.95)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '380px', textAlign: 'center' },
    errorIcon: { fontSize: '40px', marginBottom: '16px' },
    errorText: { color: '#fb7185', fontWeight: 700, fontSize: '16px', marginBottom: '8px' },
    errorSub: { color: '#7d99b5', fontSize: '13px', marginBottom: '24px' },
    backBtn: { padding: '10px 24px', borderRadius: '8px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#fb7185', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
  };

  if (loading) return (
    <div style={s.page}>
      <div style={s.bgGrid} />
      <div style={{ ...s.card, textAlign: 'center' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(0,212,184,0.2)', borderTopColor: '#00d4b8', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
        <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
        <p style={{ color: '#7d99b5', fontSize: '14px' }}>Validating invite...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={s.page}>
      <div style={s.bgGrid} />
      <div style={s.errorCard}>
        <div style={s.errorIcon}>⚠️</div>
        <p style={s.errorText}>{error}</p>
        <p style={s.errorSub}>This invite link may have expired or already been used.</p>
        <button onClick={() => navigate('/login')} style={s.backBtn}>Back to Login</button>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.bgGrid} />
      <div style={s.orb1} />
      <div style={s.orb2} />
      <div style={s.card}>
        <div style={s.logoRow}>
          <div style={s.logoBox}>
            <span style={s.logoS}>S</span>
            <div style={s.logoLine} />
          </div>
          <div>
            <div style={s.brandName}>Sanestix Flow</div>
            <div style={s.brandSub}>Team Workspace</div>
          </div>
        </div>
        <div style={s.divider} />
        <div style={s.badge}><div style={s.dot} /> You are invited</div>
        <h1 style={s.title}>Create your account</h1>
        <p style={s.subtitle}>
          Joining as <span style={s.roleChip}>{invite?.role}</span> · {invite?.email}
        </p>
        <div style={s.inputWrap}>
          <label style={s.label}>Your Name</label>
          <input style={s.input} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
            onFocus={e => e.target.style.borderColor='rgba(0,212,184,0.4)'}
            onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'} />
        </div>
        <div style={s.inputWrap}>
          <label style={s.label}>Password</label>
          <input style={{ ...s.input, paddingRight: '40px' }} type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters"
            onFocus={e => e.target.style.borderColor='rgba(0,212,184,0.4)'}
            onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'} />
          <button style={s.eyeBtn} onClick={() => setShowPass(!showPass)}>{showPass ? '🙈' : '👁️'}</button>
        </div>
        <button onClick={handleSubmit} disabled={submitting} style={{ ...s.btn, ...(submitting ? s.btnDisabled : {}) }}>
          {submitting ? 'Creating account...' : 'Create Account →'}
        </button>
        <a style={s.backLink} onClick={() => navigate('/login')}>Already have an account? Login</a>
      </div>
    </div>
  );
}
