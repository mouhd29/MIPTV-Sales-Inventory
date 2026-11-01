import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentAccess,canEdit} from '@/lib/auth/server';
export const dynamic='force-dynamic';
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
type POInput={sku:string;quantity:number;unit_cost:number};
const parse=(input:unknown):POInput[]=>{
 if(!Array.isArray(input)||input.length<1||input.length>100)throw Error('Enter 1 to 100 inventory items');
 const seen=new Set<string>();
 return input.map((raw:Record<string,unknown>)=>{
 const sku=String(raw.sku||'').trim(),quantity=Number(raw.quantity),unit_cost=Number(raw.unit_cost);
 if(!sku||seen.has(sku)||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(unit_cost)||unit_cost<0)throw Error('Each SKU must be unique with a positive quantity and valid purchase cost');
 seen.add(sku);return {sku,quantity,unit_cost};
 });
};
export async function GET(){
 if(!await currentAccess())return fail('Unauthorized',403);
 try{
 const [suppliers,items,orders,lines,receipts,receiptLines]=await Promise.all([
 db()`SELECT code,name FROM suppliers ORDER BY name LIMIT 2000`,
 db()`SELECT sku,name,unit,quantity,cost,price FROM items ORDER BY name LIMIT 2000`,
 db()`SELECT p.*,s.name supplier_name FROM purchase_orders p LEFT JOIN suppliers s ON s.code=p.supplier_code ORDER BY p.id DESC LIMIT 500`,
 db()`SELECT l.* FROM purchase_order_lines l JOIN (SELECT id FROM purchase_orders ORDER BY id DESC LIMIT 500) p ON p.id=l.order_id ORDER BY l.id`,
 db()`SELECT r.* FROM purchase_receipts r ORDER BY r.id DESC LIMIT 500`,
 db()`SELECT l.* FROM purchase_receipt_lines l JOIN (SELECT id FROM purchase_receipts ORDER BY id DESC LIMIT 500) r ON r.id=l.receipt_id ORDER BY l.id`
 ]);
 return NextResponse.json({suppliers,items,orders,lines,receipts,receiptLines});
 }catch(e){return fail(String(e),500);}
}
export async function POST(req:NextRequest){
 if(!await canEdit())return fail('Administrator or Editor required',403);
 try{
 const input=await req.json();
 if(input.action==='create'){
 const number=String(input.number||'').trim(),supplier=String(input.supplier_code||'').trim(),lines=parse(input.lines);
 if(!number||number.length>80||!supplier)return fail('PO number and supplier are required');
 const result=await db().begin(async tx=>{
 const s=await tx`SELECT code FROM suppliers WHERE code=${supplier}`;if(!s.length)throw Error('Supplier not found');
 for(const line of lines){const i=await tx`SELECT sku FROM items WHERE sku=${line.sku}`;if(!i.length)throw Error('Inventory SKU not found: '+line.sku);}
 const total=lines.reduce((n,l)=>n+l.quantity*l.unit_cost,0);
 const po=await tx`INSERT INTO purchase_orders(number,supplier_code,date,status,total) VALUES(${number},${supplier},CURRENT_DATE,'Open',${total}) RETURNING id,number,status`;
 for(const line of lines)await tx`INSERT INTO purchase_order_lines(order_id,sku,quantity,unit_cost) VALUES(${po[0].id},${line.sku},${line.quantity},${line.unit_cost})`;
 return po[0];
 });
 return NextResponse.json(result,{status:201});
 }
 if(input.action==='receive'){
 const id=Number(input.order_id),receiptNumber=String(input.receipt_number||'').trim(),notes=String(input.notes||'').trim();
 if(!Number.isSafeInteger(id)||id<=0||!receiptNumber||receiptNumber.length>80)return fail('Valid PO and receipt number required');
 const quantities=input.lines;
 if(!Array.isArray(quantities)||!quantities.length)return fail('Select quantities to receive');
 const requested=new Map<number,number>();
 for(const line of quantities){const lineId=Number(line.id),qty=Number(line.quantity);if(!Number.isSafeInteger(lineId)||lineId<=0||!Number.isFinite(qty)||qty<0||requested.has(lineId))return fail('Invalid or repeated receipt line');requested.set(lineId,qty);}
 const result=await db().begin(async tx=>{
 const po=await tx`SELECT id,number,status FROM purchase_orders WHERE id=${id} FOR UPDATE`;if(!po.length)throw Error('Purchase order not found');if(po[0].status==='Received')throw Error('PO already fully received');
 const lines=await tx`SELECT * FROM purchase_order_lines WHERE order_id=${id} ORDER BY sku FOR UPDATE`;
 if(!lines.length)throw Error('PO has no line items');
 if([...requested.keys()].some(k=>!lines.some(l=>Number(l.id)===k)))throw Error('Receipt contains a line outside this PO');
 const receipt=await tx`INSERT INTO purchase_receipts(order_id,receipt_number,notes) VALUES(${id},${receiptNumber},${notes}) RETURNING id,receipt_number`;
 let received=0;
 for(const line of lines){
 const amount=requested.get(Number(line.id))||0;if(amount<=0)continue;
 const outstanding=Number(line.quantity)-Number(line.received_quantity);
 if(amount>outstanding+0.00000001)throw Error('Quantity exceeds outstanding balance for '+line.sku);
 const item=await tx`SELECT sku,quantity,cost FROM items WHERE sku=${line.sku} FOR UPDATE`;
 if(!item.length)throw Error('Inventory SKU not found: '+line.sku);
 const oldQty=Number(item[0].quantity),oldCost=Number(item[0].cost),purchaseCost=Number(line.unit_cost);
 if(oldQty<0)throw Error('Negative stock balance is not supported for APP');
 const newQty=oldQty+amount;
 const app=(oldQty*oldCost+amount*purchaseCost)/newQty;
 await tx`UPDATE items SET quantity=${newQty},cost=${app} WHERE sku=${line.sku}`;
 await tx`UPDATE purchase_order_lines SET received_quantity=received_quantity+${amount} WHERE id=${line.id}`;
 await tx`INSERT INTO stock_movements(sku,movement_type,quantity,reference) VALUES(${line.sku},'IN',${amount},${'PO:'+po[0].number+' / GRN:'+receiptNumber})`;
 await tx`INSERT INTO purchase_receipt_lines(receipt_id,order_line_id,sku,quantity,unit_cost,average_cost_after) VALUES(${receipt[0].id},${line.id},${line.sku},${amount},${purchaseCost},${app})`;
 received++;
 }
 if(!received)throw Error('Enter at least one positive receipt quantity');
 const complete=lines.every(l=>Number(l.received_quantity)+(requested.get(Number(l.id))||0)>=Number(l.quantity)-0.00000001);
 const status=complete?'Received':'Partially Received';
 await tx`UPDATE purchase_orders SET status=${status} WHERE id=${id}`;
 return {receipt_number:receiptNumber,status,items_received:received};
 });
 return NextResponse.json(result,{status:201});
 }
 return fail('Unknown action');
 }catch(e){return fail(e instanceof Error?e.message:'Purchase operation failed');}
}
