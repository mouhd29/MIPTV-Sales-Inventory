import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentAccess,canEdit} from '@/lib/auth/server';
export const dynamic='force-dynamic';
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
export async function GET(req:NextRequest){
 if(!await currentAccess())return fail('Sign in required',403);
 const query=String(req.nextUrl.searchParams.get('q')||'').trim().slice(0,120);
 const page=Math.max(1,Number(req.nextUrl.searchParams.get('page')||1)||1);
 const size=25,offset=(page-1)*size;
 try{
 const [count,customers,stats]=await Promise.all([
 db()`SELECT count(*)::int total FROM customers WHERE ${!query} OR code ILIKE ${'%'+query+'%'} OR name ILIKE ${'%'+query+'%'} OR email ILIKE ${'%'+query+'%'} OR phone ILIKE ${'%'+query+'%'}`,
 db()`SELECT id,code,name,email,phone,address,created_at FROM customers WHERE ${!query} OR code ILIKE ${'%'+query+'%'} OR name ILIKE ${'%'+query+'%'} OR email ILIKE ${'%'+query+'%'} OR phone ILIKE ${'%'+query+'%'} ORDER BY name ASC,id DESC LIMIT ${size} OFFSET ${offset}`,
 db()`SELECT count(*)::int total,count(*) FILTER(WHERE NULLIF(trim(email),'') IS NOT NULL)::int with_email,count(*) FILTER(WHERE NULLIF(trim(phone),'') IS NOT NULL)::int with_phone FROM customers`
 ]);
 return NextResponse.json({customers,total:count[0].total,page,pageSize:size,stats:stats[0]});
 }catch(e){return fail(String(e),500);}
}
export async function PATCH(req:NextRequest){
 if(!await canEdit())return fail('Administrator or Editor required',403);
 try{
 const p=await req.json();const id=Number(p.id),code=String(p.code||'').trim(),name=String(p.name||'').trim(),email=String(p.email||'').trim(),phone=String(p.phone||'').trim(),address=String(p.address||'').trim();
 if(!Number.isSafeInteger(id)||id<1||!code||!name||code.length>120||name.length>300)return fail('Valid customer code and name are required');
 const original=await db()`SELECT code FROM customers WHERE id=${id}`;if(!original.length)return fail('Customer not found',404);
 if(original[0].code!==code)return fail('Customer code cannot be changed because orders and invoices refer to it. Create a new customer code instead.');
 const rows=await db()`UPDATE customers SET name=${name},email=${email},phone=${phone},address=${address} WHERE id=${id} RETURNING id,code,name,email,phone,address`;
 return NextResponse.json(rows[0]);
 }catch(e){return fail(String(e),500);}
}
export async function DELETE(req:NextRequest){
 const access=await currentAccess();if(!access||access.role!=='admin')return fail('Administrator required',403);
 try{
 const id=Number(req.nextUrl.searchParams.get('id'));if(!Number.isSafeInteger(id)||id<1)return fail('Invalid customer id');
 const rows=await db()`SELECT code FROM customers WHERE id=${id}`;if(!rows.length)return fail('Customer not found',404);
 const code=rows[0].code;
 const [orders,invoices,estimates]=await Promise.all([db()`SELECT 1 FROM sales_orders WHERE customer_code=${code} LIMIT 1`,db()`SELECT 1 FROM sales_invoices WHERE customer_code=${code} LIMIT 1`,db()`SELECT 1 FROM estimates WHERE customer_code=${code} LIMIT 1`]);
 if(orders.length||invoices.length||estimates.length)return fail('Customer has linked documents and cannot be deleted. Preserve the transaction history.');
 await db()`DELETE FROM customers WHERE id=${id}`;return NextResponse.json({deleted:true});
 }catch(e){return fail(String(e),500);}
}
