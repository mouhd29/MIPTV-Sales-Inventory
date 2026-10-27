import type { Metadata } from 'next';
import './styles.css';
export const metadata: Metadata = { title: 'MIPTV Sales & Inventory', description: 'Independent sales and inventory management' };
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
