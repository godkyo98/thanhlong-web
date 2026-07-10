// app/layout.tsx
import './globals.css';
import { Providers } from './providers';
import { Analytics } from "@vercel/analytics/next" // 1. Import bùa chú

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
                <Analytics /> {/* 2. Chèn vào cuối thân bài để nó soi xét toàn cục */}
            </body>
        </html>
    );
}