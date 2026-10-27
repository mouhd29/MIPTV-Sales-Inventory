'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {authClient} from '@/lib/auth/client';

export default function ResetPassword(){
 const [token,setToken]=useState('');
 const [invalid,setInvalid]=useState(false);
 const [password,setPassword]=useState('');
 const [confirm,setConfirm]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState(false);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  setToken(params.get('token')||'');
  setInvalid(Boolean(params.get('error')));
 },[]);
 async function submit(e:React.FormEvent){
  e.preventDefault();setError('');
  if(!token){setError('Reset link is missing or invalid. Request a new link.');return;}
  if(password.length<8){setError('Use at least 8 characters.');return;}
  if(password!==confirm){setError('Passwords do not match.');return;}
  setBusy(true);
  try{
   const result=await authClient.resetPassword({token,newPassword:password});
   if(result.error)throw Error(result.error.message||'Password reset failed');
   setSuccess(true);setPassword('');setConfirm('');
  }catch(err){setError(err instanceof Error?err.message:'Password reset failed');}
  finally{setBusy(false);}
 }
 return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#edf3f8',padding:16}}>
  <div style={{width:'min(420px,92vw)',padding:32,background:'white',borderRadius:12}}>
   <h1>MIPTV</h1><h2>Set a new password</h2>
   {success?<><p role="status">Your password was updated. You can now sign in.</p><Link href="/auth/sign-in">Go to sign in</Link></>:
   (invalid||!token)?<><p>This reset link is invalid or expired. Please request a new one.</p><Link href="/auth/sign-in">Back to sign in</Link></>:
   <form onSubmit={submit}>
    <label>New password<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%',padding:12,margin:'8px 0 15px'}}/></label>
    <label>Confirm password<input type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} style={{width:'100%',padding:12,margin:'8px 0 15px'}}/></label>
    {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
    <button type="submit" disabled={busy} style={{background:'#0d3657',color:'white',padding:13,width:'100%',border:0,borderRadius:6}}>{busy?'Updating...':'Update password'}</button>
   </form>}
  </div>
 </main>;
}
