import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';import {entities} from '@/lib/modules';import {currentAccess,canEdit} from '@/lib/auth/server';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){if(!await currentAccess())return NextResponse.json({error:'Forbidden'},{status:403});try{const s=entities[req.nextUrl.searchParams.get('module')||''];if(!s)return NextResponse.json({error:'Unknown module'},{status:400});return NextResponse.json(await db().unsafe('SELECT * FROM '+s.table+' ORDER BY id DESC LIMIT 500'));}catch(e){return NextResponse.json({error:String(e)},{status:500});}}
export async function POST(req:NextRequest){if(!await canEdit())return NextResponse.json({error:'Forbidden'},{status:403});try{const {module,record}=await req.json();const s=entities[module];if(!s)return NextResponse.json({error:'Unknown module'},{status:400});const keys=s.columns.filter(k=>record[k]!==undefined&&record[k]!==null&&String(record[k]).trim()!=='');if(!keys.length)return NextResponse.json({error:'Empty record'},{status:400});const values=keys.map(k=>record[k]);const rows=await db().unsafe('INSERT INTO '+s.table+' ('+keys.join(',')+') VALUES ('+keys.map((_,i)=>'$'+(i+1)).join(',')+') RETURNING *',values);return NextResponse.json(rows[0],{status:201});}catch(e){return NextResponse.json({error:String(e)},{status:500});}}
const editableModules=new Set(['Address Book','My Tasks','Prospect List','Supplier List','Sales Leads','Stock Transfers','Kitting & Bundling','Manage Categories','Manage Attributes','Locations & Zones','Estimates','Purchase Orders']);
export async function PATCH(req:NextRequest){
 if(!await canEdit())return NextResponse.json({error:'Forbidden'},{status:403});
 try{
 const {module,id,record}=await req.json();const spec=entities[module];
 if(!spec||!editableModules.has(module))return NextResponse.json({error:'Editing unavailable for this module'},{status:400});
 if(!Number.isSafeInteger(Number(id))||Number(id)<1)return NextResponse.json({error:'Invalid record id'},{status:400});
 const immutable=new Set(['code','number','reference','kit_sku']);
 const keys=spec.columns.filter(k=>!immutable.has(k)&&Object.prototype.hasOwnProperty.call(record,k));
 if(!keys.length)return NextResponse.json({error:'No editable fields supplied'},{status:400});
 const values=keys.map(k=>record[k]??'');
 const statement='UPDATE '+spec.table+' SET '+keys.map((k,i)=>k+'=$'+(i+1)).join(',')+' WHERE id=$'+(keys.length+1)+' RETURNING *';
 const rows=await db().unsafe(statement,[...values,Number(id)]);
 if(!rows.length)return NextResponse.json({error:'Record not found'},{status:404});
 return NextResponse.json(rows[0]);
 }catch(e){return NextResponse.json({error:String(e)},{status:500});}
}
