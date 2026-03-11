import React, { useState } from 'react';
import CannedResponsesSettings from './settings/CannedResponsesSettings';
import AISettings              from './settings/AISettings';

const ZapIcon     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const BotIcon     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V6a3 3 0 016 0v2"/><path d="M9 14h.01M15 14h.01" strokeLinecap="round"/></svg>;
const ChevronIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>;

const TABS = [
  { id:'ai',     label:'AI Management',    icon:<BotIcon/>,  desc:'Prompt, auto-pause, intents' },
  { id:'canned', label:'Canned Responses', icon:<ZapIcon/>,  desc:'Quick reply shortcuts' },
];

export default function SettingsPage() {
  const [active, setActive] = useState('ai');
  return (
    <div style={{display:'flex',height:'100%',background:'#070b11',overflow:'hidden'}}>
      <div style={{width:'230px',borderRight:'1px solid rgba(255,255,255,0.06)',padding:'24px 0',flexShrink:0,overflowY:'auto'}}>
        <div style={{padding:'0 18px 18px',borderBottom:'1px solid rgba(255,255,255,0.05)',marginBottom:'10px'}}>
          <div style={{fontSize:'11px',fontWeight:'700',color:'#3a5068',letterSpacing:'0.1em'}}>SETTINGS</div>
        </div>
        {TABS.map(tab=>(
          <button key={tab.id} onClick={()=>setActive(tab.id)}
            style={{width:'100%',display:'flex',alignItems:'center',gap:'10px',padding:'10px 18px',background:active===tab.id?'rgba(0,212,184,0.08)':'transparent',border:'none',borderLeft:active===tab.id?'2px solid #00d4b8':'2px solid transparent',cursor:'pointer',textAlign:'left',transition:'all 0.15s'}}>
            <div style={{color:active===tab.id?'#00d4b8':'#536471',display:'flex',alignItems:'center',transition:'color 0.15s'}}>{tab.icon}</div>
            <div style={{flex:1}}>
              <span style={{fontSize:'13px',fontWeight:active===tab.id?'600':'400',color:active===tab.id?'#e9edef':'#8696a0',transition:'color 0.15s'}}>{tab.label}</span>
              <div style={{fontSize:'10px',color:'#3a5068',marginTop:'1px'}}>{tab.desc}</div>
            </div>
            {active===tab.id&&<div style={{marginLeft:'auto',color:'#3a5068'}}><ChevronIcon/></div>}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        {active==='ai'     && <AISettings/>}
        {active==='canned' && <CannedResponsesSettings/>}
      </div>
    </div>
  );
}
