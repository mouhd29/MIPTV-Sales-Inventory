import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentAccess,canEdit} from '@/lib/auth/server';
export const dynamic='force-dynamic';
const bad=(error:string,status=400)=>NextResponse.json({error},{status});
export async function GET(){
 if(!await currentAccess())return bad('Sign in required',403);
 try{
 const [customers,items,orders,invoices,orderLines,invoiceLines,movements]=await Promise.all([
 db()`SELECT code,name,email,phone,address FROM customers ORDER BY name LIMIT 2000`,
 db()`SELECT sku,name,category,unit,cost,price,quantity FROM items ORDER BY name LIMIT 2000`,
 db()`SELECT o.*,c.name customer_name,i.id invoice_id,i.number invoice_number FROM sales_orders o LEFT JOIN customers c ON c.code=o.customer_code LEFT JOIN sales_invoices i ON i.sales_order_id=o.id ORDER BY o.id DESC LIMIT 500`,
 db()`SELECT i.*,c.name customer_name,o.number order_number FROM sales_invoices i LEFT JOIN customers c ON c.code=i.customer_code LEFT JOIN sales_orders o ON o.id=i.sales_order_id ORDER BY i.id DESC LIMIT 500`,
 db()`SELECT l.* FROM sales_order_lines l JOIN (SELECT id FROM sales_orders ORDER BY id DESC LIMIT 500) o ON o.id=l.order_id ORDER BY l.id`,
 db()`SELECT l.* FROM sales_invoice_lines l JOIN (SELECT id FROM sales_invoices ORDER BY id DESC LIMIT 500) i ON i.id=l.invoice_id ORDER BY l.id`,
 db()`SELECT id,sku,movement_type,quantity,reference,created_at FROM stock_movements ORDER BY id DESC LIMIT 100`
 ]);
 return NextResponse.json({customers,items,orders,invoices,orderLines,invoiceLines,movements});
 }catch(e){return bad(e instanceof Error?e.message:'Unable to load sales workspace',500);}
}
type Line={sku:string;quantity:number;unit_price:number};
function parseLines(raw:unknown):Line[]{
 if(!Array.isArray(raw)||raw.length<1||raw.length>100)throw Error('Add 1–100 products');
 return raw.map((x:Record<string,unknown>)=>{
 const sku=String(x.sku||'').trim(),quantity=Number(x.quantity),unit_price=Number(x.unit_price);
 if(!sku||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(unit_price)||unit_price<0)throw Error('Each product needs a valid SKU, positive quantity and non-negative price');
 return {sku,quantity,unit_price};
 });
}
export async function POST(req:NextRequest){
 if(!await canEdit())return bad('Administrator or Editor required',403);
 try{
 const input=await req.json();
 if(input.action==='create_order'){
 const number=String(input.number||'').trim(),customer=String(input.customer_code||'').trim();
 if(!number||!customer)return bad('Order number and customer are required');
 const lines=parseLines(input.lines);
 const result=await db().begin(async tx=>{
 const found=await tx`SELECT code FROM customers WHERE code=${customer}`;if(!found.length)throw Error('Customer not found');
 for(const l of lines){const foundItem=await tx`SELECT sku FROM items WHERE sku=${l.sku}`;if(!foundItem.length)throw Error('Unknown product: '+l.sku);}
 const total=lines.reduce((n,l)=>n+l.quantity*l.unit_price,0);
 const rows=await tx`INSERT INTO sales_orders(number,customer_code,date,status,total) VALUES(${number},${customer},CURRENT_DATE,'Draft',${total}) RETURNING id,number`;
 for(const l of lines)await tx`INSERT INTO sales_order_lines(order_id,sku,quantity,unit_price) VALUES(${rows[0].id},${l.sku},${l.quantity},${l.unit_price})`;
 return rows[0];
 });return NextResponse.json(result,{status:201});
 }
 if(input.action==='issue_invoice'){
 const orderId=Number(input.order_id);if(!Number.isSafeInteger(orderId)||orderId<=0)return bad('Select a valid sales order');
 const result=await db().begin(async tx=>{
 const orders=await tx`SELECT * FROM sales_orders WHERE id=${orderId} FOR UPDATE`;
 if(!orders.length)throw Error('Sales order not found');
 const order=orders[0];
 const existing=await tx`SELECT id FROM sales_invoices WHERE sales_order_id=${orderId}`;
 if(existing.length)throw Error('An invoice already exists for this order');
 const lines=await tx`SELECT sku,quantity,unit_price FROM sales_order_lines WHERE order_id=${orderId}`;
 if(!lines.length)throw Error('This order has no product lines');
 const number=String(input.number||'').trim();
 if(!number)throw Error('Invoice number is required');
 // Lock stock rows and check total quantities per SKU before any issue.
 const costs=new Map<string,number>();const qty=new Map<string,number>();for(const l of lines)qty.set(String(l.sku),(qty.get(String(l.sku))||0)+Number(l.quantity));
 for(const [sku,amount] of [...qty.entries()].sort(([a],[b])=>a.localeCompare(b))){
 const items=await tx`SELECT quantity,cost FROM items WHERE sku=${sku} FOR UPDATE`;
 if(!items.length)throw Error('Product not found: '+sku);
 costs.set(sku,Number(items[0].cost));if(Number(items[0].quantity)<amount)throw Error('Insufficient stock for '+sku+' (available '+items[0].quantity+', required '+amount+')');
 }
 const invoice=await tx`INSERT INTO sales_invoices(number,customer_code,date,status,total,sales_order_id) VALUES(${number},${order.customer_code},CURRENT_DATE,'Issued',${order.total},${orderId}) RETURNING id,number`;
 for(const l of lines)await tx`INSERT INTO sales_invoice_lines(invoice_id,sku,quantity,unit_price,unit_cost) VALUES(${invoice[0].id},${l.sku},${l.quantity},${l.unit_price},${costs.get(String(l.sku))||0})`;
 for(const [sku,amount] of qty){await tx`UPDATE items SET quantity=quantity-${amount} WHERE sku=${sku}`;await tx`INSERT INTO stock_movements(sku,movement_type,quantity,reference) VALUES(${sku},'OUT',${amount},${number})`;}
 await tx`UPDATE sales_orders SET status='Invoiced' WHERE id=${orderId}`;
 return invoice[0];
 });return NextResponse.json(result,{status:201});
 }
 if(input.action==='stock_adjustment'){
 const sku=String(input.sku||'').trim(),amount=Number(input.quantity),direction=String(input.direction),reference=String(input.reference||'Manual adjustment').trim();
 if(!sku||!Number.isFinite(amount)||amount<=0||!['IN','OUT'].includes(direction))return bad('Select an item, positive quantity and direction');
 const result=await db().begin(async tx=>{
 const item=await tx`SELECT quantity FROM items WHERE sku=${sku} FOR UPDATE`;if(!item.length)throw Error('Item not found');
 const next=Number(item[0].quantity)+(direction==='IN'?amount:-amount);if(next<0)throw Error('Insufficient stock');
 await tx`UPDATE items SET quantity=${next} WHERE sku=${sku}`;
 await tx`INSERT INTO stock_movements(sku,movement_type,quantity,reference) VALUES(${sku},${direction},${amount},${reference})`;
 return {sku,quantity:next};
 });return NextResponse.json(result);
 }
 return bad('Unknown action');
 }catch(e){return bad(e instanceof Error?e.message:'Operation failed');}
}
