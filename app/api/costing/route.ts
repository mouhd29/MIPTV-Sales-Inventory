import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentAccess,canEdit} from '@/lib/auth/server';
export const dynamic='force-dynamic';
const error=(message:string,status=400)=>NextResponse.json({error:message},{status});
export async function GET(){
 if(!await currentAccess())return error('Unauthorized',403);
 try{
 const [items,batches,sales,summary]=await Promise.all([
 db()`SELECT sku,name,category,unit,quantity,cost,price,round((price-cost)::numeric,3) unit_profit, CASE WHEN price>0 THEN round(((price-cost)/price*100)::numeric,2) ELSE 0 END margin_pct,round((quantity*cost)::numeric,3) stock_value FROM items ORDER BY name LIMIT 2000`,
 db()`SELECT id,sku,batch_number,quantity,unit_cost,received_date,notes FROM inventory_batches ORDER BY received_date DESC,id DESC LIMIT 2000`,
 db()`SELECT i.id,i.number,i.date,i.customer_code,c.name customer_name,i.total,round(COALESCE(SUM(l.quantity*l.unit_cost),0)::numeric,3) cogs,round((i.total-COALESCE(SUM(l.quantity*l.unit_cost),0))::numeric,3) gross_profit, CASE WHEN i.total>0 THEN round(((i.total-COALESCE(SUM(l.quantity*l.unit_cost),0))/i.total*100)::numeric,2) ELSE 0 END margin_pct, bool_or(l.unit_cost IS NULL) missing_cost FROM sales_invoices i LEFT JOIN customers c ON c.code=i.customer_code LEFT JOIN sales_invoice_lines l ON l.invoice_id=i.id GROUP BY i.id,c.name ORDER BY i.id DESC LIMIT 1000`,
 db()`SELECT count(*) item_count,COALESCE(sum(quantity*cost),0) inventory_value,COALESCE(sum(quantity),0) units_in_stock,COALESCE(sum(CASE WHEN quantity<=5 THEN 1 ELSE 0 END),0) low_stock FROM items`
 ]);
 return NextResponse.json({items,batches,sales,summary:summary[0]});
 }catch(e){return error(String(e),500);}
}
export async function POST(req:NextRequest){
 if(!await canEdit())return error('Administrator or Editor required',403);
 try{
 const p=await req.json();
 if(p.action==='price'){
 const sku=String(p.sku||'').trim(),cost=Number(p.cost),price=Number(p.price);
 if(!sku||!Number.isFinite(cost)||cost<0||!Number.isFinite(price)||price<0)return error('Valid SKU, cost and price required');
 const rows=await db()`UPDATE items SET cost=${cost},price=${price} WHERE sku=${sku} RETURNING sku,cost,price`;
 if(!rows.length)return error('SKU not found',404);return NextResponse.json(rows[0]);
 }
 if(p.action==='batch'){
 const sku=String(p.sku||'').trim(),batch=String(p.batch_number||'').trim(),qty=Number(p.quantity),cost=Number(p.unit_cost),notes=String(p.notes||'').trim();
 if(!sku||!batch||batch.length>100||!Number.isFinite(qty)||qty<=0||!Number.isFinite(cost)||cost<0)return error('SKU, batch number, positive quantity and cost required');
 const result=await db().begin(async tx=>{
 const item=await tx`SELECT sku,quantity,cost FROM items WHERE sku=${sku} FOR UPDATE`;if(!item.length)throw Error('SKU not found');
 const existing=await tx`SELECT id FROM inventory_batches WHERE sku=${sku} AND batch_number=${batch}`;if(existing.length)throw Error('Batch number already exists for this SKU');
 const previousQty=Number(item[0].quantity),previousCost=Number(item[0].cost);
 const weighted=(previousQty*previousCost+qty*cost)/(previousQty+qty);
 const row=await tx`INSERT INTO inventory_batches(sku,batch_number,quantity,unit_cost,notes) VALUES(${sku},${batch},${qty},${cost},${notes}) RETURNING *`;
 await tx`UPDATE items SET quantity=quantity+${qty},cost=${weighted} WHERE sku=${sku}`;
 await tx`INSERT INTO stock_movements(sku,movement_type,quantity,reference) VALUES(${sku},'IN',${qty},${'BATCH:'+batch})`;
 return row[0];
 });return NextResponse.json(result,{status:201});
 }
 return error('Unknown action');
 }catch(e){return error(e instanceof Error?e.message:'Request failed');}
}
