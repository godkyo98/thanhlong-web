/* eslint-disable @typescript-eslint/no-explicit-any */
// components/tabs/WwmBuildsTab.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Props {
    wwmBuilds: Record<string, any>;
    wwmData: any;
    danhLuc: any;
    playerProfiles: any;
    session: any;
    lang: 'vi' | 'en';
    isMaster: boolean;
}

const DEFAULT_VO_HOC_LIST = [
    "Tiếng Chuông Vang (Vô Danh)",
    "Tiếng Chuông Vang (Cửu Kiếm)",
    "Xé Đá (Tank)",
    "Xé Đá (Dame)",
    "Kéo Tơ (Dame)",
    "Kéo Tơ (Heal)",
    "Phá Tre (Song Đao)",
    "Phá Tre (Dù)",
    "Phá Tre (Quyền)",
    "Phá Tre (Túy Quyền)",
    "Kéo Tơ (Buff)"
];

export type SlotKey = 'umbrella' | 'fan' | 'disc' | 'pendant' | 'helm' | 'chest' | 'bracers' | 'greaves';

interface SlotMeta {
    key: SlotKey;
    labelVi: string;
    labelEn: string;
    icon: string;
    side: 'left' | 'right';
    recommendedSet: string;
    godLineKey: string | null;
    godLineName: string;
    requiredAttunementKey: string;
    requiredAttunementName: string;
}

const SLOTS_CONFIG: SlotMeta[] = [
    {
        key: 'umbrella',
        labelVi: '1. Vũ Khí Chính (Dù)',
        labelEn: '1. Main Weapon (Umbrella)',
        icon: '☂️',
        side: 'left',
        recommendedSet: 'Mistwillow (Thời Vũ)',
        godLineKey: 'ART_UMBRELLA_BOOST',
        godLineName: 'Art of Umbrella Boost (Võ học Cửu Trùng Xuân Sắc tăng ST)',
        requiredAttunementKey: 'PHYS_PEN',
        requiredAttunementName: 'Xuyên phá ngoại công (Physical Penetration)'
    },
    {
        key: 'fan',
        labelVi: '2. Vũ Khí Phụ (Quạt)',
        labelEn: '2. Sub Weapon (Fan)',
        icon: '🪭',
        side: 'left',
        recommendedSet: 'Mistwillow (Thời Vũ)',
        godLineKey: null,
        godLineName: 'Max Physical Attack (Quạt không có God Line riêng)',
        requiredAttunementKey: 'PHYS_PEN',
        requiredAttunementName: 'Xuyên phá ngoại công (Physical Penetration)'
    },
    {
        key: 'disc',
        labelVi: '3. Dây Chuyền (Hình Tròn)',
        labelEn: '3. Disc (Necklace)',
        icon: '📿',
        side: 'left',
        recommendedSet: 'Mistwillow (Thời Vũ)',
        godLineKey: 'ALL_MARTIAL_ARTS_BOOST',
        godLineName: 'All Martial Arts Boost (Tất cả võ học tăng ST)',
        requiredAttunementKey: 'PHYS_PEN',
        requiredAttunementName: 'Xuyên phá ngoại công (Physical Penetration)'
    },
    {
        key: 'pendant',
        labelVi: '4. Ngọc Bội',
        labelEn: '4. Pendant (Jade)',
        icon: '玉',
        side: 'left',
        recommendedSet: 'Mistwillow (Thời Vũ)',
        godLineKey: 'ALL_MARTIAL_ARTS_BOOST',
        godLineName: 'All Martial Arts Boost (Tất cả võ học tăng ST)',
        requiredAttunementKey: 'PHYS_PEN',
        requiredAttunementName: 'Xuyên phá ngoại công (Physical Penetration)'
    },
    {
        key: 'helm',
        labelVi: '5. Nón (Mũ Giáp)',
        labelEn: '5. Helm (Headgear)',
        icon: '🪖',
        side: 'right',
        recommendedSet: 'Beyond the Chill',
        godLineKey: null,
        godLineName: 'Max Physical / Power / Crit + Mystic DMG (Dòng Gộp 2.3)',
        requiredAttunementKey: 'UMBRELLA_PROJECTILE_BOOST',
        requiredAttunementName: 'Cửu Trùng Xuân Sắc · Tăng ST đạn đạo tần suất cao (+4.2%~7.0%)'
    },
    {
        key: 'chest',
        labelVi: '6. Áo Giáp',
        labelEn: '6. Chest Armor',
        icon: '🥋',
        side: 'right',
        recommendedSet: 'Beyond the Chill',
        godLineKey: null,
        godLineName: 'Max Physical / Power / Crit + Mystic DMG (Dòng Gộp 2.3)',
        requiredAttunementKey: 'UMBRELLA_PROJECTILE_BOOST',
        requiredAttunementName: 'Cửu Trùng Xuân Sắc · Tăng ST đạn đạo tần suất cao (+4.2%~7.0%)'
    },
    {
        key: 'bracers',
        labelVi: '7. Hộ Uyển (Tay)',
        labelEn: '7. Bracers (Wrists)',
        icon: '🧤',
        side: 'right',
        recommendedSet: 'Beyond the Chill',
        godLineKey: 'BOSS_DMG_BOOST',
        godLineName: 'Combat Boost Against Boss Units (Tăng ST lên Thủ lĩnh)',
        requiredAttunementKey: 'UMBRELLA_PROJECTILE_BOOST',
        requiredAttunementName: 'Cửu Trùng Xuân Sắc · Tăng ST đạn đạo tần suất cao (+4.2%~7.0%)'
    },
    {
        key: 'greaves',
        labelVi: '8. Giày / Giáp Chân',
        labelEn: '8. Greaves (Legs)',
        icon: '🥾',
        side: 'right',
        recommendedSet: 'Beyond the Chill',
        godLineKey: 'BOSS_DMG_BOOST',
        godLineName: 'Combat Boost Against Boss Units (Tăng ST lên Thủ lĩnh)',
        requiredAttunementKey: 'UMBRELLA_PROJECTILE_BOOST',
        requiredAttunementName: 'Cửu Trùng Xuân Sắc · Tăng ST đạn đạo tần suất cao (+4.2%~7.0%)'
    }
];

export interface StatOption {
    key: string;
    labelVi: string;
    labelEn: string;
    group: 'T0' | 'T1' | 'T2' | 'T3';
    defaultVal: number;
    unit: string;
    crossSpecHint?: string;
}

const STAT_OPTIONS: StatOption[] = [
    { key: 'ART_UMBRELLA_BOOST', labelVi: '🌟 [T0] Võ học Cửu Trùng Xuân Sắc tăng ST', labelEn: 'Art of Umbrella Boost', group: 'T0', defaultVal: 6.5, unit: '%' },
    { key: 'ALL_MARTIAL_ARTS_BOOST', labelVi: '🌟 [T0] Tất cả võ học tăng sát thương', labelEn: 'All Martial Arts Boost', group: 'T0', defaultVal: 4.8, unit: '%' },
    { key: 'BOSS_DMG_BOOST', labelVi: '🌟 [T0] Tăng sát thương lên Thủ lĩnh (Boss)', labelEn: 'Combat Boost Against Boss Units', group: 'T0', defaultVal: 5.2, unit: '%' },
    { key: 'MAX_PHYS_ATK', labelVi: '⚔️ [T1] Tấn công ngoại công tối đa (Max Physical)', labelEn: 'Max Physical Attack', group: 'T1', defaultVal: 48, unit: '' },
    { key: 'POWER', labelVi: '💪 [T1] Lực đạo / Sức mạnh (Power)', labelEn: 'Power', group: 'T1', defaultVal: 28, unit: '' },
    { key: 'PRECISION_RATE', labelVi: '🎯 [T1] Tỷ lệ Chính xác (Precision Rate)', labelEn: 'Precision Rate', group: 'T1', defaultVal: 4.5, unit: '%' },
    { key: 'CRIT_RATE', labelVi: '💥 [T1] Tỷ lệ Chí mạng (Critical Rate)', labelEn: 'Critical Rate', group: 'T1', defaultVal: 4.2, unit: '%' },
    { key: 'MYSTIC_DMG_23', labelVi: '🔥 [T1] Tăng ST Kỳ thuật (Dòng Gộp Nón/Áo 2.3)', labelEn: 'Mystic Skill DMG Boost (2.3 Merged)', group: 'T1', defaultVal: 6.0, unit: '%' },
    { key: 'AGILITY', labelVi: '🌪️ [T2] Nhanh nhẹn / Ngự (Agility)', labelEn: 'Agility', group: 'T2', defaultVal: 28, unit: '' },
    { key: 'MIN_SILKBIND_ATK', labelVi: '🕸️ [T2] Tấn công Kéo Tơ nhỏ nhất (Min Silkbind)', labelEn: 'Min Silkbind Attack', group: 'T2', defaultVal: 26, unit: '' },
    { key: 'MAX_SILKBIND_ATK', labelVi: '🕸️ [T2] Tấn công Kéo Tơ tối đa (Max Silkbind)', labelEn: 'Max Silkbind Attack', group: 'T2', defaultVal: 42, unit: '' },
    { key: 'MOMENTUM', labelVi: '⚡ [T2] Thế (Momentum)', labelEn: 'Momentum', group: 'T2', defaultVal: 25, unit: '' },
    { key: 'FORMLESS_ATK', labelVi: '🌀 [T2] Vô Tướng Công (Formless Attack)', labelEn: 'Formless Attack', group: 'T2', defaultVal: 30, unit: '' },
    { key: 'MIN_PHYS_ATK', labelVi: '⚠️ [T3] Tấn công ngoại công tối thiểu (Min Physical)', labelEn: 'Min Physical Attack', group: 'T3', defaultVal: 32, unit: '' },
    { key: 'AFFINITY_RATE', labelVi: '⚠️ [T3] Tỉ lệ Hiểu ý (Affinity Rate - Phế trên Thời Vũ 2.3)', labelEn: 'Affinity Rate', group: 'T3', defaultVal: 4.0, unit: '%', crossSpecHint: 'Hợp với Cửu Kiếm / Xuất Huyết' },
    { key: 'BELLSTRIKE_ATK', labelVi: '❌ [T3] Tấn công Tiếng Chuông (Bellstrike - 0% tác dụng)', labelEn: 'Bellstrike Attack', group: 'T3', defaultVal: 40, unit: '', crossSpecHint: 'Thuộc hệ Tiếng Chuông Vang (Vô Danh / Cửu Kiếm)' },
    { key: 'BAMBOOCUT_ATK', labelVi: '❌ [T3] Tấn công Phá Tre (Bamboocut - 0% tác dụng)', labelEn: 'Bamboocut Attack', group: 'T3', defaultVal: 40, unit: '', crossSpecHint: 'Thuộc hệ Phá Tre (Song Đao / Quyền)' },
    { key: 'STONESPLIT_ATK', labelVi: '❌ [T3] Tấn công Xé Đá (Stonesplit - 0% tác dụng)', labelEn: 'Stonesplit Attack', group: 'T3', defaultVal: 40, unit: '', crossSpecHint: 'Thuộc hệ Xé Đá (Tank / Dame)' },
    { key: 'DEFENSE_HP_BODY', labelVi: '🗑️ [T3] Phòng ngự / Khí huyết / Thể phách (HP/DEF/Body)', labelEn: 'HP / Body / Defense', group: 'T3', defaultVal: 1200, unit: '' },
];

