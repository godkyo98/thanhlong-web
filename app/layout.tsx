// app/layout.tsx
import './globals.css';
import { Providers } from './providers';
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata = {
    title: 'Thanh Long Sơn Trang',
    description: 'Tổng Hành Dinh Thanh Long Bang',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="vi">
            {/* Lớp nền dưới đáy cùng */}
            <body className="bg-zinc-950 text-zinc-100 min-h-screen selection:bg-sky-500/30 selection:text-sky-100">
                
                {/* 🌊 HIỆU ỨNG 1: Hào quang Thanh Long (ĐÃ BỎ z-[-1] ĐỂ NÓ NỔI LÊN TRÊN NỀN ĐEN) */}
                <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-500/35 via-zinc-950/80 to-zinc-950"></div>
                
                {/* 🕸️ HIỆU ỨNG 2: Thiên La Địa Võng (ĐÃ BỎ z-[-2]) */}
                <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(to_right,#0ea5e90f_1px,transparent_1px),linear-gradient(to_bottom,#0ea5e90f_1px,transparent_1px)] bg-[size:40px_32px]"></div>

                {/* 🔮 NỘI DUNG CHÍNH: Được bế nổi lên trên cùng nhờ relative z-10 */}
                <div className="relative z-10 w-full min-h-screen">
                    <Providers>{children}</Providers>
                </div>
                
                {/* Hệ thống giám sát */}
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}