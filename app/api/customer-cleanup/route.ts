import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentAccess} from '@/lib/auth/server';
export const dynamic='force-dynamic';
const normalize=(v:string)=>v.trim().toLocaleLowerCase().replace(/\s+/g,' ');
export async function GET(){
 const access=await currentAccess();if(!access)return NextResponse.json({error:'Sign in required'},{status:403});
 try{
 const rows=await db()`SELECT c.id,c.code,c.name,c.phone,c.email,c.address,EXISTS(SELECT 1 FROM sales_orders s WHERE s.customer_code=c.code) OR EXISTS(SELECT 1 FROM sales_invoices i WHERE i.customer_code=c.code) OR EXISTS(SELECT 1 FROM estimates e WHERE e.customer_code=c.code) linked FROM customers c ORDER BY c.id ASC`;
 const groups=new Map<string,typeof rows>();
 for(const c of rows){const name=normalize(String(c.name||''));const phone=String(c.phone||'').replace(/[^0-9]/g,'');for(const key of [name?'name:'+name:'',phone.length>=6?'phone:'+phone:'']){if(!key)continue;const list=groups.get(key)||[];list.push(c);groups.set(key,list);}}
 const duplicates=[...groups.entries()].filter(([,v])=>v.length>1).map(([key,v])=>({type:key.startsWith('name:')?'Name':'Phone',value:key.slice(key.indexOf(':')+1),customers:v.map(c=>({id:c.id,code:c.code,name:c.name,phone:c.phone,email:c.email,linked:c.linked}))}));
 return NextResponse.json({total:rows.length,linked:rows.filter(c=>c.linked).length,unlinked:rows.filter(c=>!c.linked).length,duplicates});
 }catch(e){return NextResponse.json({error:String(e)},{status:500});}
}
export async function POST(req:NextRequest){
 const access=await currentAccess();if(!access||access.role!=='admin')return NextResponse.json({error:'Administrator required'},{status:403});
 try{
 const p=await req.json();
 if(p.action!=='delete_unlinked'||p.confirm!=='DELETE UNLINKED CUSTOMERS')return NextResponse.json({error:'Explicit confirmation required'},{status:400});
 const deleted=await db().begin(async tx=>tx`DELETE FROM customers c WHERE NOT EXISTS(SELECT 1 FROM sales_orders s WHERE s.customer_code=c.code) AND NOT EXISTS(SELECT 1 FROM sales_invoices i WHERE i.customer_code=c.code) AND NOT EXISTS(SELECT 1 FROM estimates e WHERE e.customer_code=c.code) RETURNING id`);
 return NextResponse.json({deleted:deleted.length,keptLinked:true});
 }catch(e){return NextResponse.json({error:String(e)},{status:500});}
}
