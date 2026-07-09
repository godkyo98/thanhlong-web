// app/page.tsx
'use client';

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import useFirebaseData from "@/hooks/useFirebaseData";

import Header from "@/components/layout/Header";
import HomeTab from "@/components/tabs/HomeTab"; // 🟢 Import Chính Điện
import DanhLucTab from "@/components/tabs/DanhLucTab";
import TuViTab from "@/components/tabs/TuViTab";
import SoiAccTab from "@/components/tabs/SoiAccTab";
import TalentTab from "@/components/tabs/TalentTab";
import AdminTab from "@/components/tabs/AdminTab";
import GiftcodeTab from "@/components/tabs/GiftcodeTab";
import PointTab from "@/components/tabs/PointTab";
import SatTuongTab from "@/components/tabs/SatTuongTab";

export default function Home() {
    const { data: session, status } = useSession();
    
    // 🟢 SỬA LẠI TAB MẶC ĐỊNH LÀ 'home' ĐỂ VỪA VÀO LÀ THẤY TRANG CHỦ
    const [activeTab, setActiveTab] = useState<'home' | 'danhluc' | 'talent' | 'sattuong' | 'soi_acc' | 'admin' | 'tuvi' | 'giftcode' | 'point'>('home');
    const [displayLang, setDisplayLang] = useState<'vi' | 'en'>('vi');

    const { danhLuc, talent, wwmData, playerProfiles, tuViData, giftcodeData, giftcodeClaims, pointData, satTuongData } = useFirebaseData();
    

    if (status === "loading") return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-amber-400 animate-pulse text-xl">🔮 Đang soi xét lệnh bài...</div>;

    if (!session) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
                <div className="text-7xl mb-6">🐉</div>
                <h1 className="text-4xl font-bold text-amber-400 mb-4 tracking-widest">THANH LONG SƠN TRANG</h1>
                <p className="text-zinc-400 mb-10 max-w-md leading-relaxed">Khách vãng lai xin vui lòng xuất trình lệnh bài Discord để tiến vào.</p>
                <button onClick={() => signIn('discord')} className="px-8 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl font-bold mt-4 transition-all shadow-[0_0_20px_rgba(88,101,242,0.3)]">Tiến Vào Bằng Discord</button>
            </div>
        );
    }

    const isMaster = session?.user?.name === "kyo_98" || session?.user?.name === "Master";

    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 pb-12 relative overflow-x-hidden">
            <Header 
                activeTab={activeTab} setActiveTab={setActiveTab} 
                displayLang={displayLang} setDisplayLang={setDisplayLang} 
                isMaster={isMaster} signOut={signOut} 
            />

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* 🟢 KHẢM CHÍNH ĐIỆN VÀO ĐÂY */}
                {activeTab === 'home' && <HomeTab session={session} danhLuc={danhLuc} tuViData={tuViData} setActiveTab={setActiveTab} />}
                
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
            </div>
        </main>
    );
}