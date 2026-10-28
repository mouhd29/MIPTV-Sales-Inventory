'use client';
import {useEffect,useState} from 'react';
import {Settings2,Package,FileText,Users,Save,ChevronRight,ShieldCheck} from 'lucide-react';
import AdminPanel from './AdminPanel';
type Group={title:string;items:string[]};
const groups:Group[]=[
 {title:'Account Setup',items:['General Settings','User Accounts','Logo Setup','Custom Fields','CRM & Accounts','Currency & Taxes','Pricing Tiers','Service Items','Number Sequences']},
 {title:'Inventory',items:['General Settings','Units Of Measure','Product Labels','Barcode Scanning','Shipping']},
 {title:'Documents',items:['General Settings','Invoices','Estimates','Sales Orders','Purchase Orders','Packing Lists','Stock Transfers']}
];
const schemas:Record<string,{key:string;label:string;type?:string;placeholder?:string}[]>={
 'CRM & Accounts':[{key:'default_customer_type',label:'Default customer type',placeholder:'Retail / Business'},{key:'credit_days',label:'Default credit days',type:'number'}],
 'Currency & Taxes':[{key:'currency',label:'Base currency',placeholder:'KWD'},{key:'currency_decimals',label:'Currency decimals',type:'number'},{key:'tax_label',label:'Tax name',placeholder:'VAT'},{key:'tax_rate',label:'Default tax rate (%)',type:'number'}],
 'Pricing Tiers':[{key:'tier_1',label:'Retail tier name'},{key:'tier_2',label:'Wholesale tier name'},{key:'tier_3',label:'VIP tier name'}],
 'Service Items':[{key:'service_prefix',label:'Service item code prefix',placeholder:'SRV-'},{key:'default_service_unit',label:'Service unit',placeholder:'Hour'}],
 'Number Sequences':[{key:'customer_prefix',label:'Customer prefix',placeholder:'CUS-'},{key:'invoice_prefix',label:'Invoice prefix',placeholder:'INV-'},{key:'order_prefix',label:'Sales order prefix',placeholder:'SO-'},{key:'purchase_prefix',label:'Purchase order prefix',placeholder:'PO-'}],
 'Inventory General Settings':[{key:'default_unit',label:'Default stock unit',placeholder:'PCS'},{key:'low_stock_threshold',label:'Low-stock alert threshold',type:'number'},{key:'valuation_method',label:'Preferred valuation label',placeholder:'Weighted Average'}],
 'Units Of Measure':[{key:'default_unit',label:'Default unit',placeholder:'PCS'},{key:'allowed_units',label:'Allowed units (comma separated)',placeholder:'PCS, BOX, KG, LTR'}],
 'Product Labels':[{key:'label_width_mm',label:'Label width (mm)',type:'number'},{key:'label_height_mm',label:'Label height (mm)',type:'number'},{key:'show_price',label:'Show price (yes/no)',placeholder:'yes'}],
 'Barcode Scanning':[{key:'barcode_format',label:'Barcode format',placeholder:'CODE128'},{key:'scanner_suffix',label:'Scanner suffix',placeholder:'Enter'}],
 'Shipping':[{key:'default_carrier',label:'Default carrier'},{key:'delivery_note_prefix',label:'Delivery note prefix',placeholder:'DN-'}],
 'Documents General Settings':[{key:'footer_note',label:'Default document footer'},{key:'payment_terms',label:'Default payment terms'}],
 'Invoices':[{key:'invoice_title',label:'Invoice title',placeholder:'SALES INVOICE'},{key:'footer_note',label:'Invoice footer message'},{key:'payment_terms',label:'Payment terms'}],
 'Estimates':[{key:'validity_days',label:'Estimate validity (days)',type:'number'},{key:'prefix',label:'Estimate prefix',placeholder:'EST-'}],
 'Sales Orders':[{key:'prefix',label:'Sales order prefix',placeholder:'SO-'},{key:'default_status',label:'Default status',placeholder:'Draft'}],
 'Purchase Orders':[{key:'prefix',label:'Purchase order prefix',placeholder:'PO-'},{key:'default_status',label:'Default status',placeholder:'Draft'}],
 'Packing Lists':[{key:'prefix',label:'Packing list prefix',placeholder:'PL-'},{key:'footer_note',label:'Packing list footer'}],
 'Stock Transfers':[{key:'prefix',label:'Stock transfer prefix',placeholder:'ST-'},{key:'require_reference',label:'Require reference (yes/no)',placeholder:'yes'}],
 'Custom Fields':[{key:'customer_fields',label:'Customer custom fields (comma separated)'},{key:'item_fields',label:'Inventory custom fields (comma separated)'},{key:'invoice_fields',label:'Invoice custom fields (comma separated)'}]
};
export default function AdminSettingsHub({onCompanyChange}:{onCompanyChange:(v:Record<string,string>)=>void}){
 const [group,setGroup]=useState('Account Setup'),[tab,setTab]=useState('General Settings'),[settings,setSettings]=useState<Record<string,Record<string,string>>>({}),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const key=tab==='General Settings'?group+' General Settings':tab;
 useEffect(()=>{fetch('/api/preferences').then(r=>r.json()).then(j=>{if(!j.error)setSettings(j);}).catch(()=>{});},[]);
 const select=(g:string,t:string)=>{setGroup(g);setTab(t);setMessage('');};
 const save=async()=>{setBusy(true);setMessage('');try{const r=await fetch('/api/preferences',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({section:key,settings:settings[key]||{}})});const j=await r.json();if(!r.ok)throw Error(j.error);setMessage('Preferences saved successfully.');}catch(e){setMessage(String(e));}finally{setBusy(false);}};
 return <div className="adminhub"><style>{`.adminhub{display:grid;grid-template-columns:235px minmax(0,1fr);gap:20px;color:#1b304e}.adminhub .sidenav{background:#f3f6fa;border:1px solid #e2e9f1;border-radius:15px;padding:16px}.adminhub .group{margin-bottom:19px}.adminhub .group h3{display:flex;align-items:center;gap:9px;color:#193758;font-size:16px;margin:0 0 10px;padding-bottom:10px;border-bottom:1px solid #dce4ee}.adminhub .navbtn{display:block;width:100%;border:0;background:transparent;color:#4d5f76;padding:10px 12px;text-align:left;border-radius:8px;cursor:pointer;font-size:13px}.adminhub .navbtn.active{background:#176b9f;color:white;font-weight:700}.adminhub .content{background:white;border:1px solid #e2e9f1;border-radius:15px;padding:26px;min-width:0}.adminhub .intro{color:#728198;font-size:13px}.adminhub .fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px;margin:25px 0}.adminhub label{display:grid;gap:8px;font-size:12px;font-weight:700;color:#64748b}.adminhub input{padding:12px;border:1px solid #d9e3ef;border-radius:9px;width:100%;color:#1e3554}.adminhub .save{display:inline-flex;align-items:center;gap:9px;border:0;background:#183f6c;color:white;padding:12px 19px;border-radius:9px;cursor:pointer;font-weight:700}.adminhub .message{padding:12px;background:#edf8f1;border-radius:8px;margin:15px 0}.adminhub .warning{background:#fff8e8;color:#806126;padding:12px;border-radius:8px;font-size:12px;margin-top:18px}@media(max-width:800px){.adminhub{grid-template-columns:1fr}.adminhub .sidenav{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}}`}</style>
 <aside className="sidenav">{groups.map((g,i)=>{const Icon=[Settings2,Package,FileText][i];return <div className="group" key={g.title}><h3><Icon size={20}/>{g.title}</h3>{g.items.map(t=><button key={t} className={'navbtn '+(group===g.title&&tab===t?'active':'')} onClick={()=>select(g.title,t)}>⚙ &nbsp;{t}</button>)}</div>;})}</aside>
 <div className="content"><div className="intro">Administration / {group}</div><h2 style={{margin:'10px 0 6px'}}>{tab}</h2><p className="intro">Manage your ERP configuration in one organized workspace.</p>
 {(tab==='User Accounts'||tab==='General Settings'||tab==='Logo Setup')&&group==='Account Setup'?<AdminPanel section={tab==='User Accounts'?'Users & Roles':'Settings'} onCompanyChange={onCompanyChange}/>:<><div className="fields">{(schemas[key]||[]).map(f=><label key={f.key}>{f.label}<input type={f.type||'text'} placeholder={f.placeholder||''} value={settings[key]?.[f.key]||''} onChange={e=>setSettings(s=>({...s,[key]:{...s[key],[f.key]:e.target.value}}))}/></label>)}</div><button className="save" disabled={busy} onClick={save}><Save size={17}/>{busy?'Saving…':'Save Preferences'}</button><p className="warning">These are saved configuration preferences. They do not automatically change existing invoices, tax calculations, stock valuation, barcode processing, or document numbering until the corresponding workflows are connected.</p></>}
 {message&&<div className="message">{message}</div>}</div></div>;
}
