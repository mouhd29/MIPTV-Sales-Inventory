import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentAccess} from '@/lib/auth/server';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 if(!await currentAccess())return NextResponse.json({error:'Sign in required'},{status:403});
 const period=req.nextUrl.searchParams.get('period')||'monthly';
 if(!['daily','monthly','yearly'].includes(period))return NextResponse.json({error:'Invalid reporting period'},{status:400});
 try{
 const format=period==='daily'?'YYYY-MM-DD':period==='yearly'?'YYYY':'YYYY-MM';
 const start=period==='daily'?"CURRENT_DATE - INTERVAL '29 days'":period==='yearly'?"date_trunc('year',CURRENT_DATE) - INTERVAL '4 years'":"date_trunc('month',CURRENT_DATE) - INTERVAL '11 months'";
 const [series,activity,unpaid,summary]=await Promise.all([
 db().unsafe(`WITH buckets AS (SELECT generate_series(${start},CURRENT_DATE,${period==='daily'?"INTERVAL '1 day'":period==='yearly'?"INTERVAL '1 year'":"INTERVAL '1 month'"})::date AS bucket_date), invoice_cost AS (SELECT i.id,i.date,i.total,COALESCE(SUM(l.quantity*l.unit_cost),0) cost,COUNT(l.id) FILTER(WHERE l.unit_cost IS NULL) missing_cost FROM sales_invoices i LEFT JOIN sales_invoice_lines l ON l.invoice_id=i.id GROUP BY i.id) SELECT to_char(b.bucket_date,'${format}') label,COALESCE(SUM(ic.total),0)::numeric revenue,COALESCE(SUM(ic.cost),0)::numeric cost,(COALESCE(SUM(ic.total),0)-COALESCE(SUM(ic.cost),0))::numeric profit,COALESCE(SUM(ic.missing_cost),0)::int missing_cost_lines FROM buckets b LEFT JOIN invoice_cost ic ON ${period==='daily'?"ic.date=b.bucket_date":period==='yearly'?"date_trunc('year',ic.date)=date_trunc('year',b.bucket_date)":"date_trunc('month',ic.date)=date_trunc('month',b.bucket_date)"} GROUP BY b.bucket_date ORDER BY b.bucket_date`),
 db()`SELECT i.number,i.date,c.name customer,i.total FROM sales_invoices i LEFT JOIN customers c ON c.code=i.customer_code ORDER BY i.date DESC NULLS LAST,i.id DESC LIMIT 8`,
 db()`SELECT i.number,i.date,c.name customer,i.total,i.status FROM sales_invoices i LEFT JOIN customers c ON c.code=i.customer_code WHERE lower(COALESCE(i.status,'')) IN ('unpaid','issued','overdue','open') ORDER BY i.date DESC NULLS LAST,i.id DESC LIMIT 8`,
 db()`SELECT COUNT(*)::int invoice_count,COALESCE(SUM(total),0)::numeric revenue FROM sales_invoices`
 ]);
 return NextResponse.json({period,series,activity,unpaid,summary:summary[0],unpaidIsStatusBased:true});
 }catch(e){return NextResponse.json({error:String(e)},{status:500});}
}
