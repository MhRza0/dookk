import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={metadataBase:new URL('https://dook-boutique.hesam9090.chatgpt.site'),alternates:{canonical:'/'},title:'DOOK | بوتیک دوک',description:'بوتیک دوک؛ انتخابی از پوشاک و اکسسوری مردانه. هودی، پیراهن، تیشرت و کاپشن. ارسال به سراسر ایران.',openGraph:{title:'DOOK | بوتیک دوک',description:'پوشاک مردانه، با امضای خودت.',locale:'fa_IR',type:'website'},icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fa" dir="rtl"><body>{children}</body></html>}
