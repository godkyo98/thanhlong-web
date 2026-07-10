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
            {/* Thêm selection:bg-amber-500/30 để khi anh em bôi đen chữ cũng có màu vàng */}
            <body className="bg-zinc-950 text-zinc-100 min-h-screen relative selection:bg-amber-500/30 selection:text-amber-100">
                
                {/* 🌟 LỚP NỀN 1: Ảnh Background Bang Hội (Nếu ngài có) */}
                {/* Cách dùng: Ngài ném 1 ảnh tên là bg.jpg vào thư mục public/. Bỏ 2 dấu // ở dòng dưới đi là nó hiện */}
                {/* <div className="fixed inset-0 z-[-2] bg-[url('/bg.jpg')] bg-cover bg-center bg-no-repeat opacity-10"></div> */}

                {/* 🌟 LỚP NỀN 2: Hiệu ứng ánh sáng Hổ Phách tỏa từ trên đỉnh xuống */}
                <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/15 via-zinc-950 to-zinc-950 pointer-events-none"></div>

                {/* Nội dung chính của Web */}
                <Providers>{children}</Providers>
                
                {/* Hệ thống giám sát */}
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}