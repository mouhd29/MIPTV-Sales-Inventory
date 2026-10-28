import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentAccess,requireAdmin} from '@/lib/auth/server';
export const dynamic='force-dynamic';
export async function GET(){
 const access=await currentAccess();
 if(!access)return NextResponse.json({error:'Forbidden'},{status:403});
 if(access.role!=='admin')return NextResponse.json({email:access.email,role:access.role});
 try {const rows=await db()`SELECT email,role,active,updated_at FROM app_user_roles ORDER BY email`;
 return NextResponse.json({email:access.email,role:access.role,users:rows});}
 catch {return NextResponse.json({email:access.email,role:access.role,users:[],warning:'Database temporarily unavailable; account permissions are still valid.'});}
}
export async function PUT(req:NextRequest){
 if(!await requireAdmin())return NextResponse.json({error:'Admin only'},{status:403});
 try{
  const {email,role,active}=await req.json();
  if(typeof email!=='string'||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return NextResponse.json({error:'Invalid email'},{status:400});
  if(!['admin','editor','viewer'].includes(role)||typeof active!=='boolean')return NextResponse.json({error:'Invalid role or status'},{status:400});
  const normalized=email.trim().toLowerCase();
  if(normalized==='mouhd29@gmail.com'&&(role!=='admin'||!active))return NextResponse.json({error:'Owner administrator cannot be disabled or demoted'},{status:400});
  const rows=await db()`INSERT INTO app_user_roles(email,role,active) VALUES(${normalized},${role},${active}) ON CONFLICT(email) DO UPDATE SET role=excluded.role,active=excluded.active,updated_at=now() RETURNING email,role,active`;
  return NextResponse.json(rows[0]);
 }catch(e){return NextResponse.json({error:String(e)},{status:500});}
}
