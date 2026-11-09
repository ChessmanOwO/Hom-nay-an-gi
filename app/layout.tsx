import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Hôm nay ăn gì? | Ăn ngon, đúng túi tiền',description:'Sổ ăn uống của cộng đồng. Khám phá món ngon theo túi tiền, ghim quán và chia sẻ trải nghiệm thật.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="vi"><body>{children}</body></html>}
