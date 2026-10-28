import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentAccess,requireAdmin} from '@/lib/auth/server';
export const dynamic='force-dynamic';
const fields=['company_name','company_name_ar','registration_number','tax_number','address','phone','mobile','email','website','logo_data'];
export async function GET(){
 if(!await currentAccess())return NextResponse.json({error:'Forbidden'},{status:403});
 const rows=await db()`SELECT * FROM company_settings WHERE id=1`;
 return NextResponse.json(rows[0]||{});
}
export async function PUT(req:NextRequest){
 if(!await requireAdmin())return NextResponse.json({error:'Admin only'},{status:403});
 try{
  const input=await req.json();
  const values=fields.map(k=>typeof input[k]==='string'?input[k].trim():'');
  if(values.some((v,i)=>v.length>(fields[i]==='logo_data'?400000:2000)))return NextResponse.json({error:'One or more fields are too long. Logo maximum ~300KB.'},{status:400});
  const logo=values[fields.indexOf('logo_data')];
  if(logo&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo))return NextResponse.json({error:'Use a PNG, JPEG or WebP logo'},{status:400});
  const updates=fields.map((k,i)=>k+'=$'+(i+1)).join(',');
  const rows=await db().unsafe('UPDATE company_settings SET '+updates+',updated_at=now() WHERE id=1 RETURNING *',values);
  return NextResponse.json(rows[0]);
 }catch(e){return NextResponse.json({error:String(e)},{status:500});}
}
