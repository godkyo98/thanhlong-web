// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Thanh Long Sơn Trang",
    description: "Đại Điện Thanh Long Sơn Trang - Where Winds Meet",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="vi" className="dark">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased text-zinc-100 min-h-screen relative selection:bg-cyan-500/30 selection:text-cyan-200`}
                style={{ backgroundColor: "#040814" }}
            >
                {/* 🟢 LỚP NỀN DÙNG INLINE STYLE: Không bao giờ bị Tailwind hay globals.css làm mất màu */}
                <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                    {/* 1. Vầng hào quang Xanh Thanh Long (Cyan/Blue) tỏa rực từ đỉnh và hai bên */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `
                                radial-gradient(circle 800px at 50% -100px, rgba(6, 182, 212, 0.28), transparent 70%),
                                radial-gradient(circle 600px at 85% 20%, rgba(14, 165, 233, 0.18), transparent 70%),
                                radial-gradient(circle 600px at 15% 80%, rgba(16, 185, 129, 0.15), transparent 70%)
                            `
                        }}
                    />

                    {/* 2. Lưới Càn Khôn (Caro) sáng rõ trên nền xanh đêm */}
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundImage: `
                                linear-gradient(to right, rgba(56, 189, 248, 0.12) 1px, transparent 1px),
                                linear-gradient(to bottom, rgba(56, 189, 248, 0.12) 1px, transparent 1px)
                            `,
                            backgroundSize: "32px 32px",
                            maskImage: "radial-gradient(ellipse 90% 80% at 50% 30%, #000 60%, transparent 100%)",
                            WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 50% 30%, #000 60%, transparent 100%)"
                        }}
                    />
                </div>

                {/* 🟢 Nội dung trang nổi lên trên lớp nền */}
                <div className="relative z-10">
                    <Providers>{children}</Providers>
                </div>
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}