'use client';
import {useState} from 'react';
import {authClient} from '@/lib/auth/client';

export default function SignIn(){
 const [email,setEmail]=useState('mouhd29@gmail.com');
 const [password,setPassword]=useState('');
 const [forgot,setForgot]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){
  e.preventDefault();setError('');setMessage('');setBusy(true);
  try {
   if(forgot){
    const redirectTo=window.location.origin+'/auth/reset-password';
    const result=await authClient.requestPasswordReset({email,redirectTo});
    if(result.error)throw Error(result.error.message||'Unable to request password reset');
    setMessage('If this email is registered, a password reset link will be sent. Check your inbox and spam folder.');
   } else {
    const result=await authClient.signIn.email({email,password});
    if(result.error)throw Error(result.error.message||'Sign in failed');
    window.location.href='/';
   }
  }catch(err){setError(err instanceof Error?err.message:'Request failed');}
  finally{setBusy(false);}
 }
 return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#edf3f8',padding:16}}>
  <form onSubmit={submit} style={{width:'min(420px,92vw)',padding:32,background:'white',borderRadius:12}}>
   <h1>MIPTV</h1><h2>{forgot?'Reset your password':'Administrator sign in'}</h2>
   <label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%',padding:12,margin:'8px 0 15px'}}/></label>
   {!forgot&&<label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%',padding:12,margin:'8px 15px 15px 0'}}/></label>}
   {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
   {message&&<p role="status" style={{color:'#166534'}}>{message}</p>}
   <button type="submit" disabled={busy} style={{background:'#0d3657',color:'white',padding:13,width:'100%',border:0,borderRadius:6,cursor:'pointer'}}>{busy?'Please wait...':forgot?'Send reset link':'Sign in'}</button>
   <button type="button" onClick={()=>{setForgot(!forgot);setError('');setMessage('');}} style={{marginTop:16,background:'none',border:0,color:'#0d3657',textDecoration:'underline',cursor:'pointer'}}>{forgot?'Back to sign in':'Forgot password?'}</button>
  </form>
 </main>;
}
