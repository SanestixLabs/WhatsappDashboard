import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const BotIcon     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V6a3 3 0 016 0v2"/><path d="M9 14h.01M15 14h.01" strokeLinecap="round"/></svg>;
const SaveIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const PauseIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
const BrainIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M9 9h.01M15 9h.01M9 13a4 4 0 006 0"/></svg>;
const ZapIcon     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const ChevronIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 9l-7 7-7-7"/></svg>;
const PlusIcon    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const TrashIcon   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>;
const SpinSvg     = () => <span style={{width:'14px',height:'14px',border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'ai-spin .7s linear infinite'}}/>;

const Toggle = ({ value, onChange }) => (
  <button onClick={() => onChange(!value)} style={{width:'38px',height:'22px',borderRadius:'11px',border:'none',background:value?'#00d4b8':'#1a2e42',position:'relative',cursor:'pointer',transition:'background .2s',flexShrink:0}}>
    <div style={{width:'16px',height:'16px',background:'white',borderRadius:'50%',position:'absolute',top:'3px',left:value?'19px':'3px',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.4)'}}/>
  </button>
);

const Section = ({ icon, title, desc, children, collapsible=false, accent='#00d4b8' }) => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{background:'#0c1219',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',overflow:'hidden',marginBottom:'16px'}}>
      <div onClick={()=>collapsible&&setOpen(v=>!v)} style={{display:'flex',alignItems:'center',gap:'10px',padding:'16px 20px',borderBottom:open?'1px solid rgba(255,255,255,0.06)':'none',cursor:collapsible?'pointer':'default',background:'rgba(255,255,255,0.02)'}}>
        <div style={{width:'30px',height:'30px',borderRadius:'8px',background:'rgba(0,212,184,0.12)',display:'flex',alignItems:'center',justifyContent:'center',color:accent,flexShrink:0}}>{icon}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#e9edef'}}>{title}</div>
          {desc&&<div style={{fontSize:'11px',color:'#3a5068',marginTop:'2px'}}>{desc}</div>}
        </div>
        {collapsible&&<div style={{color:'#3a5068',transform:open?'rotate(180deg)':'none',transition:'transform .2s'}}><ChevronIcon/></div>}
      </div>
      {open&&<div style={{padding:'20px'}}>{children}</div>}
    </div>
  );
};

const Row = ({ label, desc, children }) => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
    <div style={{flex:1,marginRight:'16px'}}>
      <div style={{fontSize:'13px',color:'#c9d6df',fontWeight:'500'}}>{label}</div>
      {desc&&<div style={{fontSize:'11px',color:'#3a5068',marginTop:'2px'}}>{desc}</div>}
    </div>
    {children}
  </div>
);

