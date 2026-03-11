import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';



export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [importOpen, setImportOpen] = useState(false);
  const fileRef = useRef();
  const LIMIT = 25;

  useEffect(() => { loadTags(); }, []);
  useEffect(() => { loadContacts(); }, [page, search, tagFilter]);

  async function loadTags() {
    const r = await api('/api/contacts/tags');
    if (Array.isArray(r)) setAllTags(r);
  }

  async function loadContacts() {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (search) params.set('search', search);
    if (tagFilter) params.set('tag', tagFilter);
    const r = await api(`/api/contacts?${params}`);
    if (r.contacts) { setContacts(r.contacts); setTotal(r.total); }
    setLoading(false);
  }

  async function openContact(c) {
    const r = await api(`/api/contacts/${c.id}`);
    setSelected(r);
    setEditData({ name: r.name || '', email: r.email || '', notes: r.notes || '', tags: (r.tags || []).join(', ') });
    setEditMode(false);
  }

  async function saveContact() {
    const tags = editData.tags.split(',').map(t => t.trim()).filter(Boolean);
    const r = await api(`/api/contacts/${selected.id}`, {
      method: 'PATCH', body: JSON.stringify({ ...editData, tags })
    });
    if (r.id) { setSelected(r); setEditMode(false); toast.success('Contact saved'); loadContacts(); loadTags(); }
    else toast.error('Save failed');
  }

  async function toggleOptOut() {
    const r = await api(`/api/contacts/${selected.id}`, {
      method: 'PATCH', body: JSON.stringify({ opted_out: !selected.opted_out })
    });
    if (r.id) { setSelected(r); toast.success(r.opted_out ? 'Opted out' : 'Opted back in'); }
  }

  async function exportCSV() {
    const token = useAuthStore.getState().token;
    const params = tagFilter ? `?tag=${tagFilter}` : '';
    const res = await fetch(`${API}/api/contacts/export${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'contacts.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const contacts = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.replace(/"/g, '').trim());
      const obj = {};
      headers.forEach((h, i) => obj[h] = vals[i]);
      if (obj.tags) obj.tags = obj.tags.split(';').filter(Boolean);
      return obj;
    });
    const r = await api('/api/contacts/import', { method: 'POST', body: JSON.stringify({ contacts }) });
    if (r.imported !== undefined) {
      toast.success(`Imported ${r.imported}, skipped ${r.skipped}`);
      setImportOpen(false); loadContacts(); loadTags();
    } else toast.error('Import failed');
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.title}>Contacts</div>
          <div style={s.sub}>{total.toLocaleString()} contacts</div>
        </div>
        <div style={s.headerBtns}>
          <button style={s.btnSec} onClick={exportCSV}>
            <ExportIcon /> Export CSV
          </button>
          <button style={s.btnSec} onClick={() => { setImportOpen(true); setTimeout(() => fileRef.current?.click(), 100); }}>
            <ImportIcon /> Import CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
        </div>
      </div>

      {/* Filters */}
      <div style={s.filters}>
        <div style={s.searchWrap}>
          <SearchIcon />
          <input style={s.searchInput} placeholder="Search name, phone, email..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          {search && <button style={s.clearBtn} onClick={() => { setSearch(''); setPage(1); }}>
            <ClearIcon />
          </button>}
        </div>
        <select style={s.select} value={tagFilter} onChange={e => { setTagFilter(e.target.value); setPage(1); }}>
          <option value="">All tags</option>
          {allTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={s.tableWrap}>
        {loading ? (
          <div style={s.empty}><SpinIcon /></div>
        ) : contacts.length === 0 ? (
          <div style={s.empty}>
            <ContactsEmptyIcon />
            <div style={s.emptyTitle}>No contacts yet</div>
            <div style={s.emptySub}>Contacts are created automatically when customers message you, or import a CSV.</div>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {['Contact', 'Phone', 'Email', 'Tags', 'Last Message', 'Status'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id} style={s.tr} onClick={() => openContact(c)}>
                  <td style={s.td}>
                    <div style={s.contactCell}>
                      <div style={s.avatar}>{(c.name || c.phone_number)[0].toUpperCase()}</div>
                      <span style={s.name}>{c.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td style={s.td}><span style={s.phone}>{c.phone_number}</span></td>
                  <td style={s.td}><span style={s.muted}>{c.email || '—'}</span></td>
                  <td style={s.td}>
                    <div style={s.tagRow}>
                      {(c.tags || []).slice(0, 3).map(t => <span key={t} style={s.tag}>{t}</span>)}
                      {(c.tags || []).length > 3 && <span style={s.tagMore}>+{c.tags.length - 3}</span>}
                    </div>
                  </td>
                  <td style={s.td}><span style={s.muted}>{c.last_message_at ? new Date(c.last_message_at).toLocaleDateString() : '—'}</span></td>
                  <td style={s.td}>
                    <span style={{ ...s.statusBadge, ...(c.opted_out ? s.optedOut : s.active) }}>
                      {c.opted_out ? 'Opted out' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={s.pagination}>
          <button style={s.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeftIcon />
          </button>
          <span style={s.pageInfo}>Page {page} of {totalPages}</span>
          <button style={s.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRightIcon />
          </button>
        </div>
      )}

      {/* Contact Drawer */}
      {selected && (
        <div style={s.overlay} onClick={() => setSelected(null)}>
          <div style={s.drawer} onClick={e => e.stopPropagation()}>
            <div style={s.drawerHeader}>
              <div style={s.drawerAvatar}>{(selected.name || selected.phone_number)[0].toUpperCase()}</div>
              <div>
                <div style={s.drawerName}>{selected.name || 'Unknown'}</div>
                <div style={s.drawerPhone}>{selected.phone_number}</div>
              </div>
              <button style={s.closeBtn} onClick={() => setSelected(null)}><ClearIcon /></button>
            </div>

            <div style={s.drawerStats}>
              <div style={s.stat}><div style={s.statVal}>{selected.conversation_count || 0}</div><div style={s.statLabel}>Conversations</div></div>
              <div style={s.stat}><div style={s.statVal}>{selected.message_count || 0}</div><div style={s.statLabel}>Messages</div></div>
              <div style={s.stat}>
                <div style={{ ...s.statVal, color: selected.opted_out ? '#ef4444' : '#10b981' }}>
                  {selected.opted_out ? 'Out' : 'Active'}
                </div>
                <div style={s.statLabel}>Status</div>
              </div>
            </div>

            {editMode ? (
              <div style={s.editForm}>
                {[['Name', 'name', 'text'], ['Email', 'email', 'email'], ['Tags (comma separated)', 'tags', 'text'], ['Notes', 'notes', 'textarea']].map(([label, key, type]) => (
                  <div key={key} style={s.field}>
                    <label style={s.label}>{label}</label>
                    {type === 'textarea'
                      ? <textarea style={s.textarea} value={editData[key]} onChange={e => setEditData(d => ({ ...d, [key]: e.target.value }))} rows={3} />
                      : <input style={s.input} type={type} value={editData[key]} onChange={e => setEditData(d => ({ ...d, [key]: e.target.value }))} />
                    }
                  </div>
                ))}
                <div style={s.editBtns}>
                  <button style={s.btnPrimary} onClick={saveContact}>Save</button>
                  <button style={s.btnSec} onClick={() => setEditMode(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={s.editForm}>
                {[['Email', selected.email || '—'], ['Notes', selected.notes || '—']].map(([l, v]) => (
                  <div key={l} style={s.field}>
                    <label style={s.label}>{l}</label>
                    <div style={s.value}>{v}</div>
                  </div>
                ))}
                <div style={s.field}>
                  <label style={s.label}>Tags</label>
                  <div style={s.tagRow}>
                    {(selected.tags || []).map(t => <span key={t} style={s.tag}>{t}</span>)}
                    {!(selected.tags || []).length && <span style={s.muted}>No tags</span>}
                  </div>
                </div>
                <div style={s.editBtns}>
                  <button style={s.btnPrimary} onClick={() => setEditMode(true)}>
                    <EditIcon /> Edit
                  </button>
                  <button style={{ ...s.btnSec, color: selected.opted_out ? '#10b981' : '#ef4444' }} onClick={toggleOptOut}>
                    {selected.opted_out ? 'Opt Back In' : 'Opt Out'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const SearchIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3a5068" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>;
const ClearIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>;
const ExportIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>;
const ImportIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>;
const EditIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const ChevronLeftIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>;
const ChevronRightIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>;
const SpinIcon = () => <div style={{ width: 32, height: 32, border: '3px solid rgba(0,212,184,0.2)', borderTopColor: '#00d4b8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />;
const ContactsEmptyIcon = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e3a4a" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

const s = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', background: '#0b0e14', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0', flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 20, fontWeight: 700, color: '#e2e8f0' },
  sub: { fontSize: 12, color: '#3a5068', marginTop: 2 },
  headerBtns: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  filters: { display: 'flex', gap: 10, padding: '16px 24px', flexWrap: 'wrap' },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 8, background: '#111b21', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '8px 12px', flex: 1, minWidth: 200 },
  searchInput: { flex: 1, background: 'transparent', border: 'none', color: '#e2e8f0', fontSize: 13, outline: 'none' },
  clearBtn: { background: 'transparent', border: 'none', color: '#3a5068', cursor: 'pointer', display: 'flex', padding: 0 },
  select: { background: '#111b21', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, color: '#8fa8b8', fontSize: 13, padding: '8px 12px', cursor: 'pointer', outline: 'none' },
  tableWrap: { flex: 1, overflow: 'auto', padding: '0 24px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', color: '#3a5068', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.15s' },
  td: { padding: '12px 12px', color: '#c9d8e4', verticalAlign: 'middle' },
  contactCell: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 },
  name: { fontWeight: 500, color: '#e2e8f0' },
  phone: { fontFamily: 'monospace', fontSize: 12, color: '#8fa8b8' },
  muted: { color: '#3a5068', fontSize: 12 },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  tag: { background: 'rgba(0,212,184,0.1)', color: '#00d4b8', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 500 },
  tagMore: { background: 'rgba(255,255,255,0.05)', color: '#3a5068', borderRadius: 6, padding: '2px 8px', fontSize: 11 },
  statusBadge: { borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600 },
  active: { background: 'rgba(16,185,129,0.1)', color: '#10b981' },
  optedOut: { background: 'rgba(239,68,68,0.1)', color: '#ef4444' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 60, color: '#3a5068' },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: '#1e3a4a' },
  emptySub: { fontSize: 13, color: '#1e3a4a', textAlign: 'center', maxWidth: 320 },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' },
  pageBtn: { background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, color: '#8fa8b8', cursor: 'pointer', padding: '6px 10px', display: 'flex' },
  pageInfo: { fontSize: 13, color: '#3a5068' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' },
  drawer: { width: '100%', maxWidth: 420, background: '#111b21', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto', boxShadow: '-4px 0 30px rgba(0,0,0,0.4)' },
  drawerHeader: { display: 'flex', alignItems: 'center', gap: 14, padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  drawerAvatar: { width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'white', flexShrink: 0 },
  drawerName: { fontSize: 16, fontWeight: 700, color: '#e2e8f0' },
  drawerPhone: { fontSize: 12, color: '#3a5068', fontFamily: 'monospace', marginTop: 2 },
  closeBtn: { marginLeft: 'auto', background: 'transparent', border: 'none', color: '#3a5068', cursor: 'pointer', padding: 4 },
  drawerStats: { display: 'flex', padding: '16px 20px', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' },
  stat: { flex: 1, textAlign: 'center' },
  statVal: { fontSize: 20, fontWeight: 700, color: '#e2e8f0' },
  statLabel: { fontSize: 11, color: '#3a5068', marginTop: 2 },
  editForm: { padding: 20, display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, color: '#3a5068', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 },
  value: { fontSize: 13, color: '#c9d8e4' },
  input: { background: '#0b0e14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e2e8f0', fontSize: 13, padding: '9px 12px', outline: 'none' },
  textarea: { background: '#0b0e14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e2e8f0', fontSize: 13, padding: '9px 12px', outline: 'none', resize: 'vertical' },
  editBtns: { display: 'flex', gap: 8, marginTop: 4 },
  btnPrimary: { display: 'flex', alignItems: 'center', gap: 6, background: '#00a884', color: 'white', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSec: { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', color: '#8fa8b8', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
};
