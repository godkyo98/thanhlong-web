// app/layout.tsx
import './globals.css';
import { Providers } from './providers';
import { Analytics } from "@vercel/analytics/next" // 👁️ Mắt thần theo dõi người dùng
import { SpeedInsights } from "@vercel/speed-insights/next" // 🚀 Máy đo khinh công tốc độ tải trang

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
            <body className="bg-zinc-950 text-zinc-100 min-h-screen">
                <Providers>{children}</Providers>
                <Analytics />
                <SpeedInsights /> {/* 🚀 Đặt ngay cạnh Analytics */}
            </body>
        </html>
    );
}