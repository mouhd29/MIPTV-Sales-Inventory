import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {entities} from '@/lib/modules';
export const dynamic='force-dynamic';
function schema(module:string){return entities[module];}
export async function GET(req:NextRequest){try{const mod=req.nextUrl.searchParams.get('module')||'';const s=schema(mod);if(!s)return NextResponse.json({error:'Unknown module'},{status:400});const rows=await db().unsafe('SELECT * FROM '+s.table+' ORDER BY id DESC LIMIT 500');return NextResponse.json(rows);}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Server error'},{status:500});}}
export async function POST(req:NextRequest){try{const {module,record}=await req.json();const s=schema(module);if(!s)return NextResponse.json({error:'Unknown module'},{status:400});const keys=s.columns.filter(k=>record[k]!==undefined&&record[k]!==null&&String(record[k]).trim()!=='');if(!keys.length)return NextResponse.json({error:'Empty record'},{status:400});const values=keys.map(k=>record[k]);const params=keys.map((_,i)=>'$'+(i+1)).join(',');const rows=await db().unsafe('INSERT INTO '+s.table+' ('+keys.join(',')+') VALUES ('+params+') RETURNING *',values);return NextResponse.json(rows[0],{status:201});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Server error'},{status:500});}}
