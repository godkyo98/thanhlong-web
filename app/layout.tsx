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
            {/* 🎨 Kyo giải mật: Bỏ bg-zinc-950 khỏi body, chuyển xuống lớp nền z-[-3] biệt lập.
              Nếu để bg-zinc-950 ở body, các hiệu ứng z-[-1] và z-[-2] sẽ bị chôn vùi bên dưới lớp nền đen này.
            */}
            <body className="text-zinc-100 min-h-screen selection:bg-sky-500/30 selection:text-sky-100 relative">
                
                {/* 🖤 LỚP NỀN ĐEN ĐÁY CÙNG */}
                <div className="fixed inset-0 bg-zinc-950 z-[-3] pointer-events-none"></div>

                {/* 🌊 HIỆU ỨNG 1: Hào quang Thanh Long (Khảm lại z-[-1] chuẩn chỉ để ẩn sau nội dung) */}
                <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-500/35 via-zinc-950/80 to-zinc-950 z-[-1]"></div>
                
                {/* 🕸️ HIỆU ỨNG 2: Thiên La Địa Võng (Khảm lại z-[-2] để hiển thị mờ ảo dưới nội dung) */}
                <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(to_right,#0ea5e90f_1px,transparent_1px),linear-gradient(to_bottom,#0ea5e90f_1px,transparent_1px)] bg-[size:40px_32px] z-[-2]"></div>

                <Providers>
                    {children}
                </Providers>
                
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}