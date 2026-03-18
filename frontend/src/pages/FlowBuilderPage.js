import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlow, Background, Controls, addEdge, Handle, Position,
  useNodesState, useEdgesState, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import api from '../services/api';
import toast from 'react-hot-toast';

// -- SVG Icons --------------------------------------------------
const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>;
const SaveIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const PlayIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>;
const PauseIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
const TrashIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>;

// -- Node type colours ------------------------------------------
const NODE_COLORS = {
  send_message:  '#00d4b8',
  set_variable:  '#6366f1',
  condition:     '#f59e0b',
  delay:         '#8b5cf6',
  end_flow:      '#ef4444',
  human_handoff: '#f97316',
  ai_reply:      '#10b981',
};

// -- Node type SVG icons --------------------------------------
const NodeIcons = {
  send_message:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  set_variable:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  condition:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>,
  delay:         () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  end_flow:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  human_handoff: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  ai_reply:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 110 20A10 10 0 0112 2z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
};

const NODE_LABELS = {
  send_message:  'Send Message',
  set_variable:  'Capture Input',
  condition:     'Condition',
  delay:         'Delay',
  end_flow:      'End Flow',
  human_handoff: 'Human Handoff',
  ai_reply:      'AI Reply',
};

// -- Custom Node Component --------------------------------------
const CustomNode = ({ data }) => {
  const color = NODE_COLORS[data.node_type] || '#00d4b8';
  const isEnd = data.node_type === 'end_flow';
  return (
    <div style={{
      background: '#1a2535', border: `1.5px solid ${color}33`,
      borderTop: `3px solid ${color}`, borderRadius: '10px',
      padding: '12px 16px', minWidth: '180px', maxWidth: '240px',
      boxShadow: `0 4px 20px rgba(0,0,0,0.4)`,
    }}>
      <Handle type="target" position={Position.Top}
        style={{ background: color, width: '12px', height: '12px',
          border: '2px solid #0b1117', borderRadius: '50%', top: '-7px' }} />
      <div style={{ fontSize: '11px', fontWeight: '700', color, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {(() => { const I = NodeIcons[data.node_type]; return I ? <><I/><span style={{marginLeft:'5px'}}>{NODE_LABELS[data.node_type] || data.node_type}</span></> : (NODE_LABELS[data.node_type] || data.node_type); })()}
      </div>
      <div style={{ fontSize: '13px', color: '#c9d8e8', wordBreak: 'break-word' }}>
        {data.label || <span style={{ color: '#4a6580', fontStyle: 'italic' }}>Click to configure</span>}
      </div>
      {!isEnd && (
        <Handle type="source" position={Position.Bottom}
          style={{ background: color, width: '12px', height: '12px',
            border: '2px solid #0b1117', borderRadius: '50%', bottom: '-7px' }} />
      )}

    </div>
  );
};

const nodeTypes = { custom: CustomNode };

// -- Node Config Panel ------------------------------------------
function NodeConfigPanel({ node, onUpdate, onDelete }) {
  const [cfg, setCfg] = useState(node?.data?.node_config || {});
  useEffect(() => { setCfg(node?.data?.node_config || {}); }, [node]);

  if (!node) return (
    <div style={s.panel}>
      <div style={s.panelEmpty}>
        <div style={{ fontSize: '28px', marginBottom: '10px' }}>🧩</div>
        <div style={{ fontSize: '13px', color: '#4a6580', textAlign: 'center' }}>
          Click a node to configure it, or drag a node type from the left panel onto the canvas
        </div>
      </div>
    </div>
  );

  const save = () => {
    let label = '';
    if (cfg.text)            label = cfg.text.substring(0, 40) + (cfg.text.length > 40 ? '…' : '');
    if (cfg.prompt)          label = cfg.prompt.substring(0, 40) + '…';
    if (cfg.delay_seconds)   label = `Wait ${cfg.delay_seconds}s`;
    if (cfg.message)         label = cfg.message.substring(0, 40);
    if (node.data.node_type === 'condition') label = `If {${cfg.variable}} ${cfg.operator} "${cfg.value}"`;
    if (node.data.node_type === 'ai_reply')  label = 'Hand off to AI';
    onUpdate(node.id, cfg, label);
    toast.success('Node saved');
  };

  const t = node.data.node_type;

  return (
    <div style={s.panel}>
      <div style={s.panelTitle}>{(() => { const I = NodeIcons[t]; return I ? <><I/><span style={{marginLeft:'6px'}}>{NODE_LABELS[t] || t}</span></> : (NODE_LABELS[t] || t); })()}</div>

      {t === 'send_message' && <>
        <Field label="Message Text">
          <textarea style={{...s.input, height:'90px', resize:'vertical'}}
            placeholder="Hi {name}, how can I help you today?"
            value={cfg.text||''} onChange={e=>setCfg({...cfg,text:e.target.value})}/>
        </Field>
      </>}

      {t === 'set_variable' && <>
        <Field label="Prompt to User">
          <input style={s.input} placeholder="Please share your order ID"
            value={cfg.prompt||''} onChange={e=>setCfg({...cfg,prompt:e.target.value})}/>
        </Field>
        <Field label="Save reply as variable">
          <input style={s.input} placeholder="e.g. order_id"
            value={cfg.variable_name||''} onChange={e=>setCfg({...cfg,variable_name:e.target.value})}/>
        </Field>
      </>}

      {t === 'condition' && <>
        <Field label="Variable to check">
          <input style={s.input} placeholder="e.g. order_id"
            value={cfg.variable||''} onChange={e=>setCfg({...cfg,variable:e.target.value})}/>
        </Field>
        <Field label="Operator">
          <select style={s.input} value={cfg.operator||'contains'}
            onChange={e=>setCfg({...cfg,operator:e.target.value})}>
            <option value="contains">Contains</option>
            <option value="equals">Equals</option>
            <option value="not_equals">Not Equals</option>
          </select>
        </Field>
        <Field label="Value">
          <input style={s.input} placeholder="e.g. yes"
            value={cfg.value||''} onChange={e=>setCfg({...cfg,value:e.target.value})}/>
        </Field>
      </>}

      {t === 'delay' && <>
        <Field label="Delay (seconds)">
          <input style={s.input} type="number" min="1" max="30"
            value={cfg.delay_seconds||3} onChange={e=>setCfg({...cfg,delay_seconds:parseInt(e.target.value)})}/>
        </Field>
      </>}

      {t === 'end_flow' && <>
        <Field label="Final Message (optional)">
          <textarea style={{...s.input, height:'80px', resize:'vertical'}}
            placeholder="Thank you! Have a great day 👋"
            value={cfg.message||''} onChange={e=>setCfg({...cfg,message:e.target.value})}/>
        </Field>
      </>}

      {t === 'human_handoff' && <>
        <Field label="Message before handoff">
          <textarea style={{...s.input, height:'80px', resize:'vertical'}}
            placeholder="Connecting you to a human agent..."
            value={cfg.message||''} onChange={e=>setCfg({...cfg,message:e.target.value})}/>
        </Field>
      </>}

      {t === 'ai_reply' && (
        <div style={{fontSize:'13px',color:'#4a6580',lineHeight:'1.6'}}>
          Flow will hand off to the AI assistant. The flow session ends here.
        </div>
      )}

      <div style={{display:'flex',gap:'8px',marginTop:'20px'}}>
        <button style={s.saveBtn} onClick={save}><SaveIcon/> Save Node</button>
        <button style={s.deleteBtn} onClick={() => onDelete(node.id)}><TrashIcon/></button>
      </div>

    </div>
  );
}

const Field = ({ label, children }) => (
  <div style={{marginBottom:'14px'}}>
    <div style={{fontSize:'11px',fontWeight:'600',color:'#8fa8b8',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.04em'}}>{label}</div>
    {children}
  </div>
);

// -- Main Builder Page ------------------------------------------
export default function FlowBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [flow, setFlow] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadFlow(); }, [id]);

  const loadFlow = async () => {
    try {
      const res = await api.get(`/flows/${id}`);
      setFlow(res.data.flow);
      const dbNodes = res.data.nodes || [];

      // Convert DB nodes → React Flow nodes
      const rfNodes = dbNodes.map(n => ({
        id: n.id,
        type: 'custom',
        position: { x: n.position_x || 0, y: n.position_y || 0 },
        data: {
          node_type: n.node_type,
          node_config: n.node_config || {},
          label: getLabelFromConfig(n.node_type, n.node_config),
        },
      }));

      // Convert next_node_id → edges
      const rfEdges = dbNodes
        .filter(n => n.next_node_id)
        .map(n => ({
          id: `e-${n.id}-${n.next_node_id}`,
          source: n.id,
          target: n.next_node_id,
          style: { stroke: '#00d4b8', strokeWidth: 1.5 },
          animated: true,
        }));

      setNodes(rfNodes);
      setEdges(rfEdges);
    } catch { toast.error('Failed to load flow'); }
  };

  const getLabelFromConfig = (type, cfg) => {
    if (!cfg) return '';
    if (cfg.text)          return cfg.text.substring(0, 40);
    if (cfg.prompt)        return cfg.prompt.substring(0, 40);
    if (cfg.delay_seconds) return `Wait ${cfg.delay_seconds}s`;
    if (cfg.message)       return cfg.message.substring(0, 40);
    if (type === 'condition') return `If {${cfg.variable||'?'}} ${cfg.operator||'contains'} "${cfg.value||'?'}"`;
    if (type === 'ai_reply')  return 'Hand off to AI';
    return '';
  };

  const onConnect = useCallback((params) => {
    setEdges(eds => addEdge({
      ...params,
      style: { stroke: '#00d4b8', strokeWidth: 1.5 },
      animated: true,
    }, eds));
  }, [setEdges]);

  const addNode = (nodeType) => {
    const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); });
    const newNode = {
      id,
      type: 'custom',
      position: { x: 200 + Math.random() * 200, y: 100 + nodes.length * 120 },
      data: { node_type: nodeType, node_config: {}, label: '' },
    };
    setNodes(nds => [...nds, newNode]);
  };

  const updateNode = (nodeId, config, label) => {
    setNodes(nds => nds.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, node_config: config, label } } : n
    ));
    setSelectedNode(prev => prev?.id === nodeId
      ? { ...prev, data: { ...prev.data, node_config: config, label } }
      : prev
    );
  };

  const deleteNode = (nodeId) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  };

  const saveFlow = async () => {
    setSaving(true);
    try {
      // Build next_node_id from edges
      const edgeMap = {};
      edges.forEach(e => { edgeMap[e.source] = e.target; });

      const dbNodes = nodes.map(n => ({
        id: n.id,
        node_type: n.data.node_type,
        node_config: n.data.node_config || {},
        position_x: n.position.x,
        position_y: n.position.y,
        next_node_id: edgeMap[n.id] || null,
      }));

      await api.put(`/flows/${id}`, {
        name: flow.name,
        description: flow.description,
        trigger_type: flow.trigger_type,
        trigger_value: flow.trigger_value,
        nodes: dbNodes,
      });
      toast.success('Flow saved!');
    } catch(err) { console.error('Save error:', err?.response?.data || err.message); toast.error('Failed to save flow: ' + (err?.response?.data?.error || err.message)); }
    finally { setSaving(false); }
  };

  const toggleActive = async () => {
    try {
      const res = await api.post(`/flows/${id}/activate`, { is_active: !flow.is_active });
      setFlow(res.data.flow);
      toast.success(res.data.flow.is_active ? '✅ Flow activated!' : 'Flow paused');
    } catch { toast.error('Failed to toggle flow'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0b1117' }}>
      {/* Top Bar */}
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={() => navigate('/', { state: { tab: 'flows' } })}><BackIcon /></button>
        <div style={s.flowName}>{flow?.name || 'Loading...'}</div>
        <div style={s.triggerInfo}>
          {flow?.trigger_type && <span style={s.triggerTag}>{flow.trigger_type}{flow.trigger_value ? `: "${flow.trigger_value}"` : ''}</span>}
          <span style={{...s.statusTag, background: flow?.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)', color: flow?.is_active ? '#10b981' : '#64748b'}}>
            {flow?.is_active ? '● Active' : '○ Inactive'}
          </span>
        </div>
        <div style={s.topActions}>
          <button onClick={() => setHelpOpen(true)} style={{display:'flex',alignItems:'center',gap:'6px',padding:'7px 14px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'9px',color:'#7d99b5',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>
            <span style={{fontSize:'14px',fontWeight:'700'}}>?</span> Help
          </button>
          <button style={s.saveBtn2} onClick={saveFlow} disabled={saving}>
            <SaveIcon /> {saving ? 'Saving...' : 'Save'}
          </button>
          <button style={{...s.activateBtn, background: flow?.is_active ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: flow?.is_active ? '#ef4444' : '#10b981'}}
            onClick={toggleActive}>
            {flow?.is_active ? <><PauseIcon/> Pause</> : <><PlayIcon/> Activate</>}
          </button>
        </div>
      </div>

      {/* Canvas + Panels */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel — Node Types */}
        <div style={s.leftPanel}>
          <div style={s.leftTitle}>Node Types</div>
          <div style={s.leftSub}>Drag or click to add</div>
          {Object.entries(NODE_LABELS).map(([type, label]) => {
            const Icon = NodeIcons[type];
            return (
              <button key={type} style={{...s.nodeTypeBtn, borderColor: NODE_COLORS[type]+'44'}}
                onClick={() => addNode(type)}>
                <div style={{...s.nodeTypeDot, background: NODE_COLORS[type], display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', width:'28px', height:'28px', borderRadius:'8px', flexShrink:0}}>
                  {Icon && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'block'}}>{NodeIcons[type] && NodeIcons[type]().props.children}</svg>}
                </div>
                <span style={{fontSize:'12px',color:'#c9d8e8'}}>{label}</span>
              </button>
            );
          })}
        </div>

        {/* React Flow Canvas */}
        <div style={{ flex: 1 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNode(node)}
            onPaneClick={() => setSelectedNode(null)}
            nodeTypes={nodeTypes}
            fitView
            style={{ background: '#0d1520' }}
          >
            <Background color="#1a2535" gap={20} />
            <Controls style={{ background: '#1a2535', border: '1px solid rgba(255,255,255,0.08)' }} />
            <Panel position="top-center">
              <div style={{background:'rgba(0,212,184,0.08)',border:'1px solid rgba(0,212,184,0.15)',borderRadius:'8px',padding:'6px 14px',fontSize:'12px',color:'#00d4b8'}}>
                {nodes.length} nodes · {edges.length} connections
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Right Panel — Node Config */}
        <NodeConfigPanel
          node={selectedNode}
          onUpdate={updateNode}
          onDelete={deleteNode}
        />
      </div>

      {/* Help Guide Sidebar */}
      {helpOpen && (
        <div style={{
          position:'fixed', inset:0, zIndex:9999, display:'flex', justifyContent:'flex-end'
        }}>
          <div onClick={() => setHelpOpen(false)} style={{
            position:'absolute', inset:0, background:'rgba(0,0,0,0.5)'
          }}/>
          <div style={{
            position:'relative', width:'min(700px, 90vw)', height:'100vh',
            background:'#090e1a', borderLeft:'1px solid rgba(255,255,255,0.1)',
            display:'flex', flexDirection:'column', zIndex:1
          }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0}}>
              <span style={{fontWeight:700, fontSize:15, color:'#00d4b8'}}>? Flow Builder Guide</span>
              <button onClick={() => setHelpOpen(false)} style={{
                background:'none', border:'none', color:'#7d99b5', cursor:'pointer',
                fontSize:22, lineHeight:1, padding:'0 4px'
              }}>✕</button>
            </div>
            <iframe
              src="/flow-guide.html"
              style={{flex:1, border:'none', width:'100%'}}
              title="Flow Builder Guide"
            />
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  topBar:{height:'56px',background:'#111b27',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',padding:'0 16px',gap:'12px',flexShrink:0},
  backBtn:{width:'34px',height:'34px',borderRadius:'9px',border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'#8fa8b8',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'},
  flowName:{fontSize:'15px',fontWeight:'700',color:'#e2e8f0',flex:1},
  triggerInfo:{display:'flex',gap:'8px',alignItems:'center'},
  triggerTag:{fontSize:'11px',color:'#a78bfa',background:'rgba(167,139,250,0.1)',padding:'3px 9px',borderRadius:'99px'},
  statusTag:{fontSize:'11px',fontWeight:'600',padding:'3px 9px',borderRadius:'99px'},
  topActions:{display:'flex',gap:'8px'},
  saveBtn2:{display:'flex',alignItems:'center',gap:'6px',padding:'7px 16px',background:'rgba(0,212,184,0.12)',border:'1px solid rgba(0,212,184,0.2)',borderRadius:'9px',color:'#00d4b8',fontSize:'12px',fontWeight:'600',cursor:'pointer'},
  activateBtn:{display:'flex',alignItems:'center',gap:'6px',padding:'7px 16px',border:'none',borderRadius:'9px',fontSize:'12px',fontWeight:'600',cursor:'pointer'},
  leftPanel:{width:'180px',background:'#111b27',borderRight:'1px solid rgba(255,255,255,0.06)',padding:'16px 12px',overflowY:'auto',flexShrink:0},
  leftTitle:{fontSize:'11px',fontWeight:'700',color:'#e2e8f0',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'4px'},
  leftSub:{fontSize:'11px',color:'#4a6580',marginBottom:'14px'},
  nodeTypeBtn:{display:'flex',alignItems:'center',gap:'8px',width:'100%',padding:'9px 10px',background:'rgba(255,255,255,0.02)',border:'1px solid',borderRadius:'8px',cursor:'pointer',marginBottom:'6px',textAlign:'left'},
  nodeTypeDot:{width:'8px',height:'8px',borderRadius:'50%',flexShrink:0},
  panel:{width:'260px',background:'#111b27',borderLeft:'1px solid rgba(255,255,255,0.06)',padding:'18px 16px',overflowY:'auto',flexShrink:0},
  panelEmpty:{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',padding:'20px'},
  panelTitle:{fontSize:'13px',fontWeight:'700',color:'#e2e8f0',marginBottom:'18px'},
  input:{width:'100%',background:'#0d1520',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'9px 12px',color:'#e2e8f0',fontSize:'13px',outline:'none',boxSizing:'border-box'},
  saveBtn:{display:'flex',alignItems:'center',gap:'6px',flex:1,padding:'9px 14px',background:'linear-gradient(135deg,#00d4b8,#00a884)',border:'none',borderRadius:'9px',color:'white',fontSize:'12px',fontWeight:'600',cursor:'pointer'},
  deleteBtn:{width:'36px',height:'36px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'9px',color:'#ef4444',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'},
};
