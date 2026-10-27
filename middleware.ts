import {auth} from '@/lib/auth/server';
export default auth.middleware({loginUrl:'/auth/sign-in'});
// Keep sign-in, password recovery, and Neon Auth endpoints accessible without a session.
// The records API also checks requireAdmin() server-side.
export const config={matcher:['/','/api/records/:path*']};
