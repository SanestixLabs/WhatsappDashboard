import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const T = {
  bg:'#070b11',bg2:'#0a1520',bg3:'#0f1e2e',bg4:'#162032',
  border:'rgba(255,255,255,0.07)',border2:'rgba(255,255,255,0.12)',
  text:'#edf2f8',text2:'#7a95af',text3:'#3a5068',
  teal:'#00d4b8',tealDim:'rgba(0,212,184,0.12)',tealBorder:'rgba(0,212,184,0.3)',
  red:'#f43f5e',redDim:'rgba(244,63,94,0.12)',redBorder:'rgba(244,63,94,0.3)',
  green:'#10b981',greenDim:'rgba(16,185,129,0.12)',greenBorder:'rgba(16,185,129,0.3)',
  yellow:'#f59e0b',yellowDim:'rgba(245,158,11,0.12)',yellowBorder:'rgba(245,158,11,0.3)',
  purple:'#8b5cf6',purpleDim:'rgba(139,92,246,0.12)',
};
const card = { background:T.bg2, border:'1px solid '+T.border, borderRadius:12 };
const inp  = { width:'100%', boxSizing:'border-box', padding:'9px 12px', background:T.bg3, border:'1px solid '+T.border2, borderRadius:8, fontSize:14, color:T.text, outline:'none', fontFamily:'inherit' };
const btnP = { padding:'9px 18px', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', border:'none', fontFamily:'inherit', background:'linear-gradient(135deg,#00d4b8,#00b8a0)', color:'#070b11' };
const btnG = { padding:'9px 18px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', background:'transparent', border:'1px solid '+T.border2, color:T.text2 };
const btnD = { padding:'9px 18px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', background:T.redDim, color:T.red };

// ── SVG Icons ─────────────────────────────────────────────────────
const Icons = {
  Shopify: () => (
    <svg width="22" height="22" viewBox="0 0 109.5 124.5" fill="#95BF47">
      <path d="M74.7,14.8c0,0-1.4,0.4-3.7,1.1c-0.4-1.3-1-2.8-1.8-4.4c-2.6-5-6.5-7.7-11.1-7.7c0,0,0,0,0,0 c-0.3,0-0.6,0-1,0.1c-0.1-0.2-0.3-0.3-0.4-0.5c-2-2.2-4.6-3.2-7.7-3.1C43,0.6,36.2,5.2,30.9,13.5c-3.7,5.8-6.5,13.1-7.3,18.8 c-7.5,2.3-12.7,3.9-12.8,4c-3.8,1.2-3.9,1.3-4.4,4.9C6,44,0,90.6,0,90.6l57.8,10.1V0C57.8,0,74.7,14.8,74.7,14.8z"/>
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00d4b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Package: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  Cart: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
    </svg>
  ),
  X: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Edit: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Save: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
    </svg>
  ),
  Refresh: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
    </svg>
  ),
  Link: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  ),
  MessageSquare: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
  Activity: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  Eye: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
};

const TEMPLATE_META = {
  shopify_order_confirmed: {
    label: 'Order Confirmed',
    icon: Icons.Cart,
    color: T.teal,
    colorDim: T.tealDim,
    colorBorder: T.tealBorder,
    desc: 'Sent when Shopify creates a new order',
    vars: ['{{customer_name}}', '{{order_number}}', '{{items_list}}', '{{total}}'],
  },
  shopify_order_shipped: {
    label: 'Order Shipped',
    icon: Icons.Package,
    color: T.purple,
    colorDim: T.purpleDim,
    colorBorder: 'rgba(139,92,246,0.3)',
    desc: 'Sent when order is fulfilled / shipped',
    vars: ['{{customer_name}}', '{{order_number}}', '{{tracking_line}}'],
  },
  shopify_order_cancelled: {
    label: 'Order Cancelled',
    icon: Icons.X,
    color: T.red,
    colorDim: T.redDim,
    colorBorder: T.redBorder,
    desc: 'Sent when an order is cancelled',
    vars: ['{{customer_name}}', '{{order_number}}', '{{total}}'],
  },
};

