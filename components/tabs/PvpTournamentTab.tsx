// components/tabs/PvpTournamentTab.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Props {
    danhLuc: any;
    wwmData: any;
    session: any;
    isMaster: boolean;
}

export interface DynamicMatch {
    id: string;
    bracketType: 'UB' | 'LB' | 'GF';
    round: number;
    matchIndex: number;
    label: string;
    team1: string;
    team2: string;
    score1: number;
    score2: number;
    bo: number;
    winner: string | null;
    loser: string | null;
    isByeMatch?: boolean;
}

export interface DynamicTournamentData {
    bracketSize: number;      // 4 | 8 | 16 | 32
    participantCount: number; // Số người thực tế (VD: 7, 14, 16...)
    ubRoundsCount: number;    // log2(bracketSize)
    lbRoundsCount: number;    // 2 * (ubRoundsCount - 1)
    matches: Record<string, DynamicMatch>;
    tournamentTitle: string;
    prizes: {
        top1: string;
        top2: string;
        top3: string;
    };
    updatedAt: number;
}

export interface RegisteredPlayer {
    id: string;
    ingame: string;
    class: string;
    registeredAt: number;
}

const SUGGESTED_BO_LIST = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];

// 1. THUẬT TOÁN CÂY HẠT GIỐNG CHUẨN OLYMPIC (PHÂN BỔ BYE ĐỐI XỨNG, KHÔNG LỆCH NHÁNH)
function generateStandardSeedOrder(bracketSize: number): number[] {
    const rounds = Math.log2(bracketSize);
    let seeds = [1, 2];
    for (let r = 1; r < rounds; r++) {
        const nextSeeds: number[] = [];
        const sum = Math.pow(2, r + 1) + 1;
        for (let i = 0; i < seeds.length; i++) {
            nextSeeds.push(seeds[i]);
            nextSeeds.push(sum - seeds[i]);
        }
        seeds = nextSeeds;
    }
    return seeds;
}

function getUbRoundTitle(round: number, totalUbRounds: number, matchNumber?: number): string {
    const diff = totalUbRounds - round;
    const prefix =
        diff === 0 ? 'Chung Kết Nhánh Thắng' :
        diff === 1 ? 'Bán Kết Nhánh Thắng' :
        diff === 2 ? 'Tứ Kết Nhánh Thắng' :
        `Vòng ${round} Nhánh Thắng`;
    return matchNumber !== undefined && diff > 0 ? `${prefix} • Trận ${matchNumber}` : prefix;
}

function getLbRoundTitle(lbRound: number, totalLbRounds: number, matchNumber?: number): string {
    const prefix =
        lbRound === totalLbRounds ? 'Chung Kết Nhánh Thua' :
        lbRound === totalLbRounds - 1 ? 'Bán Kết Nhánh Thua' :
        `Nhánh Thua • Vòng ${lbRound}`;
    return matchNumber !== undefined && lbRound < totalLbRounds - 1 ? `${prefix} • Trận ${matchNumber}` : prefix;
}

// 2. KHỞI TẠO SƠ ĐỒ DOUBLE ELIMINATION ĐỘNG CHO MỌI SỐ LƯỢNG NGƯỜI CHƠI (N = 3 -> 32)
function buildDynamicTournament(
    playerNames: string[],
    defaultBo = 5,
    finalBo = 9,
    title = 'ĐẠI HỘI VÕ LÂM TRANH BÁ • THANH LONG',
    prizes = {
        top1: 'Danh hiệu Thiên Hạ Đệ Nhất + 500.000 VNĐ',
        top2: 'Danh hiệu Võ Lâm Chí Tôn + 300.000 VNĐ',
        top3: 'Danh hiệu Tuyệt Thế Cao Thủ + 100.000 VNĐ'
    }
): DynamicTournamentData {
    const realCount = Math.max(playerNames.length, 4);
    const rawPow = Math.pow(2, Math.ceil(Math.log2(realCount)));
    const bracketSize = Math.min(32, Math.max(4, rawPow));
    const ubRoundsCount = Math.log2(bracketSize);
    const lbRoundsCount = 2 * (ubRoundsCount - 1);

    const seedOrder = generateStandardSeedOrder(bracketSize);
    const seededPlayers = seedOrder.map((seedNum) => {
        if (seedNum <= playerNames.length) {
            return playerNames[seedNum - 1];
        }
        return 'BYE';
    });

    const matches: Record<string, DynamicMatch> = {};

    // A. TẠO CÁC VÒNG NHÁNH THẮNG (UPPER BRACKET)
    for (let r = 1; r <= ubRoundsCount; r++) {
        const matchCount = bracketSize / Math.pow(2, r);
        for (let m = 1; m <= matchCount; m++) {
            const id = `UB_R${r}_M${m}`;
            const t1 = r === 1 ? seededPlayers[(m - 1) * 2] : 'TBD';
            const t2 = r === 1 ? seededPlayers[(m - 1) * 2 + 1] : 'TBD';
            matches[id] = {
                id,
                bracketType: 'UB',
                round: r,
                matchIndex: m,
                label: getUbRoundTitle(r, ubRoundsCount, m),
                team1: t1,
                team2: t2,
                score1: 0,
                score2: 0,
                bo: r === ubRoundsCount ? finalBo : defaultBo,
                winner: null,
                loser: null,
                isByeMatch: false
            };
        }
    }

    // B. TẠO CÁC VÒNG NHÁNH THUA (LOWER BRACKET)
    for (let lr = 1; lr <= lbRoundsCount; lr++) {
        const powerExp = Math.floor((lr + 1) / 2) + 1;
        const matchCount = bracketSize / Math.pow(2, powerExp);
        for (let m = 1; m <= matchCount; m++) {
            const id = `LB_R${lr}_M${m}`;
            matches[id] = {
                id,
                bracketType: 'LB',
                round: lr,
                matchIndex: m,
                label: getLbRoundTitle(lr, lbRoundsCount, m),
                team1: 'TBD',
                team2: 'TBD',
                score1: 0,
                score2: 0,
                bo: lr === lbRoundsCount ? finalBo : defaultBo,
                winner: null,
                loser: null,
                isByeMatch: false
            };
        }
    }

    // C. TRẬN CHUNG KẾT TỔNG (GRAND FINAL - TÁCH KHUNG ĐỘC LẬP)
    matches['GRAND_FINAL'] = {
        id: 'GRAND_FINAL',
        bracketType: 'GF',
        round: 1,
        matchIndex: 1,
        label: '👑 ĐẠI LÔI ĐÀI CHUNG KẾT TỔNG (GRAND FINAL)',
        team1: 'TBD',
        team2: 'TBD',
        score1: 0,
        score2: 0,
        bo: finalBo,
        winner: null,
        loser: null,
        isByeMatch: false
    };

    const initialData: DynamicTournamentData = {
        bracketSize,
        participantCount: playerNames.length,
        ubRoundsCount,
        lbRoundsCount,
        matches,
        tournamentTitle: title,
        prizes,
        updatedAt: Date.now()
    };

    return propagateDynamicBracket(initialData);
}

