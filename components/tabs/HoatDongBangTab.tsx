// components/tabs/HoatDongBangTab.tsx
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function HoatDongBangTab() {
    const [isLoading, setIsLoading] = useState(true);
    const [reportData, setReportData] = useState<any[] | null>(null);
    const [metaData, setMetaData] = useState({ guildName: 'Thanh Long', totalMembers: 0, lastUpdated: '' });

    // 🔮 TUYỆT KỸ KÉO DỮ LIỆU TỪ THIÊN ĐÌNH (FIREBASE)
    const fetchHoatDongFromFirebase = async () => {
        setIsLoading(true);
        try {
            const docRef = doc(db, 'thanhlong_config', 'bang_hoat_dong');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setReportData(data.members || []);
                setMetaData({
                    guildName: data.guildName || 'Thanh Long',
                    totalMembers: data.totalMembers || 0,
                    lastUpdated: data.lastUpdated || ''
                });
            } else {
                setReportData([]);
            }
        } catch (error: any) {
            alert('❌ Lỗi tải sổ sách từ Firebase: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Tự động gọi hàm khi vừa mở Tab
    useEffect(() => {
        fetchHoatDongFromFirebase();
    }, []);

    const formatTime = (isoString: string) => {
        if (!isoString) return 'Chưa rõ';
        const d = new Date(isoString);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-10">
            {/* TIÊU ĐỀ & NÚT LÀM MỚI */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-emerald-400">🔥 Sổ Điệp Hoạt Động Bang Hội</h2>
                    <p className="text-sm text-zinc-400 mt-1">
                        Dữ liệu được đồng bộ từ lần xuất báo cáo gần nhất của Bot Discord.
                    </p>
                </div>
                <button
                    onClick={fetchHoatDongFromFirebase}
                    disabled={isLoading}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold py-2 px-4 rounded-lg border border-zinc-700 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                    {isLoading ? '⏳ Đang kéo...' : '🔄 Làm mới dữ liệu'}
                </button>
            </div>

            {/* BẢNG BÁO CÁO */}
            {isLoading ? (
                <div className="text-center py-20 text-zinc-500 font-mono animate-pulse">Đang triệu hồi dữ liệu từ Firebase...</div>
            ) : !reportData || reportData.length === 0 ? (
                <div className="text-center py-16 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
                    🍃 Sổ sách trống rỗng. Bang Chủ hãy gõ lệnh <code className="text-amber-400 bg-amber-400/10 px-1 rounded">/bang_hoat_dong</code> trên Discord để Bot tải dữ liệu lên đây nhé!
                </div>
            ) : (
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4">
                    {/* Header Bảng */}
                    <div className="bg-zinc-950 p-5 flex flex-col sm:flex-row justify-between items-center border-b border-zinc-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">🐉</span>
                            <div>
                                <h3 className="text-lg font-bold text-zinc-100 uppercase tracking-wide">Bang: {metaData.guildName}</h3>
                                <div className="text-xs text-zinc-500 font-mono mt-0.5">
                                    Quân số: <span className="text-emerald-400 font-bold">{metaData.totalMembers}</span> | Cập nhật: <span className="text-amber-400">{formatTime(metaData.lastUpdated)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4 sm:mt-0">
                            <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs rounded-lg font-medium">🥇 Top 10 Cột Sống</span>
                            <span className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs rounded-lg font-medium">⚠️ Cảnh báo Lười biếng</span>
                        </div>
                    </div>

                    {/* Lưới Dữ Liệu */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-900/50 border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500">
                                    <th className="p-4 font-bold text-center w-16">Hạng</th>
                                    <th className="p-4 font-bold">Danh Xưng</th>
                                    <th className="p-4 font-bold text-center">Cấp</th>
                                    <th className="p-4 font-bold text-amber-400/80 text-right">N.Động Tuần</th>
                                    <th className="p-4 font-bold text-right">N.Động Tháng</th>
                                    <th className="p-4 font-bold text-right">Tổng N.Động</th>
                                    <th className="p-4 font-bold text-right text-emerald-400/80">Quỹ Bang</th>
                                    <th className="p-4 font-bold">Gia Nhập</th>
                                    <th className="p-4 font-bold">Online Gần Nhất</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {reportData.map((m: any, idx: number) => {
                                    // Logic đánh dấu
                                    const isTop10 = idx < 10;
                                    const isLazy = m.nangDongTuan < 500; // < 500 điểm bị bôi đỏ

                                    let rankIcon: React.ReactNode = <span className="text-zinc-500 font-mono">{idx + 1}</span>;
                                    if (idx === 0) rankIcon = <span className="text-2xl drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">🥇</span>;
                                    else if (idx === 1) rankIcon = <span className="text-2xl drop-shadow-[0_0_8px_rgba(156,163,175,0.8)]">🥈</span>;
                                    else if (idx === 2) rankIcon = <span className="text-2xl drop-shadow-[0_0_8px_rgba(180,83,9,0.8)]">🥉</span>;
                                    else if (idx === 3) rankIcon = <span className="text-xl">🏅</span>;
                                    else if (isTop10) rankIcon = <span className="text-lg">🔥</span>;

                                    return (
                                        <tr key={idx} className={`border-b border-zinc-800/40 hover:bg-zinc-800/30 transition-colors ${isLazy && !isTop10 ? 'bg-rose-950/10' : ''}`}>
                                            <td className="p-4 text-center align-middle">{rankIcon}</td>
                                            
                                            <td className="p-4">
                                                <div className={`font-bold ${isTop10 ? 'text-amber-400' : isLazy ? 'text-rose-400' : 'text-zinc-200'}`}>
                                                    {m.ten}
                                                </div>
                                                {isLazy && <div className="text-[9px] text-rose-500 mt-0.5 uppercase font-bold tracking-wider">⚠️ Lười biếng</div>}
                                            </td>

                                            <td className="p-4 text-center text-zinc-400 font-mono">{m.level}</td>
                                            
                                            <td className="p-4 text-right">
                                                <span className={`font-black font-mono ${isTop10 ? 'text-amber-400 text-base' : isLazy ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                    {m.nangDongTuan?.toLocaleString('vi-VN')}
                                                </span>
                                            </td>

                                            <td className="p-4 text-right text-zinc-300 font-mono">{m.nangDongThang?.toLocaleString('vi-VN')}</td>
                                            <td className="p-4 text-right text-zinc-500 font-mono">{m.nangDongTong?.toLocaleString('vi-VN')}</td>
                                            <td className="p-4 text-right text-emerald-400/80 font-mono font-bold">{m.quy?.toLocaleString('vi-VN')}</td>
                                            
                                            <td className="p-4 text-xs text-zinc-500 font-mono">{m.joinTime}</td>
                                            <td className="p-4 text-xs text-zinc-400 font-mono">{m.lastOnline}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}