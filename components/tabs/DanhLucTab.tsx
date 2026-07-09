// components/tabs/DanhLucTab.tsx
import { useState } from 'react';

export default function DanhLucTab({ data }: { data: any }) {
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'ingame', direction: 'asc' });
    const [filterClass, setFilterClass] = useState<string>('Tất cả');
    const [filterGw, setFilterGw] = useState<string>('Tất cả');

    const uniqueClasses = data ? Array.from(new Set(Object.values(data).filter((p: any) => p.ingame).map((p: any) => p.class || 'Chưa rõ'))).sort() : [];

    const getSortedPlayers = () => {
        if (!data) return [];
        let players = Object.values(data).filter((p: any) => p.ingame);
        if (filterClass !== 'Tất cả') players = players.filter((p: any) => (p.class || 'Chưa rõ') === filterClass);
        if (filterGw !== 'Tất cả') players = players.filter((p: any) => (p.gw_day || 'Vắng') === filterGw);
        
        if (sortConfig) {
            players.sort((a: any, b: any) => {
                let valA = a[sortConfig.key] || ''; let valB = b[sortConfig.key] || '';
                if (sortConfig.key === 'gw_day') {
                    const weight: Record<string, number> = { 'Cả 2': 1, 'T7': 2, 'CN': 3, 'Vắng': 4, '': 4 };
                    valA = weight[valA] || 4; valB = weight[valB] || 4;
                } else { valA = valA.toString().toLowerCase(); valB = valB.toString().toLowerCase(); }
                return valA < valB ? (sortConfig.direction === 'asc' ? -1 : 1) : valA > valB ? (sortConfig.direction === 'asc' ? 1 : -1) : 0;
            });
        }
        return players;
    };
    const sortedPlayers = getSortedPlayers();

    const handleSort = (key: string) => {
        setSortConfig({ key, direction: sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc' });
    };

    return (
        <section className="animate-in fade-in duration-300">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-50">📜 Sổ Danh Lục Bang Chúng</h2>
                    <p className="text-sm text-zinc-400 mt-1">Dùng bộ lọc bên dưới để tìm kiếm nhanh chóng.</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 px-5 py-2.5 rounded-xl text-sm text-amber-400 flex flex-col items-end">
                    <span className="text-xs uppercase tracking-wider font-semibold">Quân số hiển thị</span>
                    <span className="font-bold text-xl leading-none mt-1">{sortedPlayers.length}</span>
                </div>
            </div>

            <div className="mb-6 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex gap-4 items-center">
                <div className="flex items-center gap-3">
                    <span className="text-sm text-zinc-400">🔍 Lọc Võ Học:</span>
                    <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="bg-zinc-950 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
                        <option value="Tất cả">--- Tất cả ---</option>
                        {uniqueClasses.map((cls: any, i) => (<option key={i} value={cls}>{cls}</option>))}
                    </select>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-zinc-400">⚔️ Lọc Bang Chiến:</span>
                    <select value={filterGw} onChange={(e) => setFilterGw(e.target.value)} className="bg-zinc-950 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
                        <option value="Tất cả">--- Tất cả ---</option>
                        <option value="Cả 2">Cả hai</option>
                        <option value="T7">Thứ 7</option>
                        <option value="CN">Chủ Nhật</option>
                        <option value="Vắng">Vắng</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-md">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 text-xs font-semibold uppercase tracking-wider select-none">
                            <th onClick={() => handleSort('ingame')} className="px-6 py-4 cursor-pointer hover:bg-zinc-800/30">Tên In-game ↕️</th>
                            <th onClick={() => handleSort('class')} className="px-6 py-4 cursor-pointer hover:bg-zinc-800/30">Võ Học ↕️</th>
                            <th className="px-6 py-4">UID Game</th>
                            <th onClick={() => handleSort('gw_day')} className="px-6 py-4 text-center cursor-pointer hover:bg-zinc-800/30">Trận Bang Chiến ↕️</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 text-sm">
                        {!data ? <tr><td colSpan={4} className="px-6 py-10 text-center">🔮 Đang gọi thiên thư...</td></tr> : 
                         sortedPlayers.length === 0 ? <tr><td colSpan={4} className="px-6 py-10 text-center">Trống</td></tr> : 
                         sortedPlayers.map((p: any, i) => (
                            <tr key={i} className="hover:bg-zinc-900/50">
                                <td className="px-6 py-4 font-semibold text-zinc-200">{p.ingame}</td>
                                <td className="px-6 py-4"><span className="px-2 py-1 bg-zinc-800 rounded-lg text-xs text-amber-400">{p.class || 'Chưa rõ'}</span></td>
                                <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{p.uid || '-'}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className="px-2 py-1 rounded bg-zinc-800 text-xs">{p.gw_day || 'Vắng'}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}