// 3. ĐỘNG CƠ TỰ ĐỘNG ĐÔN NHÁNH & XỬ LÝ VÉ MIỄN ĐẤU (BYE)
function propagateDynamicBracket(data: DynamicTournamentData): DynamicTournamentData {
    const next: DynamicTournamentData = JSON.parse(JSON.stringify(data));
    const { bracketSize, ubRoundsCount, lbRoundsCount, matches } = next;

    const evaluateSingleMatch = (m: DynamicMatch) => {
        if (!m) return;
        if (m.team1 === 'TBD' || m.team2 === 'TBD') {
            m.winner = null;
            m.loser = null;
            m.isByeMatch = false;
            return;
        }

        if (m.team1 === 'BYE' && m.team2 === 'BYE') {
            m.winner = 'BYE';
            m.loser = 'BYE';
            m.isByeMatch = true;
            return;
        }
        if (m.team1 === 'BYE') {
            m.winner = m.team2;
            m.loser = 'BYE';
            m.isByeMatch = true;
            return;
        }
        if (m.team2 === 'BYE') {
            m.winner = m.team1;
            m.loser = 'BYE';
            m.isByeMatch = true;
            return;
        }

        m.isByeMatch = false;
        const safeBo = Math.max(1, Number(m.bo) || 3);
        const winTarget = Math.ceil(safeBo / 2);
        if (m.score1 >= winTarget && m.score1 > m.score2) {
            m.winner = m.team1;
            m.loser = m.team2;
        } else if (m.score2 >= winTarget && m.score2 > m.score1) {
            m.winner = m.team2;
            m.loser = m.team1;
        } else {
            m.winner = null;
            m.loser = null;
        }
    };

    for (let pass = 0; pass < ubRoundsCount + lbRoundsCount + 2; pass++) {
        // 1. Duyệt Nhánh Thắng (UB)
        for (let r = 1; r <= ubRoundsCount; r++) {
            const matchCount = bracketSize / Math.pow(2, r);
            for (let m = 1; m <= matchCount; m++) {
                const curMatch = matches[`UB_R${r}_M${m}`];
                evaluateSingleMatch(curMatch);

                if (r < ubRoundsCount) {
                    const nextUbMatch = matches[`UB_R${r + 1}_M${Math.ceil(m / 2)}`];
                    if (nextUbMatch) {
                        if (m % 2 === 1) nextUbMatch.team1 = curMatch.winner || 'TBD';
                        else nextUbMatch.team2 = curMatch.winner || 'TBD';
                    }
                } else {
                    if (matches['GRAND_FINAL']) {
                        matches['GRAND_FINAL'].team1 = curMatch.winner || 'TBD';
                    }
                }
            }
        }

        // 2. Duyệt Nhánh Thua (LB)
        for (let lr = 1; lr <= lbRoundsCount; lr++) {
            const powerExp = Math.floor((lr + 1) / 2) + 1;
            const matchCount = bracketSize / Math.pow(2, powerExp);

            for (let m = 1; m <= matchCount; m++) {
                const lbMatch = matches[`LB_R${lr}_M${m}`];
                if (!lbMatch) continue;

                if (lr === 1) {
                    const ubM1 = matches[`UB_R1_M${(m - 1) * 2 + 1}`];
                    const ubM2 = matches[`UB_R1_M${(m - 1) * 2 + 2}`];
                    lbMatch.team1 = ubM1?.loser || 'TBD';
                    lbMatch.team2 = ubM2?.loser || 'TBD';
                } else if (lr % 2 === 0) {
                    const ubSourceRound = lr / 2 + 1;
                    const reversedUbIndex = matchCount - m + 1;
                    const ubDropMatch = matches[`UB_R${ubSourceRound}_M${reversedUbIndex}`];
                    const prevLbMatch = matches[`LB_R${lr - 1}_M${m}`];

                    lbMatch.team1 = ubDropMatch?.loser || 'TBD';
                    lbMatch.team2 = prevLbMatch?.winner || 'TBD';
                } else {
                    const prevLb1 = matches[`LB_R${lr - 1}_M${(m - 1) * 2 + 1}`];
                    const prevLb2 = matches[`LB_R${lr - 1}_M${(m - 1) * 2 + 2}`];
                    lbMatch.team1 = prevLb1?.winner || 'TBD';
                    lbMatch.team2 = prevLb2?.winner || 'TBD';
                }

                evaluateSingleMatch(lbMatch);

                if (lr === lbRoundsCount && matches['GRAND_FINAL']) {
                    matches['GRAND_FINAL'].team2 = lbMatch.winner || 'TBD';
                }
            }
        }

        // 3. Duyệt Chung Kết Tổng
        if (matches['GRAND_FINAL']) {
            evaluateSingleMatch(matches['GRAND_FINAL']);
        }
    }

    return next;
}

