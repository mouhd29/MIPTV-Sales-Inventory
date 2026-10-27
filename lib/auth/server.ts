import {createNeonAuth} from '@neondatabase/auth/next/server';
export const auth=createNeonAuth({baseUrl:process.env.NEON_AUTH_BASE_URL!,cookies:{secret:process.env.NEON_AUTH_COOKIE_SECRET!,sessionDataTtl:300}});
export async function requireAdmin(){const {data}=await auth.getSession();return data?.user?.email?.toLowerCase()==='mouhd29@gmail.com';}