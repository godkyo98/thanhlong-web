/* eslint-disable @typescript-eslint/no-explicit-any */
// app/page.tsx
'use client';

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import useFirebaseData from "@/hooks/useFirebaseData";

import Header from "@/components/layout/Header";
import HomeTab from "@/components/tabs/HomeTab";
import DanhLucTab from "@/components/tabs/DanhLucTab";
import TuViTab from "@/components/tabs/TuViTab";
import SoiAccTab from "@/components/tabs/SoiAccTab";
import TalentTab from "@/components/tabs/TalentTab";
import AdminTab from "@/components/tabs/AdminTab";
import GiftcodeTab from "@/components/tabs/GiftcodeTab";
import PointTab from "@/components/tabs/PointTab";
import SatTuongTab from "@/components/tabs/SatTuongTab";
import HoatDongTab from "@/components/tabs/HoatDongTab";
import WwmBuildsTab from "@/components/tabs/WwmBuildsTab";

export type TabKey = 'home' | 'danhluc' | 'talent' | 'sattuong' | 'soi_acc' | 'admin' | 'tuvi' | 'giftcode' | 'point' | 'hoatdong' | 'builds';

const VALID_TABS: TabKey[] = ['home', 'danhluc', 'talent', 'sattuong', 'soi_acc', 'admin', 'tuvi', 'giftcode', 'point', 'hoatdong', 'builds'];

const TAB_LABELS: Record<TabKey, { icon: string; title: string }> = {
    home: { icon: '⛩️', title: 'Chính Điện Thanh Long' },
    danhluc: { icon: '📜', title: 'Sổ Danh Lục Quân Số' },
    tuvi: { icon: '🏆', title: 'Bảng Phong Thần Tu Vi' },
    talent: { icon: '👹', title: 'Bảng Cáo Thị Săn Boss' },
    soi_acc: { icon: '🔮', title: 'Đài Chiếu Yêu (Soi Căn Cốt)' },
    giftcode: { icon: '🎁', title: 'Tàng Bảo Các (Giftcode)' },
    point: { icon: '💰', title: 'Bảng Vàng Công Trạng' },
    sattuong: { icon: '👹', title: 'Bảng Chiến Thần Sát Tướng' },
    hoatdong: { icon: '🔥', title: 'Sổ Điệp Hoạt Động Bang' },
    builds: { icon: '⚔️', title: 'Thần Khí Các · Giám Định & Tối Ưu Trang Bị' },
    admin: { icon: '⚙️', title: 'Mật Thất Quản Trị Tông Môn' },
};

export default function Home() {
    const { data: session, status } = useSession();
    const [activeTab, setActiveTabState] = useState<TabKey>('home');
    const [displayLang, setDisplayLang] = useState<'vi' | 'en'>('vi');

    const { 
        danhLuc, talent, wwmData, playerProfiles, tuViData, 
        giftcodeData, giftcodeClaims, pointData, satTuongData, bangHoatDong, wwmBuilds 
    } = useFirebaseData();

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const syncFromUrl = () => {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab') as TabKey | null;
            if (tabParam && VALID_TABS.includes(tabParam)) {
                setActiveTabState(tabParam);
            } else {
                setActiveTabState('home');
            }
        };

        syncFromUrl();
        window.addEventListener('popstate', syncFromUrl);
        return () => window.removeEventListener('popstate', syncFromUrl);
    }, []);

    const setActiveTab = useCallback((nextTab: TabKey) => {
        setActiveTabState(nextTab);
        if (typeof window !== 'undefined') {
            const url = nextTab === 'home' ? window.location.pathname : `${window.location.pathname}?tab=${nextTab}`;
            window.history.pushState({ tab: nextTab }, '', url);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, []);

    if (status === "loading") return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-amber-400 animate-pulse text-xl">🔮 Đang soi xét lệnh bài...</div>;

    if (!session) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
                <div className="text-7xl mb-6">🐉</div>
                <h1 className="text-4xl font-bold text-amber-400 mb-4 tracking-widest">THANH LONG SƠN TRANG</h1>
                <p className="text-zinc-400 mb-10 max-w-md leading-relaxed">Khách vãng lai xin vui lòng xuất trình lệnh bài Discord để tiến vào.</p>
                <button onClick={() => signIn('discord')} className="px-8 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl font-bold mt-4 transition-all shadow-[0_0_20px_rgba(88,101,242,0.3)] cursor-pointer">Tiến Vào Bằng Discord</button>
            </div>
        );
    }

    const isMaster = session?.user?.name === "kyo_98" || session?.user?.name === "Master";

    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 pb-12 relative overflow-x-hidden">
            <Header 
                activeTab={activeTab as any} 
                setActiveTab={setActiveTab as any} 
                displayLang={displayLang} 
                setDisplayLang={setDisplayLang} 
                isMaster={isMaster} 
                signOut={signOut} 
            />

            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
                {activeTab !== 'home' && (
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 rounded-2xl px-4 py-2.5 shadow-md">
                        <div className="flex items-center gap-2 text-xs">
                            <button
                                onClick={() => setActiveTab('home')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-amber-500/15 text-zinc-300 hover:text-amber-400 border border-zinc-800 hover:border-amber-500/30 font-bold transition-all cursor-pointer"
                            >
                                <span>⬅️</span>
                                <span>Trở về Chính Điện</span>
                            </button>
                            <span className="text-zinc-600 font-mono">/</span>
                            <span className="text-amber-400 font-bold flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <span>{TAB_LABELS[activeTab]?.icon}</span>
                                <span>{TAB_LABELS[activeTab]?.title}</span>
                            </span>
                        </div>

                        <div className="text-[11px] text-zinc-500 font-mono hidden sm:block">
                            🔗 Đường dẫn trực tiếp: <span className="text-zinc-400">?tab={activeTab}</span>
                        </div>
                    </div>
                )}

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
                    />
                )}
                {activeTab === 'point' && <PointTab data={pointData} danhLuc={danhLuc} />}
                {activeTab === 'sattuong' && <SatTuongTab data={satTuongData} danhLuc={danhLuc} />}
                {activeTab === 'hoatdong' && <HoatDongTab data={bangHoatDong} danhLuc={danhLuc} />}
                {activeTab === 'builds' && (
                    <WwmBuildsTab
                        wwmBuilds={wwmBuilds}
                        wwmData={wwmData}
                        danhLuc={danhLuc}
                        playerProfiles={playerProfiles}
                        session={session}
                        lang={displayLang}
                        isMaster={isMaster}
                    />
                )}
            </div>
        </main>
    );
}