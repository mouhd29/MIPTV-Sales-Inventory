import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentAccess} from '@/lib/auth/server';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 if(!await currentAccess())return NextResponse.json({error:'Sign in required'},{status:403});
 try{
 const sku=String(req.nextUrl.searchParams.get('sku')||'').trim();
 const direction=String(req.nextUrl.searchParams.get('direction')||'ALL').toUpperCase();
 const page=Math.max(1,Math.min(100000,Number(req.nextUrl.searchParams.get('page')||1)||1));
 if(!['ALL','IN','OUT'].includes(direction))return NextResponse.json({error:'Invalid direction'},{status:400});
 const limit=50,offset=(page-1)*limit;
 const [items,movements,count,summary]=await Promise.all([
 db()`SELECT sku,name,unit,quantity,cost,quantity*cost stock_value FROM items ORDER BY name`,
 db()`SELECT m.id,m.sku,i.name item_name,m.movement_type,m.quantity,m.reference,m.created_at,m.unit_cost,m.stock_balance_after,m.average_cost_after,CASE WHEN m.unit_cost IS NULL THEN NULL ELSE m.quantity*m.unit_cost END movement_value FROM stock_movements m LEFT JOIN items i ON i.sku=m.sku WHERE (${sku}='' OR m.sku=${sku}) AND (${direction}='ALL' OR m.movement_type=${direction}) ORDER BY m.created_at DESC,m.id DESC LIMIT ${limit} OFFSET ${offset}`,
 db()`SELECT count(*)::int total FROM stock_movements m WHERE (${sku}='' OR m.sku=${sku}) AND (${direction}='ALL' OR m.movement_type=${direction})`,
 db()`SELECT COALESCE(sum(CASE WHEN movement_type='IN' THEN quantity ELSE 0 END),0) qty_in,COALESCE(sum(CASE WHEN movement_type='OUT' THEN quantity ELSE 0 END),0) qty_out,COALESCE(sum(CASE WHEN movement_type='IN' AND unit_cost IS NOT NULL THEN quantity*unit_cost ELSE 0 END),0) value_in,COALESCE(sum(CASE WHEN movement_type='OUT' AND unit_cost IS NOT NULL THEN quantity*unit_cost ELSE 0 END),0) value_out,count(*) FILTER(WHERE unit_cost IS NULL)::int uncosted FROM stock_movements WHERE (${sku}='' OR sku=${sku}) AND (${direction}='ALL' OR movement_type=${direction})`
 ]);
 return NextResponse.json({items,movements,total:count[0].total,page,pageSize:limit,summary:summary[0]});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to load stock ledger'},{status:500});}
}
