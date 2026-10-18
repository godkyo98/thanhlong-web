// components/tabs/HomeTab.tsx
import React from 'react';

export default function HomeTab({ session, danhLuc, tuViData, setActiveTab }: { session: any, danhLuc: any, tuViData: any, setActiveTab: (tab: any) => void }) {
    
    const userName = (() => {
        const discordName = session?.user?.name;
        if (!discordName) return "Đại Hiệp";
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
            {/* BANNER CHÀO MỪNG (ĐÃ BỎ LỚP NỀN ĐEN ĐẶC to-black) */}
            <div
                className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-cyan-500/30 backdrop-blur-md"
                style={{
                    background: "linear-gradient(135deg, rgba(8, 47, 73, 0.55) 0%, rgba(15, 23, 42, 0.65) 50%, rgba(6, 78, 59, 0.4) 100%)",
                    boxShadow: "0 0 50px -10px rgba(6, 182, 212, 0.2)"
                }}
            >
                {/* Ánh sáng trang trí góc phải Banner */}
                <div
                    className="absolute -top-24 -right-24 w-96 h-96 rounded-full pointer-events-none blur-3xl"
                    style={{ background: "radial-gradient(circle, rgba(245, 158, 11, 0.22) 0%, transparent 70%)" }}
                />

                <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <div className="inline-block px-3 py-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold tracking-widest mb-4">
                            ⛩️ ĐỆ NHẤT SƠN TRANG
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 mb-2 drop-shadow-sm">
                            Hoan nghênh, {userName}!
                        </h2>
                        <p className="text-slate-300 max-w-xl leading-relaxed text-sm">
                            Chào mừng đại hiệp bước vào Chính Điện của Thanh Long. Hãy chọn một trong các lối đi bên dưới để bắt đầu kiểm tra mật thư bang hội.
                        </p>
                    </div>
                    
                    <div className="hidden md:flex flex-col gap-3 shrink-0">
                        <div className="bg-slate-950/60 backdrop-blur-md border border-cyan-500/25 p-4 rounded-xl flex items-center gap-4 w-48">
                            <div className="text-3xl">👥</div>
                            <div>
                                <div className="text-[10px] text-cyan-400/80 uppercase font-bold tracking-wider">Quân Số Sơn Trang</div>
                                <div className="text-xl font-black text-white">{totalMembers}</div>
                            </div>
                        </div>
                        {top1TuVi && (
                            <div className="bg-slate-950/60 backdrop-blur-md border border-amber-500/30 p-4 rounded-xl flex items-center gap-4 w-48">
                                <div className="text-3xl">👑</div>
                                <div className="overflow-hidden">
                                    <div className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">Top 1 Phong Thần</div>
                                    <div className="text-sm font-black text-amber-300 truncate w-full">{top1TuVi.name}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 8 THẺ MẬT THẤT GỐC */}
            <div>
                <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-4 pl-1">🏰 Các Cửa Vào Mật Thất</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    
                    <div onClick={() => setActiveTab('danhluc')} className="group bg-zinc-900/40 border border-zinc-800/80 hover:border-amber-500/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-[0_10px_20px_rgba(245,158,11,0.05)] flex flex-col justify-between">
                        <div>
                            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">📜</div>
                            <h4 className="text-base font-bold text-zinc-200 group-hover:text-amber-400 transition-colors">Sổ Danh Lục</h4>
                            <p className="text-[11px] text-zinc-500 leading-relaxed mt-1.5">Tra cứu quân số, môn phái, chức vụ và sơ đồ tham gia Bang Chiến của toàn bang.</p>
                        </div>
                    </div>

                    <div onClick={() => setActiveTab('tuvi')} className="group bg-zinc-900/40 border border-zinc-800/80 hover:border-amber-500/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-[0_10px_20px_rgba(245,158,11,0.05)] flex flex-col justify-between">
                        <div>
                            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">🏆</div>
                            <h4 className="text-base font-bold text-zinc-200 group-hover:text-amber-400 transition-colors">Phong Thần</h4>
                            <p className="text-[11px] text-zinc-500 leading-relaxed mt-1.5">Xem thứ hạng cào phím tương tác, tu vi cấp độ và kho danh hiệu huyền thoại.</p>
                        </div>
                    </div>

                    <div onClick={() => setActiveTab('talent')} className="group bg-zinc-900/40 border border-zinc-800/80 hover:border-amber-500/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-[0_10px_20px_rgba(245,158,11,0.05)] flex flex-col justify-between">
                        <div>
                            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">👹</div>
                            <h4 className="text-base font-bold text-zinc-200 group-hover:text-amber-400 transition-colors">Săn Boss</h4>
                            <p className="text-[11px] text-zinc-500 leading-relaxed mt-1.5">Bảng cáo thị ghi danh lập tổ đội báo danh lộ trình chinh phạt Boss ẩn.</p>
                        </div>
                    </div>

                    <div onClick={() => setActiveTab('soi_acc')} className="group bg-zinc-900/40 border border-zinc-800/80 hover:border-cyan-500/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-[0_10px_20px_rgba(6,182,212,0.05)] flex flex-col justify-between">
                        <div>
                            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">🔮</div>
                            <h4 className="text-base font-bold text-zinc-200 group-hover:text-cyan-400 transition-colors">Đài Chiếu Yêu</h4>
                            <p className="text-[11px] text-zinc-500 leading-relaxed mt-1.5">Khai triển thiên nhãn soi ngũ hành căn cốt, dòng ẩn trang bị của quần hùng.</p>
                        </div>
                    </div>

                    <div onClick={() => setActiveTab('giftcode')} className="group bg-zinc-900/40 border border-zinc-800/80 hover:border-rose-500/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-[0_10px_20px_rgba(244,63,94,0.05)] flex flex-col justify-between">
                        <div>
                            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">🎁</div>
                            <h4 className="text-base font-bold text-zinc-200 group-hover:text-rose-400 transition-colors">Tàng Bảo Các</h4>
                            <p className="text-[11px] text-zinc-500 leading-relaxed mt-1.5">Sao chép Giftcode phúc lợi sơn môn thần tốc, kiểm soát tiến độ claimed.</p>
                        </div>
                    </div>

                    <div onClick={() => setActiveTab('point')} className="group bg-zinc-900/40 border border-zinc-800/80 hover:border-emerald-500/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-[0_10px_20px_rgba(16,185,129,0.05)] flex flex-col justify-between">
                        <div>
                            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">💰</div>
                            <h4 className="text-base font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">Công Trạng</h4>
                            <p className="text-[11px] text-zinc-500 leading-relaxed mt-1.5">Bảng Vàng vinh danh tổng cống hiến lịch sử và Ngân khố điểm hiện tại của bang.</p>
                        </div>
                    </div>
                    
                    <div onClick={() => setActiveTab('sattuong')} className="group bg-zinc-900/40 border border-zinc-800/80 hover:border-rose-500/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-[0_10px_20px_rgba(239,68,68,0.05)] flex flex-col justify-between">
                        <div>
                            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">👹</div>
                            <h4 className="text-base font-bold text-zinc-200 group-hover:text-rose-400 transition-colors">Sát Tướng</h4>
                            <p className="text-[11px] text-zinc-500 leading-relaxed mt-1.5">Bảng Vàng vinh danh Chiến Thần PVE, điểm Phong Thần tháng và danh hiệu Mùa giải.</p>
                        </div>
                    </div>

                    <div onClick={() => setActiveTab('hoatdong')} className="group bg-zinc-900/40 border border-zinc-800/80 hover:border-orange-500/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-[0_10px_20px_rgba(249,115,22,0.05)] flex flex-col justify-between">
                        <div>
                            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">🔥</div>
                            <h4 className="text-base font-bold text-zinc-200 group-hover:text-orange-400 transition-colors">Hoạt Động Bang</h4>
                            <p className="text-[11px] text-zinc-500 leading-relaxed mt-1.5">Sổ điệp tuần kiểm độ năng động tuần, tháng của bang chúng đồng bộ từ Discord Bot.</p>
                        </div>
                    </div>
                    
                </div>
            </div>

            {/* 🟢 ĐẠI SẢNH THẦN KHÍ CÁC (KHÔNG GÁN CHẾT SỐ LƯỢNG VÕ HỌC HAY PHIÊN BẢN 2.3) */}
            <div>
                <h3 className="text-emerald-400/90 text-xs font-bold uppercase tracking-widest mb-4 pl-1">⚔️ Thần Khí Đài & Tối Ưu Trang Bị</h3>
                <div
                    onClick={() => setActiveTab('builds')}
                    className="group relative overflow-hidden bg-gradient-to-r from-emerald-950/40 via-zinc-900/70 to-zinc-950 border border-emerald-500/30 hover:border-amber-400/60 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-[0_12px_30px_rgba(16,185,129,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                    <div className="flex items-start sm:items-center gap-4">
                        <div className="text-4xl p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                            ⚔️
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-lg font-black text-emerald-400 group-hover:text-amber-300 transition-colors">
                                    Thần Khí Các · Trung Tâm Giám Định & Build Đồ Đa Hệ Võ Học
                                </h4>
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    AI VISION
                                </span>
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Quét ảnh trang bị bằng AI (Ctrl+V), chấm điểm dòng ẩn, khóa 100% Thiên phú Võ học, lưu trữ Tâm Pháp và đồng bộ kho trang bị 8 món theo từng hệ phái.
                            </p>
                        </div>
                    </div>

                    <div className="shrink-0 px-4 py-2 rounded-xl bg-emerald-500/15 group-hover:bg-amber-500 text-emerald-300 group-hover:text-zinc-950 font-black text-xs transition-all">
                        Tiến Vào Thần Khí Các ➔
                    </div>
                </div>
            </div>
        </section>
    );
}