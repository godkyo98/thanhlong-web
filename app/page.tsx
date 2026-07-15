// app/page.tsx
'use client';

import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import useFirebaseData from '@/hooks/useFirebaseData';

import Header from '@/components/layout/Header';
import HomeTab from '@/components/tabs/HomeTab';
import DanhLucTab from '@/components/tabs/DanhLucTab';
import TuViTab from '@/components/tabs/TuViTab';
import SoiAccTab from '@/components/tabs/SoiAccTab';
import TalentTab from '@/components/tabs/TalentTab';
import AdminTab from '@/components/tabs/AdminTab';
import GiftcodeTab from '@/components/tabs/GiftcodeTab';
import PointTab from '@/components/tabs/PointTab';
import SatTuongTab from '@/components/tabs/SatTuongTab';
import HoatDongBangTab from '@/components/tabs/HoatDongBangTab';

export default function Home() {
    const { data: session, status } = useSession();
    
    // Quản lý các Linh Điện (Tab)
    const [activeTab, setActiveTab] = useState<'home' | 'danhluc' | 'talent' | 'sattuong' | 'soi_acc' | 'admin' | 'tuvi' | 'giftcode' | 'point' | 'hoatDong'>('home');
    const [displayLang, setDisplayLang] = useState<'vi' | 'en'>('vi');

    // 🟢 ĐÃ SỬA LỖI BUILD: Bỏ chữ `loading` đi để TypeScript không chặn đường nữa
    const { danhLuc, talent, wwmData, playerProfiles, tuViData, giftcodeData, giftcodeClaims, pointData, satTuongData } = useFirebaseData();

    // 🟢 Thuật toán nhận diện Bang Chủ siêu chuẩn
    const isMaster = session?.user?.name === "kyo_98" || session?.user?.name === "Master";

    // 🟢 ĐÃ SỬA LỖI BUILD: Chỉ dùng `status === 'loading'` của NextAuth
    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-sky-500/20 border-t-sky-500 animate-spin"></div>
                    <p className="text-zinc-400 text-sm font-medium tracking-widest uppercase">Đang mở cổng sơn trang...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 relative overflow-hidden">
                {/* Hào quang nền */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-sky-500/10 via-zinc-950/50 to-zinc-950"></div>
                
                <div className="relative z-10 bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md p-8 rounded-2xl max-w-md w-full mx-4 shadow-2xl text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center font-black text-white text-2xl mx-auto mb-6 shadow-[0_0_20px_rgba(14,165,233,0.3)]">
                        TL
                    </div>
                    <h2 className="text-xl font-bold tracking-wider text-zinc-100 mb-2">THANH LONG SƠN TRANG</h2>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-8">Nơi tụ hội của các bậc cao nhân</p>
                    <button 
                        onClick={() => signIn('discord')}
                        className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm tracking-wider transition-all shadow-[0_4px_20px_rgba(14,165,233,0.25)] hover:shadow-[0_4px_25px_rgba(14,165,233,0.4)] cursor-pointer"
                    >
                        🔑 Khởi Động Trận Pháp (Discord)
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-16">
            <Header 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                displayLang={displayLang} 
                setDisplayLang={setDisplayLang} 
                isMaster={isMaster} 
                signOut={signOut} 
            />

            <div className="max-w-7xl mx-auto px-4 py-8">
                {activeTab === 'home' && <HomeTab session={session} danhLuc={danhLuc} tuViData={tuViData} setActiveTab={setActiveTab} isMaster={isMaster} />}
                
                {activeTab === 'danhluc' && <DanhLucTab data={danhLuc} />}
                {activeTab === 'tuvi' && <TuViTab data={tuViData} danhLuc={danhLuc} />}
                {activeTab === 'soi_acc' && <SoiAccTab profiles={playerProfiles} wwmData={wwmData} lang={displayLang} />}
                {activeTab === 'talent' && <TalentTab data={talent} danhLuc={danhLuc} />}
                {activeTab === 'admin' && isMaster && <AdminTab wwmData={wwmData} />}
                {activeTab === 'giftcode' && (
                    <GiftcodeTab 
                        giftcodeData={giftcodeData} 
                        giftcodeClaims={giftcodeClaims} 
                        danhLuc={danhLuc}
                        session={session}
                        isMaster={isMaster}
                    />)}
                {activeTab === 'point' && <PointTab data={pointData} danhLuc={danhLuc} />}
                
                {activeTab === 'sattuong' && <SatTuongTab data={satTuongData} danhLuc={danhLuc} />}
                
                {activeTab === 'hoatDong' && (
                    <HoatDongBangTab 
                        danhLuc={danhLuc} 
                        session={session} 
                        isMaster={isMaster} 
                    />
                )}
            </div>
        </div>
    );
}