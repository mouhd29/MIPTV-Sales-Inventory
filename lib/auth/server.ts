import {createNeonAuth} from '@neondatabase/auth/next/server';
import {db} from '@/lib/db';
export const auth=createNeonAuth({baseUrl:process.env.NEON_AUTH_BASE_URL!,cookies:{secret:process.env.NEON_AUTH_COOKIE_SECRET!,sessionDataTtl:300}});
export type AppRole='admin'|'editor'|'viewer';
export async function currentAccess():Promise<{email:string;role:AppRole}|null>{
 const {data}=await auth.getSession();
 const email=data?.user?.email?.trim().toLowerCase();
 if(!email)return null;
 // Permanent owner safeguard: the configured owner cannot be demoted by a role edit.
 if(email==='mouhd29@gmail.com')return {email,role:'admin'};
 const rows=await db()`SELECT role FROM app_user_roles WHERE lower(email)=${email} AND active=true LIMIT 1`;
 const role=rows[0]?.role;
 return role==='admin'||role==='editor'||role==='viewer'?{email,role}:null;
}
export async function requireAdmin(){return (await currentAccess())?.role==='admin';}
export async function canEdit(){const role=(await currentAccess())?.role;return role==='admin'||role==='editor';}
