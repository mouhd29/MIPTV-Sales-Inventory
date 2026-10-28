import {NextRequest,NextResponse} from 'next/server';
import {currentAccess} from '@/lib/auth/server';
import {db} from '@/lib/db';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 if(!await currentAccess())return NextResponse.json({error:'Unauthorized'},{status:403});
 const sku=req.nextUrl.searchParams.get('sku')||'';
 if(!sku||sku.length>120)return NextResponse.json({error:'Invalid SKU'},{status:400});
 const rows=await db()`SELECT sku,name,price FROM items WHERE sku=${sku} LIMIT 1`;
 if(!rows.length)return NextResponse.json({error:'SKU not found'},{status:404});
 return NextResponse.json(rows[0]);
}