export interface AttunementOption {
    key: string;
    labelVi: string;
    labelEn: string;
    side: 'left' | 'right' | 'both';
    isBiS: boolean;
    trapWarning?: string;
}

const ATTUNEMENT_OPTIONS: AttunementOption[] = [
    {
        key: 'PHYS_PEN',
        labelVi: '✅ [Chuẩn Trái] Xuyên phá ngoại công (Physical Penetration)',
        labelEn: 'Physical Penetration',
        side: 'left',
        isBiS: true
    },
    {
        key: 'UMBRELLA_PROJECTILE_BOOST',
        labelVi: '✅ [Chuẩn Giáp Phải] Cửu Trùng Xuân Sắc · Tăng ST đạn đạo tần suất cao (+4.2%~7.0%)',
        labelEn: 'Vernal Umbrella: Frequent Projectile DMG Boost',
        side: 'right',
        isBiS: true
    },
    {
        key: 'TRAP_LIGHT_HEAVY',
        labelVi: '🚨 [BẪY 1] Cửu Trùng Xuân Sắc · Đòn nhẹ, Trọng kích & Phái sinh tăng ST',
        labelEn: 'Trap: Light/Heavy Attack & Varied Combo DMG Boost',
        side: 'right',
        isBiS: false,
        trapWarning: 'BẪY NẶNG NHẤT: Đánh Boss PvE hệ Dù không dùng đòn đánh thường/trọng kích! Phải Định âm lại (Re-attune) ngay!'
    },
    {
        key: 'TRAP_MARTIAL_SKILL',
        labelVi: '🚨 [BẪY 2] Cửu Trùng Xuân Sắc · Kỹ năng võ học tăng sát thương',
        labelEn: 'Trap: Martial Art Skill DMG Boost',
        side: 'right',
        isBiS: false,
        trapWarning: 'BẪY ĐỊNH ÂM: Chỉ tăng chiêu lẻ Spring Sorrow, tỷ trọng DPS rất nhỏ so với Đạn Đạo Tần Suất Cao!'
    },
    {
        key: 'TRAP_FAN_SPECIAL',
        labelVi: '🚨 [BẪY 3] Thanh Sơn Chấp Bút · Kỹ năng đặc biệt & truy kích tăng ST',
        labelEn: 'Trap: Inkwell Fan Special & Follow-up DMG Boost',
        side: 'right',
        isBiS: false,
        trapWarning: 'BẪY ĐỊNH ÂM: Quạt chỉ dùng dựng Tường Gió & gắn debuff [Lingering Bone] 5s, tuyệt đối không dồn định âm vào Quạt!'
    },
    {
        key: 'TRAP_FAN_CHARGED',
        labelVi: '🚨 [BẪY 4] Thanh Sơn Chấp Bút · Kỹ năng tích lực tăng sát thương',
        labelEn: 'Trap: Inkwell Fan Charged Skill DMG Boost',
        side: 'right',
        isBiS: false,
        trapWarning: 'BẪY ĐỊNH ÂM: Chỉ tăng lốc xoáy của Quạt, không dùng tối ưu Boss PvE!'
    },
    {
        key: 'TRAP_SILKBIND_WINGS',
        labelVi: '🚨 [BẪY 2.3] Định âm nhánh mới Silkbind: Wings (Trống Eo + Quạt)',
        labelEn: 'Trap: Silkbind Wings Attunement',
        side: 'both',
        isBiS: false,
        trapWarning: 'NHẦM NHÁNH 2.3: Đây là định âm của nhánh Trống Eo (Qingzhou), 0% tác dụng cho Cửu Trùng Xuân Sắc!'
    }
];

export interface TuningLine {
    statKey: string;
    value: number;
}

export interface GearItem {
    slot: SlotKey;
    name: string;
    tier: 96 | 100;
    gearSet: 'Mistwillow' | 'BeyondTheChill' | 'Hawkwing' | 'SilkbindWings' | 'Other';
    slot1: TuningLine;
    tuningLines: TuningLine[];
    attunementKey: string;
    attunementValue: number;
}

export interface CharacterBaseline {
    agility: number;
    reqAgility: number;
    minPhysical: number;
    reqMinPhysical: number;
    minSilkbind: number;
    reqMinSilkbind: number;
    precisionRate: number;
    critRate: number;
    affinityRate: number;
    simulate23: boolean;
    agiThreshold23: number;
    silkThreshold23: number;
    arsenal96Active: boolean;
}

const DEFAULT_BASELINE: CharacterBaseline = {
    agility: 381,
    reqAgility: 300,
    minPhysical: 1513.2,
    reqMinPhysical: 750,
    minSilkbind: 469.9,
    reqMinSilkbind: 352,
    precisionRate: 99.6,
    critRate: 78.5,
    affinityRate: 12.0,
    simulate23: false,
    agiThreshold23: 365,
    silkThreshold23: 440,
    arsenal96Active: true
};

const createSampleBiSGear = (slot: SlotKey): GearItem => {
    const meta = SLOTS_CONFIG.find(s => s.key === slot)!;
    return {
        slot,
        name: `${meta.labelVi.split('(')[0].trim()} Bậc 100`,
        tier: 100,
        gearSet: meta.side === 'left' ? 'Mistwillow' : 'BeyondTheChill',
        slot1: {
            statKey: meta.godLineKey || 'MAX_PHYS_ATK',
            value: meta.godLineKey ? 5.5 : 48
        },
        tuningLines: [
            { statKey: 'MAX_PHYS_ATK', value: 46 },
            { statKey: 'POWER', value: 27 },
            { statKey: slot === 'fan' || slot === 'helm' || slot === 'bracers' ? 'AGILITY' : 'PRECISION_RATE', value: slot === 'fan' || slot === 'helm' || slot === 'bracers' ? 28 : 4.5 }
        ],
        attunementKey: meta.requiredAttunementKey,
        attunementValue: 5.8
    };
};

const createBlankGear = (slot: SlotKey): GearItem => {
    const meta = SLOTS_CONFIG.find(s => s.key === slot)!;
    return {
        slot,
        name: `${meta.labelVi.split('(')[0].trim()} (Chưa nhập)`,
        tier: 96,
        gearSet: meta.side === 'left' ? 'Mistwillow' : 'BeyondTheChill',
        slot1: { statKey: 'MAX_PHYS_ATK', value: 0 },
        tuningLines: [
            { statKey: 'MAX_PHYS_ATK', value: 0 },
            { statKey: 'POWER', value: 0 },
            { statKey: 'CRIT_RATE', value: 0 }
        ],
        attunementKey: meta.requiredAttunementKey,
        attunementValue: 0
    };
};

