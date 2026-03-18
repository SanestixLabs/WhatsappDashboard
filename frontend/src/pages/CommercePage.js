import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import ShopifyTab from './settings/ShopifyTab';

const T = {
  bg:'#070b11',bg2:'#0a1520',bg3:'#0f1e2e',bg4:'#162032',
  border:'rgba(255,255,255,0.07)',border2:'rgba(255,255,255,0.12)',
  text:'#edf2f8',text2:'#7a95af',
  teal:'#00d4b8',tealDim:'rgba(0,212,184,0.12)',tealBorder:'rgba(0,212,184,0.3)',
  red:'#f43f5e',redDim:'rgba(244,63,94,0.12)',
  yellow:'#f59e0b',yellowDim:'rgba(245,158,11,0.12)',
  blue:'#3b82f6',blueDim:'rgba(59,130,246,0.12)',
  green:'#10b981',greenDim:'rgba(16,185,129,0.12)',
  purple:'#8b5cf6',purpleDim:'rgba(139,92,246,0.12)',
};
const STATUS = {
  pending:  {bg:'rgba(245,158,11,0.12)',text:'#f59e0b',border:'rgba(245,158,11,0.3)'},
  confirmed:{bg:'rgba(59,130,246,0.12)', text:'#3b82f6',border:'rgba(59,130,246,0.3)'},
  shipped:  {bg:'rgba(139,92,246,0.12)', text:'#8b5cf6',border:'rgba(139,92,246,0.3)'},
  delivered:{bg:'rgba(16,185,129,0.12)', text:'#10b981',border:'rgba(16,185,129,0.3)'},
  cancelled:{bg:'rgba(244,63,94,0.12)',  text:'#f43f5e',border:'rgba(244,63,94,0.3)'},
};
const PAY = {
  unpaid:{bg:'rgba(244,63,94,0.12)',text:'#f43f5e'},
  paid:  {bg:'rgba(16,185,129,0.12)',text:'#10b981'},
};
const inp = {width:'100%',boxSizing:'border-box',padding:'9px 12px',background:'#0f1e2e',border:'1px solid rgba(255,255,255,0.12)',borderRadius:8,fontSize:14,color:'#edf2f8',outline:'none',fontFamily:'inherit'};
const card = {background:'#0a1520',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12};
const btnP = {padding:'9px 18px',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',border:'none',fontFamily:'inherit',background:'linear-gradient(135deg,#00d4b8,#00b8a0)',color:'#070b11'};
const btnG = {padding:'9px 18px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',background:'transparent',border:'1px solid rgba(255,255,255,0.12)',color:'#7a95af'};
const btnD = {padding:'9px 18px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',border:'none',fontFamily:'inherit',background:'rgba(244,63,94,0.12)',color:'#f43f5e'};

function Badge({s}){
  const c=STATUS[s]||{bg:'#162032',text:'#7a95af',border:'rgba(255,255,255,0.07)'};
  return <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:c.bg,color:c.text,border:'1px solid '+c.border}}>{s}</span>;
}
function PayBadge({s}){
  const c=PAY[s]||{bg:'#162032',text:'#7a95af'};
  return <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:c.bg,color:c.text}}>{s}</span>;
}
function Modal({open,onClose,title,children,width=580}){
  if(!open)return null;
  return <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
    <div onClick={e=>e.stopPropagation()} style={{...card,width:'100%',maxWidth:width,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 25px 60px rgba(0,0,0,0.6)'}}>
      <div style={{padding:'18px 24px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2 style={{margin:0,fontSize:17,fontWeight:700,color:'#edf2f8'}}>{title}</h2>
        <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#7a95af',lineHeight:1}}>x</button>
      </div>
      <div style={{padding:24}}>{children}</div>
    </div>
  </div>;
}
function Field({label,req,children}){
  return <div style={{marginBottom:16}}>
    <label style={{display:'block',fontSize:12,fontWeight:600,color:'#7a95af',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}{req&&<span style={{color:'#f43f5e'}}> *</span>}</label>
    {children}
  </div>;
}

function NewOrderModal({products,onClose,onSaved}){
  const [contact,setContact]=useState(null);
  const [contactQ,setContactQ]=useState('');
  const [contactRes,setContactRes]=useState([]);
  const [productQ,setProductQ]=useState('');
  const [showPDrop,setShowPDrop]=useState(false);
  const [items,setItems]=useState([{name:'',qty:1,price:''}]);
  const [currency,setCurrency]=useState('PKR');
  const [shipping,setShipping]=useState('');
  const [payLink,setPayLink]=useState('');
  const [notes,setNotes]=useState('');
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState('');
  const total=items.reduce((s,i)=>s+(parseFloat(i.price)||0)*(parseInt(i.qty)||1),0);
  useEffect(()=>{
    if(contactQ.length<2){setContactRes([]);return;}
    const t=setTimeout(async()=>{
      try{const r=await api.get('/contacts?search='+encodeURIComponent(contactQ)+'&limit=8');setContactRes(Array.isArray(r.data)?r.data:r.data&&r.data.contacts?r.data.contacts:[]);}catch{setContactRes([]);}
    },300);
    return()=>clearTimeout(t);
  },[contactQ]);
  const addProduct=p=>{
    setItems(prev=>{const ex=prev.findIndex(i=>i.name===p.name);if(ex>=0){const u=[...prev];u[ex]={...u[ex],qty:u[ex].qty+1};return u;}return [...prev.filter(i=>i.name),{name:p.name,qty:1,price:p.price}];});
    setCurrency(p.currency||'PKR');setProductQ('');setShowPDrop(false);
  };
  const filteredP=products.filter(p=>p.is_active&&p.name.toLowerCase().includes(productQ.toLowerCase()));
  const setItem=(idx,k,v)=>setItems(prev=>prev.map((x,i)=>i===idx?{...x,[k]:v}:x));
  const submit=async()=>{
    const valid=items.filter(i=>i.name&&i.price);
    if(!valid.length){setErr('Add at least one item with name and price.');return;}
    setSaving(true);setErr('');
    try{
      await api.post('/commerce/orders',{contact_id:contact?contact.id:null,items:valid,total_amount:total,currency,payment_link_url:payLink||null,notes:[notes,shipping?'Shipping: '+shipping:''].filter(Boolean).join('\n')||null});
      onSaved();
    }catch(e){setErr(e.response&&e.response.data&&e.response.data.error?e.response.data.error:'Failed to create order');}
    finally{setSaving(false);}
  };
  const dropStyle={position:'absolute',top:'100%',left:0,right:0,zIndex:50,...card,marginTop:4,maxHeight:200,overflowY:'auto',boxShadow:'0 12px 32px rgba(0,0,0,0.5)'};
  return <Modal open onClose={onClose} title="New Order" width={620}>
    <Field label="Customer Contact">
      <div style={{position:'relative'}}>
        <input style={inp} placeholder="Type name or phone..." value={contact?contact.name+' '+(contact.phone_number||''):contactQ} onChange={e=>{setContactQ(e.target.value);setContact(null);}}/>
        {contactRes.length>0&&!contact&&<div style={dropStyle}>{contactRes.map(c=><div key={c.id} style={{padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.07)'}} onMouseEnter={e=>e.currentTarget.style.background='#162032'} onMouseLeave={e=>e.currentTarget.style.background=''} onClick={()=>{setContact(c);setContactQ('');setContactRes([]);}}><div style={{fontWeight:600,color:'#edf2f8',fontSize:14}}>{c.name}</div><div style={{fontSize:12,color:'#7a95af'}}>{c.phone_number}</div></div>)}</div>}
      </div>
      {contact&&<div style={{marginTop:6,padding:'7px 12px',background:'rgba(0,212,184,0.12)',border:'1px solid rgba(0,212,184,0.3)',borderRadius:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,fontWeight:600,color:'#00d4b8'}}>Selected: {contact.name} - {contact.phone_number}</span><button onClick={()=>setContact(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#7a95af',fontSize:16}}>x</button></div>}
    </Field>
    <Field label="Add from Catalog">
      <div style={{position:'relative'}}>
        <input style={inp} placeholder="Search products..." value={productQ} onChange={e=>{setProductQ(e.target.value);setShowPDrop(true);}} onFocus={()=>setShowPDrop(true)}/>
        {showPDrop&&filteredP.length>0&&<div style={dropStyle}>{filteredP.map(p=><div key={p.id} style={{padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'center'}} onMouseEnter={e=>e.currentTarget.style.background='#162032'} onMouseLeave={e=>e.currentTarget.style.background=''} onClick={()=>addProduct(p)}><div><div style={{fontWeight:600,color:'#edf2f8',fontSize:14}}>{p.name}</div><div style={{fontSize:11,color:'#7a95af'}}>Stock: {p.stock!=null?p.stock:'unlimited'}</div></div><div style={{fontWeight:700,color:'#00d4b8'}}>{p.currency} {Number(p.price).toLocaleString()}</div></div>)}</div>}
      </div>
    </Field>
    <Field label="Order Items" req>
      {items.map((it,idx)=><div key={idx} style={{display:'grid',gridTemplateColumns:'1fr 65px 100px 32px',gap:8,marginBottom:8}}>
        <input style={inp} placeholder="Item name" value={it.name} onChange={e=>setItem(idx,'name',e.target.value)}/>
        <input style={inp} type="number" placeholder="Qty" value={it.qty} onChange={e=>setItem(idx,'qty',e.target.value)}/>
        <input style={inp} type="number" placeholder="Price" value={it.price} onChange={e=>setItem(idx,'price',e.target.value)}/>
        <button onClick={()=>setItems(p=>p.filter((_,i)=>i!==idx))} style={{background:'rgba(244,63,94,0.12)',border:'1px solid rgba(244,63,94,0.3)',borderRadius:6,color:'#f43f5e',cursor:'pointer',fontSize:16}}>x</button>
      </div>)}
      <button onClick={()=>setItems(p=>[...p,{name:'',qty:1,price:''}])} style={{fontSize:13,color:'#00d4b8',background:'rgba(0,212,184,0.12)',border:'1px dashed rgba(0,212,184,0.3)',borderRadius:8,padding:'6px 14px',cursor:'pointer',width:'100%',fontFamily:'inherit'}}>+ Add Item</button>
    </Field>
    <div style={{display:'grid',gridTemplateColumns:'1fr 110px',gap:12}}>
      <Field label="Total"><div style={{padding:'9px 14px',background:'rgba(0,212,184,0.12)',border:'1px solid rgba(0,212,184,0.3)',borderRadius:8,fontWeight:800,fontSize:17,color:'#00d4b8'}}>{currency} {total.toLocaleString()}</div></Field>
      <Field label="Currency"><input style={inp} value={currency} onChange={e=>setCurrency(e.target.value)}/></Field>
    </div>
    <Field label="Shipping Address"><input style={inp} placeholder="Street, City, Country..." value={shipping} onChange={e=>setShipping(e.target.value)}/></Field>
    <Field label="Payment Link"><input style={inp} placeholder="https://..." value={payLink} onChange={e=>setPayLink(e.target.value)}/></Field>
    <Field label="Notes"><textarea style={{...inp,minHeight:70,resize:'vertical'}} value={notes} onChange={e=>setNotes(e.target.value)}/></Field>
    {err&&<div style={{color:'#f43f5e',fontSize:13,marginBottom:12,padding:'8px 12px',background:'rgba(244,63,94,0.12)',borderRadius:8,border:'1px solid rgba(244,63,94,0.3)'}}>{err}</div>}
    <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}><button style={btnG} onClick={onClose}>Cancel</button><button style={btnP} onClick={submit} disabled={saving}>{saving?'Creating...':' Create Order'}</button></div>
  </Modal>;
}

function ProductModal({initial,onClose,onSaved}){
  const [form,setForm]=useState({name:'',description:'',price:'',currency:'PKR',stock:'',image_url:'',is_active:true});
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState('');
  useEffect(()=>{
    setForm(initial?{name:initial.name||'',description:initial.description||'',price:initial.price||'',currency:initial.currency||'PKR',stock:initial.stock!=null?initial.stock:'',image_url:initial.image_url||'',is_active:initial.is_active!=null?initial.is_active:true}:{name:'',description:'',price:'',currency:'PKR',stock:'',image_url:'',is_active:true});
  },[initial]);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const submit=async()=>{
    if(!form.name||form.price===''){setErr('Name and price required.');return;}
    setSaving(true);setErr('');
    try{
      if(initial&&initial.id)await api.patch('/commerce/products/'+initial.id,form);
      else await api.post('/commerce/products',form);
      onSaved();
    }catch(e){setErr(e.response&&e.response.data&&e.response.data.error?e.response.data.error:'Failed to save');}
    finally{setSaving(false);}
  };
  return <Modal open onClose={onClose} title={initial?'Edit Product':'New Product'} width={500}>
    <Field label="Product Name" req><input style={inp} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Premium T-Shirt"/></Field>
    <Field label="Description"><textarea style={{...inp,minHeight:70,resize:'vertical'}} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Describe the product..."/></Field>
    <div style={{display:'grid',gridTemplateColumns:'1fr 110px',gap:12}}>
      <Field label="Price" req><input style={inp} type="number" value={form.price} onChange={e=>set('price',e.target.value)} placeholder="0.00"/></Field>
      <Field label="Currency"><input style={inp} value={form.currency} onChange={e=>set('currency',e.target.value)}/></Field>
    </div>
    <Field label="Stock (blank=unlimited)"><input style={inp} type="number" value={form.stock} onChange={e=>set('stock',e.target.value)} placeholder="Leave blank for unlimited"/></Field>
    <Field label="Product Image">
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        <input type="file" accept="image/*" onChange={async(e)=>{
          const file=e.target.files[0]; if(!file) return;
          const fd=new FormData(); fd.append('image',file);
          try{
            const r=await api.post('/commerce/upload-image',fd,{headers:{'Content-Type':'multipart/form-data'}});
            set('image_url', r.data.url);
          }catch{ alert('Upload failed'); }
        }} style={{...inp,padding:'6px'}}/>
        {form.image_url&&<div style={{borderRadius:8,overflow:'hidden',height:120,backgroundImage:'url('+
          (form.image_url.startsWith('http')?form.image_url:(process.env.REACT_APP_API_URL||'')+form.image_url)
          +')',backgroundSize:'cover',backgroundPosition:'center'}}/>}
      </div>
    </Field>
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,padding:'10px 14px',background:'#0f1e2e',borderRadius:8,border:'1px solid rgba(255,255,255,0.07)'}}><input type="checkbox" id="active" checked={form.is_active} onChange={e=>set('is_active',e.target.checked)} style={{width:16,height:16,accentColor:'#00d4b8'}}/><label htmlFor="active" style={{fontSize:13,fontWeight:600,color:'#edf2f8',cursor:'pointer'}}>Active - visible to customers</label></div>
    {err&&<div style={{color:'#f43f5e',fontSize:13,marginBottom:12,padding:'8px 12px',background:'rgba(244,63,94,0.12)',borderRadius:8}}>{err}</div>}
    <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}><button style={btnG} onClick={onClose}>Cancel</button><button style={btnP} onClick={submit} disabled={saving}>{saving?'Saving...':'Save Product'}</button></div>
  </Modal>;
}

function OrderDetailModal({order,onClose,onUpdate}){
  const [sending,setSending]=useState(false);
  const [msg,setMsg]=useState('');
  if(!order)return null;
  const sc=STATUS[order.status]||{bg:'#162032',text:'#7a95af',border:'rgba(255,255,255,0.07)'};
  const pc=PAY[order.payment_status]||{bg:'#162032',text:'#7a95af'};
  const sendNotif=async()=>{setSending(true);setMsg('');try{await api.post('/commerce/orders/'+order.id+'/notify');setMsg('WhatsApp notification sent!');}catch{setMsg('Failed to send.');}finally{setSending(false);}};
  const notes=order.notes||'';
  const shippingLine=notes.split('\n').find(l=>l.startsWith('Shipping:'));
  const otherNotes=notes.split('\n').filter(l=>!l.startsWith('Shipping:')).join('\n').trim();
  return <Modal open onClose={onClose} title={'Order #'+order.order_number} width={560}>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20,alignItems:'center'}}><Badge s={order.status}/><PayBadge s={order.payment_status}/><span style={{marginLeft:'auto',fontWeight:800,fontSize:19,color:'#00d4b8'}}>{order.currency} {Number(order.total_amount).toLocaleString()}</span></div>
    {(order.contact_name||order.contact_phone)&&<div style={{padding:'12px 16px',background:'#0f1e2e',borderRadius:10,border:'1px solid rgba(255,255,255,0.07)',marginBottom:16}}><div style={{fontSize:11,fontWeight:700,color:'#7a95af',marginBottom:4,textTransform:'uppercase'}}>Customer</div><div style={{fontWeight:700,color:'#edf2f8'}}>{order.contact_name||'Unknown'}</div><div style={{color:'#7a95af',fontSize:13}}>{order.contact_phone}</div></div>}
    {order.tracking_number&&<div style={{padding:'12px 16px',background:'#0f1e2e',borderRadius:10,border:'1px solid rgba(255,255,255,0.07)',marginBottom:16}}>
      <div style={{fontSize:11,fontWeight:700,color:'#7a95af',marginBottom:4,textTransform:'uppercase'}}>Tracking Number</div>
      <div style={{fontSize:14,color:'#edf2f8',fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00d4b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        {order.tracking_number}
      </div>
      {order.tracking_url&&<a href={order.tracking_url} target="_blank" rel="noreferrer" style={{fontSize:12,color:'#00d4b8',marginTop:6,display:'inline-flex',alignItems:'center',gap:4}}>Track Shipment →</a>}
    </div>}
    {shippingLine&&<div style={{padding:'12px 16px',background:'#0f1e2e',borderRadius:10,border:'1px solid rgba(255,255,255,0.07)',marginBottom:16}}><div style={{fontSize:11,fontWeight:700,color:'#7a95af',marginBottom:4,textTransform:'uppercase'}}>Shipping</div><div style={{fontSize:14,color:'#edf2f8'}}>{shippingLine.replace('Shipping:','').trim()}</div></div>}
    <div style={{marginBottom:16}}>
      <div style={{fontSize:11,fontWeight:700,color:'#7a95af',marginBottom:8,textTransform:'uppercase'}}>Items</div>
      {(order.items||[]).map((it,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,0.07)',fontSize:14,color:'#edf2f8'}}><span>{it.name} x{it.qty||1}</span><span style={{fontWeight:600,color:'#00d4b8'}}>{order.currency} {(Number(it.price)*(it.qty||1)).toLocaleString()}</span></div>)}
      <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0 0',fontWeight:800,fontSize:16,color:'#edf2f8'}}><span>Total</span><span style={{color:'#00d4b8'}}>{order.currency} {Number(order.total_amount).toLocaleString()}</span></div>
    </div>
    {order.payment_link_url&&<div style={{padding:'10px 14px',background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:8,marginBottom:16,fontSize:13}}><a href={order.payment_link_url} target="_blank" rel="noreferrer" style={{color:'#10b981',fontWeight:600}}>View Payment Link</a></div>}
    {otherNotes&&<div style={{padding:'10px 14px',background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:8,marginBottom:16,fontSize:13,color:'#f59e0b'}}>{otherNotes}</div>}
    <div style={{marginBottom:16}}>
      <div style={{fontSize:11,fontWeight:700,color:'#7a95af',marginBottom:8,textTransform:'uppercase'}}>Update Status</div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{Object.keys(STATUS).map(s=>{const c=STATUS[s];const active=order.status===s;return <button key={s} onClick={()=>onUpdate(order.id,s)} style={{padding:'5px 14px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',background:active?c.bg:'#0f1e2e',color:active?c.text:'#7a95af',border:active?'1px solid '+c.border:'1px solid rgba(255,255,255,0.07)'}}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>;})}</div>
    </div>
    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
      {order.contact_phone&&<button onClick={sendNotif} disabled={sending} style={{...btnP,flex:1}}>{sending?'Sending...':'Send WhatsApp Notification'}</button>}
      <button onClick={()=>window.print()} style={{...btnG,flex:1}}>Print Order</button>
    </div>
    {msg&&<div style={{marginTop:10,fontSize:13,color:msg.startsWith('W')?'#00d4b8':'#f43f5e'}}>{msg}</div>}
  </Modal>;
}

export default function CommercePage(){
  const [tab,setTab]=useState('orders');
  const [orders,setOrders]=useState([]);
  const [products,setProducts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [filterStatus,setFilter]=useState('');
  const [search,setSearch]=useState('');
  const [showNewOrder,setNewOrder]=useState(false);
  const [showNewProd,setNewProd]=useState(false);
  const [editProd,setEditProd]=useState(null);
  const [detailOrder,setDetail]=useState(null);

  const fetchAll=useCallback(async()=>{
    try{
      const [o,p]=await Promise.all([api.get('/commerce/orders'+(filterStatus?'?status='+filterStatus:'')),api.get('/commerce/products')]);
      setOrders(Array.isArray(o.data)?o.data:[]);
      setProducts(Array.isArray(p.data)?p.data:[]);
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  },[filterStatus]);

  useEffect(()=>{fetchAll();},[fetchAll]);

  const updateStatus=async(id,status)=>{
    try{await api.patch('/commerce/orders/'+id,{status});setOrders(p=>p.map(o=>o.id===id?{...o,status}:o));if(detailOrder&&detailOrder.id===id)setDetail(d=>({...d,status}));}
    catch{alert('Failed to update status');}
  };
  const deleteProd=async id=>{
    if(!window.confirm('Delete this product?'))return;
    try{await api.delete('/commerce/products/'+id);fetchAll();}catch{alert('Failed to delete');}
  };
  const filtered=orders.filter(o=>{if(!search)return true;const q=search.toLowerCase();return String(o.order_number).includes(q)||(o.contact_name||'').toLowerCase().includes(q)||(o.contact_phone||'').includes(q);});
  const lowStock=products.filter(p=>p.is_active&&p.stock!=null&&p.stock<=5);
  const revenue=orders.filter(o=>o.payment_status==='paid').reduce((s,o)=>s+Number(o.total_amount),0);
  const thS={padding:'11px 16px',textAlign:'left',fontSize:10,fontWeight:700,color:'#7a95af',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'1px solid rgba(255,255,255,0.07)'};

  return <div style={{padding:24,minHeight:'100vh',background:'#070b11',fontFamily:'inherit',color:'#edf2f8'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
      <div><h1 style={{margin:0,fontSize:22,fontWeight:800,color:'#edf2f8'}}>Commerce</h1><p style={{margin:'4px 0 0',color:'#7a95af',fontSize:13}}>Manage products, orders and payments</p></div>
      <div style={{display:'flex',gap:10}}>
        {tab==='orders'&&<button style={btnP} onClick={()=>setNewOrder(true)}>+ New Order</button>}
        {tab==='products'&&<button style={btnP} onClick={()=>setNewProd(true)}>+ New Product</button>}
      </div>
    </div>
    {lowStock.length>0&&<div style={{marginBottom:16,padding:'11px 16px',background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:10,fontSize:13,color:'#f59e0b'}}>Low stock: {lowStock.map(p=>p.name+' ('+p.stock+' left)').join(', ')}</div>}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:24}}>
      {[{label:'Total Orders',value:orders.length,color:'#00d4b8'},{label:'Pending',value:orders.filter(o=>o.status==='pending').length,color:'#f59e0b'},{label:'Revenue (PKR)',value:revenue.toLocaleString(),color:'#10b981'},{label:'Products',value:products.length,color:'#8b5cf6'}].map(sc=><div key={sc.label} style={{...card,padding:'16px 20px',borderLeft:'3px solid '+sc.color}}><div style={{fontSize:24,fontWeight:800,color:sc.color}}>{loading?'...':sc.value}</div><div style={{fontSize:11,color:'#7a95af',fontWeight:600,marginTop:4}}>{sc.label}</div></div>)}
    </div>
    <div style={{display:'flex',gap:4,marginBottom:20,background:'#0a1520',borderRadius:10,padding:4,width:'fit-content',border:'1px solid rgba(255,255,255,0.07)'}}>
      {['orders','products','shopify'].map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:'7px 20px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:600,fontSize:13,fontFamily:'inherit',background:tab===t?'#00d4b8':'transparent',color:tab===t?'#070b11':'#7a95af'}}>{t==='orders'?'Orders':t==='products'?'Products':'🛒 Shopify'}</button>)}
    </div>
    {tab==='orders'&&<div>
      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <input style={{...inp,maxWidth:260}} placeholder="Search order #, name, phone..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{['','pending','confirmed','shipped','delivered','cancelled'].map(s=><button key={s} onClick={()=>setFilter(s)} style={{padding:'5px 14px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',border:'none',fontFamily:'inherit',background:filterStatus===s?'#00d4b8':'#0f1e2e',color:filterStatus===s?'#070b11':'#7a95af'}}>{s===''?'All':s.charAt(0).toUpperCase()+s.slice(1)}</button>)}</div>
      </div>
      {loading?<div style={{textAlign:'center',padding:60,color:'#7a95af'}}>Loading...</div>:filtered.length===0?<div style={{...card,textAlign:'center',padding:60,color:'#7a95af'}}><div style={{fontSize:15,fontWeight:600,marginBottom:8}}>No orders yet</div><button style={btnP} onClick={()=>setNewOrder(true)}>+ New Order</button></div>:
      <div style={{...card,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#0f1e2e'}}>{['Order #','Customer','Items','Total','Status','Payment','Actions'].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(o=><tr key={o.id} style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}} onMouseEnter={e=>e.currentTarget.style.background='#0f1e2e'} onMouseLeave={e=>e.currentTarget.style.background=''}>
            <td style={{padding:'12px 16px',fontWeight:700,color:'#00d4b8',fontSize:13}}>#{o.order_number}</td>
            <td style={{padding:'12px 16px',fontSize:13}}><div style={{fontWeight:600,color:'#edf2f8'}}>{o.contact_name||'—'}</div><div style={{fontSize:11,color:'#7a95af'}}>{o.contact_phone||''}</div></td>
            <td style={{padding:'12px 16px',fontSize:12,color:'#7a95af'}}>{(o.items||[]).length} item(s)</td>
            <td style={{padding:'12px 16px',fontWeight:700,fontSize:13,color:'#edf2f8'}}>{o.currency} {Number(o.total_amount).toLocaleString()}</td>
            <td style={{padding:'12px 16px'}}><Badge s={o.status}/></td>
            <td style={{padding:'12px 16px'}}><PayBadge s={o.payment_status}/></td>
            <td style={{padding:'12px 16px'}}><div style={{display:'flex',gap:6,alignItems:'center'}}><button onClick={()=>setDetail(o)} style={{padding:'4px 12px',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',border:'1px solid rgba(255,255,255,0.12)',background:'transparent',color:'#7a95af'}}>View</button><select value={o.status} onChange={e=>updateStatus(o.id,e.target.value)} style={{padding:'4px 8px',borderRadius:6,fontSize:11,cursor:'pointer',background:'#0f1e2e',border:'1px solid rgba(255,255,255,0.12)',color:'#7a95af',fontFamily:'inherit'}}>{Object.keys(STATUS).map(s=><option key={s} value={s}>{s}</option>)}</select></div></td>
          </tr>)}</tbody>
        </table>
      </div>}
    </div>}
    {tab==='products'&&<div>
      {loading?<div style={{textAlign:'center',padding:60,color:'#7a95af'}}>Loading...</div>:products.length===0?<div style={{...card,textAlign:'center',padding:60,color:'#7a95af'}}><div style={{fontSize:15,fontWeight:600,marginBottom:8}}>No products yet</div><button style={btnP} onClick={()=>setNewProd(true)}>+ New Product</button></div>:
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:14}}>
        {products.map(p=>{const isLow=p.stock!=null&&p.stock<=5;return <div key={p.id} style={{...card,overflow:'hidden'}}>
          <div style={{height:130,background:p.image_url?'url('+p.image_url+') center/cover':'linear-gradient(135deg,#0f1e2e,#162032)',display:'flex',alignItems:'center',justifyContent:'center',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>{!p.image_url&&<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(0,212,184,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>}</div>
          <div style={{padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}><div style={{fontWeight:700,fontSize:14,color:'#edf2f8'}}>{p.name}</div><span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:p.is_active?'rgba(16,185,129,0.12)':'#162032',color:p.is_active?'#10b981':'#7a95af'}}>{p.is_active?'Active':'Off'}</span></div>
            {p.description&&<div style={{fontSize:12,color:'#7a95af',marginBottom:8,lineHeight:1.5}}>{p.description}</div>}
            <div style={{fontWeight:800,fontSize:17,color:'#00d4b8',marginBottom:6}}>{p.currency} {Number(p.price).toLocaleString()}</div>
            <div style={{fontSize:12,marginBottom:12,color:isLow?'#f43f5e':'#7a95af',fontWeight:isLow?700:400}}>{p.stock==null?'Unlimited stock':isLow?'Low: '+p.stock+' left':'Stock: '+p.stock}</div>
            <div style={{display:'flex',gap:8}}><button style={{...btnG,flex:1,padding:'6px 0',fontSize:12}} onClick={()=>setEditProd(p)}>Edit</button><button style={{...btnD,flex:1,padding:'6px 0',fontSize:12}} onClick={()=>deleteProd(p.id)}>Delete</button></div>
          </div>
        </div>;})}
      </div>}
    </div>}
    {showNewOrder&&<NewOrderModal products={products} onClose={()=>setNewOrder(false)} onSaved={()=>{setNewOrder(false);fetchAll();}}/>}
    {(showNewProd||editProd)&&<ProductModal initial={editProd} onClose={()=>{setNewProd(false);setEditProd(null);}} onSaved={()=>{setNewProd(false);setEditProd(null);fetchAll();}}/>}
    {tab==='shopify'&&<ShopifyTab/>}
    {detailOrder&&<OrderDetailModal order={detailOrder} onClose={()=>setDetail(null)} onUpdate={updateStatus}/>}
  </div>;
}
