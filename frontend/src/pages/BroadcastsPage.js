import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_API_URL || '';
function api(path, opts = {}) {
  const token = useAuthStore.getState().token;
  return fetch(API + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  }).then(r => r.json());
}

const STATUS_COLORS = {
  draft:      { bg: 'rgba(100,116,139,0.15)', color: '#64748b' },
  scheduled:  { bg: 'rgba(99,102,241,0.15)',  color: '#818cf8' },
  sending:    { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
  sent:       { bg: 'rgba(16,185,129,0.15)',  color: '#10b981' },
  failed:     { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
  cancelled:  { bg: 'rgba(100,116,139,0.15)', color: '#64748b' },
};

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [segments, setSegments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({ name: '', template_name: '', template_lang: 'en', target_all: true, target_tags: [], segment_id: '', scheduled_at: '' });
  const [allTags, setAllTags] = useState([]);
  const [sending, setSending] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [b, s, t, tags] = await Promise.all([
      api('/api/broadcasts'),
      api('/api/segments'),
      api('/api/templates'),
      api('/api/contacts/tags'),
    ]);
    if (Array.isArray(b)) setBroadcasts(b);
    if (Array.isArray(s)) setSegments(s);
    if (Array.isArray(t)) setTemplates(t);
    if (Array.isArray(tags)) setAllTags(tags);
    setLoading(false);
  }

  async function openDetail(b) {
    const r = await api(`/api/broadcasts/${b.id}`);
    setDetail(r);
  }

  async function createBroadcast() {
    if (!form.name || !form.template_name) return toast.error('Name and template required');
    const payload = { ...form };
    if (!payload.scheduled_at) delete payload.scheduled_at;
    if (!payload.segment_id) delete payload.segment_id;
    const r = await api('/api/broadcasts', { method: 'POST', body: JSON.stringify(payload) });
    if (r.id) { toast.success('Broadcast created'); setCreating(false); setForm({ name: '', template_name: '', template_lang: 'en', target_all: true, target_tags: [], segment_id: '', scheduled_at: '' }); loadAll(); }
    else toast.error(r.error || 'Failed');
  }

  async function sendBroadcast(id) {
    setSending(id);
    const r = await api(`/api/broadcasts/${id}/send`, { method: 'POST' });
    setSending(null);
    if (r.success) { toast.success(`Sending to ${r.total_recipients} contacts`); loadAll(); if (detail?.id === id) openDetail({ id }); }
    else toast.error(r.error || 'Failed');
  }

  async function cancelBroadcast(id) {
    await api(`/api/broadcasts/${id}/cancel`, { method: 'POST' });
    toast.success('Cancelled'); loadAll();
  }

  async function deleteBroadcast(id) {
    await api(`/api/broadcasts/${id}`, { method: 'DELETE' });
    toast.success('Deleted'); loadAll(); setDetail(null);
  }

  const pct = (n, total) => total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.title}>Broadcasts</div>
          <div style={s.sub}>Send WhatsApp template messages to your contacts</div>
        </div>
        <button style={s.btnPrimary} onClick={() => setCreating(true)}>
          <PlusIcon /> New Broadcast
        </button>
      </div>

      {/* List */}
      <div style={s.listWrap}>
        {loading ? (
          <div style={s.empty}><SpinIcon /></div>
        ) : broadcasts.length === 0 ? (
          <div style={s.empty}>
            <BroadcastEmptyIcon />
            <div style={s.emptyTitle}>No broadcasts yet</div>
            <div style={s.emptySub}>Reach your customers with a single WhatsApp message using approved templates.</div>
            <button style={s.btnPrimary} onClick={() => setCreating(true)}>Create broadcast</button>
          </div>
        ) : (
          broadcasts.map(b => (
            <div key={b.id} style={s.card} onClick={() => openDetail(b)}>
              <div style={s.cardTop}>
                <div style={s.cardName}>{b.name}</div>
                <span style={{ ...s.statusBadge, ...STATUS_COLORS[b.status] }}>{b.status}</span>
              </div>
              <div style={s.cardMeta}>
                <span style={s.metaItem}><TemplateIcon /> {b.template_name}</span>
                {b.segment_name && <span style={s.metaItem}><SegmentIcon /> {b.segment_name}</span>}
                {b.scheduled_at && <span style={s.metaItem}><ClockIcon /> {new Date(b.scheduled_at).toLocaleString()}</span>}
                <span style={s.metaItem}><UsersIcon /> {b.total_recipients || 0} recipients</span>
              </div>
              {b.status === 'sent' && b.total_recipients > 0 && (
                <div style={s.statsRow}>
                  {[['Sent', b.sent_count, '#00d4b8'], ['Delivered', b.delivered_count, '#10b981'], ['Read', b.read_count, '#6366f1'], ['Failed', b.failed_count, '#ef4444']].map(([label, count, color]) => (
                    <div key={label} style={s.statBox}>
                      <div style={{ ...s.statNum, color }}>{pct(count, b.total_recipients)}%</div>
                      <div style={s.statLabel}>{label}</div>
                      <div style={s.statRaw}>{count || 0}</div>
                    </div>
                  ))}
                </div>
              )}
              {['draft', 'scheduled'].includes(b.status) && (
                <div style={s.cardActions} onClick={e => e.stopPropagation()}>
                  <button style={s.btnSend} disabled={sending === b.id} onClick={() => sendBroadcast(b.id)}>
                    {sending === b.id ? 'Sending...' : <><SendIcon /> Send Now</>}
                  </button>
                  <button style={s.btnDanger} onClick={() => cancelBroadcast(b.id)}>Cancel</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {creating && (
        <div style={s.overlay} onClick={() => setCreating(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div style={s.modalTitle}>New Broadcast</div>
              <button style={s.closeBtn} onClick={() => setCreating(false)}><ClearIcon /></button>
            </div>
            <div style={s.modalBody}>
              {[
                { label: 'Broadcast Name', key: 'name', type: 'text', placeholder: 'e.g. Eid Offer 2026' },
                { label: 'Template Language', key: 'template_lang', type: 'text', placeholder: 'en' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} style={s.field}>
                  <label style={s.label}>{label}</label>
                  <input style={s.input} type={type} placeholder={placeholder} value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}

              <div style={s.field}>
                <label style={s.label}>WhatsApp Template</label>
                {templates.length > 0 ? (
                  <select style={s.select} value={form.template_name} onChange={e => setForm(f => ({ ...f, template_name: e.target.value }))}>
                    <option value="">Select template...</option>
                    {templates.map(t => <option key={t.name} value={t.name}>{t.name} ({t.language || 'en'})</option>)}
                  </select>
                ) : (
                  <input style={s.input} placeholder="Template name (exact)" value={form.template_name}
                    onChange={e => setForm(f => ({ ...f, template_name: e.target.value }))} />
                )}
              </div>

              <div style={s.field}>
                <label style={s.label}>Audience</label>
                <div style={s.audienceOpts}>
                  <label style={s.radioLabel}>
                    <input type="radio" checked={form.target_all} onChange={() => setForm(f => ({ ...f, target_all: true, target_tags: [], segment_id: '' }))} />
                    All active contacts
                  </label>
                  <label style={s.radioLabel}>
                    <input type="radio" checked={!form.target_all && !form.segment_id} onChange={() => setForm(f => ({ ...f, target_all: false, segment_id: '' }))} />
                    By tag
                  </label>
                  {segments.length > 0 && (
                    <label style={s.radioLabel}>
                      <input type="radio" checked={!!form.segment_id} onChange={() => setForm(f => ({ ...f, target_all: false, segment_id: segments[0]?.id || '' }))} />
                      By segment
                    </label>
                  )}
                </div>
                {!form.target_all && !form.segment_id && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {allTags.map(t => (
                      <label key={t} style={{ ...s.tagChk, ...(form.target_tags.includes(t) ? s.tagChkActive : {}) }}>
                        <input type="checkbox" style={{ display: 'none' }} checked={form.target_tags.includes(t)}
                          onChange={() => setForm(f => ({ ...f, target_tags: f.target_tags.includes(t) ? f.target_tags.filter(x => x !== t) : [...f.target_tags, t] }))} />
                        {t}
                      </label>
                    ))}
                  </div>
                )}
                {!!form.segment_id && (
                  <select style={{ ...s.select, marginTop: 8 }} value={form.segment_id} onChange={e => setForm(f => ({ ...f, segment_id: e.target.value }))}>
                    {segments.map(s => <option key={s.id} value={s.id}>{s.name} ({s.contact_count} contacts)</option>)}
                  </select>
                )}
              </div>

              <div style={s.field}>
                <label style={s.label}>Schedule (optional)</label>
                <input style={s.input} type="datetime-local" value={form.scheduled_at}
                  onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
                <div style={s.hint}>Leave empty to save as draft and send manually.</div>
              </div>
            </div>
            <div style={s.modalFooter}>
              <button style={s.btnSec} onClick={() => setCreating(false)}>Cancel</button>
              <button style={s.btnPrimary} onClick={createBroadcast}>Create Broadcast</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div style={s.overlay} onClick={() => setDetail(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={s.modalTitle}>{detail.name}</div>
                <span style={{ ...s.statusBadge, ...STATUS_COLORS[detail.status], marginTop: 4, display: 'inline-block' }}>{detail.status}</span>
              </div>
              <button style={s.closeBtn} onClick={() => setDetail(null)}><ClearIcon /></button>
            </div>
            <div style={s.modalBody}>
              <div style={s.detailGrid}>
                {[['Template', detail.template_name], ['Language', detail.template_lang], ['Recipients', detail.total_recipients], ['Segment', detail.segment_name || '—'], ['Created', detail.created_by_name || '—'], ['Scheduled', detail.scheduled_at ? new Date(detail.scheduled_at).toLocaleString() : '—']].map(([l, v]) => (
                  <div key={l} style={s.detailItem}><div style={s.label}>{l}</div><div style={s.detailVal}>{v}</div></div>
                ))}
              </div>

              {detail.status === 'sent' && (
                <div style={s.statsRow}>
                  {[['Sent', detail.sent_count, '#00d4b8'], ['Delivered', detail.delivered_count, '#10b981'], ['Read', detail.read_count, '#6366f1'], ['Failed', detail.failed_count, '#ef4444'], ['Replied', detail.reply_count, '#f59e0b']].map(([label, count, color]) => (
                    <div key={label} style={s.statBox}>
                      <div style={{ ...s.statNum, color }}>{pct(count, detail.total_recipients)}%</div>
                      <div style={s.statLabel}>{label}</div>
                      <div style={s.statRaw}>{count || 0}</div>
                    </div>
                  ))}
                </div>
              )}

              {detail.recipients?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={s.label}>Recipients (latest 100)</div>
                  <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 8 }}>
                    {detail.recipients.map(r => (
                      <div key={r.id} style={s.recipientRow}>
                        <span style={s.recipientName}>{r.contact_name || r.phone_number}</span>
                        <span style={{ ...s.statusBadge, ...STATUS_COLORS[r.status] }}>{r.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={s.modalFooter}>
              {['draft', 'scheduled'].includes(detail.status) && (
                <button style={s.btnSend} disabled={sending === detail.id} onClick={() => sendBroadcast(detail.id)}>
                  {sending === detail.id ? 'Sending...' : 'Send Now'}
                </button>
              )}
              {['draft', 'cancelled'].includes(detail.status) && (
                <button style={s.btnDanger} onClick={() => deleteBroadcast(detail.id)}>Delete</button>
              )}
              <button style={s.btnSec} onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>;
const ClearIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>;
const SendIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>;
const TemplateIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 8h10M7 12h7M7 16h4" strokeLinecap="round"/></svg>;
const SegmentIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="3"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M16 11h6M19 8v6"/></svg>;
const ClockIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
const UsersIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
const SpinIcon = () => <div style={{ width: 32, height: 32, border: '3px solid rgba(0,212,184,0.2)', borderTopColor: '#00d4b8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />;
const BroadcastEmptyIcon = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e3a4a" strokeWidth="1.5"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>;

const s = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', background: '#0b0e14', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 20, fontWeight: 700, color: '#e2e8f0' },
  sub: { fontSize: 12, color: '#3a5068', marginTop: 2 },
  listWrap: { flex: 1, overflow: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 },
  card: { background: '#111b21', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 18px', cursor: 'pointer', transition: 'border-color 0.15s' },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardName: { fontSize: 14, fontWeight: 600, color: '#e2e8f0' },
  cardMeta: { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  metaItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#3a5068' },
  statsRow: { display: 'flex', gap: 0, marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 },
  statBox: { flex: 1, textAlign: 'center' },
  statNum: { fontSize: 18, fontWeight: 700 },
  statLabel: { fontSize: 10, color: '#3a5068', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 },
  statRaw: { fontSize: 11, color: '#1e3a4a', marginTop: 1 },
  cardActions: { display: 'flex', gap: 8, marginTop: 12 },
  statusBadge: { borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 600 },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#3a5068' },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: '#1e3a4a' },
  emptySub: { fontSize: 13, color: '#1e3a4a', textAlign: 'center', maxWidth: 320, marginBottom: 4 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: '#111b21', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
  modalHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  modalTitle: { fontSize: 16, fontWeight: 700, color: '#e2e8f0' },
  modalBody: { flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 },
  modalFooter: { display: 'flex', gap: 8, padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', justifyContent: 'flex-end' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, color: '#3a5068', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 },
  input: { background: '#0b0e14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e2e8f0', fontSize: 13, padding: '9px 12px', outline: 'none' },
  select: { background: '#0b0e14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e2e8f0', fontSize: 13, padding: '9px 12px', outline: 'none', cursor: 'pointer' },
  hint: { fontSize: 11, color: '#1e3a4a', marginTop: 2 },
  audienceOpts: { display: 'flex', flexDirection: 'column', gap: 8 },
  radioLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#8fa8b8', cursor: 'pointer' },
  tagChk: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '5px 12px', fontSize: 12, color: '#8fa8b8', cursor: 'pointer' },
  tagChkActive: { background: 'rgba(0,212,184,0.12)', border: '1px solid rgba(0,212,184,0.3)', color: '#00d4b8' },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  detailItem: { display: 'flex', flexDirection: 'column', gap: 4 },
  detailVal: { fontSize: 13, color: '#c9d8e4', fontWeight: 500 },
  recipientRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  recipientName: { fontSize: 13, color: '#8fa8b8' },
  btnPrimary: { display: 'flex', alignItems: 'center', gap: 6, background: '#00a884', color: 'white', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSec: { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', color: '#8fa8b8', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  btnSend: { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,212,184,0.15)', color: '#00d4b8', border: '1px solid rgba(0,212,184,0.3)', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnDanger: { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  closeBtn: { background: 'transparent', border: 'none', color: '#3a5068', cursor: 'pointer', padding: 4 },
};
