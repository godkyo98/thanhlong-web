// components/layout/Header.tsx
import React from 'react';

export type TabType = 'home' | 'danhluc' | 'tuvi' | 'soi_acc' | 'talent' | 'giftcode' | 'point' | 'sattuong' | 'hoatdong' | 'builds' | 'pvp' | 'admin';

interface HeaderProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
    displayLang: 'vi' | 'en';
    setDisplayLang: (lang: 'vi' | 'en') => void;
    isMaster: boolean;
    signOut: () => void;
}

export default function Header({
    activeTab,
    setActiveTab,
    displayLang,
    setDisplayLang,
    isMaster,
    signOut
}: HeaderProps) {
    return (
        <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80">
            {/* 🟢 Dùng chung max-w-[1440px] mx-auto px-4 sm:px-6 để thẳng hàng 100% với Banner bên dưới */}
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                <div
                    onClick={() => setActiveTab('home')}
                    className="flex items-center gap-3 cursor-pointer group"
                >
                    <span className="text-2xl group-hover:scale-110 transition-transform">🐉</span>
                    <h1 className="text-lg sm:text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500">
                        ĐẠI ĐIỆN THANH LONG
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    {isMaster && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('admin')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                                activeTab === 'admin'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                            }`}
                        >
                            <span>⚙️</span>
                            <span>Quản Trị</span>
                        </button>
                    )}

                    <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block"></div>

                    <button
                        type="button"
                        onClick={() => setDisplayLang(displayLang === 'vi' ? 'en' : 'vi')}
                        className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 transition-colors cursor-pointer"
                    >
                        {displayLang === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
                    </button>

                    <button
                        type="button"
                        onClick={() => signOut()}
                        className="px-2.5 py-1.5 rounded-xl bg-zinc-900/60 hover:bg-rose-950/40 border border-zinc-800/80 hover:border-rose-500/30 text-xs text-zinc-400 hover:text-rose-300 transition-colors cursor-pointer"
                        title="Đăng xuất"
                    >
                        🚪
                    </button>
                </div>
            </div>
        </header>
    );
}