/* eslint-disable @typescript-eslint/no-explicit-any */
// app/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import useFirebaseData from "@/hooks/useFirebaseData";

import Header from "@/components/layout/Header";
import HomeTab from "@/components/tabs/HomeTab";
import DanhLucTab, { DanhLucSubTab } from "@/components/tabs/DanhLucTab";
import TuViTab from "@/components/tabs/TuViTab";
import SoiAccTab from "@/components/tabs/SoiAccTab";
import TalentTab from "@/components/tabs/TalentTab";
import AdminTab, { AdminSection } from "@/components/tabs/AdminTab";
import GiftcodeTab from "@/components/tabs/GiftcodeTab";
import SatTuongTab from "@/components/tabs/SatTuongTab";

import WwmBuildsTab from "@/components/tabs/WwmBuildsTab";
import PvpTournamentTab from "@/components/tabs/PvpTournamentTab";
import ThongBaoTab from "@/components/tabs/ThongBaoTab";

export type TabKey = 'home' | 'danhluc' | 'talent' | 'sattuong' | 'soi_acc' | 'admin' | 'tuvi' | 'giftcode' | 'point' | 'builds' | 'pvp' | 'thongbao';

const VALID_TABS: TabKey[] = ['home', 'danhluc', 'talent', 'sattuong', 'soi_acc', 'admin', 'tuvi', 'giftcode', 'point', 'builds', 'pvp', 'thongbao'];

const TAB_LABELS: Record<TabKey, { icon: string; title: string }> = {
    home: { icon: '⛩️', title: 'Chính Điện Thanh Long' },
    danhluc: { icon: '📜', title: 'Sổ Danh Lục & Công Trạng' },
    tuvi: { icon: '🏆', title: 'Bảng Phong Thần Tu Vi' },
    talent: { icon: '👹', title: 'Bảng Cáo Thị Thiên Phú Boss' },
    soi_acc: { icon: '🪞', title: 'Đài Chiếu Yêu · Khoe Build & Chỉ Số Quần Hùng' },
    giftcode: { icon: '🎁', title: 'Tàng Bảo Các (Giftcode)' },
    point: { icon: '💰', title: 'Bảng Vàng Công Trạng' },
    sattuong: { icon: '👹', title: 'Bảng Chiến Thần Sát Tướng' },

    builds: { icon: '⚔️', title: 'Thần Khí Các · Giám Định & Tối Ưu Trang Bị' },
    pvp: { icon: '🏆', title: 'Võ Lâm Tranh Bá · Sơ Đồ Giải Đấu PvP' },
    thongbao: { icon: '📢', title: 'Đài Truyền Âm · Cáo Thị & Thông Báo Tông Môn' },
    admin: { icon: '⚙️', title: 'Mật Thất Quản Trị Tông Môn' },
};

