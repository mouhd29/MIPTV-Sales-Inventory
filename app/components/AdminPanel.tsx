'use client';
import {useEffect,useState} from 'react';
type Role='admin'|'editor'|'viewer';
type User={email:string;role:Role;active:boolean};
const fields:[string,string][]=[['company_name','Company name'],['company_name_ar','Company name (Arabic)'],['registration_number','Registration / CR number'],['tax_number','Tax number'],['address','Address'],['phone','Telephone'],['mobile','Mobile'],['email','Company email'],['website','Website']];
export default function AdminPanel({section,onCompanyChange}:{section:string;onCompanyChange:(v:Record<string,string>)=>void}){
 const [company,setCompany]=useState<Record<string,string>>({});
 const [users,setUsers]=useState<User[]>([]);
 const [access,setAccess]=useState<{email:string;role:Role}|null>(null);
 const [email,setEmail]=useState('');
 const [role,setRole]=useState<Role>('viewer');
 const [notice,setNotice]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{(async()=>{try{
  const r=await fetch('/api/users');const j=await r.json();if(!r.ok)throw Error(j.error);
  setAccess({email:j.email,role:j.role});setUsers(j.users||[]);
  if(section==='Settings'){const c=await fetch('/api/company');if(c.ok)setCompany(await c.json());}
 }catch(e){setNotice(String(e));}})()},[section]);
 async function saveCompany(){setBusy(true);setNotice('');try{
  const r=await fetch('/api/company',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(company)});
  const j=await r.json();if(!r.ok)throw Error(j.error);
  setCompany(j);onCompanyChange(j);setNotice('Company details saved.');
 }catch(e){setNotice(String(e));}finally{setBusy(false);}}
 async function uploadLogo(file:File){setNotice('');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>250000){setNotice('Please select a PNG, JPEG or WebP image smaller than 250 KB.');return;}
  const reader=new FileReader();reader.onload=()=>setCompany(c=>({...c,logo_data:String(reader.result)}));reader.readAsDataURL(file);
 }
 async function saveUser(next:User){setBusy(true);setNotice('');try{
  const r=await fetch('/api/users',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)});
  const j=await r.json();if(!r.ok)throw Error(j.error);
  setUsers(current=>[...current.filter(u=>u.email!==j.email),j].sort((a,b)=>a.email.localeCompare(b.email)));
  setNotice('Permissions saved. The user must also have a registered Neon Auth account.');
 }catch(e){setNotice(String(e));}finally{setBusy(false);}}
 if(!access)return <section className="panel">Loading administration...</section>;
 if(access.role!=='admin')return <section className="panel">Administrator access required.</section>;
 return <section className="panel"><h2>{section}</h2>{notice&&<p role="status">{notice}</p>}
 {section==='Settings'?<>
 <p>Company details will be displayed on the MIPTV dashboard. Upload a compact logo and save your changes.</p>
 {company.logo_data&&<img src={company.logo_data} alt="Company logo" style={{maxHeight:95,maxWidth:240,objectFit:'contain',display:'block',marginBottom:12}}/>}
 <label>Logo (PNG/JPEG/WebP, max 250 KB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{if(e.target.files?.[0])uploadLogo(e.target.files[0]);}}/></label>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginTop:18}}>{fields.map(([key,label])=><label key={key} style={{display:'grid',gap:6}}>{label}<input style={{padding:10}} value={company[key]||''} onChange={e=>setCompany(c=>({...c,[key]:e.target.value}))}/></label>)}</div>
 <button className="primary" disabled={busy} onClick={saveCompany} style={{marginTop:18}}>Save company details</button>
 </>:<>
 <p>Administrator: all access. Editor: view, create and import records. Viewer: read-only. Permissions apply only after a user has registered and signed in with Neon Auth.</p>
 <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'18px 0'}}>
 <input type="email" placeholder="user@example.com" value={email} onChange={e=>setEmail(e.target.value)} style={{padding:10,minWidth:230}}/>
 <select value={role} onChange={e=>setRole(e.target.value as Role)}><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Administrator</option></select>
 <button className="primary" disabled={busy||!email} onClick={()=>saveUser({email:email.trim().toLowerCase(),role,active:true})}>Add / update user</button></div>
 <div className="tablewrap"><table><thead><tr><th>Email</th><th>Role</th><th>Access</th><th>Save</th></tr></thead><tbody>{users.map(u=><tr key={u.email}><td>{u.email}</td><td><select value={u.role} disabled={u.email==='mouhd29@gmail.com'} onChange={e=>setUsers(prev=>prev.map(x=>x.email===u.email?{...x,role:e.target.value as Role}:x))}><option value="admin">Administrator</option><option value="editor">Editor</option><option value="viewer">Viewer</option></select></td><td><input type="checkbox" checked={u.active} disabled={u.email==='mouhd29@gmail.com'} onChange={e=>setUsers(prev=>prev.map(x=>x.email===u.email?{...x,active:e.target.checked}:x))}/></td><td><button disabled={busy} onClick={()=>saveUser(u)}>Save</button></td></tr>)}</tbody></table></div>
 </>}
 </section>;
}
