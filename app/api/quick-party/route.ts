import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {canEdit} from '@/lib/auth/server';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest){
 if(!await canEdit())return NextResponse.json({error:'Administrator or Editor required'},{status:403});
 try{
 const p=await req.json(),kind=p.kind;
 if(kind!=='customer'&&kind!=='supplier')return NextResponse.json({error:'Invalid party type'},{status:400});
 const name=String(p.name||'').trim(),email=String(p.email||'').trim(),phone=String(p.phone||'').trim(),address=String(p.address||'').trim();
 if(!name||name.length>300)return NextResponse.json({error:'Name is required (maximum 300 characters)'},{status:400});
 let code=String(p.code||'').trim();
 if(code.length>120)return NextResponse.json({error:'Code is too long'},{status:400});
 const table=kind==='customer'?'customers':'suppliers';
 if(!code){const seq=await db()`SELECT nextval('public.quick_party_code_seq') AS n`;code=(kind==='customer'?'CUST-':'SUP-')+String(seq[0].n).padStart(7,'0');}
 const rows=await db().unsafe('INSERT INTO '+table+' (code,name,email,phone,address) VALUES ($1,$2,$3,$4,$5) RETURNING code,name,email,phone,address',[code,name,email,phone,address]);
 return NextResponse.json(rows[0],{status:201});
 }catch(e){const msg=String(e);return NextResponse.json({error:msg.includes('duplicate key')?'This code already exists. Please choose a different code.':msg},{status:400});}
}