export default function PvpTournamentTab({ danhLuc, wwmData, session, isMaster }: Props) {
    const [tournament, setTournament] = useState<DynamicTournamentData>(() =>
        buildDynamicTournament(
            Array.from({ length: 8 }, (_, i) => `Hạt Giống #${i + 1}`),
            5,
            9
        )
    );
    const [registeredList, setRegisteredList] = useState<RegisteredPlayer[]>([]);
    const [defaultBo, setDefaultBo] = useState<number>(5);
    const [finalBo, setFinalBo] = useState<number>(9);
    const [editingTeamsMode, setEditingTeamsMode] = useState<boolean>(false);
    const [manualPlayerName, setManualPlayerName] = useState<string>('');
    const [manualPlayerClass, setManualPlayerClass] = useState<string>('');
    const [simCount, setSimCount] = useState<number>(14);

    const currentUserId = useMemo(() => {
        if (!session?.user) return '';
        if (session.user.id) return String(session.user.id);
        if (session.user.image?.includes('avatars/')) {
            const m = session.user.image.match(/avatars\/(\d+)\//);
            if (m && m[1]) return m[1];
        }
        if (danhLuc) {
            const found = Object.entries(danhLuc).find(([_, v]: any) => v.ingame === session.user.name || v.discordName === session.user.name);
            if (found) return found[0];
        }
        return session.user.name || '';
    }, [session, danhLuc]);

    const currentIngame = useMemo(() => {
        if (danhLuc && danhLuc[currentUserId]?.ingame) return danhLuc[currentUserId].ingame;
        return session?.user?.name || 'Đại Hiệp';
    }, [danhLuc, currentUserId, session]);

    const currentClass = useMemo(() => {
        return danhLuc?.[currentUserId]?.class || (Array.isArray(wwmData?.VO_HOC_LIST) ? wwmData.VO_HOC_LIST[0] : 'Chưa rõ');
    }, [danhLuc, currentUserId, wwmData]);

    useEffect(() => {
        const unsubBracket = onSnapshot(doc(db, 'thanhlong_config', 'tournament_bracket'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.matches && data.bracketSize) {
                    setTournament(propagateDynamicBracket(data as DynamicTournamentData));
                }
            }
        });

        const unsubReg = onSnapshot(doc(db, 'thanhlong_config', 'tournament_registration'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (Array.isArray(data.list)) {
                    setRegisteredList(data.list);
                }
            }
        });

        return () => {
            unsubBracket();
            unsubReg();
        };
    }, []);

    const saveTournamentToCloud = async (nextData: DynamicTournamentData) => {
        const progressed = propagateDynamicBracket(nextData);
        setTournament(progressed);
        try {
            await setDoc(doc(db, 'thanhlong_config', 'tournament_bracket'), {
                ...progressed,
                updatedAt: Date.now()
            });
        } catch (err) {
            console.error('Lỗi lưu tournament_bracket:', err);
            alert('❌ Không thể lưu sơ đồ giải đấu lên Firebase!');
        }
    };

    const notifyDiscordMatchFinished = async (match: DynamicMatch) => {
        if (match.isByeMatch) return;
        const webhook = wwmData?.SHARED_DISCORD_WEBHOOK || (typeof window !== 'undefined' ? localStorage.getItem('tl_discord_webhook') : '');
        if (!webhook || !match.winner) return;

        const isGrandFinal = match.id === 'GRAND_FINAL';
        const embed = {
            title: `⚔️ KẾT QUẢ THI ĐẤU • ${match.label.toUpperCase()}`,
            description:
                `### 🎮 **${match.team1}** \` ${match.score1} -${match.score2} \` **${match.team2}** *(BO${match.bo})*\n\n` +
                `> 🏆 **Chiến Thắng:** **${match.winner.toUpperCase()}** ${isGrandFinal ? '👑 **TÂN QUÁN QUÂN VÕ LÂM TRANH BÁ!**' : 'tiến vào vòng tiếp theo!'}\n` +
                `> 💀 **Thất Bại:** *${match.loser}* ${match.bracketType === 'LB' || isGrandFinal ? '(Chính thức dừng bước)' : '(Rớt xuống Nhánh Thua)'}`,
            color: isGrandFinal ? 0xf59e0b : 0xe11d48,
            footer: { text: `${tournament.tournamentTitle} • Khung ${tournament.bracketSize} (${tournament.participantCount} đấu thủ)` },
            timestamp: new Date().toISOString()
        };

        try {
            await fetch(webhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embeds: [embed] })
            });
        } catch {}
    };

    const handleUpdateMatch = async (matchId: string, patch: Partial<DynamicMatch>) => {
        if (!isMaster) return;
        const prevWinner = tournament.matches[matchId]?.winner;
        const nextMatches = {
            ...tournament.matches,
            [matchId]: {
                ...tournament.matches[matchId],
                ...patch
            }
        };
        const nextTournament = propagateDynamicBracket({
            ...tournament,
            matches: nextMatches
        });

        await saveTournamentToCloud(nextTournament);

        const newMatch = nextTournament.matches[matchId];
        if (newMatch?.winner && newMatch.winner !== prevWinner && !newMatch.isByeMatch) {
            notifyDiscordMatchFinished(newMatch);
        }
    };

    const handleGenerateFromRegistered = async () => {
        if (!isMaster) return;
        if (registeredList.length < 3) {
            alert('⚠️ Cần tối thiểu 3 đấu thủ trong danh sách đăng ký để chia nhánh!');
            return;
        }
        const n = registeredList.length;
        const targetBracketSize = Math.min(32, Math.max(4, Math.pow(2, Math.ceil(Math.log2(n)))));
        const byeCount = Math.max(0, targetBracketSize - n);

        if (!window.confirm(
            `🎲 Xác nhận bốc thăm ngẫu nhiên cho [${n} đấu thủ] đã đăng ký?\n` +
            `• Hệ thống sẽ tự động dựng Khung Chuẩn ${targetBracketSize} (${byeCount} vé Miễn Đấu / BYE được rải đối xứng chống lệch nhánh).`
        )) return;

        const shuffled = [...registeredList].sort(() => Math.random() - 0.5).slice(0, 32);
        const playerNames = shuffled.map(p => p.ingame);

        const newTourney = buildDynamicTournament(
            playerNames,
            Math.max(1, defaultBo),
            Math.max(1, finalBo),
            tournament.tournamentTitle,
            tournament.prizes
        );
        await saveTournamentToCloud(newTourney);
    };

    const handleSimulateCustomCount = async (count: number) => {
        if (!isMaster) return;
        const n = Math.min(32, Math.max(3, count));
        const sampleNames = Array.from({ length: n }, (_, i) => {
            if (registeredList[i]?.ingame) return registeredList[i].ingame;
            return `Cao Thủ #${i + 1}`;
        });

        const newTourney = buildDynamicTournament(
            sampleNames,
            Math.max(1, defaultBo),
            Math.max(1, finalBo),
            tournament.tournamentTitle,
            tournament.prizes
        );
        await saveTournamentToCloud(newTourney);
    };

    const handleApplyGlobalBo = async () => {
        if (!isMaster) return;
        const safeDefaultBo = Math.max(1, Number(defaultBo) || 5);
        const safeFinalBo = Math.max(1, Number(finalBo) || 9);
        const nextMatches = { ...tournament.matches };
        Object.keys(nextMatches).forEach((mId) => {
            const m = nextMatches[mId];
            const isFinal =
                m.id === 'GRAND_FINAL' ||
                (m.bracketType === 'UB' && m.round === tournament.ubRoundsCount) ||
                (m.bracketType === 'LB' && m.round === tournament.lbRoundsCount);
            nextMatches[mId] = {
                ...m,
                bo: isFinal ? safeFinalBo : safeDefaultBo
            };
        });
        await saveTournamentToCloud({ ...tournament, matches: nextMatches });
    };

    const isCurrentUserRegistered = useMemo(
        () => registeredList.some(p => p.id === currentUserId || p.ingame.toLowerCase() === currentIngame.toLowerCase()),
        [registeredList, currentUserId, currentIngame]
    );

    const handleToggleSelfRegister = async () => {
        if (!currentUserId) {
            alert('⚠️ Đại hiệp cần đăng nhập Discord để báo danh!');
            return;
        }
        let nextList = [...registeredList];
        if (isCurrentUserRegistered) {
            nextList = nextList.filter(p => p.id !== currentUserId && p.ingame.toLowerCase() !== currentIngame.toLowerCase());
        } else {
            nextList.push({
                id: currentUserId,
                ingame: currentIngame,
                class: currentClass,
                registeredAt: Date.now()
            });
        }
        try {
            await setDoc(doc(db, 'thanhlong_config', 'tournament_registration'), { list: nextList }, { merge: true });
        } catch {
            alert('❌ Lỗi khi cập nhật danh sách báo danh!');
        }
    };

    const handleAdminAddPlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isMaster || !manualPlayerName.trim()) return;
        const nextList = [
            ...registeredList,
            {
                id: `manual_${Date.now()}`,
                ingame: manualPlayerName.trim(),
                class: manualPlayerClass.trim() || 'Chưa rõ',
                registeredAt: Date.now()
            }
        ];
        await setDoc(doc(db, 'thanhlong_config', 'tournament_registration'), { list: nextList }, { merge: true });
        setManualPlayerName('');
        setManualPlayerClass('');
    };

    const handleAdminRemovePlayer = async (targetId: string) => {
        if (!isMaster) return;
        const nextList = registeredList.filter(p => p.id !== targetId);
        await setDoc(doc(db, 'thanhlong_config', 'tournament_registration'), { list: nextList }, { merge: true });
    };

    const podium = useMemo(() => {
        const gf = tournament.matches['GRAND_FINAL'];
        const lbf = tournament.matches[`LB_R${tournament.lbRoundsCount}_M1`];
        return {
            champion: gf?.winner && gf.winner !== 'BYE' ? gf.winner : null,
            runnerUp: gf?.loser && gf.loser !== 'BYE' ? gf.loser : null,
            thirdPlace: lbf?.loser && lbf.loser !== 'BYE' ? lbf.loser : null
        };
    }, [tournament]);

    // 🟢 RENDER THẺ TRẬN ĐẤU (KHÔNG BỊ CẮT CHỮ "...", HỖ TRỢ NHẬP BO BẤT KỲ KHÔNG GIỚI HẠN)
    const renderMatchCard = (matchId: string, theme: 'emerald' | 'rose' | 'amber' = 'emerald') => {
        const m = tournament.matches[matchId];
        if (!m) return null;

        const safeBo = Math.max(1, Number(m.bo) || 3);
        const winTarget = Math.ceil(safeBo / 2);
        const t1Won = m.winner === m.team1 && m.team1 !== 'TBD' && m.team1 !== 'BYE';
        const t2Won = m.winner === m.team2 && m.team2 !== 'TBD' && m.team2 !== 'BYE';
        const isEditableSeed = isMaster && (editingTeamsMode || (m.bracketType === 'UB' && m.round === 1));
        const isDoubleBye = m.team1 === 'BYE' && m.team2 === 'BYE';

        if (isDoubleBye) {
            return (
                <div key={matchId} className="rounded-2xl border border-zinc-800/50 bg-zinc-950/40 p-3 opacity-45 text-center">
                    <div className="text-[11px] font-bold text-zinc-500 uppercase">{m.label}</div>
                    <div className="text-xs text-zinc-600 italic mt-0.5">⏭️ Khe Miễn Đấu Kép (Tự động qua vòng)</div>
                </div>
            );
        }

        const borderClass =
            theme === 'amber'
                ? 'border-amber-500/60 bg-gradient-to-b from-amber-950/35 to-zinc-950 shadow-[0_0_25px_rgba(245,158,11,0.12)]'
                : theme === 'rose'
                    ? 'border-rose-500/35 bg-zinc-950/95'
                    : 'border-emerald-500/35 bg-zinc-950/95';

        return (
            <div key={matchId} className={`rounded-2xl border p-3.5 shadow-lg transition-all ${borderClass} space-y-2.5`}>
                {/* HEADER CỦA TRẬN ĐẤU: HIỂN THỊ TRỌN VẸN TÊN VÒNG + Ô NHẬP BO TỰ DO */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
                    <span className={`text-[11px] font-black uppercase tracking-wide leading-tight ${
                        theme === 'amber' ? 'text-amber-300' : theme === 'rose' ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                        {m.label}
                    </span>

                    {m.isByeMatch ? (
                        <span className="px-2 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-black text-cyan-300 shrink-0">
                            ⚡ MIỄN ĐẤU (AUTO QUA)
                        </span>
                    ) : isMaster ? (
                        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-0.5 shrink-0" title="Nhập số BO bất kỳ (VD: 1, 3, 5, 7, 9, 11, 15, 21...)">
                            <span className="text-[10px] font-black text-amber-400">BO</span>
                            <input
                                type="number"
                                min={1}
                                max={99}
                                list="bo-presets-list"
                                value={m.bo || 5}
                                onChange={(e) => {
                                    const val = Math.max(1, Number(e.target.value) || 1);
                                    handleUpdateMatch(matchId, { bo: val });
                                }}
                                className="w-9 bg-transparent text-[11px] font-mono font-black text-amber-300 text-center focus:outline-none border-b border-amber-500/40"
                            />
                            <span className="text-[10px] font-mono text-zinc-400">(Chạm {winTarget})</span>
                        </div>
                    ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-mono font-bold text-amber-300 shrink-0">
                            BO{safeBo} (Chạm {winTarget})
                        </span>
                    )}
                </div>

                {/* ĐỘI 1 */}
                <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border ${
                    m.team1 === 'BYE'
                        ? 'bg-zinc-950/50 border-zinc-800/50 text-zinc-600 italic'
                        : t1Won
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-black'
                            : m.winner && !t1Won
                                ? 'bg-zinc-900/40 border-zinc-800/60 text-zinc-500 line-through'
                                : 'bg-zinc-900/80 border-zinc-800 text-zinc-100 font-bold'
                }`}>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {t1Won && <span className="text-xs shrink-0">👑</span>}
                        {isEditableSeed ? (
                            <input
                                type="text"
                                value={m.team1}
                                onChange={(e) => handleUpdateMatch(matchId, { team1: e.target.value })}
                                className="w-full bg-transparent text-xs font-bold focus:outline-none border-b border-amber-400/50"
                            />
                        ) : (
                            <span className="text-xs break-words">
                                {m.team1 === 'BYE' ? 'BYE (Miễn Đấu)' : m.team1 === 'TBD' ? '⏳ Đang chờ đối thủ...' : m.team1}
                            </span>
                        )}
                    </div>

                    {!m.isByeMatch && m.team1 !== 'BYE' && m.team2 !== 'BYE' && (
                        <div className="flex items-center gap-1 shrink-0">
                            {isMaster && (
                                <button
                                    type="button"
                                    onClick={() => handleUpdateMatch(matchId, { score1: Math.max(0, m.score1 - 1) })}
                                    className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-black cursor-pointer"
                                >
                                    -
                                </button>
                            )}
                            <span className={`w-6 text-center font-mono text-sm font-black ${t1Won ? 'text-emerald-300' : 'text-amber-300'}`}>
                                {m.score1}
                            </span>
                            {isMaster && (
                                <button
                                    type="button"
                                    onClick={() => handleUpdateMatch(matchId, { score1: m.score1 + 1 })}
                                    className="w-5 h-5 rounded bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 text-xs font-black cursor-pointer"
                                >
                                    +
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* ĐỘI 2 */}
                <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border ${
                    m.team2 === 'BYE'
                        ? 'bg-zinc-950/50 border-zinc-800/50 text-zinc-600 italic'
                        : t2Won
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-black'
                            : m.winner && !t2Won
                                ? 'bg-zinc-900/40 border-zinc-800/60 text-zinc-500 line-through'
                                : 'bg-zinc-900/80 border-zinc-800 text-zinc-100 font-bold'
                }`}>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {t2Won && <span className="text-xs shrink-0">👑</span>}
                        {isEditableSeed ? (
                            <input
                                type="text"
                                value={m.team2}
                                onChange={(e) => handleUpdateMatch(matchId, { team2: e.target.value })}
                                className="w-full bg-transparent text-xs font-bold focus:outline-none border-b border-amber-400/50"
                            />
                        ) : (
                            <span className="text-xs break-words">
                                {m.team2 === 'BYE' ? 'BYE (Miễn Đấu)' : m.team2 === 'TBD' ? '⏳ Đang chờ đối thủ...' : m.team2}
                            </span>
                        )}
                    </div>

                    {!m.isByeMatch && m.team1 !== 'BYE' && m.team2 !== 'BYE' && (
                        <div className="flex items-center gap-1 shrink-0">
                            {isMaster && (
                                <button
                                    type="button"
                                    onClick={() => handleUpdateMatch(matchId, { score2: Math.max(0, m.score2 - 1) })}
                                    className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-black cursor-pointer"
                                >
                                    -
                                </button>
                            )}
                            <span className={`w-6 text-center font-mono text-sm font-black ${t2Won ? 'text-emerald-300' : 'text-amber-300'}`}>
                                {m.score2}
                            </span>
                            {isMaster && (
                                <button
                                    type="button"
                                    onClick={() => handleUpdateMatch(matchId, { score2: m.score2 + 1 })}
                                    className="w-5 h-5 rounded bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 text-xs font-black cursor-pointer"
                                >
                                    +
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const byeCount = Math.max(0, tournament.bracketSize - tournament.participantCount);
    const ubFinalWinner = tournament.matches[`UB_R${tournament.ubRoundsCount}_M1`]?.winner;
    const lbFinalWinner = tournament.matches[`LB_R${tournament.lbRoundsCount}_M1`]?.winner;

    return (
        <section className="space-y-6 animate-in fade-in duration-300 pb-16">
            {/* DATALIST GỢI Ý NHANH CÁC MỐC BO (NHƯNG VẪN CHO PHÉP GÕ SỐ BẤT KỲ) */}
            <datalist id="bo-presets-list">
                {SUGGESTED_BO_LIST.map(val => (
                    <option key={val} value={val}>BO{val} (Chạm {Math.ceil(val / 2)})</option>
                ))}
            </datalist>

            {/* 🟢 BANNER ĐẦU (ĐÃ TÁCH HÀNG TIÊU ĐỀ RỘNG 100% — KHÔNG BAO GIỜ BỊ CẮT CHỮ HAY VỠ KHUNG) */}
            <div className="bg-[#090d16]/90 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
                {/* TẦNG 1: NHÃN TRẠNG THÁI & TIÊU ĐỀ RỘNG TOÀN KHUNG */}
                <div className="space-y-3 border-b border-zinc-800/80 pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-black uppercase tracking-wider">
                            ⚔️ SƠ ĐỒ TỰ CO GIÃN ĐỘNG
                        </span>
                        <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                            👥 SĨ SỐ HIỆN TẠI: {tournament.participantCount} ĐẤU THỦ (KHUNG {tournament.bracketSize} • {byeCount} VÉ MIỄN ĐẤU)
                        </span>
                    </div>

                    {isMaster && editingTeamsMode ? (
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-amber-400 uppercase">✏️ Nhập Tên Giải Đấu (Hiển thị đầy đủ 100%):</label>
                            <input
                                type="text"
                                value={tournament.tournamentTitle}
                                onChange={(e) => setTournament({ ...tournament, tournamentTitle: e.target.value })}
                                onBlur={() => saveTournamentToCloud(tournament)}
                                className="block w-full bg-zinc-950 border border-amber-500/60 focus:border-amber-400 rounded-xl px-4 py-2.5 text-xl sm:text-2xl font-black text-amber-300 focus:outline-none"
                            />
                        </div>
                    ) : (
                        <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-300 to-yellow-500 break-words leading-snug">
                            🏆 {tournament.tournamentTitle}
                        </h2>
                    )}

                    <p className="text-xs text-zinc-400 leading-relaxed">
                        Tự động phân bổ vé <b>Miễn Đấu (BYE)</b> đối xứng theo chuẩn Olympic cho mọi quy mô lẻ (7 người, 14 người, 16 người, 24 người...) không bao giờ lệch nhánh!
                    </p>
                </div>

                {/* TẦNG 2: THANH CÔNG CỤ TRỌNG TÀI / ADMIN (TRẢI NGANG RỘNG RÃI, KHÔNG CHÈN ÉP TIÊU ĐỀ) */}
                {isMaster && (
                    <div className="bg-zinc-950/90 p-4 rounded-2xl border border-zinc-800 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleGenerateFromRegistered}
                                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-zinc-950 text-xs font-black cursor-pointer shadow-lg"
                                >
                                    🎲 Chia Bảng Tự Động Theo Đúng {registeredList.length} Người Đăng Ký
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setEditingTeamsMode(!editingTeamsMode)}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                                        editingTeamsMode
                                            ? 'bg-amber-500 text-zinc-950 border-amber-400'
                                            : 'bg-zinc-900 text-amber-300 border-amber-500/40 hover:bg-amber-500/15'
                                    }`}
                                >
                                    {editingTeamsMode ? '✅ Khóa Sửa Tên & Giải Thưởng' : '✏️ Sửa Tên Đấu Thủ / Giải Thưởng'}
                                </button>
                            </div>

                            {/* CẤU HÌNH BO TỰ DO KHÔNG GIỚI HẠN */}
                            <div className="flex flex-wrap items-center gap-2 bg-zinc-900/90 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs">
                                <span className="text-zinc-400 font-bold">⚙️ BO Vòng Ngoài:</span>
                                <div className="flex items-center bg-zinc-950 border border-emerald-500/40 rounded-lg px-2 py-1">
                                    <span className="text-[10px] font-black text-emerald-400 mr-1">BO</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={99}
                                        list="bo-presets-list"
                                        value={defaultBo}
                                        onChange={(e) => setDefaultBo(Math.max(1, Number(e.target.value) || 1))}
                                        className="w-10 bg-transparent text-xs font-mono font-black text-emerald-300 text-center focus:outline-none"
                                    />
                                    <span className="text-[10px] text-zinc-500">(Chạm {Math.ceil(Math.max(1, defaultBo) / 2)})</span>
                                </div>

                                <span className="text-zinc-400 font-bold ml-1">👑 BO Chung Kết:</span>
                                <div className="flex items-center bg-zinc-950 border border-amber-500/40 rounded-lg px-2 py-1">
                                    <span className="text-[10px] font-black text-amber-400 mr-1">BO</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={99}
                                        list="bo-presets-list"
                                        value={finalBo}
                                        onChange={(e) => setFinalBo(Math.max(1, Number(e.target.value) || 1))}
                                        className="w-10 bg-transparent text-xs font-mono font-black text-amber-300 text-center focus:outline-none"
                                    />
                                    <span className="text-[10px] text-zinc-500">(Chạm {Math.ceil(Math.max(1, finalBo) / 2)})</span>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleApplyGlobalBo}
                                    className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs cursor-pointer"
                                >
                                    ⚡ Áp Dụng BO Toàn Giải
                                </button>
                            </div>
                        </div>

                        {/* DỰNG THỬ THEO SĨ SỐ BẤT KỲ */}
                        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-zinc-800/80 text-xs">
                            <span className="text-zinc-400 font-bold">⚡ Dựng nhanh sơ đồ theo sĩ số:</span>
                            {[7, 8, 12, 14, 16, 24].map((presetN) => (
                                <button
                                    key={presetN}
                                    type="button"
                                    onClick={() => handleSimulateCustomCount(presetN)}
                                    className={`px-3 py-1 rounded-lg font-mono font-bold cursor-pointer border transition-all ${
                                        tournament.participantCount === presetN
                                            ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                                            : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-amber-400'
                                    }`}
                                >
                                    {presetN} người
                                </button>
                            ))}
                            <div className="flex items-center gap-1.5 ml-1">
                                <input
                                    type="number"
                                    min={3}
                                    max={32}
                                    value={simCount}
                                    onChange={(e) => setSimCount(Number(e.target.value))}
                                    className="w-16 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-center font-mono text-amber-300 font-bold"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleSimulateCustomCount(simCount)}
                                    className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold cursor-pointer"
                                >
                                    Dựng {simCount} người
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* BỤC VINH QUANG TOP 3 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-zinc-900/80 to-zinc-950 border border-amber-400/50 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider">🥇 QUÁN QUÂN (TOP 1)</span>
                                {podium.champion && <span className="px-2 py-0.5 rounded bg-amber-400 text-zinc-950 text-[10px] font-black">VÔ ĐỊCH</span>}
                            </div>
                            <div className="text-lg font-black text-white mt-1 break-words">
                                {podium.champion || 'Đang tranh tài...'}
                            </div>
                        </div>
                        {isMaster && editingTeamsMode ? (
                            <input
                                type="text"
                                value={tournament.prizes.top1}
                                onChange={(e) => setTournament({ ...tournament, prizes: { ...tournament.prizes, top1: e.target.value } })}
                                onBlur={() => saveTournamentToCloud(tournament)}
                                className="mt-2 w-full bg-zinc-950 border border-amber-500/40 rounded px-2.5 py-1.5 text-xs text-amber-300"
                            />
                        ) : (
                            <div className="text-xs text-amber-300/90 mt-2 font-medium">🎁 {tournament.prizes.top1}</div>
                        )}
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-900/70 border border-slate-400/30 flex flex-col justify-between">
                        <div>
                            <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider">🥈 Á QUÂN (TOP 2)</span>
                            <div className="text-lg font-black text-zinc-100 mt-1 break-words">
                                {podium.runnerUp || 'Đang tranh tài...'}
                            </div>
                        </div>
                        {isMaster && editingTeamsMode ? (
                            <input
                                type="text"
                                value={tournament.prizes.top2}
                                onChange={(e) => setTournament({ ...tournament, prizes: { ...tournament.prizes, top2: e.target.value } })}
                                onBlur={() => saveTournamentToCloud(tournament)}
                                className="mt-2 w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-slate-300"
                            />
                        ) : (
                            <div className="text-xs text-slate-300 mt-2 font-medium">🎁 {tournament.prizes.top2}</div>
                        )}
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-900/70 border border-orange-500/30 flex flex-col justify-between">
                        <div>
                            <span className="text-[11px] font-black text-orange-400 uppercase tracking-wider">🥉 QUÝ QUÂN (TOP 3)</span>
                            <div className="text-lg font-black text-zinc-100 mt-1 break-words">
                                {podium.thirdPlace || 'Đang tranh tài...'}
                            </div>
                        </div>
                        {isMaster && editingTeamsMode ? (
                            <input
                                type="text"
                                value={tournament.prizes.top3}
                                onChange={(e) => setTournament({ ...tournament, prizes: { ...tournament.prizes, top3: e.target.value } })}
                                onBlur={() => saveTournamentToCloud(tournament)}
                                className="mt-2 w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-orange-300"
                            />
                        ) : (
                            <div className="text-xs text-orange-300 mt-2 font-medium">🎁 {tournament.prizes.top3}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* 🟢 KHUNG 1: SƠ ĐỒ NHÁNH THẮNG ĐỘC LẬP (UPPER BRACKET — ĐÃ TÁCH CHUNG KẾT TỔNG RA RIÊNG) */}
            <div className="bg-[#090d16]/90 border border-emerald-500/30 rounded-3xl p-5 shadow-2xl space-y-4 overflow-x-auto">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                    <h3 className="text-base font-black text-emerald-400 uppercase tracking-wider">
                        🟢 NHÁNH THẮNG (UPPER BRACKET — {tournament.ubRoundsCount} VÒNG)
                    </h3>
                    <span className="text-xs text-zinc-400">
                        Người thắng <b>Chung Kết Nhánh Thắng</b> tiến thẳng vào <b>Đại Lôi Đài Chung Kết Tổng</b> • Người thua rớt xuống Nhánh Thua
                    </span>
                </div>

                <div className="flex items-stretch gap-6 min-w-max pb-2">
                    {Array.from({ length: tournament.ubRoundsCount }, (_, idx) => {
                        const r = idx + 1;
                        const matchCount = tournament.bracketSize / Math.pow(2, r);
                        return (
                            <div key={`ub_col_${r}`} className="w-[320px] shrink-0 flex flex-col justify-around space-y-3">
                                <div className="text-xs font-black text-emerald-300 uppercase tracking-wider text-center bg-zinc-900/90 py-2 px-3 rounded-xl border border-emerald-500/25">
                                    {getUbRoundTitle(r, tournament.ubRoundsCount)} ({matchCount} trận)
                                </div>
                                <div className="flex-1 flex flex-col justify-around space-y-3">
                                    {Array.from({ length: matchCount }, (__, mIdx) =>
                                        renderMatchCard(`UB_R${r}_M${mIdx + 1}`, 'emerald')
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 🔴 KHUNG 2: SƠ ĐỒ NHÁNH THUA ĐỘC LẬP (LOWER BRACKET) */}
            <div className="bg-[#090d16]/90 border border-rose-500/30 rounded-3xl p-5 shadow-2xl space-y-4 overflow-x-auto">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                    <h3 className="text-base font-black text-rose-400 uppercase tracking-wider">
                        🔴 NHÁNH THUA (LOWER BRACKET — {tournament.lbRoundsCount} VÒNG SINH TỬ)
                    </h3>
                    <span className="text-xs text-zinc-400">
                        Người thắng <b>Chung Kết Nhánh Thua</b> giành tấm vé thứ 2 bước vào <b>Đại Lôi Đài Chung Kết Tổng</b>!
                    </span>
                </div>

                <div className="flex items-stretch gap-6 min-w-max pb-2">
                    {Array.from({ length: tournament.lbRoundsCount }, (_, idx) => {
                        const lr = idx + 1;
                        const powerExp = Math.floor((lr + 1) / 2) + 1;
                        const matchCount = tournament.bracketSize / Math.pow(2, powerExp);
                        return (
                            <div key={`lb_col_${lr}`} className="w-[320px] shrink-0 flex flex-col justify-around space-y-3">
                                <div className="text-xs font-black text-rose-300 uppercase tracking-wider text-center bg-zinc-900/90 py-2 px-3 rounded-xl border border-rose-500/25">
                                    {getLbRoundTitle(lr, tournament.lbRoundsCount)} ({matchCount} trận)
                                </div>
                                <div className="flex-1 flex flex-col justify-around space-y-3">
                                    {Array.from({ length: matchCount }, (__, mIdx) =>
                                        renderMatchCard(`LB_R${lr}_M${mIdx + 1}`, 'rose')
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 👑 KHUNG 3: ĐẠI LÔI ĐÀI CHUNG KẾT TỔNG (GRAND FINAL — TÁCH RIÊNG BIỆT UY NGHI) */}
            <div className="bg-gradient-to-br from-amber-950/30 via-[#090d16] to-rose-950/25 border-2 border-amber-500/50 rounded-3xl p-6 shadow-[0_0_40px_rgba(245,158,11,0.12)] space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 pb-3">
                    <div>
                        <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 uppercase tracking-wider">
                            👑 ĐẠI LÔI ĐÀI CHUNG KẾT TỔNG (GRAND FINAL • QUYẾT CHIẾN ĐỈNH CAO)
                        </h3>
                        <p className="text-xs text-zinc-300 mt-0.5">
                            Trận chiến cuối cùng giữa <b>Quán Quân Nhánh Thắng</b> và <b>Quán Quân Nhánh Thua</b> để tìm ra Tân Vương Võ Lâm!
                        </p>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-black uppercase">
                        🏆 TRANH NGÔI VÔ ĐỊCH
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                    {/* ĐẠI DIỆN NHÁNH THẮNG */}
                    <div className="lg:col-span-3 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-1">
                        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                            🟢 ĐẠI DIỆN NHÁNH THẮNG
                        </div>
                        <div className="text-base font-black text-white break-words">
                            {ubFinalWinner && ubFinalWinner !== 'BYE' ? ubFinalWinner : '⏳ Chờ Vô Địch Nhánh Thắng'}
                        </div>
                        <div className="text-[11px] text-zinc-400">Bất bại từ đầu giải</div>
                    </div>

                    {/* THẺ TRẬN ĐẤU CHUNG KẾT TỔNG */}
                    <div className="lg:col-span-6">
                        {renderMatchCard('GRAND_FINAL', 'amber')}
                    </div>

                    {/* ĐẠI DIỆN NHÁNH THUA */}
                    <div className="lg:col-span-3 p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-center space-y-1">
                        <div className="text-[10px] font-black text-rose-400 uppercase tracking-wider">
                            🔴 ĐẠI DIỆN NHÁNH THUA
                        </div>
                        <div className="text-base font-black text-white break-words">
                            {lbFinalWinner && lbFinalWinner !== 'BYE' ? lbFinalWinner : '⏳ Chờ Vô Địch Nhánh Thua'}
                        </div>
                        <div className="text-[11px] text-zinc-400">Vượt qua Lôi Đài Sinh Tử</div>
                    </div>
                </div>
            </div>

            {/* 📜 DANH SÁCH ĐẤU THỦ BÁO DANH */}
            <div className="bg-[#090d16]/90 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                    <div>
                        <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">
                            📜 Danh Sách Chiến Tướng Ghi Danh ({registeredList.length} Đấu Thủ)
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            Đồng bộ trực tiếp với bảng <code>/dang_ky_pvp</code> trên Discord. Có bao nhiêu người đăng ký, bấm nút <b>🎲 Chia Bảng Tự Động</b> sẽ dựng nhánh chuẩn bấy nhiêu người!
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleToggleSelfRegister}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all shrink-0 ${
                            isCurrentUserRegistered
                                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg'
                        }`}
                    >
                        {isCurrentUserRegistered ? '✕ Rút Tên Khỏi Giải' : `⚔️ Báo Danh Ngay (${currentIngame})`}
                    </button>
                </div>

                {isMaster && (
                    <form onSubmit={handleAdminAddPlayer} className="flex flex-wrap items-center gap-2 bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                        <span className="text-xs font-bold text-zinc-400">➕ Thêm đấu thủ thủ công:</span>
                        <input
                            type="text"
                            value={manualPlayerName}
                            onChange={(e) => setManualPlayerName(e.target.value)}
                            placeholder="Tên In-game đấu thủ..."
                            className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 font-bold"
                        />
                        <input
                            type="text"
                            value={manualPlayerClass}
                            onChange={(e) => setManualPlayerClass(e.target.value)}
                            placeholder="Hệ phái (VD: Cửu Kiếm, Khiên Ty...)"
                            className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-emerald-300"
                        />
                        <button
                            type="submit"
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black cursor-pointer"
                        >
                            + Thêm Vào Danh Sách
                        </button>
                    </form>
                )}

                {registeredList.length === 0 ? (
                    <div className="text-xs text-zinc-500 italic p-4 bg-zinc-950/60 rounded-2xl border border-dashed border-zinc-800 text-center">
                        Chưa có cao thủ nào ghi danh. Hãy nhấn nút [⚔️ Báo Danh Ngay] hoặc bấm trên Discord để ghi tên lên bảng!
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                        {registeredList.map((p, idx) => (
                            <div
                                key={p.id || idx}
                                className="bg-zinc-950 border border-zinc-800/90 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-mono font-bold text-amber-400">
                                            #{String(idx + 1).padStart(2, '0')}
                                        </span>
                                        <span className="text-xs font-black text-zinc-100 break-words">{p.ingame}</span>
                                    </div>
                                    <div className="text-[10px] text-emerald-400 break-words mt-0.5">
                                        {p.class || 'Chưa rõ phái'}
                                    </div>
                                </div>
                                {isMaster && (
                                    <button
                                        type="button"
                                        onClick={() => handleAdminRemovePlayer(p.id)}
                                        className="text-zinc-500 hover:text-rose-400 text-xs font-bold px-1.5 cursor-pointer"
                                        title="Xóa khỏi danh sách"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}