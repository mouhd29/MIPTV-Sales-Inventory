import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {entities} from '@/lib/modules';
import {canEdit} from '@/lib/auth/server';
export const dynamic='force-dynamic';
const required:Record<string,string[]>={
 customers:['code','name'],suppliers:['code','name'],items:['sku','name'],
 sales_orders:['number'],sales_invoices:['number'],purchase_orders:['number']
};
const numeric=new Set(['cost','price','quantity','total']);
export async function POST(req:NextRequest){
 if(!await canEdit())return NextResponse.json({error:'Forbidden'},{status:403});
 try{
  const {module,records}=await req.json();
  const spec=entities[module];
  if(!spec)return NextResponse.json({error:'Unknown module'},{status:400});
  if(!Array.isArray(records)||records.length<1||records.length>1000)return NextResponse.json({error:'Import requires 1–1000 rows per batch'},{status:400});
  const keys=spec.columns;
  const data:Record<string,string|null>[]=[];
  for(let i=0;i<records.length;i++){
   const raw=records[i];
   if(!raw||typeof raw!=='object'||Array.isArray(raw))return NextResponse.json({error:`Row ${i+2}: invalid record`},{status:400});
   const row:Record<string,string|null>={};
   for(const k of keys){
    const val=raw[k]==null?'':String(raw[k]).trim();
    if(val.length>2000)return NextResponse.json({error:`Row ${i+2}: ${k} is too long`},{status:400});
    if(numeric.has(k)&&val!==''&&(!Number.isFinite(Number(val))||!/^-?(?:\d+\.?\d*|\.\d+)$/.test(val)))return NextResponse.json({error:`Row ${i+2}: invalid number for ${k}`},{status:400});
    if(k==='date'&&val!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(val))return NextResponse.json({error:`Row ${i+2}: date must be YYYY-MM-DD`},{status:400});
    row[k]=val===''?null:val;
   }
   for(const k of required[spec.table]||[])if(!row[k])return NextResponse.json({error:`Row ${i+2}: ${k} is required`},{status:400});
   data.push(row);
  }
  const result=await db().begin(async tx=>{
   for(let i=0;i<data.length;i++){
    const row=data[i];
    const columns=keys.filter(k=>row[k]!==null);
    const values=columns.map(k=>row[k]);
    try{
     await tx.unsafe('INSERT INTO '+spec.table+' ('+columns.join(',')+') VALUES ('+columns.map((_,j)=>'$'+(j+1)).join(',')+')',values);
    }catch(e){throw Error(`Row ${i+2}: ${e instanceof Error?e.message:String(e)}`);}
   }
   return {imported:data.length};
  });
  return NextResponse.json(result);
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Import failed. No rows were committed.'},{status:400});}
}