export default function AISettings() {
  const [settings, setSettings] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [stats,    setStats]    = useState(null);
  const [newKw,    setNewKw]    = useState('');
  const [dirty,    setDirty]    = useState(false);
  const [testMsg,  setTestMsg]  = useState('');
  const [testResult,setTestResult]=useState(null);
  const [testing,  setTesting]  = useState(false);

  const load = useCallback(async () => {
    try {
      const [sRes, stRes] = await Promise.all([
        api.get('/ai/settings'),
        api.get('/ai/stats').catch(()=>({data:null})),
      ]);
      setSettings(sRes.data.settings);
      if (stRes.data) setStats(stRes.data);
    } catch { toast.error('Failed to load AI settings'); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); },[load]);

  const upd = (f, v) => { setSettings(s=>({...s,[f]:v})); setDirty(true); };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put('/ai/settings', settings);
      setSettings(res.data.settings);
      setDirty(false);
      toast.success('AI settings saved!');
    } catch (err) { toast.error(err.response?.data?.error||'Save failed'); }
    finally { setSaving(false); }
  };

  const addKw = () => {
    const kw = newKw.trim().toLowerCase();
    if (!kw || settings.pause_keywords.includes(kw)) return;
    upd('pause_keywords', [...settings.pause_keywords, kw]);
    setNewKw('');
  };

  const testAnalyze = async () => {
    if (!testMsg.trim()) return;
    setTesting(true); setTestResult(null);
    try {
      const res = await api.post('/ai/analyze', { message_text: testMsg });
      setTestResult(res.data);
    } catch { toast.error('Test failed'); }
    finally { setTesting(false); }
  };

  const sentClr = { positive:'#34d399', neutral:'#60a5fa', negative:'#f43f5e' };

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'300px',gap:'10px',color:'#3a5068'}}><SpinSvg/> Loading AI settings…</div>;
  if (!settings) return <div style={{padding:'40px',textAlign:'center',color:'#f43f5e'}}>Failed to load settings</div>;

  return (
    <div style={{padding:'24px',maxWidth:'780px'}}>
      <style>{`@keyframes ai-spin{to{transform:rotate(360deg);}}`}</style>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
        <div>
          <div style={{fontSize:'18px',fontWeight:'800',color:'#e9edef',letterSpacing:'-.3px'}}>AI Management</div>
          <div style={{fontSize:'12px',color:'#3a5068',marginTop:'3px'}}>Control AI behaviour, auto-pause rules, and intent detection</div>
        </div>
        <button onClick={save} disabled={!dirty||saving} style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 18px',background:dirty?'linear-gradient(135deg,#00d4b8,#00b8a0)':'#1a2e42',border:'none',borderRadius:'10px',color:dirty?'#070b11':'#3a5068',fontSize:'13px',fontWeight:'700',cursor:dirty?'pointer':'not-allowed',transition:'all .2s'}}>
          {saving?<SpinSvg/>:<SaveIcon/>} {saving?'Saving…':'Save Changes'}
        </button>
      </div>

      {stats&&(
        <div style={{display:'flex',gap:'10px',marginBottom:'20px',flexWrap:'wrap'}}>
          {stats.sentiments?.map(s=>(
            <div key={s.sentiment} style={{flex:1,minWidth:'100px',background:'#0c1219',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'10px',padding:'12px 16px'}}>
              <div style={{fontSize:'20px',fontWeight:'800',color:sentClr[s.sentiment]||'#e9edef'}}>{s.count}</div>
              <div style={{fontSize:'11px',color:'#3a5068',marginTop:'2px',textTransform:'capitalize'}}>{s.sentiment} chats</div>
            </div>
          ))}
          {stats.paused_count>0&&(
            <div style={{flex:1,minWidth:'100px',background:'#0c1219',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'10px',padding:'12px 16px'}}>
              <div style={{fontSize:'20px',fontWeight:'800',color:'#f59e0b'}}>{stats.paused_count}</div>
              <div style={{fontSize:'11px',color:'#3a5068',marginTop:'2px'}}>AI paused</div>
            </div>
          )}
        </div>
      )}

      <Section icon={<BotIcon/>} title="AI Persona" desc="Name, model and system prompt">
        <div style={{display:'flex',gap:'12px',marginBottom:'16px',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:'180px'}}>
            <div style={{fontSize:'11px',color:'#536471',fontWeight:'600',marginBottom:'6px'}}>AI NAME</div>
            <input value={settings.ai_name} onChange={e=>upd('ai_name',e.target.value)} placeholder="e.g. Aria"
              style={{width:'100%',background:'#101924',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'9px 12px',color:'#edf2f8',fontSize:'13px',outline:'none',boxSizing:'border-box'}}/>
          </div>
          <div style={{flex:1,minWidth:'180px'}}>
            <div style={{fontSize:'11px',color:'#536471',fontWeight:'600',marginBottom:'6px'}}>MODEL</div>
            <select value={settings.model} onChange={e=>upd('model',e.target.value)}
              style={{width:'100%',background:'#101924',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'9px 12px',color:'#edf2f8',fontSize:'13px',outline:'none'}}>
              <option value="gpt-4o-mini">GPT-4o Mini (fast, cheap)</option>
              <option value="gpt-4o">GPT-4o (best quality)</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (legacy)</option>
            </select>
          </div>
        </div>
        <div style={{fontSize:'11px',color:'#536471',fontWeight:'600',marginBottom:'6px'}}>SYSTEM PROMPT</div>
        <textarea value={settings.system_prompt} onChange={e=>upd('system_prompt',e.target.value)} rows={6}
          style={{width:'100%',background:'#101924',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'10px 12px',color:'#edf2f8',fontSize:'13px',outline:'none',resize:'vertical',lineHeight:'1.6',fontFamily:'inherit',boxSizing:'border-box'}}/>
        <div style={{fontSize:'11px',color:'#3a5068',marginTop:'6px'}}>💡 Include your business name, tone, language, and what topics to avoid.</div>
      </Section>

      <Section icon={<PauseIcon/>} title="Auto-Pause Rules" desc="Pause AI on negative sentiment or trigger keywords" collapsible>
        <Row label="Auto-Pause Enabled" desc="Pause AI when negative sentiment or trigger keywords detected">
          <Toggle value={settings.auto_pause_enabled} onChange={v=>upd('auto_pause_enabled',v)}/>
        </Row>
        <Row label="Sentiment Analysis" desc="Detect customer mood from message content">
          <Toggle value={settings.sentiment_enabled} onChange={v=>upd('sentiment_enabled',v)}/>
        </Row>
        <div style={{paddingTop:'16px'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
            <span style={{fontSize:'12px',color:'#7d95b0'}}>Auto-Resume After</span>
            <span style={{fontSize:'13px',fontWeight:'700',color:'#f59e0b'}}>{settings.auto_resume_hours}h</span>
          </div>
          <div style={{position:'relative',height:'6px',background:'#1a2e42',borderRadius:'3px'}}>
            <div style={{position:'absolute',left:0,top:0,height:'6px',borderRadius:'3px',background:'#f59e0b',width:`${Math.min((settings.auto_resume_hours/24)*100,100)}%`}}/>
            <input type="range" min={1} max={24} step={1} value={settings.auto_resume_hours} onChange={e=>upd('auto_resume_hours',parseInt(e.target.value))}
              style={{position:'absolute',top:'-7px',left:0,width:'100%',opacity:0,cursor:'pointer',height:'20px'}}/>
          </div>
          <div style={{fontSize:'11px',color:'#3a5068',marginTop:'6px'}}>AI auto-resumes after <strong style={{color:'#f59e0b'}}>{settings.auto_resume_hours} hour{settings.auto_resume_hours!==1?'s':''}</strong> of agent inactivity</div>
        </div>
        <div style={{marginTop:'20px'}}>
          <div style={{fontSize:'11px',color:'#536471',fontWeight:'600',marginBottom:'10px'}}>PAUSE KEYWORDS</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'10px'}}>
            {settings.pause_keywords.map(kw=>(
              <div key={kw} style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',background:'rgba(244,63,94,0.1)',border:'1px solid rgba(244,63,94,0.25)',borderRadius:'20px'}}>
                <span style={{fontSize:'12px',color:'#fca5a5'}}>{kw}</span>
                <button onClick={()=>upd('pause_keywords',settings.pause_keywords.filter(k=>k!==kw))} style={{background:'none',border:'none',color:'#f43f5e',cursor:'pointer',display:'flex',padding:'0',lineHeight:1}}><TrashIcon/></button>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <input value={newKw} onChange={e=>setNewKw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addKw()} placeholder="Add keyword…"
              style={{flex:1,background:'#101924',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'7px 11px',color:'#edf2f8',fontSize:'12px',outline:'none'}}/>
            <button onClick={addKw} style={{display:'flex',alignItems:'center',gap:'5px',padding:'7px 12px',background:'rgba(244,63,94,0.1)',border:'1px solid rgba(244,63,94,0.25)',borderRadius:'8px',color:'#f43f5e',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>
              <PlusIcon/> Add
            </button>
          </div>
        </div>
      </Section>

      <Section icon={<BrainIcon/>} title="Intent Detection" desc="Classify customer messages automatically" collapsible>
        <Row label="Intent Classification" desc="Auto-detect: order, complaint, question, payment, other">
          <Toggle value={settings.intent_enabled} onChange={v=>upd('intent_enabled',v)}/>
        </Row>
        <div style={{marginTop:'16px',display:'flex',flexWrap:'wrap',gap:'8px'}}>
          {(settings.intent_categories||[]).map(cat=>(
            <div key={cat.key} style={{display:'flex',alignItems:'center',gap:'6px',padding:'6px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px'}}>
              <span style={{fontSize:'14px'}}>{cat.emoji}</span>
              <span style={{fontSize:'12px',color:'#c9d6df',fontWeight:'600'}}>{cat.label}</span>
              <div style={{width:'6px',height:'6px',borderRadius:'50%',background:cat.color}}/>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={<ZapIcon/>} title="Confidence Threshold" desc="When to suggest human handoff" collapsible>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
          <span style={{fontSize:'12px',color:'#7d95b0'}}>Confidence Threshold</span>
          <span style={{fontSize:'13px',fontWeight:'700',color:'#a78bfa'}}>{settings.confidence_threshold}%</span>
        </div>
        <div style={{position:'relative',height:'6px',background:'#1a2e42',borderRadius:'3px'}}>
          <div style={{position:'absolute',left:0,top:0,height:'6px',borderRadius:'3px',background:'#a78bfa',width:`${settings.confidence_threshold}%`}}/>
          <input type="range" min={0} max={100} step={5} value={settings.confidence_threshold} onChange={e=>upd('confidence_threshold',parseInt(e.target.value))}
            style={{position:'absolute',top:'-7px',left:0,width:'100%',opacity:0,cursor:'pointer',height:'20px'}}/>
        </div>
        <div style={{fontSize:'11px',color:'#3a5068',marginTop:'8px'}}>AI replies below <strong style={{color:'#a78bfa'}}>{settings.confidence_threshold}%</strong> confidence will be flagged for human review.</div>
      </Section>

      <Section icon={<ZapIcon/>} title="🧪 Test Console" desc="Test intent and sentiment on any message" collapsible>
        <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
          <input value={testMsg} onChange={e=>setTestMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&testAnalyze()}
            placeholder="e.g. I want to cancel my order, this is terrible!"
            style={{flex:1,background:'#101924',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'9px 12px',color:'#edf2f8',fontSize:'13px',outline:'none'}}/>
          <button onClick={testAnalyze} disabled={!testMsg.trim()||testing}
            style={{display:'flex',alignItems:'center',gap:'6px',padding:'9px 16px',background:'linear-gradient(135deg,#00d4b8,#00b8a0)',border:'none',borderRadius:'8px',color:'#070b11',fontSize:'13px',fontWeight:'700',cursor:testMsg.trim()?'pointer':'not-allowed'}}>
            {testing?<SpinSvg/>:'▶ Test'}
          </button>
        </div>
        {testResult&&(
          <div style={{background:'#101924',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'10px',padding:'14px',display:'flex',gap:'16px',flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:'110px'}}>
              <div style={{fontSize:'10px',color:'#536471',fontWeight:'600',marginBottom:'4px'}}>INTENT</div>
              <div style={{fontSize:'14px',fontWeight:'700',color:'#60a5fa',textTransform:'capitalize'}}>{testResult.intent}</div>
            </div>
            <div style={{flex:1,minWidth:'110px'}}>
              <div style={{fontSize:'10px',color:'#536471',fontWeight:'600',marginBottom:'4px'}}>SENTIMENT</div>
              <div style={{fontSize:'14px',fontWeight:'700',color:sentClr[testResult.sentiment]||'#e9edef',textTransform:'capitalize'}}>{testResult.sentiment}</div>
            </div>
            <div style={{flex:1,minWidth:'110px'}}>
              <div style={{fontSize:'10px',color:'#536471',fontWeight:'600',marginBottom:'4px'}}>SCORE</div>
              <div style={{fontSize:'14px',fontWeight:'700',color:'#e9edef'}}>{testResult.sentiment_score}</div>
            </div>
            <div style={{flex:1,minWidth:'110px'}}>
              <div style={{fontSize:'10px',color:'#536471',fontWeight:'600',marginBottom:'4px'}}>PAUSE AI?</div>
              <div style={{fontSize:'14px',fontWeight:'700',color:testResult.should_pause?'#f43f5e':'#34d399'}}>{testResult.should_pause?'⏸ Yes':'▶ No'}</div>
            </div>
            {testResult.pause_reason&&(
              <div style={{width:'100%',background:'rgba(244,63,94,0.08)',border:'1px solid rgba(244,63,94,0.2)',borderRadius:'8px',padding:'8px 12px',fontSize:'12px',color:'#fca5a5'}}>⚠ {testResult.pause_reason}</div>
            )}
          </div>
        )}
      </Section>

      {dirty&&(
        <div style={{position:'sticky',bottom:'0',background:'rgba(0,212,184,0.1)',border:'1px solid rgba(0,212,184,0.3)',borderRadius:'10px',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',backdropFilter:'blur(8px)'}}>
          <span style={{fontSize:'13px',color:'#00d4b8',fontWeight:'600'}}>⚠ You have unsaved changes</span>
          <button onClick={save} disabled={saving} style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 16px',background:'#00d4b8',border:'none',borderRadius:'8px',color:'#070b11',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
            {saving?<SpinSvg/>:<SaveIcon/>} Save Now
          </button>
        </div>
      )}
    </div>
  );
}
