import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ShopifyIcon = () => (
  <svg width="28" height="28" viewBox="0 0 50 50" fill="none">
    <rect width="50" height="50" rx="10" fill="#95BF47"/>
    <text x="25" y="34" textAnchor="middle" fontSize="22" fill="white" fontWeight="bold">S</text>
  </svg>
);
const CheckIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const LinkIcon   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
const UnlinkIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const LogIcon    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;

export default function IntegrationsSettings() {
  const [status,       setStatus]       = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [connecting,   setConnecting]   = useState(false);
  const [disconnecting,setDisconnecting]= useState(false);
  const [shop,         setShop]         = useState('');
  const [logs,         setLogs]         = useState([]);
  const [showLogs,     setShowLogs]     = useState(false);
  const [logsLoading,  setLogsLoading]  = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('shopify') === 'connected') {
      toast.success('Shopify connected successfully!');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('shopify') === 'error') {
      toast.error('Shopify connection failed: ' + params.get('message'));
      window.history.replaceState({}, '', window.location.pathname);
    }
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/shopify/oauth/status');
      setStatus(res.data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    let domain = shop.trim().toLowerCase();
    if (!domain) { toast.error('Enter your Shopify store domain'); return; }
    if (!domain.includes('.myshopify.com')) domain = `${domain}.myshopify.com`;
    try {
      setConnecting(true);
      const res = await api.get(`/shopify/oauth/install?shop=${domain}`);
      if (res.data.install_url) {
        window.location.href = res.data.install_url;
      } else {
        toast.error(res.data.error || 'Failed to get install URL');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Connection failed. Try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Shopify? Order notifications will stop.')) return;
    try {
      setDisconnecting(true);
      await api.delete('/shopify/oauth/disconnect');
      toast.success('Shopify disconnected');
      setStatus({ connected: false });
    } catch {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      setShowLogs(true);
      const res = await api.get('/shopify/logs?limit=20');
      setLogs(res.data.logs || []);
    } catch {
      toast.error('Failed to fetch logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const s = {
    page:  { padding: '32px 36px', maxWidth: '720px' },
    title: { fontSize: '18px', fontWeight: '700', color: '#e9edef', marginBottom: '4px' },
    sub:   { fontSize: '13px', color: '#536471', marginBottom: '32px' },
    card:  { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '24px', marginBottom: '16px' },
    row:   { display: 'flex', alignItems: 'center', gap: '16px' },
    badge: (ok) => ({ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: ok ? 'rgba(0,212,184,0.12)' : 'rgba(255,255,255,0.05)', color: ok ? '#00d4b8' : '#536471' }),
    label: { fontSize: '13px', fontWeight: '600', color: '#8696a0', marginBottom: '8px' },
    input: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', color: '#e9edef', fontSize: '13px', outline: 'none', boxSizing: 'border-box' },
    btn:   (c) => ({ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', background: c==='primary' ? '#00d4b8' : c==='danger' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.07)', color: c==='primary' ? '#000' : c==='danger' ? '#ef4444' : '#8696a0' }),
    dot:   (st) => ({ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: st==='processed' ? '#00d4b8' : st==='failed' ? '#ef4444' : '#536471' }),
  };

  if (loading) return <div style={{ ...s.page, color: '#536471', fontSize: '13px' }}>Loading integrations...</div>;

  return (
    <div style={s.page}>
      <div style={s.title}>Integrations</div>
      <div style={s.sub}>Connect your tools to automate WhatsApp notifications</div>

      {/* Shopify Card */}
      <div style={s.card}>
        <div style={{ ...s.row, marginBottom: '20px' }}>
          <ShopifyIcon />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#e9edef' }}>Shopify</div>
            <div style={{ fontSize: '12px', color: '#536471', marginTop: '2px' }}>Auto-send WhatsApp notifications for orders, shipping & cancellations</div>
          </div>
          <div style={s.badge(status?.connected)}>
            {status?.connected ? <><CheckIcon /> Connected</> : 'Not connected'}
          </div>
        </div>

        {status?.connected ? (
          <>
            <div style={{ background: 'rgba(0,212,184,0.05)', border: '1px solid rgba(0,212,184,0.15)', borderRadius: '8px', padding: '14px 18px', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#00d4b8' }}>🛒 {status.shop_domain}</div>
              <div style={{ fontSize: '11px', color: '#3a5068', marginTop: '3px' }}>
                Connected {new Date(status.created_at).toLocaleDateString()} · {status.scope?.split(',').length || 0} permissions granted
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              {['Order confirmed → WA message sent','Order shipped → WA message sent','Order cancelled → WA message sent'].map((f,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'5px 0', fontSize:'12px', color:'#8696a0' }}>
                  <div style={{ color:'#00d4b8', display:'flex' }}><CheckIcon /></div>{f}
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button style={s.btn('ghost')} onClick={fetchLogs}><LogIcon /> View Logs</button>
              <button style={s.btn('danger')} onClick={handleDisconnect} disabled={disconnecting}>
                <UnlinkIcon /> {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '16px' }}>
              <div style={s.label}>Your Shopify store domain</div>
              <input style={s.input} placeholder="yourstore.myshopify.com" value={shop}
                onChange={e => setShop(e.target.value)} onKeyDown={e => e.key==='Enter' && handleConnect()} />
              <div style={{ fontSize:'11px', color:'#3a5068', marginTop:'6px' }}>You'll be redirected to Shopify to approve permissions</div>
            </div>
            <button style={s.btn('primary')} onClick={handleConnect} disabled={connecting}>
              <LinkIcon /> {connecting ? 'Redirecting...' : 'Connect Shopify'}
            </button>
          </>
        )}
      </div>

      {/* Coming Soon */}
      {[
        { name:'WooCommerce',   desc:'Sync orders from WordPress stores',      color:'#7f54b3' },
        { name:'HubSpot',       desc:'Sync contacts and deals with CRM',       color:'#ff7a59' },
        { name:'Google Sheets', desc:'Export contacts and logs automatically', color:'#34a853' },
        { name:'Zapier',        desc:'Connect 5000+ apps via automation',      color:'#ff4a00' },
      ].map(int => (
        <div key={int.name} style={{ ...s.card, opacity: 0.5 }}>
          <div style={s.row}>
            <div style={{ width:'28px', height:'28px', borderRadius:'6px', background:int.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'800', color:'#fff' }}>{int.name[0]}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'14px', fontWeight:'600', color:'#8696a0' }}>{int.name}</div>
              <div style={{ fontSize:'12px', color:'#3a5068' }}>{int.desc}</div>
            </div>
            <div style={{ fontSize:'10px', fontWeight:'700', color:'#3a5068', background:'rgba(255,255,255,0.04)', padding:'3px 8px', borderRadius:'4px' }}>COMING SOON</div>
          </div>
        </div>
      ))}

      {/* Logs Modal */}
      {showLogs && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
          <div style={{ background:'#0d1117', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'14px', width:'600px', maxHeight:'70vh', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:'14px', fontWeight:'700', color:'#e9edef' }}>Webhook Delivery Logs</div>
              <button onClick={() => setShowLogs(false)} style={{ background:'none', border:'none', color:'#536471', cursor:'pointer', fontSize:'20px' }}>×</button>
            </div>
            <div style={{ overflowY:'auto', padding:'8px 24px' }}>
              {logsLoading ? (
                <div style={{ padding:'20px 0', color:'#536471', fontSize:'13px' }}>Loading logs...</div>
              ) : logs.length === 0 ? (
                <div style={{ padding:'20px 0', color:'#536471', fontSize:'13px' }}>No logs yet. Logs appear when Shopify sends webhook events.</div>
              ) : logs.map(log => (
                <div key={log.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:'12px' }}>
                  <div style={s.dot(log.status)} />
                  <div style={{ flex:1, color:'#8696a0' }}>{log.event}</div>
                  <div style={{ color: log.wa_sent ? '#00d4b8' : '#536471' }}>{log.wa_sent ? '✓ WA sent' : '— no WA'}</div>
                  <div style={{ color:'#3a5068', minWidth:'140px', textAlign:'right' }}>{new Date(log.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
