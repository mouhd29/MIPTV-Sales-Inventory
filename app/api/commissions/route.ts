import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentAccess,canEdit} from '@/lib/auth/server';
export const dynamic='force-dynamic';
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
export async function GET(){
 if(!await currentAccess())return fail('Sign in required',403);
 try{const [salespeople,commissions]=await Promise.all([
 db()`SELECT id,name,active FROM salespeople ORDER BY name`,
 db()`SELECT c.id,c.invoice_id,c.sales_order_id,c.salesperson_id,c.amount,c.status,c.earned_at,c.approved_at,c.paid_at,c.payment_reference,c.notes,s.name salesperson,i.number invoice_number,i.date invoice_date,o.number order_number FROM sales_commissions c JOIN salespeople s ON s.id=c.salesperson_id JOIN sales_invoices i ON i.id=c.invoice_id LEFT JOIN sales_orders o ON o.id=c.sales_order_id ORDER BY c.id DESC LIMIT 2000`
 ]);return NextResponse.json({salespeople,commissions,defaultAmount:15});}catch(e){return fail(String(e),500);}
}
export async function POST(req:NextRequest){
 if(!await canEdit())return fail('Administrator or Editor required',403);
 try{const input=await req.json();
 if(input.action==='add_salesperson'){
 const name=String(input.name||'').trim();if(name.length<2||name.length>150)return fail('Salesperson name must be 2–150 characters');
 const rows=await db()`INSERT INTO salespeople(name) VALUES(${name}) RETURNING id,name,active`;return NextResponse.json(rows[0],{status:201});
 }
 if(input.action==='toggle_salesperson'){
 const id=Number(input.id);if(!Number.isSafeInteger(id)||id<1)return fail('Invalid salesperson');
 const rows=await db()`UPDATE salespeople SET active=NOT active WHERE id=${id} RETURNING id,name,active`;if(!rows.length)return fail('Salesperson not found',404);return NextResponse.json(rows[0]);
 }
 if(input.action==='approve'||input.action==='pay'){
 const id=Number(input.id);if(!Number.isSafeInteger(id)||id<1)return fail('Invalid commission');
 if(input.action==='approve'){
 const rows=await db()`UPDATE sales_commissions SET status='approved',approved_at=now() WHERE id=${id} AND status='pending' RETURNING id`;if(!rows.length)return fail('Only pending commissions can be approved');return NextResponse.json(rows[0]);
 }
 const reference=String(input.reference||'').trim();if(!reference||reference.length>200)return fail('Payment reference required (maximum 200 characters)');
 const rows=await db()`UPDATE sales_commissions SET status='paid',paid_at=now(),payment_reference=${reference} WHERE id=${id} AND status='approved' RETURNING id`;if(!rows.length)return fail('Approve commission before marking paid');return NextResponse.json(rows[0]);
 }
 return fail('Unknown action');
 }catch(e){return fail(e instanceof Error?e.message:'Commission operation failed',500);}
}
