// app/layout.tsx
import './globals.css';
import { Providers } from './providers';

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
            </body>
        </html>
    );
}