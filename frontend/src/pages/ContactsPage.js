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
  const [addOpen, setAddOpen] = useState(false);
  const [addData, setAddData] = useState({ phone_number:'', name:'', email:'', tags:'', notes:'' });
  const [addLoading, setAddLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const fileRef = useRef();
  const LIMIT = 25;

  useEffect(() => { loadTags(); }, []);
  useEffect(() => { loadContacts(); }, [page, search, tagFilter]);

  async function loadTags() {
    try {
      const r = await api.get('/contacts/tags');
      if (Array.isArray(r.data)) setAllTags(r.data);
    } catch {}
  }

  async function loadContacts() {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (tagFilter) params.tag = tagFilter;
      const r = await api.get('/contacts', { params });
      if (r.data.contacts) { setContacts(r.data.contacts); setTotal(r.data.total); }
    } catch {}
    setLoading(false);
  }

  async function openContact(c) {
    try {
      const r = await api.get(`/contacts/${c.id}`);
      setSelected(r.data);
      setEditData({ name: r.data.name || '', email: r.data.email || '', notes: r.data.notes || '', tags: (r.data.tags || []).join(', ') });
      setEditMode(false);
    } catch {}
  }

  async function saveContact() {
    try {
      const tags = editData.tags.split(',').map(t => t.trim()).filter(Boolean);
      const r = await api.patch(`/contacts/${selected.id}`, { ...editData, tags });
      if (r.data.id) { setSelected(r.data); setEditMode(false); toast.success('Contact saved'); loadContacts(); loadTags(); }
      else toast.error('Save failed');
    } catch { toast.error('Save failed'); }
  }

  async function toggleOptOut() {
    try {
      const r = await api.patch(`/contacts/${selected.id}`, { opted_out: !selected.opted_out });
      if (r.data.id) { setSelected(r.data); toast.success(r.data.opted_out ? 'Opted out' : 'Opted back in'); }
    } catch { toast.error('Failed'); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/contacts/${deleteTarget.id}`);
      toast.success(`${deleteTarget.name || deleteTarget.phone_number} deleted`);
      setDeleteTarget(null);
      setSelected(null);
      loadContacts();
      loadTags();
    } catch { toast.error('Delete failed'); }
    finally { setDeleteLoading(false); }
  }

  async function addContact() {
    if (!addData.phone_number.trim()) return toast.error('Phone number required');
    setAddLoading(true);
    try {
      const r = await api.post('/contacts', {
        ...addData,
        tags: addData.tags.split(',').map(t=>t.trim()).filter(Boolean)
      });
      if (r.data.id) {
        toast.success('Contact added');
        setAddOpen(false);
        setAddData({ phone_number:'', name:'', email:'', tags:'', notes:'' });
        loadContacts(); loadTags();
      } else toast.error('Failed to add contact');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to add contact');
    } finally { setAddLoading(false); }
  }

  async function exportCSV() {
    try {
      const params = tagFilter ? { tag: tagFilter } : {};
      const r = await api.get('/contacts/export', { params, responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a'); a.href = url; a.download = 'contacts.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
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
      const r = await api.post('/contacts/import', { contacts });
      if (r.data.imported !== undefined) {
        toast.success(`Imported ${r.data.imported}, skipped ${r.data.skipped}`);
        loadContacts(); loadTags();
      } else toast.error('Import failed');
    } catch { toast.error('Import failed'); }
    e.target.value = '';
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
          <button style={s.btnSec} onClick={exportCSV}><ExportIcon /> Export CSV</button>
          <button style={s.btnSec} onClick={() => fileRef.current?.click()}><ImportIcon /> Import CSV</button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }} onChange={handleImport} />
          <button style={s.btnPrimary} onClick={() => setAddOpen(true)}><AddIcon /> Add Contact</button>
        </div>
      </div>

      {/* Filters */}
      <div style={s.filters}>
        <div style={s.searchWrap}>
          <SearchIcon />
          <input style={s.searchInput} placeholder="Search name, phone, email..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          {search && <button style={s.clearBtn} onClick={() => { setSearch(''); setPage(1); }}><ClearIcon /></button>}
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
                {['Contact','Phone','Email','Tags','Last Message','Status',''].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id} style={s.tr}>
                  <td style={s.td} onClick={() => openContact(c)}>
                    <div style={s.contactCell}>
                      <div style={s.avatar}>{(c.name || c.phone_number)[0].toUpperCase()}</div>
                      <span style={s.name}>{c.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td style={s.td} onClick={() => openContact(c)}><span style={s.phone}>{c.phone_number}</span></td>
                  <td style={s.td} onClick={() => openContact(c)}><span style={s.muted}>{c.email || '—'}</span></td>
                  <td style={s.td} onClick={() => openContact(c)}>
                    <div style={s.tagRow}>
                      {(c.tags || []).slice(0,3).map(t => <span key={t} style={s.tag}>{t}</span>)}
                      {(c.tags || []).length > 3 && <span style={s.tagMore}>+{c.tags.length-3}</span>}
                    </div>
                  </td>
                  <td style={s.td} onClick={() => openContact(c)}><span style={s.muted}>{c.last_message_at ? new Date(c.last_message_at).toLocaleDateString() : '—'}</span></td>
                  <td style={s.td} onClick={() => openContact(c)}>
                    <span style={{ ...s.statusBadge, ...(c.opted_out ? s.optedOut : s.active) }}>
                      {c.opted_out ? 'Opted out' : 'Active'}
                    </span>
                  </td>
                  <td style={s.td}>
                    <button style={s.deleteRowBtn} title="Delete contact" onClick={e => { e.stopPropagation(); setDeleteTarget(c); }}>
                      <TrashIcon />
                    </button>
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
          <button style={s.pageBtn} disabled={page===1} onClick={() => setPage(p=>p-1)}><ChevronLeftIcon /></button>
          <span style={s.pageInfo}>Page {page} of {totalPages}</span>
          <button style={s.pageBtn} disabled={page===totalPages} onClick={() => setPage(p=>p+1)}><ChevronRightIcon /></button>
        </div>
      )}

      {/* Contact Drawer */}
      {selected && (
        <div style={s.overlay} onClick={() => setSelected(null)}>
          <div style={s.drawer} onClick={e => e.stopPropagation()}>
            <div style={s.drawerHeader}>
              <div style={s.drawerAvatar}>{(selected.name || selected.phone_number)[0].toUpperCase()}</div>
              <div style={{flex:1}}>
                <div style={s.drawerName}>{selected.name || 'Unknown'}</div>
                <div style={s.drawerPhone}>{selected.phone_number}</div>
              </div>
              <button style={s.closeBtn} onClick={() => setSelected(null)}><ClearIcon /></button>
            </div>

            <div style={s.drawerStats}>
              <div style={s.stat}><div style={s.statVal}>{selected.conversation_count||0}</div><div style={s.statLabel}>Conversations</div></div>
              <div style={s.stat}><div style={s.statVal}>{selected.message_count||0}</div><div style={s.statLabel}>Messages</div></div>
              <div style={s.stat}>
                <div style={{...s.statVal, color: selected.opted_out?'#ef4444':'#10b981'}}>{selected.opted_out?'Out':'Active'}</div>
                <div style={s.statLabel}>Status</div>
              </div>
            </div>

            {editMode ? (
              <div style={s.editForm}>
                {[['Name','name','text'],['Email','email','email'],['Tags (comma separated)','tags','text'],['Notes','notes','textarea']].map(([label,key,type]) => (
                  <div key={key} style={s.field}>
                    <label style={s.label}>{label}</label>
                    {type==='textarea'
                      ? <textarea style={s.textarea} value={editData[key]} onChange={e=>setEditData(d=>({...d,[key]:e.target.value}))} rows={3}/>
                      : <input style={s.input} type={type} value={editData[key]} onChange={e=>setEditData(d=>({...d,[key]:e.target.value}))}/>
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
                {[['Email', selected.email||'—'],['Notes', selected.notes||'—']].map(([l,v]) => (
                  <div key={l} style={s.field}>
                    <label style={s.label}>{l}</label>
                    <div style={s.value}>{v}</div>
                  </div>
                ))}
                <div style={s.field}>
                  <label style={s.label}>Tags</label>
                  <div style={s.tagRow}>
                    {(selected.tags||[]).map(t=><span key={t} style={s.tag}>{t}</span>)}
                    {!(selected.tags||[]).length && <span style={s.muted}>No tags</span>}
                  </div>
                </div>
                <div style={s.editBtns}>
                  <button style={s.btnPrimary} onClick={() => setEditMode(true)}><EditIcon /> Edit</button>
                  <button style={{...s.btnSec, color: selected.opted_out?'#10b981':'#f59e0b'}} onClick={toggleOptOut}>
                    {selected.opted_out ? 'Opt Back In' : 'Opt Out'}
                  </button>
                </div>
                <div style={s.deleteDivider}/>
                <button style={s.btnDelete} onClick={() => setDeleteTarget(selected)}>
                  <TrashIcon /> Delete Contact Permanently
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {addOpen && (
        <div style={s.addOverlay} onClick={() => setAddOpen(false)}>
          <div style={s.addModal} onClick={e => e.stopPropagation()}>
            <div style={s.addModalHeader}>
              <span style={s.addModalTitle}>Add Contact</span>
              <button style={s.addModalClose} onClick={() => setAddOpen(false)}><ClearIcon /></button>
            </div>
            <div style={s.addModalBody}>
              {[
                ['Phone Number *','phone_number','text','923001234567','Include country code, no + or spaces (e.g. 923001234567)'],
                ['Full Name','name','text','Ahmed Khan',null],
                ['Email','email','email','ahmed@example.com',null],
                ['Tags','tags','text','customer, vip, pakistan','Comma-separated tags'],
              ].map(([label,key,type,ph,hint]) => (
                <div key={key} style={s.fieldGroup}>
                  <label style={s.fieldLabel}>{label}</label>
                  <input style={s.fieldInput} type={type} placeholder={ph} value={addData[key]}
                    onChange={e=>setAddData(d=>({...d,[key]:e.target.value}))}/>
                  {hint && <div style={s.fieldHint}>{hint}</div>}
                </div>
              ))}
              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Notes</label>
                <textarea style={{...s.fieldInput,height:'72px',resize:'vertical'}}
                  placeholder="Any notes about this contact..."
                  value={addData.notes} onChange={e=>setAddData(d=>({...d,notes:e.target.value}))}/>
              </div>
            </div>
            <div style={s.addModalFooter}>
              <button style={s.btnSec} onClick={() => setAddOpen(false)}>Cancel</button>
              <button style={{...s.btnPrimary,opacity:addLoading?0.7:1}} onClick={addContact} disabled={addLoading}>
                {addLoading ? 'Saving...' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div style={s.addOverlay} onClick={() => !deleteLoading && setDeleteTarget(null)}>
          <div style={s.deleteModal} onClick={e => e.stopPropagation()}>
            <div style={s.deleteModalIcon}><TrashLargeIcon /></div>
            <div style={s.deleteModalTitle}>Delete Contact Permanently</div>
            <div style={s.deleteModalBody}>
              You are about to permanently delete
              <span style={s.deleteModalName}> {deleteTarget.name || deleteTarget.phone_number} </span>
              ({deleteTarget.phone_number}).
              <br/><br/>
              This will also remove all associated conversations and messages. <strong style={{color:'#ef4444'}}>This action cannot be undone.</strong>
            </div>
            <div style={s.deleteModalFooter}>
              <button style={s.btnSec} onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>Cancel</button>
              <button style={{...s.btnDanger, opacity:deleteLoading?0.7:1}} onClick={confirmDelete} disabled={deleteLoading}>
                <TrashIcon />{deleteLoading ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const AddIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const SearchIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3a5068" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>;
const ClearIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>;
const ExportIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>;
const ImportIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>;
const EditIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
const TrashLargeIcon = () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
const ChevronLeftIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>;
const ChevronRightIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>;
const SpinIcon = () => <div style={{ width:32,height:32,border:'3px solid rgba(0,212,184,0.2)',borderTopColor:'#00d4b8',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>;
const ContactsEmptyIcon = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e3a4a" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

const s = {
  root:{ display:'flex',flexDirection:'column',height:'100%',background:'#0b0e14',overflow:'hidden' },
  header:{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px 0',flexWrap:'wrap',gap:12 },
  title:{ fontSize:20,fontWeight:700,color:'#e2e8f0' },
  sub:{ fontSize:12,color:'#3a5068',marginTop:2 },
  headerBtns:{ display:'flex',gap:8,flexWrap:'wrap' },
  filters:{ display:'flex',gap:10,padding:'16px 24px',flexWrap:'wrap' },
  searchWrap:{ display:'flex',alignItems:'center',gap:8,background:'#111b21',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'8px 12px',flex:1,minWidth:200 },
  searchInput:{ flex:1,background:'transparent',border:'none',color:'#e2e8f0',fontSize:13,outline:'none' },
  clearBtn:{ background:'transparent',border:'none',color:'#3a5068',cursor:'pointer',display:'flex',padding:0 },
  select:{ background:'#111b21',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,color:'#8fa8b8',fontSize:13,padding:'8px 12px',cursor:'pointer',outline:'none' },
  tableWrap:{ flex:1,overflow:'auto',padding:'0 24px' },
  table:{ width:'100%',borderCollapse:'collapse',fontSize:13 },
  th:{ textAlign:'left',padding:'10px 12px',color:'#3a5068',fontWeight:600,fontSize:11,textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:'1px solid rgba(255,255,255,0.05)',whiteSpace:'nowrap' },
  tr:{ borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:'pointer',transition:'background 0.15s' },
  td:{ padding:'12px 12px',color:'#c9d8e4',verticalAlign:'middle' },
  contactCell:{ display:'flex',alignItems:'center',gap:10 },
  avatar:{ width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'white',flexShrink:0 },
  name:{ fontWeight:500,color:'#e2e8f0' },
  phone:{ fontFamily:'monospace',fontSize:12,color:'#8fa8b8' },
  muted:{ color:'#3a5068',fontSize:12 },
  tagRow:{ display:'flex',flexWrap:'wrap',gap:4 },
  tag:{ background:'rgba(0,212,184,0.1)',color:'#00d4b8',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:500 },
  tagMore:{ background:'rgba(255,255,255,0.05)',color:'#3a5068',borderRadius:6,padding:'2px 8px',fontSize:11 },
  statusBadge:{ borderRadius:6,padding:'3px 8px',fontSize:11,fontWeight:600 },
  active:{ background:'rgba(16,185,129,0.1)',color:'#10b981' },
  optedOut:{ background:'rgba(239,68,68,0.1)',color:'#ef4444' },
  deleteRowBtn:{ background:'transparent',border:'none',color:'#3a5068',cursor:'pointer',padding:'6px',borderRadius:6,display:'flex',alignItems:'center',transition:'color 0.15s, background 0.15s' },
  empty:{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:60,color:'#3a5068' },
  emptyTitle:{ fontSize:16,fontWeight:600,color:'#1e3a4a' },
  emptySub:{ fontSize:13,color:'#1e3a4a',textAlign:'center',maxWidth:320 },
  pagination:{ display:'flex',alignItems:'center',justifyContent:'center',gap:12,padding:'12px 24px',borderTop:'1px solid rgba(255,255,255,0.05)' },
  pageBtn:{ background:'rgba(255,255,255,0.05)',border:'none',borderRadius:8,color:'#8fa8b8',cursor:'pointer',padding:'6px 10px',display:'flex' },
  pageInfo:{ fontSize:13,color:'#3a5068' },
  addOverlay:{ position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999 },
  addModal:{ background:'#0d1821',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'16px',width:'460px',maxWidth:'95vw',overflow:'hidden',boxShadow:'0 24px 60px rgba(0,0,0,0.7)' },
  addModalHeader:{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid rgba(255,255,255,0.07)',background:'rgba(0,212,184,0.03)' },
  addModalTitle:{ fontSize:'16px',fontWeight:'700',color:'#e9edef' },
  addModalClose:{ background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',color:'#8696a0',cursor:'pointer',padding:'6px',borderRadius:'6px',display:'flex',alignItems:'center' },
  addModalBody:{ padding:'22px 24px',display:'flex',flexDirection:'column',gap:'15px',background:'#0d1821' },
  addModalFooter:{ padding:'16px 24px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'flex-end',gap:'10px',background:'rgba(255,255,255,0.01)' },
  fieldGroup:{ display:'flex',flexDirection:'column',gap:'5px' },
  fieldLabel:{ fontSize:'11px',fontWeight:'700',color:'#3a5068',textTransform:'uppercase',letterSpacing:'0.07em' },
  fieldInput:{ background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'9px 12px',fontSize:'13px',color:'#e9edef',outline:'none',width:'100%',boxSizing:'border-box' },
  fieldHint:{ fontSize:'11px',color:'#2a3a44',marginTop:'2px' },
  deleteModal:{ background:'#0d1821',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'16px',width:'420px',maxWidth:'95vw',padding:'32px 28px',display:'flex',flexDirection:'column',alignItems:'center',gap:12,boxShadow:'0 24px 60px rgba(0,0,0,0.8)' },
  deleteModalIcon:{ width:64,height:64,borderRadius:'50%',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:4 },
  deleteModalTitle:{ fontSize:18,fontWeight:700,color:'#e2e8f0',textAlign:'center' },
  deleteModalBody:{ fontSize:13,color:'#8fa8b8',textAlign:'center',lineHeight:1.7,marginBottom:4 },
  deleteModalName:{ color:'#e2e8f0',fontWeight:600 },
  deleteModalFooter:{ display:'flex',gap:10,marginTop:8,width:'100%',justifyContent:'center' },
  overlay:{ position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:200,display:'flex',justifyContent:'flex-end' },
  drawer:{ width:'100%',maxWidth:420,background:'#111b21',height:'100%',display:'flex',flexDirection:'column',overflow:'auto',boxShadow:'-4px 0 30px rgba(0,0,0,0.4)' },
  drawerHeader:{ display:'flex',alignItems:'center',gap:14,padding:'20px 20px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)' },
  drawerAvatar:{ width:48,height:48,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:'white',flexShrink:0 },
  drawerName:{ fontSize:16,fontWeight:700,color:'#e2e8f0' },
  drawerPhone:{ fontSize:12,color:'#3a5068',fontFamily:'monospace',marginTop:2 },
  closeBtn:{ background:'transparent',border:'none',color:'#3a5068',cursor:'pointer',padding:4,display:'flex' },
  drawerStats:{ display:'flex',padding:'16px 20px',gap:0,borderBottom:'1px solid rgba(255,255,255,0.06)' },
  stat:{ flex:1,textAlign:'center' },
  statVal:{ fontSize:20,fontWeight:700,color:'#e2e8f0' },
  statLabel:{ fontSize:11,color:'#3a5068',marginTop:2 },
  editForm:{ padding:20,display:'flex',flexDirection:'column',gap:16 },
  field:{ display:'flex',flexDirection:'column',gap:6 },
  label:{ fontSize:11,color:'#3a5068',textTransform:'uppercase',letterSpacing:'0.05em',fontWeight:600 },
  value:{ fontSize:13,color:'#c9d8e4' },
  input:{ background:'#0b0e14',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,color:'#e2e8f0',fontSize:13,padding:'9px 12px',outline:'none' },
  textarea:{ background:'#0b0e14',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,color:'#e2e8f0',fontSize:13,padding:'9px 12px',outline:'none',resize:'vertical' },
  editBtns:{ display:'flex',gap:8,marginTop:4 },
  deleteDivider:{ borderTop:'1px solid rgba(239,68,68,0.1)',marginTop:4 },
  btnDelete:{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'rgba(239,68,68,0.08)',color:'#ef4444',border:'1px solid rgba(239,68,68,0.2)',borderRadius:9,padding:'10px 16px',fontSize:13,fontWeight:600,cursor:'pointer',width:'100%' },
  btnDanger:{ display:'flex',alignItems:'center',gap:8,background:'#ef4444',color:'white',border:'none',borderRadius:9,padding:'10px 20px',fontSize:13,fontWeight:600,cursor:'pointer' },
  btnPrimary:{ display:'flex',alignItems:'center',gap:6,background:'#00a884',color:'white',border:'none',borderRadius:9,padding:'9px 16px',fontSize:13,fontWeight:600,cursor:'pointer' },
  btnSec:{ display:'flex',alignItems:'center',gap:6,background:'rgba(255,255,255,0.05)',color:'#8fa8b8',border:'1px solid rgba(255,255,255,0.08)',borderRadius:9,padding:'9px 16px',fontSize:13,fontWeight:500,cursor:'pointer' },
};
