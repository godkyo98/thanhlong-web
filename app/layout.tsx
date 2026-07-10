// app/layout.tsx
import './globals.css';
import { Providers } from './providers';
import { Analytics } from "@vercel/analytics/next" 
import { SpeedInsights } from "@vercel/speed-insights/next"

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
            {/* selection:bg-sky-500/30 để khi anh em bôi đen chữ cũng có màu xanh dương dịu mắt */}
            <body className="bg-zinc-950 text-zinc-100 min-h-screen relative selection:bg-sky-500/30 selection:text-sky-100">
                
                {/* 🌊 HIỆU ỨNG 1: Hào quang "Thanh Long Xuất Hải" màu Xanh Dương tỏa từ đỉnh xuống */}
                <div className="fixed inset-0 z-[-1] pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-500/15 via-zinc-950/90 to-zinc-950"></div>
                
                {/* 🕸️ HIỆU ỨNG 2: Thiên La Địa Võng (Lưới sọc caro màu Xanh Lam mờ ảo tạo chiều sâu thần thoại) */}
                <div className="fixed inset-0 z-[-2] pointer-events-none bg-[linear-gradient(to_right,#0ea5e908_1px,transparent_1px),linear-gradient(to_bottom,#0ea5e908_1px,transparent_1px)] bg-[size:32px_32px]"></div>

                {/* Nội dung chính của Web */}
                <Providers>{children}</Providers>
                
                {/* Hệ thống giám sát */}
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}