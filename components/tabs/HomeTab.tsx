// components/tabs/HomeTab.tsx
import React from 'react';

export default function HomeTab({ session, danhLuc, tuViData, setActiveTab }: { session: any, danhLuc: any, tuViData: any, setActiveTab: (tab: any) => void }) {
    
    // THUẬT TOÁN ĐỊNH VỊ TÊN IN-GAME XUYÊN DATABASE
    const userName = (() => {
        const discordName = session?.user?.name;
        if (!discordName) return 'Đại Hiệp';
        if (!danhLuc) return discordName;

        let realDiscordId = session?.user?.id; 
        if (!realDiscordId && tuViData) {
            const foundTuVi = Object.entries(tuViData).find(([id, d]: any) => d.username === discordName || d.name === discordName || d.displayName === discordName);
            if (foundTuVi) realDiscordId = foundTuVi[0];
        }

        if (realDiscordId && danhLuc[realDiscordId]?.ingame) {
            return danhLuc[realDiscordId].ingame;
        }

        const match = Object.values(danhLuc).find((p: any) => p.discordName === discordName || p.username === discordName);
        if (match && (match as any).ingame) return (match as any).ingame;

        return discordName;
    })();

    const totalMembers = danhLuc ? Object.values(danhLuc).filter((p: any) => p.ingame).length : 0;
    
    // ĐỒNG BỘ CÁCH TÍNH XP CỦA TOP 1 KHỚP VỚI TAB PHONG THẦN
    const top1TuVi = (() => {
        if (!tuViData || Object.keys(tuViData).length === 0) return null;
        
        const sorted = Object.entries(tuViData).map(([id, d]: any) => {
            const calculatedXp = d.xp ?? ((d.msgCount || 0) * 10 + (d.voiceMinutes || 0) * 5 + (d.reactionCount || 0) * 2);
            return { id, ...d, xp: calculatedXp };
        }).sort((a: any, b: any) => b.xp - a.xp);

        if (!sorted[0]) return null;
        
        const top1Id = sorted[0].id;
        const top1Data = sorted[0];
        const top1Name = (danhLuc && danhLuc[top1Id]?.ingame) ? danhLuc[top1Id].ingame : (top1Data.displayName || top1Data.username || top1Data.name);
        
        return { name: top1Name };
    })();

    return (
        <section className="w-full animate-in fade-in zoom-in-95 duration-500 space-y-8">
            {/* BANNER CHÀO MỪNG BAN CHẤT ĐẠI PHÁI */}
            <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-zinc-800/80">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay"></div>
                
                <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <div className="inline-block px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold tracking-widest mb-4">
                            ⛩️ ĐỆ NHẤT SƠN TRANG
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-600 mb-2 drop-shadow-sm">
                            Hoan nghênh, {userName}!
                        </h2>
                        <p className="text-zinc-400 max-w-xl leading-relaxed text-sm">
                            Chào mừng đại hiệp bước vào Chính Điện của Thanh Long. Hãy chọn một trong các lối đi bên dưới để bắt đầu kiểm tra mật thư bang hội.
                        </p>
                    </div>
                    
                    <div className="hidden md:flex flex-col gap-3 shrink-0">
                        <div className="bg-zinc-950/60 backdrop-blur border border-zinc-800 p-4 rounded-xl flex items-center gap-4 w-48">
                            <div className="text-3xl">👥</div>
                            <div>
                                <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Quân Số Sơn Trang</div>
                                <div className="text-xl font-black text-zinc-200">{totalMembers}</div>
                            </div>
                        </div>
                        {top1TuVi && (
                            <div className="bg-zinc-950/60 backdrop-blur border border-amber-500/10 p-4 rounded-xl flex items-center gap-4 w-48">
                                <div className="text-3xl">👑</div>
                                <div className="overflow-hidden">
                                    <div className="text-[10px] text-amber-500/80 uppercase font-bold tracking-wider">Top 1 Phong Thần</div>
                                    <div className="text-sm font-black text-amber-400 truncate w-full">{top1TuVi.name}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 🟢 HỆ THỐNG CÁC LỆNH BÀI CARD ĐIỀU HƯỚNG */}
            <div>
                <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-4 pl-1">🏰 Các Cửa Vào Mật Thất</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    
                    {/* CARD 1: DANH LỤC */}
                    <div onClick={() => setActiveTab('danhluc')} className="group bg-zinc-900/40 border border-zinc-800/80 hover:border-amber-500/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-[0_10px_20px_rgba(245,158,11,0.05)] flex flex-col justify-between">
                        <div>
                            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">📜</div>
                            <h4 className="text-base font-bold text-zinc-200 group-hover:text-amber-400 transition-colors">Sổ Danh Lục</h4>
                            <p className="text-[11px] text-zinc-500 leading-relaxed mt-1.5">Tra cứu quân số, môn phái, chức vụ và sơ đồ tham gia Bang Chiến của toàn bang.</p>
                        </div>
                    </div>

                    {/* CARD 2: PHONG THẦN BẢNG */}
                    <div onClick={() => setActiveTab('tuvi')} className="group bg-zinc-900/40 border border-zinc-800/80 hover:border-amber-500/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-[0_10px_20px_rgba(245,158,11,0.05)] flex flex-col justify-between">
                        <div>
                            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">🏆</div>
                            <h4 className="text-base font-bold text-zinc-200 group-hover:text-amber-400 transition-colors">Phong Thần</h4>
                            <p className="text-[11px] text-zinc-500 leading-relaxed mt-1.5">Xem thứ hạng cào phím tương tác, tu vi cấp độ và kho danh hiệu huyền thoại.</p>
                        </div>
                    </div>

                    {/* CARD 3: SĂN BOSS TALENT */}
                    <div onClick={() => setActiveTab('talent')} className="group bg-zinc-900/40 border border-zinc-800/80 hover:border-amber-500/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-[0_10px_20px_rgba(245,158,11,0.05)] flex flex-col justify-between">
                        <div>
                            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">👹</div>
                            <h4 className="text-base font-bold text-zinc-200 group-hover:text-amber-400 transition-colors">Săn Boss</h4>
                            <p className="text-[11px] text-zinc-500 leading-relaxed mt-1.5">Bảng cáo thị ghi danh lập tổ đội báo danh lộ trình chinh phạt Boss ẩn.</p>
                        </div>
                    </div>

                    {/* CARD 4: ĐÀI CHIẾU YÊU */}
                    <div onClick={() => setActiveTab('soi_acc')} className="group bg-zinc-900/40 border border-zinc-800/80 hover:border-cyan-500/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-[0_10px_20px_rgba(6,182,212,0.05)] flex flex-col justify-between">
                        <div>
                            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">🔮</div>
                            <h4 className="text-base font-bold text-zinc-200 group-hover:text-cyan-400 transition-colors">Đài Chiếu Yêu</h4>
                            <p className="text-[11px] text-zinc-500 leading-relaxed mt-1.5">Khai triển thiên nhãn soi ngũ hành căn cốt, dòng ẩn trang bị của quần hùng.</p>
                        </div>
                    </div>

                    {/* CARD 5: TÀNG BẢO CÁC */}
                    <div onClick={() => setActiveTab('giftcode')} className="group bg-zinc-900/40 border border-zinc-800/80 hover:border-rose-500/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-[0_10px_20px_rgba(244,63,94,0.05)] flex flex-col justify-between">
                        <div>
                            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">🎁</div>
                            <h4 className="text-base font-bold text-zinc-200 group-hover:text-rose-400 transition-colors">Tàng Bảo Các</h4>
                            <p className="text-[11px] text-zinc-500 leading-relaxed mt-1.5">Sao chép Giftcode phúc lợi sơn môn thần tốc, kiểm soát tiến độ claimed.</p>
                        </div>
                    </div>

                    {/* CARD 6: CÔNG TRẠNG */}
                    <div onClick={() => setActiveTab('point')} className="group bg-zinc-900/40 border border-zinc-800/80 hover:border-emerald-500/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-[0_10px_20px_rgba(16,185,129,0.05)] flex flex-col justify-between">
                        <div>
                            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">💰</div>
                            <h4 className="text-base font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">Công Trạng</h4>
                            <p className="text-[11px] text-zinc-500 leading-relaxed mt-1.5">Bảng Vàng vinh danh tổng cống hiến lịch sử và Ngân khố điểm hiện tại của bang.</p>
                        </div>
                    </div>
                    
                    {/* CARD 7: SÁT TƯỚNG */}
                    <div onClick={() => setActiveTab('sattuong')} className="group bg-zinc-900/40 border border-zinc-800/80 hover:border-rose-500/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-[0_10px_20px_rgba(239,68,68,0.05)] flex flex-col justify-between">
                        <div>
                            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">👹</div>
                            <h4 className="text-base font-bold text-zinc-200 group-hover:text-rose-400 transition-colors">Sát Tướng</h4>
                            <p className="text-[11px] text-zinc-500 leading-relaxed mt-1.5">Bảng Vàng vinh danh Chiến Thần PVE, điểm Phong Thần tháng và danh hiệu Mùa giải.</p>
                        </div>
                    </div>

                    {/* 🟢 CARD 8: HOẠT ĐỘNG BANG (MỚI THÊM) */}
                    <div onClick={() => setActiveTab('hoatDong')} className="group bg-zinc-900/40 border border-zinc-800/80 hover:border-cyan-400/40 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-[0_10px_20px_rgba(34,211,238,0.05)] flex flex-col justify-between">
                        <div>
                            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">🔥</div>
                            <h4 className="text-base font-bold text-zinc-200 group-hover:text-cyan-400 transition-colors">Hoạt Động Bang</h4>
                            <p className="text-[11px] text-zinc-500 leading-relaxed mt-1.5">Sổ điệp tuần kiểm độ năng động tuần, tháng của bang chúng đồng bộ từ Discord Bot.</p>
                        </div>
                    </div>
                    
                </div>
            </div>
        </section>
    );
}