const EVENT_LABELS = {
  'orders/create':    { label:'Order Created',   color:T.teal,   icon: Icons.Cart },
  'orders/fulfilled': { label:'Order Shipped',   color:T.purple, icon: Icons.Package },
  'orders/cancelled': { label:'Order Cancelled', color:T.red,    icon: Icons.X },
  'ignored':          { label:'Ignored',         color:T.text3,  icon: null },
};

// ── Stat Card ─────────────────────────────────────────────────────
function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div style={{ ...card, padding:'16px 20px', borderLeft:'3px solid '+color }}>
      <div style={{ fontSize:26, fontWeight:800, color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:11, color:T.text2, fontWeight:600, marginTop:6, display:'flex', alignItems:'center', gap:5 }}>
        {Icon && <span style={{ color }}><Icon /></span>}{label}
      </div>
    </div>
  );
}

// ── Connection Panel ──────────────────────────────────────────────
function ConnectionPanel({ status, onDisconnected }) {
  const [shop, setShop] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleConnect = async () => {
    let domain = shop.trim().toLowerCase();
    if (!domain) { toast.error('Enter your Shopify store domain'); return; }
    if (!domain.includes('.myshopify.com')) domain += '.myshopify.com';
    try {
      setConnecting(true);
      const res = await api.get('/shopify/oauth/install?shop=' + domain);
      if (res.data.install_url) window.location.href = res.data.install_url;
      else toast.error(res.data.error || 'Failed to get install URL');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Connection failed');
    } finally { setConnecting(false); }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Shopify? Order notifications will stop.')) return;
    try {
      setDisconnecting(true);
      await api.delete('/shopify/oauth/disconnect');
      toast.success('Shopify disconnected');
      onDisconnected();
    } catch { toast.error('Failed to disconnect'); }
    finally { setDisconnecting(false); }
  };

  if (status?.connected) return (
    <div style={{ ...card, padding:24, marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
        <div style={{ width:46, height:46, borderRadius:10, background:'#95BF47', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icons.Shopify />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:700, color:T.text }}>Shopify</div>
          <div style={{ fontSize:12, color:T.text2 }}>Connected to {status.shop_domain}</div>
        </div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:20, fontSize:11, fontWeight:700, background:T.tealDim, color:T.teal, border:'1px solid '+T.tealBorder }}>
          <Icons.Check /> Connected
        </div>
      </div>

      <div style={{ background:'rgba(0,212,184,0.05)', border:'1px solid '+T.tealBorder, borderRadius:10, padding:'14px 18px', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <Icons.Link />
          <span style={{ fontSize:14, fontWeight:700, color:T.teal }}>{status.shop_domain}</span>
        </div>
        <div style={{ fontSize:11, color:T.text3 }}>
          Connected {new Date(status.created_at).toLocaleDateString()} · {status.scope?.split(',').length || 0} permissions granted
        </div>
      </div>

      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:10, fontWeight:700, color:T.text3, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Active Automations</div>
        {[
          { icon: Icons.Cart,    color:T.teal,   label:'Order Confirmed', desc:'Sends order summary with items and total via WhatsApp' },
          { icon: Icons.Package, color:T.purple, label:'Order Shipped',   desc:'Sends shipping notification with tracking number if available' },
          { icon: Icons.X,       color:T.red,    label:'Order Cancelled', desc:'Sends cancellation notice with refund information' },
        ].map((a, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ width:34, height:34, borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', color:a.color, flexShrink:0 }}>
              <a.icon />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{a.label}</div>
              <div style={{ fontSize:12, color:T.text2 }}>{a.desc}</div>
            </div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, background:T.tealDim, color:T.teal }}>
              ● Active
            </div>
          </div>
        ))}
      </div>

      <button style={btnD} onClick={handleDisconnect} disabled={disconnecting}>
        {disconnecting ? 'Disconnecting...' : 'Disconnect Shopify'}
      </button>
    </div>
  );

  return (
    <div style={{ ...card, padding:24, marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
        <div style={{ width:46, height:46, borderRadius:10, background:'rgba(149,191,71,0.15)', border:'1px solid rgba(149,191,71,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icons.Shopify />
        </div>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:T.text }}>Connect Shopify</div>
          <div style={{ fontSize:12, color:T.text2 }}>Auto-send WhatsApp notifications for every order</div>
        </div>
      </div>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:600, color:T.text2, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Shopify Store Domain</div>
        <input style={inp} placeholder="yourstore.myshopify.com" value={shop}
          onChange={e => setShop(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleConnect()} />
        <div style={{ fontSize:11, color:T.text3, marginTop:5 }}>You'll be redirected to Shopify to approve permissions</div>
      </div>
      <button style={btnP} onClick={handleConnect} disabled={connecting}>
        {connecting ? 'Redirecting to Shopify...' : 'Connect Shopify'}
      </button>
    </div>
  );
}

// ── Template Editor Panel ─────────────────────────────────────────
function TemplatesPanel({ connected }) {
  const [templates, setTemplates] = useState({});
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(null); // template name
  const [draft, setDraft]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [preview, setPreview]     = useState(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/shopify/templates');
      const map = {};
      (res.data.templates || []).forEach(t => { map[t.name] = t; });
      setTemplates(map);
    } catch { toast.error('Failed to load templates'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (connected) fetchTemplates(); else setLoading(false); }, [connected, fetchTemplates]);

  const startEdit = (name) => {
    setEditing(name);
    setDraft(templates[name]?.body || '');
    setPreview(null);
  };

  const cancelEdit = () => { setEditing(null); setDraft(''); setPreview(null); };

  const saveTemplate = async () => {
    if (!draft.trim()) { toast.error('Template body cannot be empty'); return; }
    try {
      setSaving(true);
      const res = await api.put('/shopify/templates/' + editing, { body: draft });
      setTemplates(prev => ({ ...prev, [editing]: res.data }));
      toast.success('Template saved');
      cancelEdit();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const buildPreview = (body) => {
    return body
      .replace('{{customer_name}}', 'Ahmed Khan')
      .replace('{{order_number}}', '1042')
      .replace('{{items_list}}', '• Premium T-Shirt x2\n• Blue Cap x1')
      .replace('{{total}}', 'PKR 4,500.00')
      .replace('{{tracking_line}}', '*Tracking:* TRK-9923781\n');
  };

  if (!connected) return (
    <div style={{ ...card, padding:48, textAlign:'center' }}>
      <div style={{ color:T.text3, marginBottom:12, display:'flex', justifyContent:'center' }}><Icons.MessageSquare /></div>
      <div style={{ fontSize:14, fontWeight:600, color:T.text2, marginBottom:4 }}>Connect Shopify first</div>
      <div style={{ fontSize:12, color:T.text3 }}>Templates will appear here after connecting your store</div>
    </div>
  );

  if (loading) return <div style={{ padding:40, textAlign:'center', color:T.text2, fontSize:13 }}>Loading templates...</div>;

  return (
    <div style={{ maxHeight:'calc(100vh - 280px)', overflowY:'auto', paddingRight:4 }}>
      <div style={{ fontSize:13, color:T.text2, marginBottom:20, padding:'12px 16px', background:'rgba(0,212,184,0.05)', border:'1px solid '+T.tealBorder, borderRadius:10 }}>
        <strong style={{ color:T.teal }}>How it works:</strong> These templates are sent automatically via WhatsApp when Shopify triggers an order event. Use variables like <code style={{ background:T.bg3, padding:'1px 6px', borderRadius:4, fontSize:12 }}>{'{{customer_name}}'}</code> — they are replaced with real order data.
      </div>

      {Object.entries(TEMPLATE_META).map(([name, meta]) => {
        const tmpl = templates[name];
        const isEditing = editing === name;
        const Icon = meta.icon;

        return (
          <div key={name} style={{ ...card, marginBottom:16, overflow:'hidden' }}>
            {/* Header */}
            <div style={{ padding:'16px 20px', borderBottom:'1px solid '+T.border, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:8, background:meta.colorDim, border:'1px solid '+meta.colorBorder, display:'flex', alignItems:'center', justifyContent:'center', color:meta.color, flexShrink:0 }}>
                <Icon />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{meta.label}</div>
                <div style={{ fontSize:12, color:T.text2 }}>{meta.desc}</div>
              </div>
              {!isEditing && (
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setPreview(preview === name ? null : name)}
                    style={{ ...btnG, padding:'6px 12px', fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
                    <Icons.Eye /> {preview === name ? 'Hide' : 'Preview'}
                  </button>
                  <button onClick={() => startEdit(name)}
                    style={{ ...btnP, padding:'6px 12px', fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
                    <Icons.Edit /> Edit
                  </button>
                </div>
              )}
            </div>

            {/* Body */}
            <div style={{ padding:20 }}>
              {/* Variables */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
                {meta.vars.map(v => (
                  <span key={v} style={{ padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:600, background:meta.colorDim, color:meta.color, border:'1px solid '+meta.colorBorder, fontFamily:'monospace', cursor: isEditing ? 'pointer' : 'default' }}
                    onClick={() => isEditing && setDraft(d => d + v)}
                    title={isEditing ? 'Click to insert' : ''}>
                    {v}
                  </span>
                ))}
                {isEditing && <span style={{ fontSize:11, color:T.text3, alignSelf:'center', marginLeft:4 }}>← click to insert</span>}
              </div>

              {isEditing ? (
                <div>
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    style={{ ...inp, minHeight:180, resize:'vertical', fontFamily:'monospace', fontSize:13, lineHeight:1.7 }}
                    placeholder="Write your WhatsApp message here..."
                  />
                  <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:12 }}>
                    <button onClick={cancelEdit} style={btnG}>Cancel</button>
                    <button onClick={saveTemplate} disabled={saving}
                      style={{ ...btnP, display:'flex', alignItems:'center', gap:6 }}>
                      <Icons.Save />{saving ? 'Saving...' : 'Save Template'}
                    </button>
                  </div>
                </div>
              ) : preview === name ? (
                <div style={{ background:T.bg3, borderRadius:10, padding:16, border:'1px solid '+T.border }}>
                  <div style={{ fontSize:10, fontWeight:700, color:T.text3, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Preview (sample data)</div>
                  <pre style={{ fontFamily:'inherit', fontSize:13, color:T.text2, whiteSpace:'pre-wrap', lineHeight:1.7, margin:0 }}>
                    {tmpl ? buildPreview(tmpl.body) : 'No template saved yet'}
                  </pre>
                </div>
              ) : (
                <pre style={{ fontFamily:'monospace', fontSize:12, color:T.text3, whiteSpace:'pre-wrap', lineHeight:1.7, margin:0, maxHeight:120, overflow:'hidden', textOverflow:'ellipsis' }}>
                  {tmpl?.body || 'No template saved'}
                </pre>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Logs Panel ────────────────────────────────────────────────────
function LogsPanel({ connected }) {
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!connected) { setLoading(false); return; }
    fetchLogs();
  }, [connected]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/shopify/logs?limit=50');
      setLogs(res.data.logs || []);
    } catch { setLogs([]); }
    finally { setLoading(false); }
  };

  const filtered = filter ? logs.filter(l => l.event === filter) : logs;
  const stats = {
    total:   logs.length,
    sent:    logs.filter(l => l.wa_sent).length,
    failed:  logs.filter(l => l.status === 'failed').length,
    skipped: logs.filter(l => l.status === 'skipped').length,
  };

  if (!connected) return (
    <div style={{ ...card, padding:48, textAlign:'center' }}>
      <div style={{ color:T.text3, marginBottom:12, display:'flex', justifyContent:'center' }}><Icons.Activity /></div>
      <div style={{ fontSize:14, fontWeight:600, color:T.text2 }}>Connect Shopify to see logs</div>
    </div>
  );

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:12, marginBottom:20 }}>
        <StatCard label="Total Events"  value={stats.total}   color={T.teal}   icon={Icons.Activity} />
        <StatCard label="WA Sent"       value={stats.sent}    color={T.green}  icon={Icons.Check} />
        <StatCard label="Failed"        value={stats.failed}  color={T.red}    icon={Icons.X} />
        <StatCard label="Skipped"       value={stats.skipped} color={T.yellow} icon={Icons.Package} />
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        {['', 'orders/create', 'orders/fulfilled', 'orders/cancelled'].map(f => {
          const meta = f ? EVENT_LABELS[f] : null;
          return (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit',
                background: filter===f ? T.teal : T.bg3, color: filter===f ? '#070b11' : T.text2 }}>
              {f === '' ? 'All' : meta?.label || f}
            </button>
          );
        })}
        <button onClick={fetchLogs} style={{ ...btnG, padding:'5px 12px', fontSize:12, marginLeft:'auto', display:'flex', alignItems:'center', gap:5 }}>
          <Icons.Refresh /> Refresh
        </button>
      </div>

      <div style={{ ...card, overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:T.text2, fontSize:13 }}>Loading logs...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:48, textAlign:'center', color:T.text2, fontSize:13 }}>
            No webhook events yet. Place a test order in Shopify to see logs here.
          </div>
        ) : (
          <div style={{ overflowX:'auto', maxHeight:'calc(100vh - 380px)', overflowY:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:580 }}>
              <thead>
                <tr style={{ background:T.bg3 }}>
                  {['Event','Status','WA Sent','Error','Time'].map(h => (
                    <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:T.text2, textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid '+T.border, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => {
                  const ev = EVENT_LABELS[log.event] || { label:log.event, color:T.text3 };
                  const EvIcon = ev.icon;
                  return (
                    <tr key={log.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => e.currentTarget.style.background = T.bg3}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:'rgba(255,255,255,0.04)', color:ev.color }}>
                          {EvIcon && <EvIcon />}{ev.label}
                        </span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                          background: log.status==='processed' ? T.tealDim : log.status==='failed' ? T.redDim : T.yellowDim,
                          color:      log.status==='processed' ? T.teal    : log.status==='failed' ? T.red    : T.yellow }}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:13, color:log.wa_sent ? T.teal : T.text3, fontWeight:700 }}>
                        {log.wa_sent ? <span style={{ display:'flex', alignItems:'center', gap:4 }}><Icons.Check /> Sent</span> : '—'}
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:T.red, maxWidth:200 }}>
                        {log.error_message
                          ? <span title={log.error_message}>{log.error_message.substring(0,40)}{log.error_message.length>40?'...':''}</span>
                          : <span style={{ color:T.text3 }}>—</span>}
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:T.text3, whiteSpace:'nowrap' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ShopifyTab ───────────────────────────────────────────────
export default function ShopifyTab() {
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab,  setSubTab]  = useState('overview');

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
    } catch { setStatus({ connected: false }); }
    finally { setLoading(false); }
  };

  const SUBTABS = [
    { id:'overview',  label:'Overview',          icon: Icons.Shopify },
    { id:'templates', label:'Message Templates',  icon: Icons.MessageSquare },
    { id:'logs',      label:'Webhook Logs',       icon: Icons.Activity },
  ];

  if (loading) return <div style={{ padding:40, textAlign:'center', color:T.text2, fontSize:13 }}>Loading Shopify integration...</div>;

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:24, background:T.bg2, borderRadius:10, padding:4, width:'fit-content', border:'1px solid '+T.border, flexWrap:'wrap' }}>
        {SUBTABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              style={{ padding:'7px 18px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:600, fontSize:13, fontFamily:'inherit',
                background: subTab===t.id ? T.teal : 'transparent',
                color: subTab===t.id ? '#070b11' : T.text2,
                display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ opacity: subTab===t.id ? 1 : 0.6 }}><Icon /></span>
              {t.label}
            </button>
          );
        })}
      </div>

      {subTab === 'overview'  && <ConnectionPanel status={status} onDisconnected={() => setStatus({ connected:false })} />}
      {subTab === 'templates' && <TemplatesPanel  connected={status?.connected} />}
      {subTab === 'logs'      && <LogsPanel       connected={status?.connected} />}
    </div>
  );
}