export default function WwmBuildsTab({ wwmBuilds, wwmData, danhLuc, playerProfiles, session }: Props) {
    const currentUserId = useMemo(() => {
        if (!session?.user) return "guest";
        if (session.user.id) return String(session.user.id);
        if (session.user.image?.includes('avatars/')) {
            const m = session.user.image.match(/avatars\/(\d+)\//);
            if (m && m[1]) return m[1];
        }
        if (danhLuc) {
            const found = Object.entries(danhLuc).find(([_, v]: any) => v.ingame === session.user.name || v.discordName === session.user.name);
            if (found) return found[0];
        }
        return session.user.name || "guest";
    }, [session, danhLuc]);

    const currentIngame = useMemo(() => {
        if (danhLuc && danhLuc[currentUserId]?.ingame) return danhLuc[currentUserId].ingame;
        return session?.user?.name || "Đại Hiệp";
    }, [danhLuc, currentUserId, session]);

    const voHocList: string[] = useMemo(() => {
        if (Array.isArray(wwmData?.VO_HOC_LIST) && wwmData.VO_HOC_LIST.length > 0) {
            return wwmData.VO_HOC_LIST;
        }
        return DEFAULT_VO_HOC_LIST;
    }, [wwmData]);

    const [selectedSpec, setSelectedSpec] = useState<string>("Kéo Tơ (Dame)");
    const [viewingUserId, setViewingUserId] = useState<string>(currentUserId);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // 🟢 CHẾ ĐỘ CHỈNH SỬA: 'edit_equipped' (Sửa trực tiếp món đang mặc) | 'compare_new' (Soi phôi mới nhặt & đối chiếu)
    const [editorMode, setEditorMode] = useState<'edit_equipped' | 'compare_new'>('edit_equipped');

    useEffect(() => {
        const userClass = danhLuc?.[currentUserId]?.class;
        if (userClass && voHocList.includes(userClass)) {
            setSelectedSpec(userClass);
        }
    }, [danhLuc, currentUserId, voHocList]);

    useEffect(() => {
        setViewingUserId(currentUserId);
    }, [currentUserId]);

    const [baseline, setBaseline] = useState<CharacterBaseline>(DEFAULT_BASELINE);
    const [equipped, setEquipped] = useState<Record<SlotKey, GearItem>>(() => ({
        umbrella: createSampleBiSGear('umbrella'),
        fan: createSampleBiSGear('fan'),
        disc: createSampleBiSGear('disc'),
        pendant: createSampleBiSGear('pendant'),
        helm: createSampleBiSGear('helm'),
        chest: createSampleBiSGear('chest'),
        bracers: createSampleBiSGear('bracers'),
        greaves: createSampleBiSGear('greaves'),
    }));
    const [arsenal96, setArsenal96] = useState<GearItem[]>([]);
    const [innerWays, setInnerWays] = useState({
        slot1: { name: 'Morale Chant (Dịch Thủy Ca)', tier: 6 },
        slot2: { name: 'Blossom Barrage (Hoa Vũ Mãn Thiên)', tier: 6 },
        slot3: { name: 'Star Reacher (Trích Tinh)', tier: 5 },
        slot4: { name: 'Thunderous Bloom (Xuân Lôi Nhất Nộ)', tier: 5 },
        bossStyle: 'flex23' as 'flex23' | 'flying' | 'standing'
    });

    const [activeSlot, setActiveSlot] = useState<SlotKey>('umbrella');
    const [candidateGear, setCandidateGear] = useState<GearItem>(() => createSampleBiSGear('umbrella'));
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [geminiApiKey, setGeminiApiKey] = useState<string>("");
    const [webhookUrl, setWebhookUrl] = useState<string>("");
    const [isScanning, setIsScanning] = useState(false);
    const [isSavingCloud, setIsSavingCloud] = useState(false);
    const [statusBanner, setStatusBanner] = useState<string | null>(null);

    // Khóa bảo vệ không cho Firebase ghi đè ngược khi người dùng đang gõ chỉnh sửa
    const loadedProfileKeyRef = useRef<string>("");

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setGeminiApiKey(localStorage.getItem('tl_gemini_key') || '');
            setWebhookUrl(localStorage.getItem('tl_discord_webhook') || '');
        }
    }, []);

    useEffect(() => {
        const profileKey = `${selectedSpec}__${viewingUserId}`;
        const specDoc = wwmBuilds?.[selectedSpec];
        const userRecord = specDoc?.[viewingUserId];

        // Chỉ nạp từ Cloud/Local khi đổi Hệ Phái, đổi Người Xem, hoặc lần đầu dữ liệu Cloud tải về mà chưa có thay đổi tay
        if (loadedProfileKeyRef.current === profileKey && hasUnsavedChanges) {
            return;
        }

        if (userRecord) {
            if (userRecord.baseline) setBaseline({ ...DEFAULT_BASELINE, ...userRecord.baseline });
            if (userRecord.equipped) setEquipped(prev => ({ ...prev, ...userRecord.equipped }));
            if (Array.isArray(userRecord.arsenal96)) setArsenal96(userRecord.arsenal96);
            if (userRecord.innerWays) setInnerWays(prev => ({ ...prev, ...userRecord.innerWays }));
            loadedProfileKeyRef.current = profileKey;
            setHasUnsavedChanges(false);
        } else if (typeof window !== 'undefined' && viewingUserId === currentUserId) {
            const localRaw = localStorage.getItem(`wwm_build_${selectedSpec}_${currentUserId}`);
            if (localRaw) {
                try {
                    const parsed = JSON.parse(localRaw);
                    if (parsed.baseline) setBaseline({ ...DEFAULT_BASELINE, ...parsed.baseline });
                    if (parsed.equipped) setEquipped(prev => ({ ...prev, ...parsed.equipped }));
                    if (Array.isArray(parsed.arsenal96)) setArsenal96(parsed.arsenal96);
                    loadedProfileKeyRef.current = profileKey;
                } catch {}
            }
        }
    }, [wwmBuilds, selectedSpec, viewingUserId, currentUserId, hasUnsavedChanges]);

    // Hàm cập nhật Baseline có bật cờ đã chỉnh sửa
    const updateBaselineField = (patch: Partial<CharacterBaseline>) => {
        setHasUnsavedChanges(true);
        setBaseline(prev => ({ ...prev, ...patch }));
    };

    // Món đồ đang được chỉnh sửa trong Form (Tùy thuộc vào chế độ: Sửa đồ đang mặc HAY Soi phôi mới)
    const activeEditingGear: GearItem = editorMode === 'edit_equipped' ? equipped[activeSlot] : candidateGear;

    const updateActiveEditingGear = (updater: (prev: GearItem) => GearItem) => {
        setHasUnsavedChanges(true);
        if (editorMode === 'edit_equipped') {
            setEquipped(prev => ({
                ...prev,
                [activeSlot]: updater(prev[activeSlot])
            }));
        } else {
            setCandidateGear(prev => updater(prev));
        }
    };

    const handleSelectSlot = (slot: SlotKey) => {
        setActiveSlot(slot);
        if (editorMode === 'compare_new') {
            setCandidateGear(createSampleBiSGear(slot));
        }
    };

    // Làm trống cả 8 món về 0 để tự nhập từ đầu
    const handleClearAll8Slots = () => {
        if (!window.confirm("🧹 Đại hiệp muốn làm trống cả 8 món đang mặc về 0 để tự nhập thông số đồ thực tế của mình chứ?")) return;
        setHasUnsavedChanges(true);
        setEquipped({
            umbrella: createBlankGear('umbrella'),
            fan: createBlankGear('fan'),
            disc: createBlankGear('disc'),
            pendant: createBlankGear('pendant'),
            helm: createBlankGear('helm'),
            chest: createBlankGear('chest'),
            bracers: createBlankGear('bracers'),
            greaves: createBlankGear('greaves'),
        });
    };

    // Nạp mẫu BiS chuẩn 2.3 cho cả 8 món
    const handleLoadSampleBiS8Slots = () => {
        if (!window.confirm("✨ Nạp bộ khung 8 món Chuẩn BiS Bậc 100 (Patch 2.3) làm mẫu tham khảo?")) return;
        setHasUnsavedChanges(true);
        setEquipped({
            umbrella: createSampleBiSGear('umbrella'),
            fan: createSampleBiSGear('fan'),
            disc: createSampleBiSGear('disc'),
            pendant: createSampleBiSGear('pendant'),
            helm: createSampleBiSGear('helm'),
            chest: createSampleBiSGear('chest'),
            bracers: createSampleBiSGear('bracers'),
            greaves: createSampleBiSGear('greaves'),
        });
    };

    const saveBuildToCloud = async (
        nextBaseline = baseline,
        nextEquipped = equipped,
        nextArsenal = arsenal96,
        nextInnerWays = innerWays
    ) => {
        if (viewingUserId !== currentUserId) {
            alert("⚠️ Đại hiệp đang xem hồ sơ của đồng môn, không thể ghi đè! Hãy chuyển về hồ sơ của chính mình trước.");
            return;
        }
        setIsSavingCloud(true);
        try {
            const payload = {
                ingame: currentIngame,
                baseline: nextBaseline,
                equipped: nextEquipped,
                arsenal96: nextArsenal,
                innerWays: nextInnerWays,
                updatedAt: new Date().toISOString()
            };

            if (typeof window !== 'undefined') {
                localStorage.setItem(`wwm_build_${selectedSpec}_${currentUserId}`, JSON.stringify(payload));
            }

            const specRef = doc(db, 'wwm_builds', selectedSpec);
            await setDoc(specRef, {
                [currentUserId]: payload
            }, { merge: true });

            setHasUnsavedChanges(false);
            setStatusBanner(`✅ Đã lưu & đồng bộ hồ sơ [${selectedSpec}] của ${currentIngame} lên Firebase (wwm_builds)!`);
            setTimeout(() => setStatusBanner(null), 4000);
        } catch (err) {
            console.error("Lỗi lưu wwm_builds:", err);
            alert("⚠️ Đã lưu vào trình duyệt (Local), nhưng chưa ghi được lên Firebase. Hãy kiểm tra Rules của collection wwm_builds!");
        } finally {
            setIsSavingCloud(false);
        }
    };

    const handleSyncFromSoiAcc = () => {
        if (!playerProfiles) {
            alert("Chưa tải được dữ liệu Đài Chiếu Yêu!");
            return;
        }
        const matchEntry = Object.entries(playerProfiles).find(([_, d]: any) => {
            const pName = String(d?.playerName || d?.name || '').toLowerCase();
            return pName === currentIngame.toLowerCase();
        });

        if (!matchEntry) {
            alert(`Không tìm thấy hồ sơ /soi_acc của [${currentIngame}]. Đại hiệp có thể gõ trực tiếp con số vào các ô bên dưới!`);
            return;
        }

        try {
            const data: any = matchEntry[1];
            const raw = typeof data.full_raw_data === 'string' ? JSON.parse(data.full_raw_data) : data.full_raw_data;
            const attr = typeof raw?.attr === 'string' ? JSON.parse(raw.attr) : (raw?.attr || {});
            const agiFromGame = Number(attr.AGI || baseline.agility);
            const nextBase = { ...baseline, agility: agiFromGame };
            setBaseline(nextBase);
            saveBuildToCloud(nextBase, equipped, arsenal96, innerWays);
        } catch {
            alert("❌ Không bóc tách được chỉ số từ hồ sơ Soi Acc!");
        }
    };

    const loadoutSummary = useMemo(() => {
        let maxPhysLines = 0;
        let powerLines = 0;
        let agiLines = 0;
        let critLines = 0;
        let precisionLines = 0;
        let godLines = 0;

        Object.values(equipped).forEach((item) => {
            if (!item) return;
            const allLines = [item.slot1, ...(item.tuningLines || [])];
            allLines.forEach((l, idx) => {
                if (!l || Number(l.value) <= 0) return;
                if (idx === 0 && ['ART_UMBRELLA_BOOST', 'ALL_MARTIAL_ARTS_BOOST', 'BOSS_DMG_BOOST'].includes(l.statKey)) {
                    godLines++;
                }
                if (l.statKey === 'MAX_PHYS_ATK') maxPhysLines++;
                if (l.statKey === 'POWER') powerLines++;
                if (l.statKey === 'AGILITY') agiLines++;
                if (l.statKey === 'CRIT_RATE') critLines++;
                if (l.statKey === 'PRECISION_RATE') precisionLines++;
            });
        });

        return { maxPhysLines, powerLines, agiLines, critLines, precisionLines, godLines };
    }, [equipped]);

    const reqAgi = baseline.simulate23 ? baseline.agiThreshold23 : (baseline.reqAgility || 300);
    const reqPhys = baseline.reqMinPhysical || 750;
    const reqSilk = baseline.simulate23 ? baseline.silkThreshold23 : (baseline.reqMinSilkbind || 352);

    const evaluateGear = (item: GearItem) => {
        const slotMeta = SLOTS_CONFIG.find(s => s.key === item.slot)!;
        let badPoints = 0;
        const lineEvaluations: { line: TuningLine; isSlot1: boolean; badPt: number; tier: string; note: string }[] = [];
        const retunePriorities: string[] = [];
        const crossSpecHints: string[] = [];

        const needAgi = loadoutSummary.agiLines <= 3 || baseline.agility < reqAgi + 25;
        const needSilk = !baseline.arsenal96Active || baseline.minSilkbind < reqSilk;
        const needMinPhys = baseline.minPhysical < reqPhys;

        const allLines = [item.slot1, ...(item.tuningLines || [])];

        allLines.forEach((line, idx) => {
            const isSlot1 = idx === 0;
            const opt = STAT_OPTIONS.find(o => o.key === line.statKey);
            if (!opt) return;

            let pt = 0;
            const tierLabel: string = opt.group;
            let note = "Chuẩn";

            if (opt.group === 'T0') {
                if (isSlot1 && slotMeta.godLineKey === line.statKey) {
                    pt = 0;
                    note = "🔥 GOD LINE T0 (>2 dòng Ngoại Công)";
                } else {
                    pt = 0;
                    note = "Dòng T0";
                }
            } else if (opt.group === 'T1') {
                if (line.statKey === 'CRIT_RATE' && baseline.critRate > 80.5) {
                    pt = 0.5;
                    note = "⚠️ Overcap >80% Crit số vàng";
                } else {
                    pt = 0;
                    note = "✅ Chỉ số T1 Tối ưu";
                }
            } else if (opt.group === 'T2') {
                if (line.statKey === 'AGILITY') {
                    pt = needAgi ? 0 : 0.5;
                    note = needAgi ? "✅ Giữ mốc 100% Thiên phú 1 (0 điểm xấu)" : "⚠️ Dư định mức 3 dòng AGI (+0.5 điểm xấu)";
                } else if (line.statKey === 'MIN_SILKBIND_ATK' || line.statKey === 'MAX_SILKBIND_ATK') {
                    pt = needSilk ? 0 : 0.5;
                    note = needSilk ? "✅ Bù mốc 100% Thiên phú 3 (0 điểm xấu)" : "⚠️ Đã đủ Kéo Tơ từ Kho 96 (+0.5 điểm xấu)";
                } else {
                    pt = 0.5;
                    note = "Chỉ số T2 Tình huống (+0.5 điểm xấu)";
                }
            } else {
                if (line.statKey === 'MIN_PHYS_ATK' && needMinPhys) {
                    pt = 0;
                    note = "✅ Đang thiếu Min Physical kích Thiên Phú 2 (0 điểm xấu)";
                } else {
                    pt = 1.0;
                    note = "❌ Dòng Rác / Lệch hệ (+1.0 điểm xấu)";
                    retunePriorities.push(opt.labelVi);
                    if (opt.crossSpecHint) {
                        crossSpecHints.push(`${opt.labelVi.split(']')[1]?.trim()}: ${opt.crossSpecHint}`);
                    }
                }
            }

            badPoints += pt;
            lineEvaluations.push({ line, isSlot1, badPt: pt, tier: tierLabel, note });
        });

        const hasValidGodLine = Boolean(slotMeta.godLineKey && item.slot1.statKey === slotMeta.godLineKey);
        const missingRequiredGodLine = Boolean(slotMeta.godLineKey && item.slot1.statKey !== slotMeta.godLineKey);

        let setWarning: string | null = null;
        if (item.gearSet === 'Hawkwing') {
            setWarning = "🚨 CẤM DÙNG HAWKWING Ở BẢN 2.3: Hiệu ứng bộ đã đổi sang cộng Bellstrike Attack (0% tác dụng với Kéo Tơ)!";
        } else if (item.gearSet === 'SilkbindWings') {
            setWarning = "🚨 NHẦM NHÁNH 2.3: Đây là đồ nhánh Silkbind: Wings (Trống Eo + Quạt) mới mở ở Qingzhou!";
        } else if (slotMeta.side === 'left' && item.gearSet !== 'Mistwillow') {
            setWarning = "⚠️ 4 món bên trái bắt buộc dùng Bộ Thời Vũ (Mistwillow Set)!";
        } else if (slotMeta.side === 'right' && item.gearSet !== 'BeyondTheChill') {
            setWarning = "⚠️ 4 món Giáp bên phải bắt buộc dùng Bộ Beyond the Chill!";
        }

        const attuneOpt = ATTUNEMENT_OPTIONS.find(a => a.key === item.attunementKey);
        const attuneTrap = attuneOpt && !attuneOpt.isBiS ? attuneOpt.trapWarning || "Sai dòng Định Âm chuẩn!" : null;

        let verdictTitle = "";
        let verdictColor: 'emerald' | 'amber' | 'rose' = 'emerald';
        let verdictAction = "";

        if (setWarning) {
            verdictTitle = "🚫 SAI BỘ SET TRANG BỊ 2.3";
            verdictColor = 'rose';
            verdictAction = setWarning;
        } else if (hasValidGodLine && badPoints > 2.0) {
            verdictTitle = "🔥 GIỮ PHÔI T0 & DÙNG [GEAR TUNING RESET] (ĐỒ 100)";
            verdictColor = 'amber';
            verdictAction = `Phôi có dòng khởi đầu Thần Cấp [${slotMeta.godLineName}] nhưng các dòng sau bị ${badPoints.toFixed(1)} điểm xấu (>2.0). Tuyệt đối KHÔNG vứt! Hãy dùng tính năng [Gear Tuning Reset] của đồ 100 để mở lại các dòng sau!`;
        } else if (badPoints <= 0.5) {
            verdictTitle = "💎 CỰC PHẨM (GOD ROLL / BiS) - MẶC NGAY!";
            verdictColor = 'emerald';
            verdictAction = missingRequiredGodLine
                ? `Chỉ số phụ cực đẹp (${badPoints.toFixed(1)} điểm xấu), nhưng lưu ý vị trí này về lâu dài nên săn phôi có dòng 1 [${slotMeta.godLineName}].`
                : `Hoàn mỹ (${badPoints.toFixed(1)} điểm xấu)! Đạt chuẩn T0/T1 Bản 2.3.`;
        } else if (badPoints <= 2.0) {
            verdictTitle = "✨ DÙNG TỐT - TẨY LẠI (RETUNE) DÒNG RÁC";
            verdictColor = 'amber';
            verdictAction = retunePriorities.length > 0
                ? `Điểm xấu: ${badPoints.toFixed(1)}/2.0. Ưu tiên dùng đá Retune tẩy dòng: ${retunePriorities[0]} trước!`
                : `Điểm xấu: ${badPoints.toFixed(1)}/2.0. Phôi dùng tốt, có thể tinh chỉnh thêm 1 dòng phụ.`;
        } else {
            if (item.tier === 96) {
                verdictTitle = "📦 KHÔNG TẨY THÊM - CẤT VÀO KHO VŨ KHÍ 96 (ARSENAL)";
                verdictColor = 'amber';
                verdictAction = `Đồ 96 có ${badPoints.toFixed(1)} điểm xấu. Tuyệt đối KHÔNG phân tách và KHÔNG tốn nguyên liệu retune. Hãy chuyển vào Kho Vũ Khí 96 (Hệ Kéo Tơ) để lấy chỉ số cộng thẳng kích Thiên Phú 3!`;
            } else {
                verdictTitle = "🗑️ PHÔI XẤU (>2.0 ĐIỂM XẤU) - BỎ HOẶC RESET TUNING";
                verdictColor = 'rose';
                verdictAction = `Tổng điểm xấu ${badPoints.toFixed(1)} > 2.0 và không có dòng khởi đầu God Line T0.`;
            }
        }

        return {
            badPoints,
            lineEvaluations,
            hasValidGodLine,
            missingRequiredGodLine,
            setWarning,
            attuneTrap,
            verdictTitle,
            verdictColor,
            verdictAction,
            retunePriorities,
            crossSpecHints
        };
    };

    const currentSlotEquipped = equipped[activeSlot];
    const activeGearEval = useMemo(() => evaluateGear(activeEditingGear), [activeEditingGear, baseline, loadoutSummary, reqAgi, reqPhys, reqSilk]);

    const comparisonDelta = useMemo(() => {
        const sumStat = (item: GearItem, key: string) => {
            const lines = [item.slot1, ...(item.tuningLines || [])];
            return lines.filter(l => l.statKey === key).reduce((acc, cur) => acc + (Number(cur.value) || 0), 0);
        };

        const targetGear = editorMode === 'compare_new' ? candidateGear : currentSlotEquipped;

        const deltaAgi = sumStat(targetGear, 'AGILITY') - sumStat(currentSlotEquipped, 'AGILITY');
        const deltaSilk = sumStat(targetGear, 'MIN_SILKBIND_ATK') - sumStat(currentSlotEquipped, 'MIN_SILKBIND_ATK');
        const deltaMaxPhys = sumStat(targetGear, 'MAX_PHYS_ATK') - sumStat(currentSlotEquipped, 'MAX_PHYS_ATK');
        const deltaPower = sumStat(targetGear, 'POWER') - sumStat(currentSlotEquipped, 'POWER');
        const deltaPrec = sumStat(targetGear, 'PRECISION_RATE') - sumStat(currentSlotEquipped, 'PRECISION_RATE');
        const deltaCrit = sumStat(targetGear, 'CRIT_RATE') - sumStat(currentSlotEquipped, 'CRIT_RATE');

        const newTotalAgi = +(baseline.agility + deltaAgi).toFixed(1);
        const newTotalSilk = +(baseline.minSilkbind + deltaSilk).toFixed(1);
        const newTotalPrec = +(baseline.precisionRate + deltaPrec).toFixed(2);
        const newTotalCrit = +(baseline.critRate + deltaCrit).toFixed(2);

        const breaksTalent1 = newTotalAgi < reqAgi;
        const breaksTalent3 = newTotalSilk < reqSilk;
        const dropsPrecision = newTotalPrec < 98.0;

        return {
            deltaAgi, deltaSilk, deltaMaxPhys, deltaPower, deltaPrec, deltaCrit,
            newTotalAgi, newTotalSilk, newTotalPrec, newTotalCrit,
            reqAgi, reqSilk, breaksTalent1, breaksTalent3, dropsPrecision
        };
    }, [candidateGear, currentSlotEquipped, baseline, editorMode, reqAgi, reqSilk]);

    const runGeminiOcr = async (base64DataUrl: string) => {
        setPreviewImage(base64DataUrl);
        setIsScanning(true);

        try {
            const base64Clean = base64DataUrl.split(',')[1];
            const promptText = `Bạn là AI OCR chuyên đọc ảnh chụp màn hình trang bị game Where Winds Meet (Yến Vân Thập Lục Thanh - Bản 2.3).
Hãy đọc ảnh trang bị và trả về DUY NHẤT 1 JSON object theo cấu trúc sau (không bọc markdown):
{
  "name": "Tên món đồ trong ảnh",
  "slot": "umbrella | fan | disc | pendant | helm | chest | bracers | greaves",
  "tier": 100,
  "gearSet": "Mistwillow | BeyondTheChill | Hawkwing | SilkbindWings | Other",
  "slot1": { "statKey": "MÃ_STAT", "value": 5.5 },
  "tuningLines": [
    { "statKey": "MÃ_STAT", "value": 48 },
    { "statKey": "MÃ_STAT", "value": 28 },
    { "statKey": "MÃ_STAT", "value": 4.2 }
  ],
  "attunementKey": "PHYS_PEN | UMBRELLA_PROJECTILE_BOOST | TRAP_LIGHT_HEAVY | TRAP_MARTIAL_SKILL | TRAP_FAN_SPECIAL | TRAP_FAN_CHARGED",
  "attunementValue": 5.8
}`;

            if (!geminiApiKey.trim()) {
                alert("💡 Để AI tự động điền thông số từ ảnh, đại hiệp hãy dán Gemini API Key vào ô cấu hình góc phải trên cùng (hoặc chỉnh trực tiếp bằng menu bên dưới)!");
                setIsScanning(false);
                return;
            }

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey.trim()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: promptText },
                            { inlineData: { mimeType: 'image/png', data: base64Clean } }
                        ]
                    }]
                })
            });

            const json = await res.json();
            const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const cleanedJson = rawText.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanedJson);

            const targetSlot: SlotKey = (parsed.slot && SLOTS_CONFIG.some(s => s.key === parsed.slot)) ? parsed.slot : activeSlot;
            setActiveSlot(targetSlot);

            updateActiveEditingGear(prev => ({
                ...prev,
                name: parsed.name || prev.name,
                slot: targetSlot,
                tier: parsed.tier === 96 ? 96 : 100,
                gearSet: parsed.gearSet || prev.gearSet,
                slot1: parsed.slot1 || prev.slot1,
                tuningLines: Array.isArray(parsed.tuningLines) && parsed.tuningLines.length > 0 ? parsed.tuningLines : prev.tuningLines,
                attunementKey: parsed.attunementKey || prev.attunementKey,
                attunementValue: Number(parsed.attunementValue) || prev.attunementValue
            }));
        } catch (err) {
            console.error("Lỗi AI OCR:", err);
            alert("⚠️ AI không đọc rõ chữ trong ảnh. Đại hiệp hãy chọn nhanh các dòng bằng Dropdown bên dưới nhé!");
        } finally {
            setIsScanning(false);
        }
    };

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            if (typeof ev.target?.result === 'string') {
                                runGeminiOcr(ev.target.result);
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [geminiApiKey, activeSlot, editorMode]);

    const handleEquipCandidate = () => {
        if (editorMode === 'edit_equipped') {
            saveBuildToCloud(baseline, equipped, arsenal96, innerWays);
            return;
        }

        if (comparisonDelta.breaksTalent1 || comparisonDelta.breaksTalent3) {
            const confirmBreak = window.confirm("🚨 BÁO ĐỘNG ĐỎ: Thay món đồ này sẽ làm GÃY MỐC 100% THIÊN PHÚ VÕ HỌC! Đại hiệp vẫn muốn ép mặc chứ?");
            if (!confirmBreak) return;
        }

        const oldItem = equipped[activeSlot];
        let nextArsenal = [...arsenal96];

        if (oldItem && oldItem.tier === 96) {
            nextArsenal = [oldItem, ...nextArsenal];
        }

        const nextEquipped = {
            ...equipped,
            [activeSlot]: { ...candidateGear, slot: activeSlot }
        };

        const nextBaseline: CharacterBaseline = {
            ...baseline,
            agility: comparisonDelta.newTotalAgi,
            minSilkbind: comparisonDelta.newTotalSilk,
            precisionRate: comparisonDelta.newTotalPrec,
            critRate: comparisonDelta.newTotalCrit
        };

        setEquipped(nextEquipped);
        setArsenal96(nextArsenal);
        setBaseline(nextBaseline);
        saveBuildToCloud(nextBaseline, nextEquipped, nextArsenal, innerWays);
    };

    const handleSendDiscordWebhook = async () => {
        if (!webhookUrl.trim()) {
            alert("Hãy dán Discord Webhook URL vào ô cấu hình phía trên trước!");
            return;
        }
        const slotMeta = SLOTS_CONFIG.find(s => s.key === activeSlot)!;
        const colorInt = activeGearEval.verdictColor === 'emerald' ? 0x10b981 : activeGearEval.verdictColor === 'amber' ? 0xf59e0b : 0xef4444;

        const embed = {
            title: `☂️ GIÁM ĐỊNH THẦN KHÍ 2.3: ${activeEditingGear.name} (Bậc ${activeEditingGear.tier})`,
            description: `**Đại hiệp:** \`${currentIngame}\` • **Hệ phái:** \`${selectedSpec}\`\n**Phán quyết:** **${activeGearEval.verdictTitle}**\n> ${activeGearEval.verdictAction}`,
            color: colorInt,
            fields: [
                {
                    name: `📌 Vị Trí & Bộ Set (${slotMeta.labelVi})`,
                    value: `Bộ: **${activeEditingGear.gearSet}** | Điểm xấu: **${activeGearEval.badPoints.toFixed(1)} / 2.0**`,
                    inline: false
                },
                {
                    name: '🌟 Dòng Khởi Đầu (Slot 1)',
                    value: `${STAT_OPTIONS.find(o => o.key === activeEditingGear.slot1.statKey)?.labelVi || activeEditingGear.slot1.statKey}: **+${activeEditingGear.slot1.value}**`,
                    inline: true
                },
                {
                    name: '🔮 Dòng Định Âm (Slot 5)',
                    value: `${ATTUNEMENT_OPTIONS.find(a => a.key === activeEditingGear.attunementKey)?.labelVi || activeEditingGear.attunementKey}`,
                    inline: true
                }
            ],
            footer: { text: 'Thanh Long Sơn Trang • WWM 2.3 Gear Optimizer Hub' },
            timestamp: new Date().toISOString()
        };

        try {
            await fetch(webhookUrl.trim(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embeds: [embed] })
            });
            alert("✅ Đã bắn Báo Cáo Giám Định Rich Embed vào kênh Discord thành công!");
        } catch {
            alert("❌ Không gửi được Webhook Discord, vui lòng kiểm tra lại URL!");
        }
    };

    const savedUsersInSpec = useMemo(() => {
        const specDoc = wwmBuilds?.[selectedSpec] || {};
        return Object.entries(specDoc).map(([uid, data]: any) => ({
            uid,
            ingame: danhLuc?.[uid]?.ingame || data?.ingame || `Cao thủ #${uid.slice(0, 5)}`,
            updatedAt: data?.updatedAt
        }));
    }, [wwmBuilds, selectedSpec, danhLuc]);

    return (
        <section className="space-y-6 animate-in fade-in duration-300 pb-16">
            {statusBanner && (
                <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg">
                    <span>{statusBanner}</span>
                    <button onClick={() => setStatusBanner(null)} className="text-emerald-400 hover:text-white">✕</button>
                </div>
            )}

            {/* THANH CHỌN HỆ VÕ HỌC & LƯU HỒ SƠ */}
            <div className="bg-[#090d16] border border-emerald-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-black uppercase tracking-wider mb-2">
                            <span>🐉 COLLECTION: wwm_builds</span>
                            <span>•</span>
                            <span>PATCH 2.3 (15/10/2026)</span>
                        </div>
                        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-amber-300 to-amber-500">
                            ⚔️ Thần Khí Các · Giám Định & Tối Ưu Đồ Võ Học
                        </h2>
                        <p className="text-xs text-zinc-400 mt-1">
                            Đang chỉnh sửa: <b className="text-emerald-400 font-mono">wwm_builds ➔ {selectedSpec} ➔ {currentIngame}</b>
                            {hasUnsavedChanges && <span className="ml-2 text-amber-400 font-bold animate-pulse">● (Có thay đổi chưa lưu lên Mây)</span>}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <select
                            value={viewingUserId}
                            onChange={(e) => {
                                setHasUnsavedChanges(false);
                                setViewingUserId(e.target.value);
                            }}
                            className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-emerald-500"
                        >
                            <option value={currentUserId}>👤 Hồ sơ của tôi: {currentIngame}</option>
                            {savedUsersInSpec.filter(u => u.uid !== currentUserId).map(u => (
                                <option key={u.uid} value={u.uid}>👀 Xem đồng môn: {u.ingame}</option>
                            ))}
                        </select>

                        <button
                            type="button"
                            onClick={handleSyncFromSoiAcc}
                            className="px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer"
                            title="Lấy nhanh chỉ số Ngự (Agility) từ Đài Chiếu Yêu (/soi_acc)"
                        >
                            🔮 Kéo Chỉ Số Từ Soi Acc
                        </button>

                        <button
                            type="button"
                            disabled={isSavingCloud || viewingUserId !== currentUserId}
                            onClick={() => saveBuildToCloud()}
                            className={`px-4 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                                hasUnsavedChanges
                                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-bounce'
                                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                            }`}
                        >
                            {isSavingCloud ? "⏳ Đang lưu..." : "☁️ Lưu Hồ Sơ Lên Mây"}
                        </button>
                    </div>
                </div>

                <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                        Chọn Nhánh Võ Học (Tự động tách kho trang bị riêng cho từng hệ):
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {voHocList.map((specName) => {
                            const isSelected = selectedSpec === specName;
                            const isSilkbindJade = specName === "Kéo Tơ (Dame)";
                            const countInSpec = Object.keys(wwmBuilds?.[specName] || {}).length;

                            return (
                                <button
                                    key={specName}
                                    type="button"
                                    onClick={() => {
                                        setHasUnsavedChanges(false);
                                        setSelectedSpec(specName);
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                                        isSelected
                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                                            : 'bg-zinc-900/70 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                                    }`}
                                >
                                    <span>{isSilkbindJade ? '☂️' : '⚔️'}</span>
                                    <span>{specName}</span>
                                    {countInSpec > 0 && (
                                        <span className="px-1.5 py-0.2 bg-zinc-950 text-amber-400 rounded-full text-[10px] font-mono">
                                            {countInSpec}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 🟢 KHU VỰC 1: BẢNG CHỈ SỐ NHÂN VẬT & MỐC THIÊN PHÚ (CHO PHÉP GÕ SỬA TRỰC TIẾP 100%) */}
            <div className="bg-[#090d16] border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                    <div>
                        <h3 className="text-base font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                            🔒 Quy Tắc Tối Thượng #1: Khóa Cứng 100% Thiên Phú Võ Học (Bấm Vào Ô Số Để Sửa Trực Tiếp)
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            Đại hiệp hãy nhập <b className="text-amber-300">Chỉ số hiện tại của nhân vật</b> và <b className="text-emerald-300">Mốc yêu cầu</b> rồi bấm <b>☁️ Lưu Hồ Sơ Lên Mây</b>.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={baseline.simulate23}
                                onChange={(e) => updateBaselineField({ simulate23: e.target.checked })}
                                className="accent-amber-400"
                            />
                            <span>🔥 Mô phỏng &lt;Mười Chiếu Chín Cấp U ·&gt; 2.3</span>
                        </label>

                        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={baseline.arsenal96Active}
                                onChange={(e) => updateBaselineField({ arsenal96Active: e.target.checked })}
                                className="accent-emerald-400"
                            />
                            <span>📦 Đã lắp Kho Vũ Khí 96 (Hệ Kéo Tơ)</span>
                        </label>
                    </div>
                </div>

                {/* 3 THẺ TIẾN TRÌNH THIÊN PHÚ (SỬA ĐƯỢC CẢ CHỈ SỐ LẪN MỐC YÊU CẦU) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* THIÊN PHÚ 1: NHANH NHẸN */}
                    <div className={`p-4 rounded-2xl border ${baseline.agility >= reqAgi ? 'bg-zinc-900/60 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Thiên Phú 1 · Direct Crit (+9.1%)</div>
                                <div className="text-sm font-black text-zinc-100">Nhanh Nhẹn (Agility)</div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${baseline.agility >= reqAgi ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500 text-white'}`}>
                                {baseline.agility >= reqAgi ? '100% ĐẠT' : `THIẾU ${(reqAgi - baseline.agility).toFixed(0)} ĐIỂM`}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 my-2">
                            <div className="flex-1">
                                <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">✏️ Chỉ số của bạn:</span>
                                <input
                                    type="number"
                                    step="1"
                                    value={baseline.agility}
                                    onChange={(e) => updateBaselineField({ agility: Number(e.target.value) })}
                                    className="w-full bg-zinc-950 border border-amber-500/40 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-sm font-mono font-black text-amber-300 focus:outline-none"
                                />
                            </div>
                            <span className="text-zinc-500 font-bold pt-4">/</span>
                            <div className="w-28">
                                <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">🎯 Mốc yêu cầu:</span>
                                <input
                                    type="number"
                                    step="1"
                                    value={reqAgi}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        if (baseline.simulate23) updateBaselineField({ agiThreshold23: val });
                                        else updateBaselineField({ reqAgility: val });
                                    }}
                                    className="w-full bg-zinc-950 border border-zinc-700 focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-sm font-mono font-bold text-zinc-300 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                            <div className={`h-full transition-all ${baseline.agility >= reqAgi ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, (baseline.agility / Math.max(1, reqAgi)) * 100)}%` }}></div>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                            Khuyến nghị giữ <b className="text-amber-300">3 dòng Nhanh nhẹn</b> trên đồ (Quạt, Nón, Tay). Hiện trên 8 món có: <b className={loadoutSummary.agiLines >= 3 ? "text-emerald-400" : "text-rose-400"}>{loadoutSummary.agiLines}/3 dòng</b>.
                        </p>
                    </div>

                    {/* THIÊN PHÚ 2: NGOẠI CÔNG TỐI THIỂU */}
                    <div className={`p-4 rounded-2xl border ${baseline.minPhysical >= reqPhys ? 'bg-zinc-900/60 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Thiên Phú 2 · +36% Projectile Crit DMG</div>
                                <div className="text-sm font-black text-zinc-100">Ngoại Công Tối Thiểu (Min Phys)</div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${baseline.minPhysical >= reqPhys ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500 text-white'}`}>
                                {baseline.minPhysical >= reqPhys ? '100% (MAX CAP)' : `THIẾU ${(reqPhys - baseline.minPhysical).toFixed(1)}`}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 my-2">
                            <div className="flex-1">
                                <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">✏️ Chỉ số của bạn:</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={baseline.minPhysical}
                                    onChange={(e) => updateBaselineField({ minPhysical: Number(e.target.value) })}
                                    className="w-full bg-zinc-950 border border-amber-500/40 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-sm font-mono font-black text-amber-300 focus:outline-none"
                                />
                            </div>
                            <span className="text-zinc-500 font-bold pt-4">/</span>
                            <div className="w-28">
                                <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">🎯 Đỉnh mùa:</span>
                                <input
                                    type="number"
                                    step="1"
                                    value={reqPhys}
                                    onChange={(e) => updateBaselineField({ reqMinPhysical: Number(e.target.value) })}
                                    className="w-full bg-zinc-950 border border-zinc-700 focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-sm font-mono font-bold text-zinc-300 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                            <div className={`h-full transition-all ${baseline.minPhysical >= reqPhys ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, (baseline.minPhysical / Math.max(1, reqPhys)) * 100)}%` }}></div>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                            {baseline.minPhysical >= reqPhys ? (
                                <>Đã vượt mốc (<b className="text-emerald-400">{baseline.minPhysical}/{reqPhys}</b>) ➔ <b className="text-rose-400">Không cần lấy thêm dòng Min Physical trên đồ!</b></>
                            ) : (
                                <>⚠️ Đang thiếu <b className="text-rose-400">{(reqPhys - baseline.minPhysical).toFixed(1)} điểm</b> để đạt trần +36% Crit DMG đạn đạo!</>
                            )}
                        </p>
                    </div>

                    {/* THIÊN PHÚ 3: KÉO TƠ NHỎ NHẤT */}
                    <div className={`p-4 rounded-2xl border ${baseline.minSilkbind >= reqSilk ? 'bg-zinc-900/60 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Thiên Phú 3 · +23.6 Xuyên Thấu Kéo Tơ</div>
                                <div className="text-sm font-black text-zinc-100">Kéo Tơ Nhỏ Nhất (Min Silkbind)</div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${baseline.minSilkbind >= reqSilk ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500 text-white'}`}>
                                {baseline.minSilkbind >= reqSilk ? '100% ĐẠT' : `THIẾU ${(reqSilk - baseline.minSilkbind).toFixed(1)}`}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 my-2">
                            <div className="flex-1">
                                <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">✏️ Chỉ số của bạn:</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={baseline.minSilkbind}
                                    onChange={(e) => updateBaselineField({ minSilkbind: Number(e.target.value) })}
                                    className="w-full bg-zinc-950 border border-amber-500/40 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-sm font-mono font-black text-amber-300 focus:outline-none"
                                />
                            </div>
                            <span className="text-zinc-500 font-bold pt-4">/</span>
                            <div className="w-28">
                                <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">🎯 Mốc yêu cầu:</span>
                                <input
                                    type="number"
                                    step="1"
                                    value={reqSilk}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        if (baseline.simulate23) updateBaselineField({ silkThreshold23: val });
                                        else updateBaselineField({ reqMinSilkbind: val });
                                    }}
                                    className="w-full bg-zinc-950 border border-zinc-700 focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-sm font-mono font-bold text-zinc-300 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                            <div className={`h-full transition-all ${baseline.minSilkbind >= reqSilk ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, (baseline.minSilkbind / Math.max(1, reqSilk)) * 100)}%` }}></div>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                            Ưu tiên số 1: Dùng <b className="text-amber-300">Kho Vũ Khí Bậc 96 (Hệ Kéo Tơ)</b> để lấy điểm cộng thẳng.
                        </p>
                    </div>
                </div>

                {/* 3 RATES SỐ VÀNG & API KEYS */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2 border-t border-zinc-800/60">
                    <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className={`p-3 rounded-xl border ${baseline.precisionRate >= 98 ? 'bg-zinc-950/80 border-amber-500/30' : 'bg-rose-950/40 border-rose-500'}`}>
                            <div className="text-[10px] font-bold text-amber-400 uppercase">🎯 Precision (Số Vàng ✏️)</div>
                            <div className="flex items-center gap-1.5 mt-1">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={baseline.precisionRate}
                                    onChange={(e) => updateBaselineField({ precisionRate: Number(e.target.value) })}
                                    className="w-24 bg-zinc-900 border border-amber-500/40 rounded px-2 py-1 text-sm font-mono font-black text-amber-300"
                                />
                                <span className="text-xs text-zinc-400">% / 100%</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-1">
                                {baseline.precisionRate < 98 ? '🚨 <98% bị nhảy Sát Thương Xám!' : '✅ Chuẩn (Cần 4-5 dòng đồ 100)'}
                            </div>
                        </div>

                        <div className={`p-3 rounded-xl border ${baseline.critRate <= 80.5 ? 'bg-zinc-950/80 border-amber-500/30' : 'bg-amber-950/30 border-amber-400'}`}>
                            <div className="text-[10px] font-bold text-amber-400 uppercase">💥 Critical (Số Vàng ✏️)</div>
                            <div className="flex items-center gap-1.5 mt-1">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={baseline.critRate}
                                    onChange={(e) => updateBaselineField({ critRate: Number(e.target.value) })}
                                    className="w-24 bg-zinc-900 border border-amber-500/40 rounded px-2 py-1 text-sm font-mono font-black text-amber-300"
                                />
                                <span className="text-xs text-zinc-400">% / 80% Trần</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-1">
                                {baseline.critRate > 80.5 ? '⚠️ Overcap >80% lãng phí!' : '✅ Gồm +9.1% từ Thiên phú 1'}
                            </div>
                        </div>

                        <div className="p-3 rounded-xl border bg-zinc-950/80 border-zinc-800">
                            <div className="text-[10px] font-bold text-zinc-400 uppercase">🌀 Affinity (Hiểu Ý ✏️)</div>
                            <div className="flex items-center gap-1.5 mt-1">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={baseline.affinityRate}
                                    onChange={(e) => updateBaselineField({ affinityRate: Number(e.target.value) })}
                                    className="w-24 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm font-mono font-bold text-zinc-300"
                                />
                                <span className="text-xs text-zinc-500">% (~12% tự nhiên)</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-1">
                                Giữ 0 dòng trên bộ Thời Vũ 2.3
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">🔑 Gemini API Key (Để quét ảnh OCR):</label>
                            <input
                                type="password"
                                value={geminiApiKey}
                                onChange={(e) => {
                                    setGeminiApiKey(e.target.value);
                                    localStorage.setItem('tl_gemini_key', e.target.value);
                                }}
                                placeholder="AIzaSy... (Tùy chọn)"
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">📤 Discord Webhook URL:</label>
                            <input
                                type="text"
                                value={webhookUrl}
                                onChange={(e) => {
                                    setWebhookUrl(e.target.value);
                                    localStorage.setItem('tl_discord_webhook', e.target.value);
                                }}
                                placeholder="https://discord.com/api/webhooks/..."
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-mono"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 🟢 KHU VỰC 2 & 3: LƯỚI 8 MÓN ĐANG MẶC (TRÁI) & BÀN CHỈNH SỬA / GIÁM ĐỊNH ĐỒ (PHẢI) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* CỘT TRÁI (5 CỘT): 8 MÓN ĐANG MẶC */}
                <div className="lg:col-span-5 bg-[#090d16] border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                        <div>
                            <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider">
                                🛡️ 8 Món Đang Mặc ({currentIngame})
                            </h3>
                            <p className="text-[11px] text-zinc-400">
                                Nhấp vào món bất kỳ để <b>Sửa chỉ số món đang mặc</b> hoặc <b>Đối chiếu phôi mới</b>
                            </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={handleClearAll8Slots}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold cursor-pointer"
                                title="Làm trống cả 8 món về 0 để tự nhập đồ của bạn"
                            >
                                🧹 Làm Trống 8 Món
                            </button>
                            <button
                                type="button"
                                onClick={handleLoadSampleBiS8Slots}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold cursor-pointer"
                                title="Nạp bộ mẫu 8 món chuẩn BiS 2.3"
                            >
                                ✨ Nạp Mẫu BiS
                            </button>
                        </div>
                    </div>

                    {/* BỘ ĐẾM DÒNG TRÊN 8 MÓN */}
                    <div className="grid grid-cols-3 gap-2 bg-zinc-950/90 p-3 rounded-2xl border border-zinc-800/80 text-center">
                        <div>
                            <div className="text-[10px] text-zinc-500">Max Physical</div>
                            <div className="text-xs font-black font-mono text-amber-300">{loadoutSummary.maxPhysLines} / 12 dòng</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-500">Power (Lực đạo)</div>
                            <div className="text-xs font-black font-mono text-amber-300">{loadoutSummary.powerLines} / 10 dòng</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-500">Agility (Nhanh nhẹn)</div>
                            <div className={`text-xs font-black font-mono ${loadoutSummary.agiLines >= 3 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {loadoutSummary.agiLines} / 3 dòng
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-500">Precision (Chính xác)</div>
                            <div className="text-xs font-black font-mono text-cyan-300">{loadoutSummary.precisionLines} / 4-5 dòng</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-500">Crit Rate (Chí mạng)</div>
                            <div className="text-xs font-black font-mono text-amber-300">{loadoutSummary.critLines} / ~7 dòng</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-500">God Lines T0</div>
                            <div className="text-xs font-black font-mono text-emerald-400">{loadoutSummary.godLines} / 5 dòng</div>
                        </div>
                    </div>

                    {/* DANH SÁCH 8 Ô TRANG BỊ */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {SLOTS_CONFIG.map((slot) => {
                            const item = equipped[slot.key];
                            const ev = evaluateGear(item);
                            const isSelected = activeSlot === slot.key;

                            return (
                                <div
                                    key={slot.key}
                                    onClick={() => handleSelectSlot(slot.key)}
                                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                                        isSelected
                                            ? 'bg-emerald-950/30 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                            : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'
                                    }`}
                                >
                                    <div className="flex justify-between items-start gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">{slot.icon}</span>
                                            <div>
                                                <div className="text-xs font-black text-zinc-100">{slot.labelVi}</div>
                                                <div className="text-[10px] text-emerald-400 font-semibold">
                                                    Bậc {item.tier} • {item.gearSet}
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black ${
                                            ev.badPoints <= 0.5 ? 'bg-emerald-500/20 text-emerald-300' : ev.badPoints <= 2.0 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                                        }`}>
                                            {ev.badPoints.toFixed(1)} xấu
                                        </span>
                                    </div>

                                    <div className="mt-2 pt-2 border-t border-zinc-800/70 text-[10px] text-amber-300 font-medium truncate">
                                        Dòng 1: {STAT_OPTIONS.find(o => o.key === item.slot1.statKey)?.labelVi.replace(/^[^\]]+\]\s*/, '')} (+{item.slot1.value})
                                    </div>
                                    <div className="mt-1 text-[9px] text-zinc-400 truncate">
                                        {item.tuningLines.map(l => STAT_OPTIONS.find(o => o.key === l.statKey)?.labelEn.split(' ')[0]).join(' • ')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* KHO VŨ KHÍ 96 */}
                    <div className="pt-3 border-t border-zinc-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                                📦 Kho Vũ Khí Bậc 96 (Tier 96 Arsenal - Hệ Kéo Tơ)
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">{arsenal96.length} món bảo toàn</span>
                        </div>
                        {arsenal96.length === 0 ? (
                            <p className="text-[11px] text-zinc-500 italic bg-zinc-950/60 p-3 rounded-xl border border-dashed border-zinc-800">
                                Tuyệt đối KHÔNG phân tách (dismantle) đồ 96 cũ có Mastery cao! Khi đại hiệp thay đồ 100 vào người, đồ 96 cũ sẽ tự động cất vào đây để kích hoạt Thiên Phú 3.
                            </p>
                        ) : (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {arsenal96.map((g, idx) => (
                                    <div key={idx} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 flex justify-between items-center text-xs">
                                        <span className="text-amber-300 font-bold">{g.name} (Bậc 96 • {g.gearSet})</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setHasUnsavedChanges(true);
                                                setArsenal96(arsenal96.filter((_, i) => i !== idx));
                                            }}
                                            className="text-zinc-500 hover:text-rose-400 text-[10px]"
                                        >
                                            ✕ Xóa
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* CỘT PHẢI (7 CỘT): CHỈNH SỬA MÓN ĐANG MẶC HOẶC SOI PHÔI MỚI NHẶT */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-[#090d16] border border-emerald-500/30 rounded-3xl p-5 shadow-xl space-y-5">
                        
                        {/* 🟢 CÔNG TẮC CHUYỂN CHẾ ĐỘ: SỬA MÓN ĐANG MẶC vs SOI PHÔI MỚI */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setEditorMode('edit_equipped')}
                                className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                                    editorMode === 'edit_equipped'
                                        ? 'bg-emerald-500 text-zinc-950 shadow-md'
                                        : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                <span>✏️ Chế Độ 1: Sửa Món Đang Mặc ({SLOTS_CONFIG.find(s => s.key === activeSlot)?.icon})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditorMode('compare_new')}
                                className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                                    editorMode === 'compare_new'
                                        ? 'bg-amber-500 text-zinc-950 shadow-md'
                                        : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                <span>⚖️ Chế Độ 2: Soi Phôi Mới & So Sánh Delta</span>
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                            <div>
                                <h3 className="text-base font-black text-emerald-400 flex items-center gap-2">
                                    {editorMode === 'edit_equipped'
                                        ? `🛠️ Đang Chỉnh Sửa Trực Tiếp: ${SLOTS_CONFIG.find(s => s.key === activeSlot)?.labelVi}`
                                        : `🔍 Đang Soi Phôi Mới Nhặt So Với: ${SLOTS_CONFIG.find(s => s.key === activeSlot)?.labelVi}`}
                                </h3>
                                <p className="text-xs text-zinc-400">
                                    {editorMode === 'edit_equipped'
                                        ? 'Mọi chỉnh sửa bên dưới sẽ cập nhật thẳng vào món đồ đang mặc của bạn ở cột bên trái!'
                                        : 'Nhấn Ctrl + V dán ảnh phôi mới nhặt hoặc chọn dòng để đọ độ chênh lệch (Delta) với món đang mặc.'}
                                </p>
                            </div>

                            <label className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold cursor-pointer shrink-0 text-center transition-all">
                                {isScanning ? "⏳ AI đang đọc ảnh..." : "📷 Tải Ảnh / Dán Ctrl+V"}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => {
                                                if (typeof ev.target?.result === 'string') runGeminiOcr(ev.target.result);
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        {previewImage && (
                            <div className="flex items-center gap-4 bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                                <img src={previewImage} alt="Gear Preview" className="w-20 h-20 object-cover rounded-xl border border-amber-500/30" />
                                <div className="text-xs text-zinc-300 space-y-1">
                                    <div className="font-bold text-emerald-400">✅ Đã nạp ảnh chụp màn hình trang bị!</div>
                                    <p className="text-[11px] text-zinc-500">Đại hiệp có thể kiểm tra hoặc tinh chỉnh lại các dòng bên dưới.</p>
                                </div>
                            </div>
                        )}

                        {/* CHỌN VỊ TRÍ, BẬC ĐỒ & BỘ SET */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-950/70 p-4 rounded-2xl border border-zinc-800/80">
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Vị trí món đồ (8 Ô):</label>
                                <select
                                    value={activeSlot}
                                    onChange={(e) => handleSelectSlot(e.target.value as SlotKey)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
                                >
                                    {SLOTS_CONFIG.map(s => (
                                        <option key={s.key} value={s.key}>{s.icon} {s.labelVi}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Bậc trang bị (Tier):</label>
                                <select
                                    value={activeEditingGear.tier}
                                    onChange={(e) => updateActiveEditingGear(g => ({ ...g, tier: Number(e.target.value) as 96 | 100 }))}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 font-bold"
                                >
                                    <option value={100}>🔥 Bậc 100 (Patch 2.3 Mới)</option>
                                    <option value={96}>📦 Bậc 96 (Đồ Cũ / Arsenal)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Bộ Set Trang Bị:</label>
                                <select
                                    value={activeEditingGear.gearSet}
                                    onChange={(e) => updateActiveEditingGear(g => ({ ...g, gearSet: e.target.value as any }))}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold"
                                >
                                    <option value="Mistwillow">✅ Mistwillow (Bộ Thời Vũ - 4 Trái)</option>
                                    <option value="BeyondTheChill">✅ Beyond the Chill (4 Giáp Phải)</option>
                                    <option value="Hawkwing">🚫 Hawkwing (Đã phế sang Bellstrike ở 2.3)</option>
                                    <option value="SilkbindWings">🚨 Silkbind: Wings (Nhánh Trống Eo 2.3)</option>
                                    <option value="Other">⚠️ Bộ Khác</option>
                                </select>
                            </div>
                        </div>

                        {/* CHỈNH DÒNG 1, DÒNG 2-4 VÀ ĐỊNH ÂM DÒNG 5 */}
                        <div className="space-y-3">
                            {/* DÒNG 1 */}
                            <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-3.5">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider">
                                        🌟 Dòng Khởi Đầu (Slot 1 - Initial Tuning):
                                    </span>
                                    <span className="text-[10px] text-zinc-400">
                                        Chuẩn BiS: <b className="text-emerald-300">{SLOTS_CONFIG.find(s => s.key === activeSlot)?.godLineName}</b>
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <select
                                        value={activeEditingGear.slot1.statKey}
                                        onChange={(e) => {
                                            const opt = STAT_OPTIONS.find(o => o.key === e.target.value);
                                            updateActiveEditingGear(g => ({
                                                ...g,
                                                slot1: { statKey: e.target.value, value: opt ? opt.defaultVal : 40 }
                                            }));
                                        }}
                                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
                                    >
                                        {STAT_OPTIONS.map(o => (
                                            <option key={o.key} value={o.key}>{o.labelVi}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={activeEditingGear.slot1.value}
                                        onChange={(e) => updateActiveEditingGear(g => ({
                                            ...g,
                                            slot1: { ...g.slot1, value: Number(e.target.value) }
                                        }))}
                                        className="w-24 bg-zinc-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-300 text-center"
                                    />
                                </div>
                            </div>

                            {/* CÁC DÒNG TẨY LUYỆN (SLOT 2, 3, 4) */}
                            <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                                        🛠️ Các Dòng Tẩy Luyện (Tuning Lines - Slot 2, 3, 4):
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => updateActiveEditingGear(g => ({
                                            ...g,
                                            tuningLines: [...g.tuningLines, { statKey: 'MAX_PHYS_ATK', value: 45 }]
                                        }))}
                                        className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-bold cursor-pointer"
                                    >
                                        + Thêm dòng
                                    </button>
                                </div>

                                {activeEditingGear.tuningLines.map((tLine, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-zinc-500 w-6">#{idx + 2}</span>
                                        <select
                                            value={tLine.statKey}
                                            onChange={(e) => {
                                                const opt = STAT_OPTIONS.find(o => o.key === e.target.value);
                                                updateActiveEditingGear(g => {
                                                    const nextLines = [...g.tuningLines];
                                                    nextLines[idx] = { statKey: e.target.value, value: opt ? opt.defaultVal : 30 };
                                                    return { ...g, tuningLines: nextLines };
                                                });
                                            }}
                                            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-200 font-medium"
                                        >
                                            {STAT_OPTIONS.filter(o => o.group !== 'T0').map(o => (
                                                <option key={o.key} value={o.key}>{o.labelVi}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={tLine.value}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                updateActiveEditingGear(g => {
                                                    const nextLines = [...g.tuningLines];
                                                    nextLines[idx] = { ...nextLines[idx], value: val };
                                                    return { ...g, tuningLines: nextLines };
                                                });
                                            }}
                                            className="w-20 bg-zinc-900 border border-amber-500/40 rounded-xl px-2 py-1.5 text-xs font-mono font-bold text-amber-300 text-center"
                                        />
                                        {activeEditingGear.tuningLines.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => updateActiveEditingGear(g => ({
                                                    ...g,
                                                    tuningLines: g.tuningLines.filter((_, i) => i !== idx)
                                                }))}
                                                className="text-zinc-600 hover:text-rose-400 px-1.5 text-xs cursor-pointer"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* DÒNG 5: ĐỊNH ÂM */}
                            <div className={`rounded-2xl p-3.5 border ${activeGearEval.attuneTrap ? 'bg-rose-950/30 border-rose-500' : 'bg-cyan-950/20 border-cyan-500/30'}`}>
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[11px] font-black text-cyan-400 uppercase tracking-wider">
                                        🔮 Dòng Định Âm Khóa Cuối (Slot 5 - Attunement):
                                    </span>
                                    <span className="text-[10px] text-zinc-400">
                                        Bắt buộc: <b className="text-amber-300">{SLOTS_CONFIG.find(s => s.key === activeSlot)?.requiredAttunementName}</b>
                                    </span>
                                </div>
                                <select
                                    value={activeEditingGear.attunementKey}
                                    onChange={(e) => updateActiveEditingGear(g => ({ ...g, attunementKey: e.target.value }))}
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-cyan-300 font-bold"
                                >
                                    {ATTUNEMENT_OPTIONS.map(a => (
                                        <option key={a.key} value={a.key}>{a.labelVi}</option>
                                    ))}
                                </select>
                                {activeGearEval.attuneTrap && (
                                    <div className="mt-2 text-xs font-bold text-rose-400 bg-rose-950/60 px-3 py-2 rounded-xl border border-rose-500/40">
                                        {activeGearEval.attuneTrap}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* HỘP PHÁN QUYẾT */}
                        <div className={`rounded-2xl p-5 border-2 shadow-xl space-y-3 ${
                            activeGearEval.verdictColor === 'emerald'
                                ? 'bg-emerald-950/30 border-emerald-500/60'
                                : activeGearEval.verdictColor === 'amber'
                                    ? 'bg-amber-950/30 border-amber-500/60'
                                    : 'bg-rose-950/30 border-rose-500/60'
                        }`}>
                            <div className="flex flex-wrap justify-between items-center gap-2">
                                <h4 className={`text-base font-black tracking-wide ${
                                    activeGearEval.verdictColor === 'emerald' ? 'text-emerald-300' : activeGearEval.verdictColor === 'amber' ? 'text-amber-300' : 'text-rose-300'
                                }`}>
                                    {activeGearEval.verdictTitle}
                                </h4>
                                <span className="px-3 py-1 rounded-full bg-zinc-950 border border-zinc-700 text-xs font-mono font-black text-amber-400">
                                    Tổng Điểm Xấu: {activeGearEval.badPoints.toFixed(1)} / 2.0
                                </span>
                            </div>

                            <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                                {activeGearEval.verdictAction}
                            </p>

                            {activeGearEval.crossSpecHints.length > 0 && (
                                <div className="bg-zinc-950/80 border border-amber-500/30 rounded-xl p-2.5 text-[11px] text-amber-300">
                                    💡 <b>Gợi ý Đa Hệ Võ Học:</b> {activeGearEval.crossSpecHints.join(' • ')}
                                </div>
                            )}

                            {/* NẾU Ở CHẾ ĐỘ SOI PHÔI MỚI THÌ HIỆN BẢNG DELTA */}
                            {editorMode === 'compare_new' && (
                                <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3.5 space-y-2">
                                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                        ⚖️ Độ Chênh Lệch (Delta) Nếu Thay Món Này Vào [{SLOTS_CONFIG.find(s => s.key === activeSlot)?.labelVi}]:
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                                        <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                                            <span className="text-[10px] text-zinc-500 block">Nhanh nhẹn (AGI)</span>
                                            <span className={`font-black ${comparisonDelta.deltaAgi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {comparisonDelta.deltaAgi >= 0 ? `+${comparisonDelta.deltaAgi}` : comparisonDelta.deltaAgi} (➔ {comparisonDelta.newTotalAgi})
                                            </span>
                                        </div>
                                        <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                                            <span className="text-[10px] text-zinc-500 block">Kéo Tơ Min</span>
                                            <span className={`font-black ${comparisonDelta.deltaSilk >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {comparisonDelta.deltaSilk >= 0 ? `+${comparisonDelta.deltaSilk}` : comparisonDelta.deltaSilk} (➔ {comparisonDelta.newTotalSilk})
                                            </span>
                                        </div>
                                        <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                                            <span className="text-[10px] text-zinc-500 block">Chính Xác (Số Vàng)</span>
                                            <span className={`font-black ${comparisonDelta.deltaPrec >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {comparisonDelta.deltaPrec >= 0 ? `+${comparisonDelta.deltaPrec}%` : `${comparisonDelta.deltaPrec}%`} (➔ {comparisonDelta.newTotalPrec}%)
                                            </span>
                                        </div>
                                        <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                                            <span className="text-[10px] text-zinc-500 block">Max Physical</span>
                                            <span className={`font-black ${comparisonDelta.deltaMaxPhys >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {comparisonDelta.deltaMaxPhys >= 0 ? `+${comparisonDelta.deltaMaxPhys}` : comparisonDelta.deltaMaxPhys}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={handleEquipCandidate}
                                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                                >
                                    {editorMode === 'edit_equipped'
                                        ? `💾 Lưu Cập Nhật Món [${SLOTS_CONFIG.find(s => s.key === activeSlot)?.labelVi}] Lên Mây`
                                        : `⚡ Thay Phôi Này Vào [${SLOTS_CONFIG.find(s => s.key === activeSlot)?.labelVi}] & Lưu Mây`}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendDiscordWebhook}
                                    className="py-3 px-5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                                >
                                    📤 Gửi Báo Cáo Lên Discord
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* KHU VỰC 4: TÂM PHÁP */}
                    <div className="bg-[#090d16] border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                            <div>
                                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">
                                    📜 Quy Tắc #6: Cố Vấn Tâm Pháp (Inner Ways) & Chuỗi Chiêu 2.3
                                </h3>
                                <p className="text-[11px] text-zinc-400">
                                    Tận dụng buff 5 giây <b className="text-emerald-400">[Lingering Bone]</b> của Quạt ở bản 2.3 & kỹ thuật giữ nút gồng khi đổi vũ khí.
                                </p>
                            </div>

                            <select
                                value={innerWays.bossStyle}
                                onChange={(e) => {
                                    setHasUnsavedChanges(true);
                                    const style = e.target.value as 'flex23' | 'flying' | 'standing';
                                    if (style === 'flex23') {
                                        setInnerWays({ ...innerWays, bossStyle: style, slot3: { name: 'Star Reacher (Trích Tinh)', tier: 5 }, slot4: { name: 'Thunderous Bloom (Xuân Lôi Nhất Nộ)', tier: 5 } });
                                    } else if (style === 'flying') {
                                        setInnerWays({ ...innerWays, bossStyle: style, slot3: { name: 'Fivefold Bleed (Ngũ Trùng Xuất Huyết)', tier: 6 }, slot4: { name: 'Thunderous Bloom (Xuân Lôi Nhất Nộ)', tier: 5 } });
                                    } else {
                                        setInnerWays({ ...innerWays, bossStyle: style, slot3: { name: 'Star Reacher (Trích Tinh)', tier: 5 }, slot4: { name: 'Breaking Point (Phá Cực)', tier: 4 } });
                                    }
                                }}
                                className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold"
                            >
                                <option value="flex23">🔥 Khuyên dùng số 1 Bản 2.3 (Naki&apos;s Flex Rotation ~61.7k DPS)</option>
                                <option value="flying">🦅 Đánh Boss Bay Nhảy (Flying Umbrella)</option>
                                <option value="standing">🗿 Đánh Boss Đứng Im (Walking Umbrella)</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-zinc-950 border border-emerald-500/30">
                                <div className="text-[10px] text-emerald-400 font-bold uppercase">Ô Cốt Lõi 1 (Cố định)</div>
                                <div className="text-xs font-black text-amber-300 mt-0.5">{innerWays.slot1.name} (Tier {innerWays.slot1.tier})</div>
                            </div>
                            <div className="p-3 rounded-xl bg-zinc-950 border border-emerald-500/30">
                                <div className="text-[10px] text-emerald-400 font-bold uppercase">Ô Cốt Lõi 2 (Cố định)</div>
                                <div className="text-xs font-black text-amber-300 mt-0.5">{innerWays.slot2.name} (Tier {innerWays.slot2.tier})</div>
                            </div>
                            <div className="p-3 rounded-xl bg-zinc-950 border border-amber-500/30 flex justify-between items-center">
                                <div>
                                    <div className="text-[10px] text-amber-400 font-bold uppercase">Ô Linh Hoạt 3</div>
                                    <div className="text-xs font-black text-zinc-100 mt-0.5">{innerWays.slot3.name}</div>
                                </div>
                                <select
                                    value={innerWays.slot3.tier}
                                    onChange={(e) => {
                                        setHasUnsavedChanges(true);
                                        setInnerWays({ ...innerWays, slot3: { ...innerWays.slot3, tier: Number(e.target.value) } });
                                    }}
                                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-amber-300 font-mono font-bold"
                                >
                                    {[1, 2, 3, 4, 5, 6].map(t => <option key={t} value={t}>Tier {t}</option>)}
                                </select>
                            </div>
                            <div className="p-3 rounded-xl bg-zinc-950 border border-amber-500/30 flex justify-between items-center">
                                <div>
                                    <div className="text-[10px] text-amber-400 font-bold uppercase">Ô Linh Hoạt 4</div>
                                    <div className="text-xs font-black text-zinc-100 mt-0.5">{innerWays.slot4.name}</div>
                                </div>
                                <select
                                    value={innerWays.slot4.tier}
                                    onChange={(e) => {
                                        setHasUnsavedChanges(true);
                                        setInnerWays({ ...innerWays, slot4: { ...innerWays.slot4, tier: Number(e.target.value) } });
                                    }}
                                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-amber-300 font-mono font-bold"
                                >
                                    {[1, 2, 3, 4, 5, 6].map(t => <option key={t} value={t}>Tier {t}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}