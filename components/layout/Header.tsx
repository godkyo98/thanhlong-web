// components/layout/Header.tsx
import React from 'react';

// 🟢 Kyo đã giữ nguyên bản, CHỈ THÊM 'hoatDong' VÀO ĐÂY ĐỂ TYPESCRIPT KHÔNG LỖI, TUYỆT ĐỐI KHÔNG VẼ THÊM NÚT XẤU XÍ
type TabType = 'home' | 'danhluc' | 'talent' | 'soi_acc' | 'admin' | 'tuvi' | 'giftcode' | 'point' | 'sattuong' | 'hoatDong';

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
        <header className="border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                
                {/* 🐉 LOGO TIÊU ĐỀ: Bấm vào đây là tự động lật trận pháp quay về Chính Điện */}
                <div 
                    onClick={() => setActiveTab('home')} 
                    className="flex items-center gap-3 cursor-pointer select-none group"
                    title="Quay về Chính Điện"
                >
                    <span className="text-2xl group-hover:scale-110 transition-transform">🐉</span>
                    <h1 className="text-xl font-black tracking-wider text-amber-400 group-hover:text-amber-300 transition-colors">
                        ĐẠI ĐIỆN THANH LONG
                    </h1>
                </div>
                
                <div className="flex gap-1 items-center">
                    {/* ⚙️ MẬT THẤT QUẢN TRỊ: Phía trên Header chỉ giữ lại duy nhất đặc quyền này */}
                    {isMaster && (
                        <button 
                            onClick={() => setActiveTab('admin')} 
                            className={`shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                                activeTab === 'admin' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'text-zinc-400 hover:text-red-400/80'
                            }`}
                        >
                            ⚙️ Quản Trị
                        </button>
                    )}
                    
                    {isMaster && <div className="w-px h-6 bg-zinc-800 mx-2 shrink-0"></div>}
                    
                    {/* NÚT GẠT CHUYỂN SONG NGỮ */}
                    <button 
                        onClick={() => setDisplayLang(displayLang === 'vi' ? 'en' : 'vi')} 
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 shrink-0"
                    >
                        {displayLang === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
                    </button>

                    {/* NÚT ĐĂNG XUẤT */}
                    <button 
                        onClick={() => signOut()} 
                        className="p-2 text-zinc-400 hover:text-red-400 rounded-lg transition-all cursor-pointer shrink-0"
                        title="Rời khỏi sơn trang"
                    >
                        🚪
                    </button>
                </div>
            </div>
        </header>
    );
}