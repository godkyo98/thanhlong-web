// app/layout.tsx
import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const beVietnamPro = Be_Vietnam_Pro({
    variable: "--font-be-vietnam-pro",
    subsets: ["latin", "vietnamese"],
    weight: ["400", "500", "600", "700", "800", "900"],
    display: "swap",
    fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    metadataBase: new URL(
        process.env.NEXT_PUBLIC_SITE_URL || 
        (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://thanhlong-web.vercel.app')
    ),
    title: "Thanh Long Sơn Trang · Where Winds Meet",
    description: "Đại Điện Thanh Long Sơn Trang · Trung tâm dữ liệu Bang hội: Sổ Danh Lục Quân Số, Tháp Phong Thần, Đài Chiếu Yêu, Sát Tướng Đài, Thần Khí Các & Võ Lâm Tranh Bá.",
    openGraph: {
        title: "Thanh Long Sơn Trang · Where Winds Meet",
        description: "Đại Điện Thanh Long Sơn Trang · Sổ Danh Lục Quân Số, Tháp Phong Thần, Đài Chiếu Yêu, Sát Tướng Đài, Thần Khí Các & Võ Lâm Tranh Bá.",
        url: "https://thanhlong-web.vercel.app",
        siteName: "Thanh Long Sơn Trang",
        images: [
            {
                url: "https://thanhlong-web.vercel.app/thanhlong_thumnail.png",
                width: 1200,
                height: 600,
                type: "image/png",
                alt: "Thanh Long Sơn Trang - Where Winds Meet",
            },
        ],
        locale: "vi_VN",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Thanh Long Sơn Trang · Where Winds Meet",
        description: "Đại Điện Thanh Long Sơn Trang · Sổ Danh Lục Quân Số, Tháp Phong Thần, Đài Chiếu Yêu, Sát Tướng Đài, Thần Khí Các & Võ Lâm Tranh Bá.",
        images: ["https://thanhlong-web.vercel.app/thanhlong_thumnail.png"],
    },
    icons: {
        icon: "/icon.png",
        apple: "/icon.png",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="vi" className="dark">
            <head>
                <meta name="theme-color" content="#f59e0b" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600;1,700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body
                className={`${beVietnamPro.variable} ${geistMono.variable} antialiased text-zinc-100 min-h-screen relative selection:bg-cyan-500/30 selection:text-cyan-200`}
                style={{ backgroundColor: "#040814" }}
            >
                {/* 🟢 LỚP NỀN ÁNH SÁNG MỊN (KHÔNG LƯỚI CARO) */}
                <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `
                                radial-gradient(circle 900px at 50% -150px, rgba(6, 182, 212, 0.22), transparent 75%),
                                radial-gradient(circle 700px at 85% 25%, rgba(14, 165, 233, 0.14), transparent 75%),
                                radial-gradient(circle 700px at 15% 80%, rgba(16, 185, 129, 0.12), transparent 75%)
                            `
                        }}
                    />
                </div>

                {/* 🟢 Nội dung trang bọc trong SessionProvider */}
                <div className="relative z-10">
                    <Providers>{children}</Providers>
                </div>
            </body>
        </html>
    );
}