export default function Home() {
    const { data: session, status } = useSession();
    const [activeTab, setActiveTabState] = useState<TabKey>('home');
    const [danhLucSubTab, setDanhLucSubTab] = useState<DanhLucSubTab>('members');
    const [adminSection, setAdminSection] = useState<AdminSection>('treasury');
    const [displayLang, setDisplayLang] = useState<'vi' | 'en'>('vi');

    const { 
        danhLuc, talent, wwmData, playerProfiles, tuViData, 
        giftcodeData, giftcodeClaims, pointData, satTuongData, satTuongMeta, bossRotation, webNotifications, wwmBuilds 
    } = useFirebaseData();

    const [lastSeenNotifAt, setLastSeenNotifAt] = useState<number>(0);

    const markAllNotifRead = useCallback(() => {
        const now = Date.now();
        setLastSeenNotifAt(now);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('thanhlong_last_seen_notif', String(now));
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const timer = window.setTimeout(() => {
            const saved = Number(window.localStorage.getItem('thanhlong_last_seen_notif') || '0');
            if (!isNaN(saved) && saved > 0) setLastSeenNotifAt(saved);
        }, 0);
        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (activeTab !== 'thongbao') return;
        const timer = window.setTimeout(() => {
            markAllNotifRead();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [activeTab, markAllNotifRead]);

    const unreadNotifCount = useMemo(() => {
        if (activeTab === 'thongbao') return 0;
        const items = Array.isArray(webNotifications?.items) ? webNotifications.items : [];
        return items.filter((it: any) => (it?.createdAt || 0) > lastSeenNotifAt).length;
    }, [webNotifications, lastSeenNotifAt, activeTab]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const syncFromUrl = () => {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab') as TabKey | null;
            const subParam = params.get('sub');
            if (tabParam === 'point') {
                setActiveTabState('danhluc');
                setDanhLucSubTab('merit');
            } else if (tabParam && VALID_TABS.includes(tabParam)) {
                setActiveTabState(tabParam);
                if (tabParam === 'danhluc') {
                    setDanhLucSubTab(subParam === 'merit' ? 'merit' : 'members');
                }
            } else {
                setActiveTabState('home');
            }
        };

        syncFromUrl();
        window.addEventListener('popstate', syncFromUrl);
        return () => window.removeEventListener('popstate', syncFromUrl);
    }, []);

    const setActiveTab = useCallback((nextTab: TabKey, sub?: DanhLucSubTab) => {
        if (nextTab === 'point') {
            setActiveTabState('danhluc');
            setDanhLucSubTab('merit');
            if (typeof window !== 'undefined') {
                const url = `${window.location.pathname}?tab=danhluc&sub=merit`;
                window.history.pushState({ tab: 'danhluc', sub: 'merit' }, '', url);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return;
        }

        setActiveTabState(nextTab);
        if (nextTab === 'danhluc') {
            setDanhLucSubTab(sub || 'members');
        }
        if (typeof window !== 'undefined') {
            const url = nextTab === 'home'
                ? window.location.pathname
                : nextTab === 'danhluc' && sub === 'merit'
                    ? `${window.location.pathname}?tab=danhluc&sub=merit`
                    : `${window.location.pathname}?tab=${nextTab}`;
            window.history.pushState({ tab: nextTab, sub }, '', url);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, []);

    const handleDanhLucSubTabChange = useCallback((nextSub: DanhLucSubTab) => {
        setDanhLucSubTab(nextSub);
        if (typeof window !== 'undefined') {
            const url = nextSub === 'merit'
                ? `${window.location.pathname}?tab=danhluc&sub=merit`
                : `${window.location.pathname}?tab=danhluc`;
            window.history.replaceState({ tab: 'danhluc', sub: nextSub }, '', url);
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
        <main className="min-h-screen bg-transparent text-zinc-100 pb-12 relative overflow-x-hidden">
            <Header 
                activeTab={activeTab as any} 
                setActiveTab={setActiveTab as any} 
                displayLang={displayLang} 
                setDisplayLang={setDisplayLang} 
                isMaster={isMaster}
                unreadNotifCount={unreadNotifCount}
                signOut={signOut} 
            />

            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
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
                    </div>
                )}

                {activeTab === 'home' && <HomeTab session={session} danhLuc={danhLuc} tuViData={tuViData} webNotifications={webNotifications} setActiveTab={setActiveTab} />}
                {activeTab === 'danhluc' && (
                    <DanhLucTab
                        danhLuc={danhLuc}
                        talentData={talent}
                        tuViData={tuViData}
                        pointData={pointData}
                        notificationsData={webNotifications}
                        isMaster={isMaster}
                        wwmData={wwmData}
                        satTuongData={satTuongData}
                        subTab={danhLucSubTab}
                        onSubTabChange={handleDanhLucSubTabChange}
                        onOpenAdminSection={
                            isMaster
                                ? (sec) => {
                                      setAdminSection(sec);
                                      setActiveTab('admin');
                                  }
                                : undefined
                        }
                    />
                )}
                {activeTab === 'tuvi' && <TuViTab data={tuViData} danhLuc={danhLuc} />}
                {activeTab === 'soi_acc' && (
                    <SoiAccTab 
                        wwmBuilds={wwmBuilds}
                        danhLuc={danhLuc}
                        wwmData={wwmData}
                        session={session}
                        lang={displayLang}
                        setActiveTab={setActiveTab}
                    />
                )}
                {activeTab === 'talent' && <TalentTab data={talent} danhLuc={danhLuc} />}
                {activeTab === 'admin' && isMaster && (
                    <AdminTab
                        wwmData={wwmData}
                        danhLuc={danhLuc}
                        pointData={pointData}
                        tuViData={tuViData}
                        notificationsData={webNotifications}
                        session={session}
                        section={adminSection}
                        onSectionChange={setAdminSection}
                        onOpenPublicMerit={() => setActiveTab('danhluc', 'merit')}
                    />
                )}
                {activeTab === 'giftcode' && (
                    <GiftcodeTab 
                        giftcodeData={giftcodeData} 
                        giftcodeClaims={giftcodeClaims} 
                        danhLuc={danhLuc}
                        session={session}
                        isMaster={isMaster}
                    />
                )}
                {activeTab === 'thongbao' && (
                    <ThongBaoTab
                        data={webNotifications}
                        danhLuc={danhLuc}
                        session={session}
                        isMaster={isMaster}
                        setActiveTab={setActiveTab}
                        onMarkAllRead={markAllNotifRead}
                    />
                )}
                {activeTab === 'sattuong' && (
                    <SatTuongTab
                        data={satTuongData}
                        metadata={satTuongMeta}
                        bossRotation={bossRotation}
                        pointData={pointData}
                        danhLuc={danhLuc}
                        session={session}
                        isMaster={isMaster}
                    />
                )}

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
                {activeTab === 'pvp' && (
                    <PvpTournamentTab
                        danhLuc={danhLuc}
                        wwmData={wwmData}
                        session={session}
                        isMaster={isMaster}
                    />
                )}
            </div>
        </main>
    );
}
