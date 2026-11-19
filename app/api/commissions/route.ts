import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentAccess,canEdit,requireAdmin} from '@/lib/auth/server';
export const dynamic='force-dynamic';
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
export async function GET(){
 if(!await currentAccess())return fail('Sign in required',403);
 try{const [salespeople,commissions,settings,audit]=await Promise.all([
 db()`SELECT id,name,active FROM salespeople ORDER BY name`,
 db()`SELECT c.id,c.invoice_id,c.sales_order_id,c.salesperson_id,c.amount,c.status,c.earned_at,c.approved_at,c.paid_at,c.payment_reference,c.notes,s.name salesperson,i.number invoice_number,i.date invoice_date,o.number order_number FROM sales_commissions c JOIN salespeople s ON s.id=c.salesperson_id JOIN sales_invoices i ON i.id=c.invoice_id LEFT JOIN sales_orders o ON o.id=c.sales_order_id ORDER BY c.id DESC LIMIT 2000`,
 db()`SELECT default_amount FROM commission_settings WHERE id=1`,
 db()`SELECT id,commission_id,salesperson_id,actor_email,action,details,created_at FROM commission_audit ORDER BY id DESC LIMIT 100`
 ]);return NextResponse.json({salespeople,commissions,defaultAmount:Number(settings[0]?.default_amount??15),audit});}catch(e){return fail(String(e),500);}
}
export async function POST(req:NextRequest){
 if(!await canEdit())return fail('Administrator or Editor required',403);
 try{const input=await req.json();
 const actor=await currentAccess();
 const admin=actor?.role==='admin';
 if(['rename_salesperson','delete_salesperson','edit_commission','reverse_payment','set_default_amount'].includes(String(input.action))&&!admin)return fail('Administrator required',403);
 const audit=async(action:string,details:Record<string,unknown>,commissionId:number|null=null,salespersonId:number|null=null)=>{await db()`INSERT INTO commission_audit(commission_id,salesperson_id,actor_email,action,details) VALUES(${commissionId},${salespersonId},${actor?.email||'unknown'},${action},${JSON.stringify(details)}::jsonb)`;};
 if(input.action==='set_default_amount'){
 const amount=Number(input.amount);if(!Number.isFinite(amount)||amount<0||amount>100000||Math.round(amount*1000)!==amount*1000)return fail('Enter a valid amount with up to 3 decimals');
 const previous=await db()`SELECT default_amount FROM commission_settings WHERE id=1`;
 await db()`UPDATE commission_settings SET default_amount=${amount},updated_at=now() WHERE id=1`;
 await audit('default_amount_changed',{before:previous[0]?.default_amount,after:amount});return NextResponse.json({defaultAmount:amount});
 }
 if(input.action==='rename_salesperson'){
 const id=Number(input.id),name=String(input.name||'').trim();if(!Number.isSafeInteger(id)||id<1||name.length<2||name.length>150)return fail('Valid salesperson and name required');
 const old=await db()`SELECT name FROM salespeople WHERE id=${id}`;if(!old.length)return fail('Salesperson not found',404);
 const rows=await db()`UPDATE salespeople SET name=${name} WHERE id=${id} RETURNING id,name`;
 await audit('salesperson_renamed',{before:old[0].name,after:name},null,id);return NextResponse.json(rows[0]);
 }
 if(input.action==='delete_salesperson'){
 const id=Number(input.id);if(!Number.isSafeInteger(id)||id<1)return fail('Invalid salesperson');
 const linked=await db()`SELECT (SELECT count(*)::int FROM sales_orders WHERE salesperson_id=${id}) orders,(SELECT count(*)::int FROM sales_commissions WHERE salesperson_id=${id}) commissions`;
 if(Number(linked[0].orders)+Number(linked[0].commissions)>0)return fail('Salesperson has linked orders or commissions. Deactivate instead.');
 const rows=await db()`DELETE FROM salespeople WHERE id=${id} RETURNING name`;if(!rows.length)return fail('Salesperson not found',404);
 await audit('salesperson_deleted',{name:rows[0].name},null,id);return NextResponse.json({deleted:true});
 }
 if(input.action==='edit_commission'){
 const id=Number(input.id),amount=Number(input.amount),salespersonId=Number(input.salesperson_id);
 if(!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(salespersonId)||salespersonId<1||!Number.isFinite(amount)||amount<0||amount>100000||Math.round(amount*1000)!==amount*1000)return fail('Invalid commission amount or salesperson');
 const old=await db()`SELECT amount,salesperson_id,status FROM sales_commissions WHERE id=${id}`;if(!old.length||old[0].status!=='pending')return fail('Only pending commissions can be edited');
 const agent=await db()`SELECT id FROM salespeople WHERE id=${salespersonId}`;if(!agent.length)return fail('Salesperson not found');
 const rows=await db()`UPDATE sales_commissions SET amount=${amount},salesperson_id=${salespersonId} WHERE id=${id} AND status='pending' RETURNING id`;
 if(!rows.length)return fail('Commission no longer pending');
 await audit('commission_edited',{before:{amount:old[0].amount,salesperson_id:old[0].salesperson_id},after:{amount,salesperson_id:salespersonId}},id,salespersonId);return NextResponse.json(rows[0]);
 }
 if(input.action==='reverse_payment'){
 const id=Number(input.id),reason=String(input.reason||'').trim();if(!Number.isSafeInteger(id)||id<1||reason.length<5||reason.length>500)return fail('Provide a reversal reason (5–500 characters)');
 const old=await db()`SELECT status,payment_reference,paid_at FROM sales_commissions WHERE id=${id}`;if(!old.length||old[0].status!=='paid')return fail('Only paid commissions can be reversed');
 const rows=await db()`UPDATE sales_commissions SET status='approved',paid_at=NULL,payment_reference=NULL WHERE id=${id} AND status='paid' RETURNING id`;
 if(!rows.length)return fail('Commission is no longer paid');
 await audit('payment_reversed',{reason,previous_payment_reference:old[0].payment_reference,previous_paid_at:old[0].paid_at},id);return NextResponse.json(rows[0]);
 }

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
