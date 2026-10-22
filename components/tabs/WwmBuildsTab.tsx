// components/tabs/WwmBuildsTab.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Props {
    wwmBuilds: Record<string, any>;
    wwmData: any;
    danhLuc: any;
    playerProfiles?: any;
    session: any;
    lang: 'vi' | 'en';
    isMaster: boolean;
}

export type SlotKey = 'umbrella' | 'fan' | 'disc' | 'pendant' | 'helm' | 'chest' | 'greaves' | 'bracers';
export type StatGroupTier = 'T0' | 'T1' | 'T2' | 'T3';

const TIER_SORT_WEIGHT: Record<StatGroupTier, number> = {
    T0: 0,
    T1: 1,
    T2: 2,
    T3: 3
};

export interface WeaponTypeOption {
    key: string;
    labelVi: string;
    labelEn: string;
    icon: string;
}

export const DEFAULT_WEAPON_TYPES: WeaponTypeOption[] = [
    { key: 'UMBRELLA', labelVi: 'Dù (Tản)', labelEn: 'Umbrella', icon: '☂️' },
    { key: 'FAN', labelVi: 'Quạt (Phiến)', labelEn: 'Fan', icon: '🪭' },
    { key: 'SWORD', labelVi: 'Kiếm (Trường Kiếm)', labelEn: 'Sword', icon: '🗡️' },
    { key: 'SPEAR', labelVi: 'Thương / Giáo', labelEn: 'Spear', icon: '🔱' },
    { key: 'MO_BLADE', labelVi: 'Mạch Đao / Đại Đao', labelEn: 'Mo Blade / Glaive', icon: '🪓' },
    { key: 'DUAL_BLADES', labelVi: 'Song Đao', labelEn: 'Dual Blades', icon: '⚔️' },
    { key: 'ROPE_DART', labelVi: 'Thằng Tiêu (Dây Phi Tiêu)', labelEn: 'Rope Dart', icon: '⛓️' },
    { key: 'GAUNTLETS', labelVi: 'Quyền / Thủ Giáp', labelEn: 'Gauntlets / Fist', icon: '🥊' },
    { key: 'HENGDAO', labelVi: 'Hoành Đao / Đường Đao', labelEn: 'Hengdao', icon: '🔪' },
    { key: 'WAIST_DRUM', labelVi: 'Trống Eo (Yêu Cổ)', labelEn: 'Waist Drum', icon: '🥁' },
];

export interface GearSetOption {
    key: string;
    labelVi: string;
    labelEn: string;
    side: 'left' | 'right' | 'both';
    warningText?: string;
}

export const DEFAULT_GEAR_SETS: GearSetOption[] = [
    { key: 'Mistwillow', labelVi: 'Mistwillow (Bộ Liễu Khói Dày Đặc / Thời Vũ)', labelEn: 'Mistwillow Set', side: 'left' },
    { key: 'BeyondTheChill', labelVi: 'Beyond the Chill (Bộ Hàn Ngoại - 4 Giáp Phải)', labelEn: 'Beyond the Chill Set', side: 'right' },
    { key: 'Ivorybloom', labelVi: 'Ivorybloom (Bộ Tượng Hoa - Heal/Kéo Tơ)', labelEn: 'Ivorybloom Set', side: 'left' },
    { key: 'Rainwhisper', labelVi: 'Rainwhisper (Bộ Vũ Ngữ - Giáp Phải)', labelEn: 'Rainwhisper Set', side: 'right' },
    { key: 'Jadeware', labelVi: 'Jadeware (Bộ Ngọc Khí - Hệ Minh Kim)', labelEn: 'Jadeware Set', side: 'left' },
    { key: 'Formbend', labelVi: 'Formbend (Bộ Định Hình - Giáp Phải)', labelEn: 'Formbend Set', side: 'right' },
    { key: 'SwallowCall', labelVi: 'Swallow Call (Bộ Yến Minh - Phá Trúc)', labelEn: 'Swallow Call Set', side: 'left' },
    { key: 'Ironclad', labelVi: 'Ironclad (Bộ Thiết Giáp - Liệt Thạch / Tank)', labelEn: 'Ironclad Set', side: 'right' },
    {
        key: 'Hawkwing',
        labelVi: 'Hawkwing (Bộ Ưng Dực - Cộng Minh Kim)',
        labelEn: 'Hawkwing Set',
        side: 'left',
        warningText: '⚠️ Lưu ý: Hiệu ứng Hawkwing cộng Minh Kim / Bellstrike Attack (Chỉ hợp hệ Chuông/Minh Kim, 0% tác dụng với Khiên Ty)!'
    },
    {
        key: 'SilkbindWings',
        labelVi: 'Silkbind: Wings (Bộ Nhánh Trống Eo)',
        labelEn: 'Silkbind: Wings Set',
        side: 'both',
        warningText: '⚠️ Lưu ý: Đây là bộ nhánh Silkbind: Wings (Trống Eo + Quạt)!'
    },
    { key: 'Other', labelVi: 'Bộ Khác / Tùy Chỉnh', labelEn: 'Other Set', side: 'both' }
];

export interface TierOption {
    tier: number;
    labelVi: string;
    isArsenal?: boolean;
}

const DEFAULT_TIER_OPTIONS: TierOption[] = [
    { tier: 100, labelVi: '🔥 Bậc 100 (Đồ Chính Hiện Tại)', isArsenal: false },
    { tier: 96, labelVi: '📦 Bậc 96 (Kho Vũ Khí / Arsenal)', isArsenal: true },
    { tier: 91, labelVi: '🛡️ Bậc 91 (Kho Vũ Khí Cũ)', isArsenal: true },
    { tier: 86, labelVi: '🛡️ Bậc 86 (Kho Vũ Khí Cũ)', isArsenal: true },
];

// 🛡️ DANH MỤC MỐC KHÁNG CẤP ĐỘ (RESISTANCE BRACKETS - MỞ RỘNG ĐỘNG CHO LV. 20+)
export interface ResistanceBracketOption {
    rate: number;
    labelVi: string;
}

const DEFAULT_RESISTANCE_BRACKETS: ResistanceBracketOption[] = [
    { rate: 85, labelVi: 'Lv. 18/19 (Lv. 100): 85% Resistance' },
    { rate: 65, labelVi: 'Lv. 16/17 (Lv. 96-100): 65% Resistance' },
    { rate: 45, labelVi: 'Lv. 14/15 (Lv. 91-95): 45% Resistance' },
    { rate: 30, labelVi: 'Lv. 13 (Lv. 86-90): 30% Resistance' },
    { rate: 15, labelVi: 'Lv. 12 (Lv. 81-85): 15% Resistance' },
];

export interface TamPhapOption {
    id: string;
    vi: string;
    en: string;
    display: string;
}

export interface SlotMeta {
    key: SlotKey;
    slotNumber: number;
    labelVi: string;
    labelEn: string;
    icon: string;
    side: 'left' | 'right';
    isWeaponSlot?: boolean;
    defaultWeaponKey?: string;
    recommendedSet: string;
    godLineKey: string | null;
    godLineName: string;
    requiredAttunementKey: string;
    requiredAttunementName: string;
}

export const SLOTS_CONFIG: SlotMeta[] = [
    {
        key: 'umbrella',
        slotNumber: 1,
        labelVi: '1. Vũ Khí Chính',
        labelEn: '1. Main Weapon',
        icon: '⚔️',
        side: 'left',
        isWeaponSlot: true,
        defaultWeaponKey: 'UMBRELLA',
        recommendedSet: 'Mistwillow',
        godLineKey: 'ART_UMBRELLA_BOOST',
        godLineName: 'Võ học Vũ khí chính tăng sát thương (T0)',
        requiredAttunementKey: 'PHYS_PEN',
        requiredAttunementName: 'Xuyên phá ngoại công (Physical Penetration)'
    },
    {
        key: 'fan',
        slotNumber: 2,
        labelVi: '2. Vũ Khí Phụ',
        labelEn: '2. Sub Weapon',
        icon: '🗡️',
        side: 'left',
        isWeaponSlot: true,
        defaultWeaponKey: 'FAN',
        recommendedSet: 'Mistwillow',
        godLineKey: null,
        godLineName: 'Công kích Ngoại công tối đa / Dòng T0 Vũ Khí Phụ',
        requiredAttunementKey: 'PHYS_PEN',
        requiredAttunementName: 'Xuyên phá ngoại công (Physical Penetration)'
    },
    {
        key: 'disc',
        slotNumber: 3,
        labelVi: '3. Dây Chuyền (Hình Tròn)',
        labelEn: '3. Disc (Necklace)',
        icon: '📿',
        side: 'left',
        recommendedSet: 'Mistwillow',
        godLineKey: 'ALL_MARTIAL_ARTS_BOOST',
        godLineName: 'Tất cả võ học tăng sát thương (All Martial Arts Boost)',
        requiredAttunementKey: 'PHYS_PEN',
        requiredAttunementName: 'Xuyên phá ngoại công (Physical Penetration)'
    },
    {
        key: 'pendant',
        slotNumber: 4,
        labelVi: '4. Ngọc Bội',
        labelEn: '4. Pendant (Jade)',
        icon: '玉',
        side: 'left',
        recommendedSet: 'Mistwillow',
        godLineKey: 'ALL_MARTIAL_ARTS_BOOST',
        godLineName: 'Tất cả võ học tăng sát thương (All Martial Arts Boost)',
        requiredAttunementKey: 'PHYS_PEN',
        requiredAttunementName: 'Xuyên phá ngoại công (Physical Penetration)'
    },
    {
        key: 'helm',
        slotNumber: 5,
        labelVi: '5. Nón (Mũ Giáp)',
        labelEn: '5. Helm (Headgear)',
        icon: '🪖',
        side: 'right',
        recommendedSet: 'Beyond the Chill',
        godLineKey: null,
        godLineName: 'Công kích Ngoại công tối đa / Lực / Chí mạng + Kỳ thuật',
        requiredAttunementKey: 'UMBRELLA_PROJECTILE_BOOST',
        requiredAttunementName: 'Tăng ST Kỹ năng chủ lực (+4.2%~7.0%)'
    },
    {
        key: 'chest',
        slotNumber: 6,
        labelVi: '6. Áo Giáp',
        labelEn: '6. Chest Armor',
        icon: '🥋',
        side: 'right',
        recommendedSet: 'Beyond the Chill',
        godLineKey: null,
        godLineName: 'Công kích Ngoại công tối đa / Lực / Chí mạng + Kỳ thuật',
        requiredAttunementKey: 'UMBRELLA_PROJECTILE_BOOST',
        requiredAttunementName: 'Tăng ST Kỹ năng chủ lực (+4.2%~7.0%)'
    },
    {
        key: 'greaves',
        slotNumber: 7,
        labelVi: '7. Giáp Chân (Greaves)',
        labelEn: '7. Greaves (Leg Armor)',
        icon: '🥾',
        side: 'right',
        recommendedSet: 'Beyond the Chill',
        godLineKey: 'BOSS_DMG_BOOST',
        godLineName: 'Tăng sát thương lên Thủ lĩnh (Boss DMG Boost)',
        requiredAttunementKey: 'UMBRELLA_PROJECTILE_BOOST',
        requiredAttunementName: 'Tăng ST Kỹ năng chủ lực (+4.2%~7.0%)'
    },
    {
        key: 'bracers',
        slotNumber: 8,
        labelVi: '8. Hộ Uyển (Tay)',
        labelEn: '8. Bracers (Wrists)',
        icon: '🧤',
        side: 'right',
        recommendedSet: 'Beyond the Chill',
        godLineKey: 'BOSS_DMG_BOOST',
        godLineName: 'Tăng sát thương lên Thủ lĩnh (Boss DMG Boost)',
        requiredAttunementKey: 'UMBRELLA_PROJECTILE_BOOST',
        requiredAttunementName: 'Tăng ST Kỹ năng chủ lực (+4.2%~7.0%)'
    }
];

export interface StatOption {
    key: string;
    labelVi: string;
    labelEn: string;
    group: StatGroupTier;
    specGroups?: Record<string, StatGroupTier>;
    defaultVal: number;
    unit: string;
    crossSpecHint?: string;
}

export const stripHardcodedTierPrefix = (rawLabel: string): string => {
    if (!rawLabel) return '';
    return rawLabel
        .replace(/^(🌟|⚔️|💪|🎯|💥|🔥|🌪️|🕸️|⚡|🌀|⚠️|❌|🗑️|🔔|🎋|🪨|🛡️)\s*/g, '')
        .replace(/^\[T[0-3](\/T[0-3])?\]\s*/i, '')
        .replace(/^(🌟|⚔️|💪|🎯|💥|🔥|🌪️|🕸️|⚡|🌀|⚠️|❌|🗑️|🔔|🎋|🪨|🛡️)\s*/g, '')
        .trim();
};

export const TIER_BADGE_PREFIX: Record<StatGroupTier, string> = {
    T0: '🌟 [T0]',
    T1: '⚔️ [T1]',
    T2: '🌪️ [T2]',
    T3: '❌ [T3]'
};

export const DEFAULT_STAT_OPTIONS: StatOption[] = [
    { key: 'ART_UMBRELLA_BOOST', labelVi: 'Võ học Vũ khí chính tăng sát thương (Martial Art Boost)', labelEn: 'Martial Art Skill Boost', group: 'T0', defaultVal: 6.7, unit: '%' },
    { key: 'ALL_MARTIAL_ARTS_BOOST', labelVi: 'Tất cả võ học tăng sát thương (All Martial Arts Boost)', labelEn: 'All Martial Arts Boost', group: 'T0', defaultVal: 4.8, unit: '%' },
    { key: 'BOSS_DMG_BOOST', labelVi: 'Tăng sát thương lên Thủ lĩnh (Combat Boost vs Boss)', labelEn: 'Combat Boost Against Boss Units', group: 'T0', defaultVal: 5.2, unit: '%' },
    { key: 'MAX_PHYS_ATK', labelVi: 'Công kích Ngoại công tối đa (Max Physical Attack)', labelEn: 'Max Physical Attack', group: 'T1', defaultVal: 85.0, unit: '' },
    { key: 'POWER', labelVi: 'Lực / Sức mạnh (Power / STR)', labelEn: 'Power', group: 'T1', defaultVal: 47.0, unit: '' },
    { key: 'PRECISION_RATE', labelVi: 'Tỷ lệ Chính xác (Precision Rate)', labelEn: 'Precision Rate', group: 'T1', defaultVal: 4.5, unit: '%' },
    { key: 'CRIT_RATE', labelVi: 'Tỷ lệ Chí mạng (Critical Rate)', labelEn: 'Critical Rate', group: 'T1', defaultVal: 4.2, unit: '%' },
    { key: 'MYSTIC_DMG_23', labelVi: 'Tăng ST Kỳ thuật (Mystic Skill DMG Boost)', labelEn: 'Mystic Skill DMG Boost', group: 'T1', defaultVal: 6.0, unit: '%' },
    { key: 'AFFINITY_RATE', labelVi: 'Tỉ lệ Hiểu ý (Affinity Rate)', labelEn: 'Affinity Rate', group: 'T1', defaultVal: 4.0, unit: '%', crossSpecHint: 'Chỉ số T1 của Cửu Kiếm / Xuất Huyết / Phá Trúc' },
    { key: 'AGILITY', labelVi: 'Nhanh nhẹn / Mẫn (Agility / AGI)', labelEn: 'Agility', group: 'T2', defaultVal: 47.3, unit: '' },
    { key: 'MOMENTUM', labelVi: 'Thế (Momentum / BAS)', labelEn: 'Momentum', group: 'T2', defaultVal: 44.6, unit: '' },
    { key: 'FORMLESS_ATK', labelVi: 'Tấn công vô hình tối đa / Vô Tướng (Formless Attack)', labelEn: 'Formless Attack', group: 'T2', defaultVal: 41.5, unit: '' },
    { key: 'MIN_PHYS_ATK', labelVi: 'Công kích Ngoại công tối thiểu (Min Physical Attack)', labelEn: 'Min Physical Attack', group: 'T2', defaultVal: 45.0, unit: '' },
    { key: 'MIN_SILKBIND_ATK', labelVi: 'Tấn công Khiên Ty nhỏ nhất (Min Silkbind Attack)', labelEn: 'Min Silkbind Attack', group: 'T2', defaultVal: 40.0, unit: '', crossSpecHint: 'Thuộc hệ Khiên Ty / Kéo Tơ' },
    { key: 'MAX_SILKBIND_ATK', labelVi: 'Tấn công Khiên Ty tối đa (Max Silkbind Attack)', labelEn: 'Max Silkbind Attack', group: 'T2', defaultVal: 42.0, unit: '', crossSpecHint: 'Thuộc hệ Khiên Ty / Kéo Tơ' },
    { key: 'BELLSTRIKE_ATK', labelVi: 'Tấn công Minh Kim (Bellstrike Attack)', labelEn: 'Bellstrike Attack', group: 'T2', defaultVal: 42.0, unit: '', crossSpecHint: 'Thuộc hệ Minh Kim / Tiếng Chuông Vang' },
    { key: 'BAMBOOCUT_ATK', labelVi: 'Tấn công Phá Trúc (Bamboocut Attack)', labelEn: 'Bamboocut Attack', group: 'T2', defaultVal: 42.0, unit: '', crossSpecHint: 'Thuộc hệ Phá Trúc / Phá Tre' },
    { key: 'STONESPLIT_ATK', labelVi: 'Tấn công Liệt Thạch (Stonesplit Attack)', labelEn: 'Stonesplit Attack', group: 'T2', defaultVal: 42.0, unit: '', crossSpecHint: 'Thuộc hệ Liệt Thạch / Xé Đá' },
    { key: 'DEFENSE_HP_BODY', labelVi: 'Thể phách / Phòng ngự / Khí huyết (CON / DEF / HP)', labelEn: 'HP / Body / Defense', group: 'T3', defaultVal: 45.0, unit: '' },
];

// 🟢 THUẬT TOÁN XÁC ĐỊNH BẬC T0/T1/T2/T3 ĐỘNG THEO TỪNG HỆ PHÁI (HỖ TRỢ CẢ DÒNG MỚI THÊM)
export const resolveStatGroupForSpec = (stat: StatOption, specName: string): StatGroupTier => {
    // 1. Ưu tiên cấu hình do người dùng gán riêng cho nhánh võ học này
    if (stat.specGroups && stat.specGroups[specName]) {
        return stat.specGroups[specName];
    }

    const key = stat.key;
    const lowerLabel = (stat.labelVi || '').toLowerCase();

    const isSilkbind = specName.includes('Kéo Tơ') || specName.includes('Khiên Ty');
    const isSilkbindJadeDame = isSilkbind && specName.includes('Dame');
    const isBellstrike = specName.includes('Tiếng Chuông') || specName.includes('Chung Minh') || specName.includes('Minh Kim');
    const isCuuKiem = specName.includes('Cửu Kiếm');
    const isStonesplit = specName.includes('Xé Đá') || specName.includes('Liệt Thạch');
    const isTankOrHeal = specName.includes('Tank') || specName.includes('Heal') || specName.includes('Buff');
    const isBamboocut = specName.includes('Phá Tre') || specName.includes('Phá Trúc');

    // Nếu là dòng T0 gốc hoặc được người dùng tạo mới với nhóm T0
    if (stat.group === 'T0' || key === 'ART_UMBRELLA_BOOST' || key === 'ALL_MARTIAL_ARTS_BOOST' || key === 'BOSS_DMG_BOOST') {
        return 'T0';
    }

    if (key === 'AFFINITY_RATE' || lowerLabel.includes('hiểu ý') || lowerLabel.includes('affinity')) {
        if (isSilkbindJadeDame) return 'T3';
        if (isBellstrike || isBamboocut || specName.includes('Buff')) return 'T1';
        return 'T2';
    }

    if (key === 'MOMENTUM' || lowerLabel.startsWith('thế ') || lowerLabel.includes('momentum')) {
        if (isCuuKiem || isBellstrike || isStonesplit) return 'T1';
        return 'T2';
    }

    if (key === 'BELLSTRIKE_ATK' || lowerLabel.includes('minh kim') || lowerLabel.includes('bellstrike') || lowerLabel.includes('tiếng chuông')) {
        return isBellstrike ? 'T1' : 'T3';
    }

    if (key === 'STONESPLIT_ATK' || lowerLabel.includes('liệt thạch') || lowerLabel.includes('stonesplit') || lowerLabel.includes('xé đá')) {
        return isStonesplit ? 'T1' : 'T3';
    }

    if (key === 'BAMBOOCUT_ATK' || lowerLabel.includes('phá trúc') || lowerLabel.includes('bamboocut') || lowerLabel.includes('phá tre')) {
        return isBamboocut ? 'T1' : 'T3';
    }

    if (key === 'MIN_SILKBIND_ATK' || key === 'MAX_SILKBIND_ATK' || lowerLabel.includes('khiên ty') || lowerLabel.includes('kéo tơ') || lowerLabel.includes('silkbind')) {
        if (!isSilkbind) return 'T3';
        return isSilkbindJadeDame ? 'T2' : 'T1';
    }

    if (key === 'DEFENSE_HP_BODY' || lowerLabel.includes('thể phách') || lowerLabel.includes('phòng ngự') || lowerLabel.includes('khí huyết')) {
        return isTankOrHeal ? 'T1' : 'T3';
    }

    if (key === 'MIN_PHYS_ATK' || lowerLabel.includes('ngoại công tối thiểu') || lowerLabel.includes('min physical')) {
        return isSilkbindJadeDame ? 'T3' : 'T2';
    }

    return stat.group || 'T1';
};

// 🎯 BỂ 6 DÒNG CHUYỂN ÂM (RETUNE POOL) CHUẨN IN-GAME THEO HỆ PHÁI (TUYỆT ĐỐI KHÔNG CÓ DÒNG T0)
export interface RetunePoolItem {
    statKey: string;
    nameVi: string;
    rangeText: string;
}

const getRetunePoolForSpec = (specName: string): RetunePoolItem[] => {
    const isBellstrike = specName.includes('Tiếng Chuông') || specName.includes('Chung Minh') || specName.includes('Minh Kim');
    const isBamboocut = specName.includes('Phá Tre') || specName.includes('Phá Trúc');
    const isStonesplit = specName.includes('Xé Đá') || specName.includes('Liệt Thạch');

    if (isBellstrike) {
        return [
            { statKey: 'MAX_PHYS_ATK', nameVi: 'Công kích Ngoại công tối đa', rangeText: '+45.3~90.6' },
            { statKey: 'AFFINITY_RATE', nameVi: 'Tỷ lệ Hiểu ý / Bạo kích', rangeText: '+5.2%~10.4%' },
            { statKey: 'POWER', nameVi: 'Lực', rangeText: '+28.7~57.4' },
            { statKey: 'MOMENTUM', nameVi: 'Thế', rangeText: '+28.7~57.4' },
            { statKey: 'BELLSTRIKE_ATK', nameVi: 'Công kích Minh Kim tối đa', rangeText: '+25.7~51.4' },
            { statKey: 'MIN_PHYS_ATK', nameVi: 'Công kích Ngoại công tối thiểu', rangeText: '+45.3~90.6' },
        ];
    }

    if (isBamboocut) {
        return [
            { statKey: 'MAX_PHYS_ATK', nameVi: 'Công kích Ngoại công tối đa', rangeText: '+45.3~90.6' },
            { statKey: 'CRIT_RATE', nameVi: 'Tỷ lệ Bạo kích', rangeText: '+5.2%~10.4%' },
            { statKey: 'POWER', nameVi: 'Lực', rangeText: '+28.7~57.4' },
            { statKey: 'AGILITY', nameVi: 'Mẫn', rangeText: '+28.7~57.4' },
            { statKey: 'BAMBOOCUT_ATK', nameVi: 'Công kích Phá Trúc tối đa', rangeText: '+25.7~51.4' },
            { statKey: 'MIN_PHYS_ATK', nameVi: 'Công kích Ngoại công tối thiểu', rangeText: '+45.3~90.6' },
        ];
    }

    if (isStonesplit) {
        return [
            { statKey: 'MAX_PHYS_ATK', nameVi: 'Công kích Ngoại công tối đa', rangeText: '+45.3~90.6' },
            { statKey: 'CRIT_RATE', nameVi: 'Tỷ lệ Bạo kích', rangeText: '+5.2%~10.4%' },
            { statKey: 'POWER', nameVi: 'Lực', rangeText: '+28.7~57.4' },
            { statKey: 'DEFENSE_HP_BODY', nameVi: 'Thể / Thế', rangeText: '+28.7~57.4' },
            { statKey: 'STONESPLIT_ATK', nameVi: 'Công kích Liệt Thạch tối đa', rangeText: '+25.7~51.4' },
            { statKey: 'MIN_PHYS_ATK', nameVi: 'Công kích Ngoại công tối thiểu', rangeText: '+45.3~90.6' },
        ];
    }

    // Mặc định nhánh Khiên Ty / Kéo Tơ (Chuẩn 100% theo ảnh chụp màn hình Chuyển âm)
    return [
        { statKey: 'MIN_PHYS_ATK', nameVi: 'Công kích Ngoại công tối thiểu', rangeText: '+45.3~90.6' },
        { statKey: 'MAX_PHYS_ATK', nameVi: 'Công kích Ngoại công tối đa', rangeText: '+45.3~90.6' },
        { statKey: 'MAX_SILKBIND_ATK', nameVi: 'Công kích Khiên Ty tối đa', rangeText: '+25.7~51.4' },
        { statKey: 'CRIT_RATE', nameVi: 'Tỷ lệ Bạo kích', rangeText: '+5.2%~10.4%' },
        { statKey: 'POWER', nameVi: 'Lực', rangeText: '+28.7~57.4' },
        { statKey: 'AGILITY', nameVi: 'Mẫn', rangeText: '+28.7~57.4' },
    ];
};

export interface AttunementOption {
    key: string;
    labelVi: string;
    labelEn: string;
    side: 'left' | 'right' | 'both';
    isBiS: boolean;
    trapWarning?: string;
}

export const DEFAULT_ATTUNEMENT_OPTIONS: AttunementOption[] = [
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
        trapWarning: 'BẪY ĐỊNH ÂM: Quạt chỉ dùng dựng Tường Gió & gắn debuff [Lingering Bone], không dồn định âm vào Quạt!'
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
        labelVi: '🚨 [BẪY] Định âm nhánh Silkbind: Wings (Trống Eo + Quạt)',
        labelEn: 'Trap: Silkbind Wings Attunement',
        side: 'both',
        isBiS: false,
        trapWarning: 'NHẦM NHÁNH: Đây là định âm của nhánh Trống Eo, 0% tác dụng cho Cửu Trùng Xuân Sắc!'
    }
];

export interface TalentCardMeta {
    badgeText: string;
    statTitle: string;
    linkedStatKey: string;
    recommendedLines: number;
    reqLabel: string;
    noteTemplate: string;
}

export interface SpecTalentsTemplate {
    t1: TalentCardMeta;
    t2: TalentCardMeta;
    t3: TalentCardMeta;
    defaultVals: {
        val1: number; req1: number; req1_23: number;
        val2: number; req2: number;
        val3: number; req3: number; req3_23: number;
    };
}

const getDefaultSpecTalentsTemplate = (specName: string): SpecTalentsTemplate => {
    if (specName.includes('Tiếng Chuông') || specName.includes('Chung Minh') || specName.includes('Minh Kim')) {
        return {
            t1: {
                badgeText: 'THIÊN PHÚ 1 · TĂNG SÁT THƯƠNG KỸ NĂNG / HIỂU Ý',
                statTitle: 'Lực / Thế (Power / Momentum)',
                linkedStatKey: 'MOMENTUM',
                recommendedLines: 3,
                reqLabel: 'Mốc yêu cầu:',
                noteTemplate: 'Ưu tiên giữ đủ mốc Thế / Lực & Tỉ lệ Hiểu ý (T1) để kích tối đa Thiên phú hệ Minh Kim.'
            },
            t2: {
                badgeText: 'THIÊN PHÚ 2 · KÍCH HOẠT NGOẠI CÔNG MINH KIM',
                statTitle: 'Ngoại Công Tối Đa (Max Physical)',
                linkedStatKey: 'MAX_PHYS_ATK',
                recommendedLines: 8,
                reqLabel: 'Đỉnh mùa:',
                noteTemplate: 'Tối đa hóa Ngoại công tối đa & Hiểu ý trên cả 8 món.'
            },
            t3: {
                badgeText: 'THIÊN PHÚ 3 · XUYÊN THẤU MINH KIM (BELLSTRIKE)',
                statTitle: 'Tấn Công Minh Kim (Bellstrike Attr)',
                linkedStatKey: 'BELLSTRIKE_ATK',
                recommendedLines: 2,
                reqLabel: 'Mốc yêu cầu:',
                noteTemplate: 'Ưu tiên lắp Kho Vũ Khí (Arsenal) hệ Minh Kim để lấy điểm thuộc tính cộng thẳng.'
            },
            defaultVals: { val1: 360, req1: 300, req1_23: 365, val2: 2450, req2: 1800, val3: 460, req3: 352, req3_23: 440 }
        };
    }

    if (specName.includes('Xé Đá') || specName.includes('Liệt Thạch')) {
        return {
            t1: {
                badgeText: 'THIÊN PHÚ 1 · KIÊN ĐỊNH & GIẢM THƯƠNG / BẠO KÍCH',
                statTitle: 'Thể Phách / Phòng Ngự (Body / CON)',
                linkedStatKey: 'DEFENSE_HP_BODY',
                recommendedLines: 3,
                reqLabel: 'Mốc yêu cầu:',
                noteTemplate: 'Hệ Liệt Thạch chuyển hóa Thể phách / Phòng ngự thành hiệu ứng Thiên phú 1.'
            },
            t2: {
                badgeText: 'THIÊN PHÚ 2 · UY LỰC TRỌNG BINH',
                statTitle: 'Lực / Ngoại Công (Power / Phys)',
                linkedStatKey: 'POWER',
                recommendedLines: 5,
                reqLabel: 'Đỉnh mùa:',
                noteTemplate: 'Đảm bảo đủ mốc Lực / Ngoại công để kích hoạt tối đa sát thương trọng kích.'
            },
            t3: {
                badgeText: 'THIÊN PHÚ 3 · XUYÊN THẤU LIỆT THẠCH (STONESPLIT)',
                statTitle: 'Tấn Công Liệt Thạch (Stonesplit Attr)',
                linkedStatKey: 'STONESPLIT_ATK',
                recommendedLines: 2,
                reqLabel: 'Mốc yêu cầu:',
                noteTemplate: 'Ưu tiên lắp Kho Vũ Khí (Arsenal) hệ Liệt Thạch để lấy điểm thuộc tính cộng thẳng.'
            },
            defaultVals: { val1: 380, req1: 300, req1_23: 365, val2: 1600, req2: 1000, val3: 450, req3: 352, req3_23: 440 }
        };
    }

    if (specName.includes('Phá Tre') || specName.includes('Phá Trúc')) {
        return {
            t1: {
                badgeText: 'THIÊN PHÚ 1 · TỐC ĐÁNH & BẠO KÍCH LIÊN HOÀN',
                statTitle: 'Nhanh Nhẹn / Mẫn (Agility / AGI)',
                linkedStatKey: 'AGILITY',
                recommendedLines: 3,
                reqLabel: 'Mốc yêu cầu:',
                noteTemplate: 'Giữ đủ mốc Nhanh nhẹn / Mẫn để đạt 100% Thiên phú 1 của hệ Phá Trúc.'
            },
            t2: {
                badgeText: 'THIÊN PHÚ 2 · SÁT THƯƠNG TRUY KÍCH',
                statTitle: 'Ngoại Công / Hiểu Ý (Physical / Affinity)',
                linkedStatKey: 'MAX_PHYS_ATK',
                recommendedLines: 8,
                reqLabel: 'Đỉnh mùa:',
                noteTemplate: 'Dồn dòng Ngoại công tối đa, Chí mạng & Hiểu ý để tối ưu sát thương chuỗi combo.'
            },
            t3: {
                badgeText: 'THIÊN PHÚ 3 · XUYÊN THẤU PHÁ TRÚC (BAMBOOCUT)',
                statTitle: 'Tấn Công Phá Trúc (Bamboocut Attr)',
                linkedStatKey: 'BAMBOOCUT_ATK',
                recommendedLines: 2,
                reqLabel: 'Mốc yêu cầu:',
                noteTemplate: 'Ưu tiên lắp Kho Vũ Khí (Arsenal) hệ Phá Trúc để lấy điểm thuộc tính cộng thẳng.'
            },
            defaultVals: { val1: 385, req1: 300, req1_23: 365, val2: 1850, req2: 1200, val3: 465, req3: 352, req3_23: 440 }
        };
    }

    return {
        t1: {
            badgeText: 'THIÊN PHÚ 1 · DIRECT CRIT (+9.1%)',
            statTitle: 'Nhanh Nhẹn / Mẫn (Agility)',
            linkedStatKey: 'AGILITY',
            recommendedLines: 3,
            reqLabel: 'Mốc yêu cầu:',
            noteTemplate: 'Khuyến nghị giữ 3 dòng Nhanh nhẹn / Mẫn trên đồ (Vũ khí phụ, Nón, Hộ uyển).'
        },
        t2: {
            badgeText: 'THIÊN PHÚ 2 · +36% PROJECTILE CRIT DMG',
            statTitle: 'Ngoại Công Tối Thiểu (Min Phys)',
            linkedStatKey: 'MIN_PHYS_ATK',
            recommendedLines: 0,
            reqLabel: 'Đỉnh mùa:',
            noteTemplate: 'Khi đã đạt đỉnh mùa 750 thì không cần lấy thêm dòng Min Physical trên đồ.'
        },
        t3: {
            badgeText: 'THIÊN PHÚ 3 · +23.6 XUYÊN THẤU KHIÊN TY',
            statTitle: 'Khiên Ty Nhỏ Nhất (Min Silkbind)',
            linkedStatKey: 'MIN_SILKBIND_ATK',
            recommendedLines: 0,
            reqLabel: 'Mốc yêu cầu:',
            noteTemplate: 'Ưu tiên số 1: Dùng Kho Vũ Khí (Arsenal) để lấy điểm cộng thẳng.'
        },
        defaultVals: { val1: 381, req1: 300, req1_23: 365, val2: 1513.2, req2: 750, val3: 469.9, req3: 352, req3_23: 440 }
    };
};

export interface TuningLine {
    statKey: string;
    value: number;
}

export interface GearItem {
    slot: SlotKey;
    name: string;
    weaponType?: string;
    tier: number;
    gearSet: string;
    slot1: TuningLine;
    tuningLines: TuningLine[];
    retunedLineIndex?: number | null;
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
    resistanceRate?: number; // 15 | 30 | 45 | 65 | 85 (%)
    rawPrecisionRate?: number;
    precisionRate: number;   // Không khóa trần 100% để thấy rõ số % bị thừa!
    rawCritRate?: number;
    critRate: number;
    rawAffinityRate?: number;
    affinityRate: number;
    directCritRate?: number;
    directAffinityRate?: number;
    simulate23: boolean;
    agiThreshold23: number;
    silkThreshold23: number;
    arsenal96Active: boolean;
    customTalentsMeta?: {
        t1: TalentCardMeta;
        t2: TalentCardMeta;
        t3: TalentCardMeta;
    };
}

const DEFAULT_BASELINE: CharacterBaseline = {
    agility: 381,
    reqAgility: 300,
    minPhysical: 1513.2,
    reqMinPhysical: 750,
    minSilkbind: 469.9,
    reqMinSilkbind: 352,
    resistanceRate: 85,      // Chuẩn Lv. 18/19 (Lv. 100): 85% Resistance
    rawPrecisionRate: 134.5,
    precisionRate: 100.4,    // 134.5 / 1.34 = 100.4% (Thừa 0.4%)
    rawCritRate: 117.6,
    critRate: 63.6,          // 117.6 / 1.85 = 63.6%
    rawAffinityRate: 37.6,
    affinityRate: 20.3,      // 37.6 / 1.85 = 20.3%
    directCritRate: 9.2,
    directAffinityRate: 0.0,
    simulate23: false,
    agiThreshold23: 365,
    silkThreshold23: 440,
    arsenal96Active: true
};

const getDefaultWeaponForSpec = (specName: string, slot: SlotKey): string => {
    if (slot !== 'umbrella' && slot !== 'fan') return '';
    if (specName.includes('Cửu Kiếm') || specName.includes('Vô Danh') || specName.includes('Minh Kim')) {
        return slot === 'umbrella' ? 'SWORD' : 'SPEAR';
    }
    if (specName.includes('Xé Đá') || specName.includes('Liệt Thạch')) {
        return slot === 'umbrella' ? 'MO_BLADE' : 'SPEAR';
    }
    if (specName.includes('Song Đao')) {
        return slot === 'umbrella' ? 'DUAL_BLADES' : 'ROPE_DART';
    }
    if (specName.includes('Quyền')) {
        return slot === 'umbrella' ? 'GAUNTLETS' : 'ROPE_DART';
    }
    return slot === 'umbrella' ? 'UMBRELLA' : 'FAN';
};

const createSampleBiSGear = (slot: SlotKey, specName = ""): GearItem => {
    const meta = SLOTS_CONFIG.find(s => s.key === slot)!;
    return {
        slot,
        name: `${meta.labelVi} Bậc 100`,
        weaponType: getDefaultWeaponForSpec(specName, slot),
        tier: 100,
        gearSet: meta.side === 'left' ? 'Mistwillow' : 'BeyondTheChill',
        slot1: {
            statKey: 'MAX_PHYS_ATK',
            value: 85.0
        },
        tuningLines: [
            { statKey: slot === 'fan' || slot === 'helm' || slot === 'bracers' ? 'AGILITY' : 'PRECISION_RATE', value: slot === 'fan' || slot === 'helm' || slot === 'bracers' ? 47.3 : 4.5 },
            { statKey: meta.godLineKey || 'POWER', value: meta.godLineKey ? 6.7 : 47.0 },
            { statKey: 'CRIT_RATE', value: 4.2 },
            { statKey: 'MAX_PHYS_ATK', value: 85.0 }
        ],
        retunedLineIndex: null,
        attunementKey: meta.requiredAttunementKey,
        attunementValue: 10.7
    };
};

const createBlankGear = (slot: SlotKey, specName = ""): GearItem => {
    const meta = SLOTS_CONFIG.find(s => s.key === slot)!;
    return {
        slot,
        name: `${meta.labelVi} (Chưa nhập)`,
        weaponType: getDefaultWeaponForSpec(specName, slot),
        tier: 100,
        gearSet: meta.side === 'left' ? 'Mistwillow' : 'BeyondTheChill',
        slot1: { statKey: 'FORMLESS_ATK', value: 0 },
        tuningLines: [
            { statKey: 'AGILITY', value: 0 },
            { statKey: 'MAX_PHYS_ATK', value: 0 },
            { statKey: 'MOMENTUM', value: 0 },
            { statKey: 'CRIT_RATE', value: 0 }
        ],
        retunedLineIndex: null,
        attunementKey: meta.requiredAttunementKey,
        attunementValue: 0
    };
};

const normalizeGearItemLines = (item: GearItem): GearItem => {
    const lines = Array.isArray(item.tuningLines) && item.tuningLines.length > 0
        ? [...item.tuningLines]
        : [
            { statKey: 'AGILITY', value: 0 },
            { statKey: 'MAX_PHYS_ATK', value: 0 },
            { statKey: 'MOMENTUM', value: 0 },
            { statKey: 'CRIT_RATE', value: 0 }
        ];
    return {
        ...item,
        tuningLines: lines,
        retunedLineIndex: typeof item.retunedLineIndex === 'number' && item.retunedLineIndex < lines.length ? item.retunedLineIndex : null
    };
};

export default function WwmBuildsTab({ wwmBuilds, wwmData, danhLuc, session }: Props) {
    // 1. KÉO TRỰC TIẾP VO_HOC_LIST TỪ FIREBASE
    const voHocList: string[] = useMemo(() => {
        const rawList = wwmData?.VO_HOC_LIST;
        if (!rawList) return [];
        if (Array.isArray(rawList)) {
            return rawList.filter(Boolean).map(String);
        }
        if (typeof rawList === 'object') {
            return Object.keys(rawList)
                .sort((a, b) => Number(a) - Number(b))
                .map(k => String(rawList[k]))
                .filter(Boolean);
        }
        return [];
    }, [wwmData]);

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

    const [selectedSpec, setSelectedSpec] = useState<string>("");
    const [viewingUserId, setViewingUserId] = useState<string>(currentUserId);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [editorMode, setEditorMode] = useState<'edit_equipped' | 'compare_new'>('edit_equipped');

    useEffect(() => {
        if (voHocList.length === 0) return;
        if (typeof window !== 'undefined') {
            try {
                const targetSpec = sessionStorage.getItem('wwm_target_spec');
                const targetUser = sessionStorage.getItem('wwm_target_user');
                if (targetSpec && voHocList.includes(targetSpec)) {
                    setSelectedSpec(targetSpec);
                    if (targetUser) setViewingUserId(targetUser);
                    sessionStorage.removeItem('wwm_target_spec');
                    sessionStorage.removeItem('wwm_target_user');
                    return;
                }
            } catch {}
        }
        if (selectedSpec && voHocList.includes(selectedSpec)) return;

        const userClass = danhLuc?.[currentUserId]?.class;
        if (userClass && voHocList.includes(userClass)) {
            setSelectedSpec(userClass);
        } else {
            setSelectedSpec(voHocList[0]);
        }
    }, [danhLuc, currentUserId, voHocList, selectedSpec]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                if (sessionStorage.getItem('wwm_target_user')) return;
            } catch {}
        }
        setViewingUserId(currentUserId);
    }, [currentUserId]);

    // 2. KÉO TRỰC TIẾP TAM_PHAP_MAP TỪ FIREBASE
    const tamPhapList: TamPhapOption[] = useMemo(() => {
        const rawMap = wwmData?.TAM_PHAP_MAP || {};
        const list: TamPhapOption[] = [];

        Object.entries(rawMap).forEach(([id, val]: any) => {
            if (!val) return;
            let vi = "";
            let en = "";
            if (typeof val === 'string') {
                vi = val;
            } else if (typeof val === 'object') {
                vi = val.vi || "";
                en = val.en || "";
            }
            const display = vi && en ? `${vi} (${en})` : (vi || en || id);
            list.push({ id, vi, en, display });
        });

        const defaults = [
            { id: 'MORALE_CHANT', vi: 'Dịch Thủy Ca', en: 'Morale Chant' },
            { id: 'BLOSSOM_BARRAGE', vi: 'Hoa Vũ Mãn Thiên', en: 'Blossom Barrage' },
            { id: 'STAR_REACHER', vi: 'Vượt đất hái sao / Trích Tinh', en: 'Star Reacher' },
            { id: 'THUNDEROUS_BLOOM', vi: 'Chương sấm xuân / Xuân Lôi Nhất Nộ', en: 'Thunderous Bloom' },
            { id: 'FIVEFOLD_BLEED', vi: 'Ngũ Trùng Xuất Huyết', en: 'Fivefold Bleed' },
            { id: 'BREAKING_POINT', vi: 'Phá Cực', en: 'Breaking Point' },
        ];
        defaults.forEach(d => {
            const exists = list.some(
                item => item.en.toLowerCase() === d.en.toLowerCase() || item.vi.toLowerCase() === d.vi.toLowerCase()
            );
            if (!exists) {
                list.push({ id: d.id, vi: d.vi, en: d.en, display: `${d.vi} (${d.en})` });
            }
        });

        return list.sort((a, b) => a.display.localeCompare(b.display, 'vi'));
    }, [wwmData]);

    // 🟢 3. HỢP NHẤT & SẮP XẾP TỰ ĐỘNG DÒNG TẨY LUYỆN THEO ĐÚNG THỨ TỰ T0 ➔ T1 ➔ T2 ➔ T3 CỦA NHÁNH VÕ HỌC ĐANG MỞ
    const statOptions: StatOption[] = useMemo(() => {
        const customMap = wwmData?.CUSTOM_TUNING_STATS || {};
        const deletedKeys: string[] = Array.isArray(wwmData?.DELETED_TUNING_STATS) ? wwmData.DELETED_TUNING_STATS : [];

        const merged = DEFAULT_STAT_OPTIONS
            .filter(item => !deletedKeys.includes(item.key))
            .map(item => {
                const custom = customMap[item.key];
                if (custom) {
                    return {
                        ...item,
                        ...custom,
                        labelVi: stripHardcodedTierPrefix(custom.labelVi || item.labelVi),
                        specGroups: custom.specGroups || item.specGroups || {}
                    };
                }
                return {
                    ...item,
                    labelVi: stripHardcodedTierPrefix(item.labelVi),
                    specGroups: item.specGroups || {}
                };
            });

        Object.entries(customMap).forEach(([k, val]: any) => {
            if (!deletedKeys.includes(k) && !merged.some(m => m.key === k) && val && typeof val === 'object') {
                merged.push({
                    key: k,
                    labelVi: stripHardcodedTierPrefix(val.labelVi || k),
                    labelEn: val.labelEn || k,
                    group: val.group || 'T1',
                    specGroups: val.specGroups || {},
                    defaultVal: Number(val.defaultVal) || 30,
                    unit: val.unit || '',
                    crossSpecHint: val.crossSpecHint || ''
                });
            }
        });

        // Sắp xếp nghiêm ngặt: T0 lên đầu ➔ T1 ➔ T2 ➔ T3 xuống cuối theo đúng hệ Võ Học đang chọn
        return [...merged].sort((a, b) => {
            const tierA = resolveStatGroupForSpec(a, selectedSpec);
            const tierB = resolveStatGroupForSpec(b, selectedSpec);
            const diff = TIER_SORT_WEIGHT[tierA] - TIER_SORT_WEIGHT[tierB];
            if (diff !== 0) return diff;
            return a.labelVi.localeCompare(b.labelVi, 'vi');
        });
    }, [wwmData, selectedSpec]);

    const attunementOptions: AttunementOption[] = useMemo(() => {
        const customAttMap = wwmData?.CUSTOM_ATTUNEMENTS || {};
        const merged = DEFAULT_ATTUNEMENT_OPTIONS.map(item => customAttMap[item.key] ? { ...item, ...customAttMap[item.key] } : item);
        Object.entries(customAttMap).forEach(([k, val]: any) => {
            if (!merged.some(m => m.key === k) && val && typeof val === 'object') {
                merged.push({
                    key: k,
                    labelVi: val.labelVi || k,
                    labelEn: val.labelEn || k,
                    side: val.side || 'both',
                    isBiS: Boolean(val.isBiS),
                    trapWarning: val.trapWarning || ''
                });
            }
        });
        return merged;
    }, [wwmData]);

    const gearSetOptions: GearSetOption[] = useMemo(() => {
        const customSets = wwmData?.CUSTOM_GEAR_SETS || {};
        const merged = DEFAULT_GEAR_SETS.map(item => customSets[item.key] ? { ...item, ...customSets[item.key] } : item);
        Object.entries(customSets).forEach(([k, val]: any) => {
            if (!merged.some(m => m.key === k) && val && typeof val === 'object') {
                merged.push({
                    key: k,
                    labelVi: val.labelVi || k,
                    labelEn: val.labelEn || k,
                    side: val.side || 'both',
                    warningText: val.warningText || ''
                });
            }
        });
        return merged;
    }, [wwmData]);

    const tierOptions: TierOption[] = useMemo(() => {
        const customTiers = wwmData?.CUSTOM_TIERS || {};
        const merged = DEFAULT_TIER_OPTIONS.map(item => customTiers[String(item.tier)] ? { ...item, ...customTiers[String(item.tier)] } : item);
        Object.entries(customTiers).forEach(([k, val]: any) => {
            const numTier = Number(k);
            if (!isNaN(numTier) && !merged.some(m => m.tier === numTier) && val && typeof val === 'object') {
                merged.push({
                    tier: numTier,
                    labelVi: val.labelVi || `🔥 Bậc ${numTier}`,
                    isArsenal: Boolean(val.isArsenal)
                });
            }
        });
        return merged.sort((a, b) => b.tier - a.tier);
    }, [wwmData]);

    // 🟢 HỢP NHẤT DANH SÁCH MỐC KHÁNG (RESISTANCE) TỪ FIREBASE (SẴN SÀNG CHO LV. 20, 21+)
    const resistanceOptions: ResistanceBracketOption[] = useMemo(() => {
        const customRes = wwmData?.CUSTOM_RESISTANCE_TIERS || {};
        const merged = DEFAULT_RESISTANCE_BRACKETS.map(item =>
            customRes[String(item.rate)] ? { ...item, ...customRes[String(item.rate)] } : item
        );
        Object.entries(customRes).forEach(([k, val]: any) => {
            const numRate = Number(k);
            if (!isNaN(numRate) && !merged.some(m => m.rate === numRate) && val && typeof val === 'object') {
                merged.push({
                    rate: numRate,
                    labelVi: val.labelVi || `Lv. Mới: ${numRate}% Resistance`
                });
            }
        });
        return merged.sort((a, b) => b.rate - a.rate);
    }, [wwmData]);

    const [editingResistanceItem, setEditingResistanceItem] = useState<ResistanceBracketOption>({
        rate: 105,
        labelVi: 'Lv. 20/21 (Lv. 105): 105% Resistance'
    });

    const handleSaveCustomResistance = async (e: React.FormEvent) => {
        e.preventDefault();
        const numRate = Number(editingResistanceItem.rate);
        if (isNaN(numRate) || numRate < 0) return;

        const newResObj: ResistanceBracketOption = {
            rate: numRate,
            labelVi: editingResistanceItem.labelVi.trim() || `Lv. Mới: ${numRate}% Resistance`
        };

        try {
            const currentRes = wwmData?.CUSTOM_RESISTANCE_TIERS || {};
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                CUSTOM_RESISTANCE_TIERS: { ...currentRes, [String(numRate)]: newResObj }
            }, { merge: true });
            alert(`✅ Đã lưu mốc kháng [${newResObj.labelVi}] lên Đám Mây cho toàn bang!`);
        } catch {
            alert("❌ Lỗi khi lưu mốc kháng cấp độ!");
        }
    };

    const weaponTypeOptions: WeaponTypeOption[] = useMemo(() => {
        const customWeapons = wwmData?.CUSTOM_WEAPON_TYPES || {};
        const merged = DEFAULT_WEAPON_TYPES.map(item => customWeapons[item.key] ? { ...item, ...customWeapons[item.key] } : item);
        Object.entries(customWeapons).forEach(([k, val]: any) => {
            if (!merged.some(m => m.key === k) && val && typeof val === 'object') {
                merged.push({
                    key: k,
                    labelVi: val.labelVi || k,
                    labelEn: val.labelEn || k,
                    icon: val.icon || '⚔️'
                });
            }
        });
        return merged;
    }, [wwmData]);

    const [showStatDictModal, setShowStatDictModal] = useState(false);
    const [dictTab, setDictTab] = useState<'tuning' | 'attunement' | 'gearset' | 'tier' | 'weapon' | 'vohoc' | 'tamphap'>('tuning');

    const [editingStatItem, setEditingStatItem] = useState<StatOption>({
        key: '', labelVi: '', labelEn: '', group: 'T1', specGroups: {}, defaultVal: 40, unit: '', crossSpecHint: ''
    });
    const [editingStatScope, setEditingStatScope] = useState<'current_spec' | 'all_specs'>('current_spec');

    const [editingAttuneItem, setEditingAttuneItem] = useState<AttunementOption>({
        key: '', labelVi: '', labelEn: '', side: 'both', isBiS: true, trapWarning: ''
    });
    const [editingSetItem, setEditingSetItem] = useState<GearSetOption>({
        key: '', labelVi: '', labelEn: '', side: 'both', warningText: ''
    });
    const [editingTierItem, setEditingTierItem] = useState<TierOption>({
        tier: 105, labelVi: '🔥 Bậc 105 (Mới)', isArsenal: false
    });
    const [editingWeaponItem, setEditingWeaponItem] = useState<WeaponTypeOption>({
        key: '', labelVi: '', labelEn: '', icon: '⚔️'
    });
    const [newVoHocName, setNewVoHocName] = useState("");
    const [editingVoHocIndex, setEditingVoHocIndex] = useState<number | null>(null);

    const [editingTamPhap, setEditingTamPhap] = useState<{ id: string; vi: string; en: string }>({
        id: '', vi: '', en: ''
    });
    const [tamPhapSearch, setTamPhapSearch] = useState("");

    const [isEditingTalentMeta, setIsEditingTalentMeta] = useState(false);

    const formatStatForSpec = (stat: StatOption, spec = selectedSpec): string => {
        const effGroup = resolveStatGroupForSpec(stat, spec);
        return `${TIER_BADGE_PREFIX[effGroup]} ${stat.labelVi}`;
    };

    const [baseline, setBaseline] = useState<CharacterBaseline>(DEFAULT_BASELINE);
    const [equipped, setEquipped] = useState<Record<SlotKey, GearItem>>(() => ({
        umbrella: createSampleBiSGear('umbrella'),
        fan: createSampleBiSGear('fan'),
        disc: createSampleBiSGear('disc'),
        pendant: createSampleBiSGear('pendant'),
        helm: createSampleBiSGear('helm'),
        chest: createSampleBiSGear('chest'),
        greaves: createSampleBiSGear('greaves'),
        bracers: createSampleBiSGear('bracers'),
    }));
    const [arsenal96, setArsenal96] = useState<GearItem[]>([]);
    const [innerWays, setInnerWays] = useState({
        slot1: { name: 'Dịch Thủy Ca (Morale Chant)', tier: 6 },
        slot2: { name: 'Hoa Vũ Mãn Thiên (Blossom Barrage)', tier: 6 },
        slot3: { name: 'Vượt đất hái sao (Star Reacher)', tier: 6 },
        slot4: { name: 'Chương sấm xuân (Thunderous Bloom)', tier: 5 },
        note: ''
    });

    const [activeSlot, setActiveSlot] = useState<SlotKey>('umbrella');
    const [candidateGear, setCandidateGear] = useState<GearItem>(() => createSampleBiSGear('umbrella'));
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const [geminiApiKey, setGeminiApiKey] = useState<string>("");
    const [geminiModel, setGeminiModel] = useState<string>("gemini-3.5-flash-lite");
    const [webhookUrl, setWebhookUrl] = useState<string>("");
    const [isScanning, setIsScanning] = useState(false);
    const [isSavingCloud, setIsSavingCloud] = useState(false);
    const [statusBanner, setStatusBanner] = useState<string | null>(null);

    // Tự động nạp Webhook chung từ Firebase nếu máy thành viên chưa nhập
    useEffect(() => {
        if (!webhookUrl && wwmData?.SHARED_DISCORD_WEBHOOK) {
            setWebhookUrl(wwmData.SHARED_DISCORD_WEBHOOK);
        }
    }, [wwmData?.SHARED_DISCORD_WEBHOOK, webhookUrl]);

    const loadedTimestampRef = useRef<string>("");

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setGeminiApiKey(localStorage.getItem('tl_gemini_key') || '');
            setGeminiModel(localStorage.getItem('tl_gemini_model') || 'gemini-3.5-flash-lite');
            setWebhookUrl(localStorage.getItem('tl_discord_webhook') || '');
        }
    }, []);

    const activeTalentsMeta = useMemo(() => {
        const specTemplateFromCloud = wwmData?.SPEC_TALENTS_MAP?.[selectedSpec];
        const fallbackTemplate = getDefaultSpecTalentsTemplate(selectedSpec);
        return {
            t1: baseline.customTalentsMeta?.t1 || specTemplateFromCloud?.t1 || fallbackTemplate.t1,
            t2: baseline.customTalentsMeta?.t2 || specTemplateFromCloud?.t2 || fallbackTemplate.t2,
            t3: baseline.customTalentsMeta?.t3 || specTemplateFromCloud?.t3 || fallbackTemplate.t3,
        };
    }, [wwmData, selectedSpec, baseline.customTalentsMeta]);

    useEffect(() => {
        if (!selectedSpec) return;
        const specDoc = wwmBuilds?.[selectedSpec];
        const userRecord = specDoc?.[viewingUserId];
        const cloudStamp = `${selectedSpec}__${viewingUserId}__${userRecord?.updatedAt || 'init'}`;

        // Nếu trên Cloud vừa có bản cập nhật mới từ Discord Bot (updatedAt thay đổi), lập tức đồng bộ vào Web!
        if (loadedTimestampRef.current === cloudStamp && hasUnsavedChanges) {
            return;
        }
        if (
            loadedTimestampRef.current &&
            loadedTimestampRef.current.startsWith(`${selectedSpec}__${viewingUserId}__`) &&
            loadedTimestampRef.current !== cloudStamp
        ) {
            setStatusBanner(`⚡ Đồng bộ trực tuyến từ Discord: Hồ sơ [${selectedSpec}] vừa được cập nhật mới!`);
            setTimeout(() => setStatusBanner(null), 5000);
        }
        loadedTimestampRef.current = cloudStamp;

        const specTemplate = wwmData?.SPEC_TALENTS_MAP?.[selectedSpec] || getDefaultSpecTalentsTemplate(selectedSpec);
        const specDefaultInnerWays = wwmData?.SPEC_INNER_WAYS_MAP?.[selectedSpec] || {
            slot1: { name: 'Dịch Thủy Ca (Morale Chant)', tier: 6 },
            slot2: { name: 'Hoa Vũ Mãn Thiên (Blossom Barrage)', tier: 6 },
            slot3: { name: 'Vượt đất hái sao (Star Reacher)', tier: 6 },
            slot4: { name: 'Chương sấm xuân (Thunderous Bloom)', tier: 5 },
            note: ''
        };

        const specDefaultBaseline: CharacterBaseline = {
            ...DEFAULT_BASELINE,
            agility: specTemplate.defaultVals?.val1 ?? 381,
            reqAgility: specTemplate.defaultVals?.req1 ?? 300,
            agiThreshold23: specTemplate.defaultVals?.req1_23 ?? 365,
            minPhysical: specTemplate.defaultVals?.val2 ?? 1513.2,
            reqMinPhysical: specTemplate.defaultVals?.req2 ?? 750,
            minSilkbind: specTemplate.defaultVals?.val3 ?? 469.9,
            reqMinSilkbind: specTemplate.defaultVals?.req3 ?? 352,
            silkThreshold23: specTemplate.defaultVals?.req3_23 ?? 440,
            customTalentsMeta: {
                t1: specTemplate.t1,
                t2: specTemplate.t2,
                t3: specTemplate.t3
            }
        };

        const normalizeEquippedMap = (rawEq: Record<SlotKey, GearItem>) => {
            const res: any = {};
            SLOTS_CONFIG.forEach(s => {
                res[s.key] = normalizeGearItemLines(rawEq?.[s.key] || createSampleBiSGear(s.key, selectedSpec));
            });
            return res as Record<SlotKey, GearItem>;
        };

        if (userRecord) {
            if (userRecord.baseline) setBaseline({ ...specDefaultBaseline, ...userRecord.baseline });
            else setBaseline(specDefaultBaseline);
            if (userRecord.equipped) setEquipped(prev => normalizeEquippedMap({ ...prev, ...userRecord.equipped }));
            if (Array.isArray(userRecord.arsenal96)) setArsenal96(userRecord.arsenal96);
            if (userRecord.innerWays) setInnerWays(prev => ({ ...specDefaultInnerWays, ...userRecord.innerWays }));
            else setInnerWays(specDefaultInnerWays);
            loadedTimestampRef.current = cloudStamp;
            setHasUnsavedChanges(false);
        } else if (typeof window !== 'undefined' && viewingUserId === currentUserId) {
            const localRaw = localStorage.getItem(`wwm_build_${selectedSpec}_${currentUserId}`);
            if (localRaw) {
                try {
                    const parsed = JSON.parse(localRaw);
                    if (parsed.baseline) setBaseline({ ...specDefaultBaseline, ...parsed.baseline });
                    if (parsed.equipped) setEquipped(prev => normalizeEquippedMap({ ...prev, ...parsed.equipped }));
                    if (Array.isArray(parsed.arsenal96)) setArsenal96(parsed.arsenal96);
                    if (parsed.innerWays) setInnerWays({ ...specDefaultInnerWays, ...parsed.innerWays });
                    loadedTimestampRef.current = cloudStamp;
                    return;
                } catch { }
            }
            setBaseline(specDefaultBaseline);
            setInnerWays(specDefaultInnerWays);
            setEquipped({
                umbrella: createSampleBiSGear('umbrella', selectedSpec),
                fan: createSampleBiSGear('fan', selectedSpec),
                disc: createSampleBiSGear('disc', selectedSpec),
                pendant: createSampleBiSGear('pendant', selectedSpec),
                helm: createSampleBiSGear('helm', selectedSpec),
                chest: createSampleBiSGear('chest', selectedSpec),
                greaves: createSampleBiSGear('greaves', selectedSpec),
                bracers: createSampleBiSGear('bracers', selectedSpec),
            });
            loadedTimestampRef.current = cloudStamp;
        }
    }, [wwmBuilds, wwmData, selectedSpec, viewingUserId, currentUserId, hasUnsavedChanges]);

    const updateBaselineField = (patch: Partial<CharacterBaseline>) => {
        setHasUnsavedChanges(true);
        setBaseline(prev => ({ ...prev, ...patch }));
    };

    const updateTalentCardMeta = (slot: 't1' | 't2' | 't3', patch: Partial<TalentCardMeta>) => {
        setHasUnsavedChanges(true);
        setBaseline(prev => ({
            ...prev,
            customTalentsMeta: {
                t1: slot === 't1' ? { ...activeTalentsMeta.t1, ...patch } : activeTalentsMeta.t1,
                t2: slot === 't2' ? { ...activeTalentsMeta.t2, ...patch } : activeTalentsMeta.t2,
                t3: slot === 't3' ? { ...activeTalentsMeta.t3, ...patch } : activeTalentsMeta.t3,
            }
        }));
    };

    const handleSaveSpecTalentTemplateToCloud = async () => {
        if (!selectedSpec) return;
        try {
            const currentMap = wwmData?.SPEC_TALENTS_MAP || {};
            const updatedSpecTemplate: SpecTalentsTemplate = {
                t1: activeTalentsMeta.t1,
                t2: activeTalentsMeta.t2,
                t3: activeTalentsMeta.t3,
                defaultVals: {
                    val1: baseline.agility,
                    req1: baseline.reqAgility || 300,
                    req1_23: baseline.agiThreshold23 || 365,
                    val2: baseline.minPhysical,
                    req2: baseline.reqMinPhysical || 750,
                    val3: baseline.minSilkbind,
                    req3: baseline.reqMinSilkbind || 352,
                    req3_23: baseline.silkThreshold23 || 440
                }
            };
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                SPEC_TALENTS_MAP: {
                    ...currentMap,
                    [selectedSpec]: updatedSpecTemplate
                }
            }, { merge: true });
            setIsEditingTalentMeta(false);
            alert(`✅ Đã lưu khung 3 Thiên Phú chuẩn cho hệ [${selectedSpec}] thành công!`);
        } catch {
            alert("❌ Không thể lưu mẫu Thiên Phú lên đám mây!");
        }
    };

    const handleSaveSpecInnerWaysTemplate = async () => {
        if (!selectedSpec) return;
        try {
            const currentMap = wwmData?.SPEC_INNER_WAYS_MAP || {};
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                SPEC_INNER_WAYS_MAP: {
                    ...currentMap,
                    [selectedSpec]: innerWays
                }
            }, { merge: true });
            alert(`✅ Đã lưu bộ 4 Tâm Pháp này làm gợi ý mặc định cho nhánh [${selectedSpec}]!`);
        } catch {
            alert("❌ Lỗi khi lưu mẫu Tâm Pháp cho hệ võ học!");
        }
    };

    const handleSaveTamPhapToMap = async (e: React.FormEvent) => {
        e.preventDefault();
        const viText = editingTamPhap.vi.trim();
        const enText = editingTamPhap.en.trim();
        if (!viText && !enText) {
            alert("Hãy nhập ít nhất Tên Tiếng Việt hoặc Tiếng Anh cho Tâm Pháp!");
            return;
        }

        let targetKey = editingTamPhap.id.trim();
        if (!targetKey) {
            const baseSlug = (enText || viText)
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/gi, 'd')
                .toUpperCase()
                .replace(/[^A-Z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '');
            targetKey = baseSlug || `TP_${Date.now()}`;
        }

        try {
            const currentTamPhapMap = wwmData?.TAM_PHAP_MAP || {};
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                TAM_PHAP_MAP: {
                    ...currentTamPhapMap,
                    [targetKey]: {
                        vi: viText || enText,
                        en: enText || viText
                    }
                }
            }, { merge: true });

            setEditingTamPhap({ id: '', vi: '', en: '' });
            alert(`✅ Đã lưu Tâm Pháp [${viText || enText}] vào TAM_PHAP_MAP trên Firebase!`);
        } catch {
            alert("❌ Lỗi khi lưu vào TAM_PHAP_MAP!");
        }
    };

    const activeEditingGear: GearItem = useMemo(() => {
        const raw = editorMode === 'edit_equipped' ? equipped[activeSlot] : candidateGear;
        return normalizeGearItemLines(raw);
    }, [editorMode, equipped, activeSlot, candidateGear]);

    const updateActiveEditingGear = (updater: (prev: GearItem) => GearItem) => {
        setHasUnsavedChanges(true);
        if (editorMode === 'edit_equipped') {
            setEquipped(prev => ({
                ...prev,
                [activeSlot]: normalizeGearItemLines(updater(normalizeGearItemLines(prev[activeSlot])))
            }));
        } else {
            setCandidateGear(prev => normalizeGearItemLines(updater(normalizeGearItemLines(prev))));
        }
    };

    const handleSelectSlot = (slot: SlotKey) => {
        setActiveSlot(slot);
        if (editorMode === 'compare_new') {
            setCandidateGear(createSampleBiSGear(slot, selectedSpec));
        }
    };

    const getSlotDisplayInfo = (slotMeta: SlotMeta, item?: GearItem) => {
        if (!slotMeta.isWeaponSlot) {
            return { icon: slotMeta.icon, title: slotMeta.labelVi };
        }
        const wKey = item?.weaponType || getDefaultWeaponForSpec(selectedSpec, slotMeta.key);
        const wObj = weaponTypeOptions.find(w => w.key === wKey);
        if (wObj) {
            return {
                icon: wObj.icon,
                title: `${slotMeta.labelVi} (${wObj.labelVi})`
            };
        }
        return { icon: slotMeta.icon, title: slotMeta.labelVi };
    };

    const handleSaveVoHocList = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newVoHocName.trim();
        if (!trimmed) return;

        let nextList = [...voHocList];
        if (editingVoHocIndex !== null && editingVoHocIndex >= 0 && editingVoHocIndex < nextList.length) {
            nextList[editingVoHocIndex] = trimmed;
        } else {
            if (nextList.includes(trimmed)) {
                alert("⚠️ Tên Võ Học này đã có trong danh sách!");
                return;
            }
            nextList.push(trimmed);
        }

        try {
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                VO_HOC_LIST: nextList
            }, { merge: true });
            setNewVoHocName("");
            setEditingVoHocIndex(null);
            alert(`✅ Đã cập nhật danh sách Võ Học thành công!`);
        } catch {
            alert("❌ Lỗi khi cập nhật danh sách Võ Học lên Firebase!");
        }
    };

    const handleDeleteVoHoc = async (idx: number) => {
        const target = voHocList[idx];
        if (!window.confirm(`Xóa nhánh võ học [${target}] khỏi danh sách?`)) return;
        const nextList = voHocList.filter((_, i) => i !== idx);
        try {
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                VO_HOC_LIST: nextList
            }, { merge: true });
        } catch {
            alert("❌ Lỗi khi xóa Võ Học!");
        }
    };

    // 🟢 LƯU DÒNG TẨY LUYỆN (TỰ ĐỘNG ĐƯA VỀ ĐÚNG THỨ TỰ T0 -> T1 -> T2 -> T3)
    const handleSaveCustomTuningStat = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanVi = stripHardcodedTierPrefix(editingStatItem.labelVi);
        if (!cleanVi) return;

        const safeKey = editingStatItem.key.trim()
            ? editingStatItem.key.trim().toUpperCase().replace(/\s+/g, '_')
            : `CUSTOM_${Date.now()}`;

        const existingStat = statOptions.find(s => s.key === safeKey);
        const nextSpecGroups: Record<string, StatGroupTier> = {
            ...(existingStat?.specGroups || {}),
            ...(editingStatItem.specGroups || {})
        };

        if (editingStatScope === 'current_spec' && selectedSpec) {
            nextSpecGroups[selectedSpec] = editingStatItem.group;
        } else if (editingStatScope === 'all_specs') {
            voHocList.forEach(vh => {
                nextSpecGroups[vh] = editingStatItem.group;
            });
        }

        const newStatObj: StatOption = {
            key: safeKey,
            labelVi: cleanVi,
            labelEn: editingStatItem.labelEn.trim() || cleanVi,
            group: editingStatScope === 'all_specs' ? editingStatItem.group : (existingStat?.group || editingStatItem.group),
            specGroups: nextSpecGroups,
            defaultVal: Number(editingStatItem.defaultVal) || 30,
            unit: editingStatItem.unit.trim(),
            crossSpecHint: editingStatItem.crossSpecHint?.trim() || ''
        };

        try {
            const currentCustom = wwmData?.CUSTOM_TUNING_STATS || {};
            const currentDeleted: string[] = Array.isArray(wwmData?.DELETED_TUNING_STATS) ? wwmData.DELETED_TUNING_STATS : [];
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                CUSTOM_TUNING_STATS: { ...currentCustom, [safeKey]: newStatObj },
                DELETED_TUNING_STATS: currentDeleted.filter(k => k !== safeKey)
            }, { merge: true });
            setEditingStatItem({ key: '', labelVi: '', labelEn: '', group: 'T1', specGroups: {}, defaultVal: 40, unit: '', crossSpecHint: '' });
            alert(`✅ Đã lưu dòng [${cleanVi}] và tự động xếp vào nhóm [${editingStatItem.group}]!`);
        } catch {
            alert("❌ Lỗi khi lưu dòng tẩy luyện lên Firebase!");
        }
    };

    // 🟢 XÓA DÒNG TẨY LUYỆN BỊ DƯ / TRÙNG LẶP KHỎI TÀNG KINH CÁC
    const handleDeleteTuningStat = async (targetStat: StatOption) => {
        if (!window.confirm(`🗑️ Đại hiệp muốn xóa dòng [${targetStat.labelVi}] khỏi danh sách dòng tẩy luyện chứ?`)) return;
        try {
            const currentCustom = { ...(wwmData?.CUSTOM_TUNING_STATS || {}) };
            delete currentCustom[targetStat.key];

            const currentDeleted: string[] = Array.isArray(wwmData?.DELETED_TUNING_STATS) ? [...wwmData.DELETED_TUNING_STATS] : [];
            if (!currentDeleted.includes(targetStat.key)) {
                currentDeleted.push(targetStat.key);
            }

            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                CUSTOM_TUNING_STATS: currentCustom,
                DELETED_TUNING_STATS: currentDeleted
            }, { merge: true });
        } catch {
            alert("❌ Lỗi khi xóa dòng tẩy luyện!");
        }
    };

    const handleSaveCustomAttunement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAttuneItem.labelVi.trim()) return;
        const safeKey = editingAttuneItem.key.trim()
            ? editingAttuneItem.key.trim().toUpperCase().replace(/\s+/g, '_')
            : `ATTUNE_${Date.now()}`;

        const newAttObj: AttunementOption = {
            key: safeKey,
            labelVi: editingAttuneItem.labelVi.trim(),
            labelEn: editingAttuneItem.labelEn.trim() || editingAttuneItem.labelVi.trim(),
            side: editingAttuneItem.side,
            isBiS: editingAttuneItem.isBiS,
            trapWarning: editingAttuneItem.trapWarning?.trim() || ''
        };

        try {
            const currentAtt = wwmData?.CUSTOM_ATTUNEMENTS || {};
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                CUSTOM_ATTUNEMENTS: { ...currentAtt, [safeKey]: newAttObj }
            }, { merge: true });
            setEditingAttuneItem({ key: '', labelVi: '', labelEn: '', side: 'both', isBiS: true, trapWarning: '' });
            alert(`✅ Đã lưu dòng Định Âm [${newAttObj.labelVi}] thành công!`);
        } catch {
            alert("❌ Lỗi khi lưu dòng Định Âm!");
        }
    };

    const handleSaveCustomGearSet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSetItem.labelVi.trim()) return;
        const safeKey = editingSetItem.key.trim()
            ? editingSetItem.key.trim().replace(/\s+/g, '_')
            : `SET_${Date.now()}`;

        const newSetObj: GearSetOption = {
            key: safeKey,
            labelVi: editingSetItem.labelVi.trim(),
            labelEn: editingSetItem.labelEn.trim() || editingSetItem.labelVi.trim(),
            side: editingSetItem.side,
            warningText: editingSetItem.warningText?.trim() || ''
        };

        try {
            const currentSets = wwmData?.CUSTOM_GEAR_SETS || {};
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                CUSTOM_GEAR_SETS: { ...currentSets, [safeKey]: newSetObj }
            }, { merge: true });
            setEditingSetItem({ key: '', labelVi: '', labelEn: '', side: 'both', warningText: '' });
            alert(`✅ Đã lưu Bộ Trang Bị [${newSetObj.labelVi}] lên hệ thống!`);
        } catch {
            alert("❌ Lỗi khi lưu Bộ Trang Bị!");
        }
    };

    const handleSaveCustomTier = async (e: React.FormEvent) => {
        e.preventDefault();
        const numTier = Number(editingTierItem.tier);
        if (!numTier || numTier <= 0) return;

        const newTierObj: TierOption = {
            tier: numTier,
            labelVi: editingTierItem.labelVi.trim() || `🔥 Bậc ${numTier}`,
            isArsenal: Boolean(editingTierItem.isArsenal)
        };

        try {
            const currentTiers = wwmData?.CUSTOM_TIERS || {};
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                CUSTOM_TIERS: { ...currentTiers, [String(numTier)]: newTierObj }
            }, { merge: true });
            alert(`✅ Đã lưu [${newTierObj.labelVi}] lên hệ thống!`);
        } catch {
            alert("❌ Lỗi khi lưu Bậc Trang Bị!");
        }
    };

    const handleSaveCustomWeapon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingWeaponItem.labelVi.trim()) return;
        const safeKey = editingWeaponItem.key.trim()
            ? editingWeaponItem.key.trim().toUpperCase().replace(/\s+/g, '_')
            : `WEAPON_${Date.now()}`;

        const newWeaponObj: WeaponTypeOption = {
            key: safeKey,
            labelVi: editingWeaponItem.labelVi.trim(),
            labelEn: editingWeaponItem.labelEn.trim() || editingWeaponItem.labelVi.trim(),
            icon: editingWeaponItem.icon.trim() || '⚔️'
        };

        try {
            const currentWeapons = wwmData?.CUSTOM_WEAPON_TYPES || {};
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                CUSTOM_WEAPON_TYPES: { ...currentWeapons, [safeKey]: newWeaponObj }
            }, { merge: true });
            setEditingWeaponItem({ key: '', labelVi: '', labelEn: '', icon: '⚔️' });
            alert(`✅ Đã lưu Loại Vũ Khí [${newWeaponObj.icon} ${newWeaponObj.labelVi}] lên hệ thống!`);
        } catch {
            alert("❌ Lỗi khi lưu Loại Vũ Khí!");
        }
    };

    const handleClearAll8Slots = () => {
        if (!window.confirm("🧹 Đại hiệp muốn làm trống cả 8 món đang mặc về 0 để tự nhập thông số đồ thực tế của mình chứ?")) return;
        setHasUnsavedChanges(true);
        setEquipped({
            umbrella: createBlankGear('umbrella', selectedSpec),
            fan: createBlankGear('fan', selectedSpec),
            disc: createBlankGear('disc', selectedSpec),
            pendant: createBlankGear('pendant', selectedSpec),
            helm: createBlankGear('helm', selectedSpec),
            chest: createBlankGear('chest', selectedSpec),
            greaves: createBlankGear('greaves', selectedSpec),
            bracers: createBlankGear('bracers', selectedSpec),
        });
    };

    const handleLoadSampleBiS8Slots = () => {
        if (!window.confirm("✨ Nạp bộ khung 8 món Chuẩn BiS làm mẫu tham khảo?")) return;
        setHasUnsavedChanges(true);
        setEquipped({
            umbrella: createSampleBiSGear('umbrella', selectedSpec),
            fan: createSampleBiSGear('fan', selectedSpec),
            disc: createSampleBiSGear('disc', selectedSpec),
            pendant: createSampleBiSGear('pendant', selectedSpec),
            helm: createSampleBiSGear('helm', selectedSpec),
            chest: createSampleBiSGear('chest', selectedSpec),
            greaves: createSampleBiSGear('greaves', selectedSpec),
            bracers: createSampleBiSGear('bracers', selectedSpec),
        });
    };

    const saveBuildToCloud = async (
        nextBaseline = baseline,
        nextEquipped = equipped,
        nextArsenal = arsenal96,
        nextInnerWays = innerWays
    ) => {
        if (!selectedSpec) return;
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
            setStatusBanner(`✅ Đã lưu & đồng bộ hồ sơ [${selectedSpec}] của ${currentIngame} lên Đám Mây!`);
            setTimeout(() => setStatusBanner(null), 4000);
        } catch (err) {
            console.error("Lỗi lưu wwm_builds:", err);
            alert("⚠️ Đã lưu vào trình duyệt (Local), nhưng chưa ghi được lên Firebase. Hãy kiểm tra Rules của collection wwm_builds!");
        } finally {
            setIsSavingCloud(false);
        }
    };

    const loadoutSummary = useMemo(() => {
        let maxPhysLines = 0;
        let powerLines = 0;
        let agiLines = 0;
        let critLines = 0;
        let precisionLines = 0;
        let godLines = 0;
        const byKeyCount: Record<string, number> = {};

        Object.values(equipped).forEach((item) => {
            if (!item) return;
            const allLines = [item.slot1, ...(item.tuningLines || [])];
            allLines.forEach((l) => {
                if (!l || Number(l.value) <= 0) return;
                byKeyCount[l.statKey] = (byKeyCount[l.statKey] || 0) + 1;

                const opt = statOptions.find(o => o.key === l.statKey);
                const effGroup = opt ? resolveStatGroupForSpec(opt, selectedSpec) : 'T1';
                if (effGroup === 'T0') {
                    godLines++;
                }
                if (l.statKey === 'MAX_PHYS_ATK') maxPhysLines++;
                if (l.statKey === 'POWER') powerLines++;
                if (l.statKey === 'AGILITY') agiLines++;
                if (l.statKey === 'CRIT_RATE') critLines++;
                if (l.statKey === 'PRECISION_RATE') precisionLines++;
            });
        });

        return { maxPhysLines, powerLines, agiLines, critLines, precisionLines, godLines, byKeyCount };
    }, [equipped, statOptions, selectedSpec]);

    const reqAgi = baseline.simulate23 ? baseline.agiThreshold23 : (baseline.reqAgility || 300);
    const reqPhys = baseline.reqMinPhysical || 750;
    const reqSilk = baseline.simulate23 ? baseline.silkThreshold23 : (baseline.reqMinSilkbind || 352);

    // 🟢 HỆ SỐ KHÁNG THUỘC TÍNH THEO CẤP ĐỘ (RESISTANCE BRACKET: 15% | 30% | 45% | 65% | 85%)
    const activeResistance = (Number(baseline.resistanceRate) || 85) / 100; // Mặc định 0.85 (85%)
    const critAffDivisor = +(1 + activeResistance).toFixed(4);              // Lv.100 (85%): 1.85 (x0.54054)
    const precisionDivisor = +(1 + activeResistance * 0.4).toFixed(4);      // Lv.100 (85%): 1.34 (Cần 134% Trắng = 100% Vàng)

    const calcYellowCritOrAff = (rawVal: number) => +(rawVal / critAffDivisor).toFixed(1);
    // KHÔNG dùng Math.min(100) để hiển thị chính xác số % Chính xác bị thừa (Overcap)!
    const calcYellowPrecision = (rawVal: number) => +(rawVal / precisionDivisor).toFixed(1);

    const precisionOvercap = +(baseline.precisionRate - 100).toFixed(1);
    const totalEffectiveCrit = +((Number(baseline.critRate) || 0) + (Number(baseline.directCritRate) || 0)).toFixed(1);
    const finalCritAffinityRate = +(
        (Number(baseline.critRate) || 0) +
        (Number(baseline.affinityRate) || 0) +
        (Number(baseline.directCritRate) || 0) +
        (Number(baseline.directAffinityRate) || 0)
    ).toFixed(1);

    const evaluateGear = (rawItem: GearItem) => {
        const item = normalizeGearItemLines(rawItem);
        const slotMeta = SLOTS_CONFIG.find(s => s.key === item.slot)!;
        let rawBadPoints = 0;
        const lineEvaluations: {
            line: TuningLine;
            lineNumber: number;
            isSlot1: boolean;
            badPt: number;
            tier: StatGroupTier;
            note: string;
            labelVi: string;
        }[] = [];
        const crossSpecHints: string[] = [];

        const t1Key = activeTalentsMeta.t1.linkedStatKey;
        const t2Key = activeTalentsMeta.t2.linkedStatKey;
        const t3Key = activeTalentsMeta.t3.linkedStatKey;

        const needT1Stat = (loadoutSummary.byKeyCount[t1Key] || 0) <= activeTalentsMeta.t1.recommendedLines || baseline.agility < reqAgi + 25;
        const needT2Stat = baseline.minPhysical < reqPhys;
        const needT3Stat = !baseline.arsenal96Active || baseline.minSilkbind < reqSilk;

        const allLines = [item.slot1, ...(item.tuningLines || [])];
        let hasValidGodLine = false;

        allLines.forEach((line, idx) => {
            const isSlot1 = idx === 0;
            const lineNumber = idx + 1;
            const opt = statOptions.find(o => o.key === line.statKey);
            if (!opt) return;

            const effGroup = resolveStatGroupForSpec(opt, selectedSpec);
            let pt = 0;
            let note = "Chuẩn";

            if (effGroup === 'T0') {
                pt = 0;
                hasValidGodLine = true;
                note = "🔥 GOD LINE T0 (>2 dòng Ngoại Công)";
            } else if (effGroup === 'T1') {
                if (line.statKey === 'PRECISION_RATE' && baseline.precisionRate > 103.5) {
                    pt = 0.5;
                    note = `⚠️ Dư thừa Chính xác (${baseline.precisionRate}% > 100%, thừa +${precisionOvercap}%)`;
                } else if (line.statKey === 'CRIT_RATE' && (totalEffectiveCrit > 80.5 || finalCritAffinityRate > 100.5)) {
                    pt = 0.5;
                    note = finalCritAffinityRate > 100.5
                        ? `⚠️ Tràn Bảng Phán Định Cuối (${finalCritAffinityRate}% > 100%)`
                        : `⚠️ Overcap >80% Crit thực tế (${totalEffectiveCrit}%)`;
                } else if (line.statKey === 'AFFINITY_RATE' && finalCritAffinityRate > 100.5) {
                    pt = 0.5;
                    note = `⚠️ Tràn Bảng Phán Định Cuối (${finalCritAffinityRate}% > 100%)`;
                } else {
                    pt = 0;
                    note = `✅ Chỉ số T1 Chuẩn của [${selectedSpec}]`;
                }
            } else if (line.statKey === t1Key && needT1Stat) {
                pt = 0;
                note = `✅ Giữ mốc 100% Thiên phú 1 (${activeTalentsMeta.t1.statTitle})`;
            } else if (line.statKey === t3Key && needT3Stat) {
                pt = 0;
                note = `✅ Bù mốc 100% Thiên phú 3 (${activeTalentsMeta.t3.statTitle})`;
            } else if (line.statKey === t2Key && needT2Stat) {
                pt = 0;
                note = `✅ Bù mốc 100% Thiên phú 2 (${activeTalentsMeta.t2.statTitle})`;
            } else if (effGroup === 'T2') {
                pt = 0.5;
                note = isSlot1 ? "🔒 Dòng #1 Gốc T2 (+0.5 xấu - Không tẩy lẻ được)" : "🌪️ Dòng T2 Tình huống (+0.5 điểm xấu)";
            } else {
                pt = 1.0;
                note = isSlot1 ? "🔒 Dòng #1 Gốc T3 (+1.0 xấu - Không tẩy lẻ được)" : "❌ Dòng T3 Lệch hệ / Dư thừa (+1.0 điểm xấu)";
                if (opt.crossSpecHint) {
                    crossSpecHints.push(`${opt.labelVi}: ${opt.crossSpecHint}`);
                }
            }

            rawBadPoints += pt;
            lineEvaluations.push({
                line,
                lineNumber,
                isSlot1,
                badPt: pt,
                tier: effGroup,
                note,
                labelVi: opt.labelVi
            });
        });

        const slot1Eval = lineEvaluations[0];
        const middleEvals = lineEvaluations.slice(1);

        let worstMiddleIdx = -1;
        let maxReducibleBadPt = 0;
        middleEvals.forEach((ev, mIdx) => {
            if (ev.badPt > maxReducibleBadPt) {
                maxReducibleBadPt = ev.badPt;
                worstMiddleIdx = mIdx;
            }
        });

        const hasAlreadyRetunedOneLine = typeof item.retunedLineIndex === 'number' && item.retunedLineIndex >= 0;
        const lockedRetuneEval = hasAlreadyRetunedOneLine ? middleEvals[item.retunedLineIndex!] : null;

        // 🟢 NẾU ĐÃ KHÓA DÒNG CHUYỂN ÂM (#2-#5) NHƯNG DÒNG ĐÓ VẪN ĐANG LÀ DÒNG XẤU (badPt > 0):
        // Mỗi tuần vẫn được Chuyển âm lại đúng dòng đó 1 lần! Nên tiềm năng sau khi tẩy trúng T1 sẽ trừ đi badPt của chính dòng đã khóa đó!
        const reduciblePt = hasAlreadyRetunedOneLine
            ? (lockedRetuneEval ? lockedRetuneEval.badPt : 0)
            : maxReducibleBadPt;

        const badPointsAfterOneRetune = Math.max(0, +(rawBadPoints - reduciblePt).toFixed(1));

        const targetRetuneEval = hasAlreadyRetunedOneLine
            ? (lockedRetuneEval && lockedRetuneEval.badPt > 0 ? lockedRetuneEval : null)
            : (worstMiddleIdx !== -1 && maxReducibleBadPt > 0 ? middleEvals[worstMiddleIdx] : null);

        // 🟢 PHÂN TÍCH BỂ 6 DÒNG CHUYỂN ÂM (LOẠI TRỪ CÁC DÒNG ĐÃ CÓ TRÊN ĐỒ NHƯ TRONG GAME)
        const existingMiddleKeys = new Set(
            (item.tuningLines || []).map(l => l.statKey)
        );
        // Đồng bộ tên mã Khiên Ty tối thiểu/tối đa để nhận diện trùng lặp
        if (existingMiddleKeys.has('MIN_SILKBIND_ATK')) existingMiddleKeys.add('MAX_SILKBIND_ATK');

        const rawPool6 = getRetunePoolForSpec(selectedSpec);
        const retunePoolPreview = rawPool6.map(pItem => {
            const opt = statOptions.find(o => o.key === pItem.statKey);
            const tier = opt ? resolveStatGroupForSpec(opt, selectedSpec) : 'T1';
            const isGreyedOut = existingMiddleKeys.has(pItem.statKey);
            const isGoodTarget = tier === 'T1' || (pItem.statKey === activeTalentsMeta.t1.linkedStatKey);
            return {
                ...pItem,
                tier,
                isGreyedOut,
                isGoodTarget
            };
        });

        const availableGoodTargets = retunePoolPreview
            .filter(p => !p.isGreyedOut && p.isGoodTarget)
            .map(p => `${p.nameVi} (${p.rangeText})`);

        const allGoodTargetsInPool = retunePoolPreview
            .filter(p => p.isGoodTarget)
            .map(p => `${p.nameVi} (${p.rangeText})`);

        const suggestedTargetsText = availableGoodTargets.length > 0
            ? availableGoodTargets.join(' hoặc ')
            : allGoodTargetsInPool.join(', ');

        const missingRequiredGodLine = Boolean(slotMeta.godLineKey && !hasValidGodLine);

        const setOpt = gearSetOptions.find(s => s.key === item.gearSet);
        let setWarning: string | null = null;
        if (setOpt?.warningText && (selectedSpec.includes('Kéo Tơ') || selectedSpec.includes('Khiên Ty'))) {
            setWarning = setOpt.warningText;
        }

        const attuneOpt = attunementOptions.find(a => a.key === item.attunementKey);
        const attuneTrap = attuneOpt && !attuneOpt.isBiS ? attuneOpt.trapWarning || "Sai dòng Định Âm chuẩn!" : null;

        let verdictTitle = "";
        let verdictColor: 'emerald' | 'amber' | 'rose' = 'emerald';
        let verdictAction = "";

        if (setWarning) {
            verdictTitle = "🚫 CẢNH BÁO BỘ SET TRANG BỊ";
            verdictColor = 'rose';
            verdictAction = setWarning;
        } else if (slot1Eval && slot1Eval.badPt >= 1.0 && !hasValidGodLine) {
            verdictTitle = "⚠️ DÒNG #1 GỐC BỊ LỆCH HỆ (T3 - KHÔNG THỂ TẨY LẺ DÒNG #1)";
            verdictColor = 'rose';
            verdictAction = `Dòng #1 [${slot1Eval.labelVi}] là dòng gốc sinh ra cùng phôi (không thể dùng đá Chuyển âm tẩy lẻ) đã mất 1.0 điểm xấu. Tổng điểm xấu hiện tại: ${rawBadPoints.toFixed(1)} (Sau khi tẩy 1 dòng giữa còn ${badPointsAfterOneRetune.toFixed(1)}).`;
        } else if (badPointsAfterOneRetune <= 0.5) {
            if (targetRetuneEval) {
                verdictTitle = hasAlreadyRetunedOneLine
                    ? `🔄 DÒNG #${targetRetuneEval.lineNumber} ĐANG RA DÒNG PHỤ — TUẦN SAU CHUYỂN ÂM TIẾP SẼ VỀ ${badPointsAfterOneRetune.toFixed(1)} XẤU (BiS!)`
                    : `💎 PHÔI CỰC PHẨM! CHUYỂN ÂM DÒNG #${targetRetuneEval.lineNumber} LÀ THÀNH BiS (${badPointsAfterOneRetune.toFixed(1)} XẤU)`;
                verdictColor = 'emerald';
                verdictAction = hasAlreadyRetunedOneLine
                    ? `Dòng #${targetRetuneEval.lineNumber} đã khóa Chuyển âm nhưng đang dừng ở [${targetRetuneEval.labelVi}] (+${targetRetuneEval.badPt} xấu). Mỗi tuần được Chuyển âm lại 1 lần: Hãy tẩy tiếp dòng #${targetRetuneEval.lineNumber} để lấy [${suggestedTargetsText}] ➔ Điểm xấu sẽ giảm từ ${rawBadPoints.toFixed(1)} xuống còn ${badPointsAfterOneRetune.toFixed(1)}/2.0!`
                    : `Hiện tại ${rawBadPoints.toFixed(1)} điểm xấu. Hãy khóa Chuyển âm vào Dòng #${targetRetuneEval.lineNumber} [${targetRetuneEval.labelVi}] và tìm [${suggestedTargetsText}] trong bể 6 dòng ➔ Điểm xấu giảm còn ${badPointsAfterOneRetune.toFixed(1)}/2.0!`;
            } else {
                verdictTitle = "💎 CỰC PHẨM HOÀN MỸ (GOD ROLL / BiS) - ĐÃ CHỐT HẠ!";
                verdictColor = 'emerald';
                verdictAction = `Hoàn mỹ (${rawBadPoints.toFixed(1)} điểm xấu)! Dòng Chuyển âm đã đạt chuẩn tối ưu, không cần tốn lượt Chuyển âm hàng tuần vào món này nữa.`;
            }
        } else if (badPointsAfterOneRetune <= 2.0) {
            verdictTitle = "✨ DÙNG TỐT - TẬN DỤNG LƯỢT CHUYỂN ÂM MỖI TUẦN (BỂ 6 DÒNG)";
            verdictColor = 'amber';
            if (targetRetuneEval) {
                verdictAction = hasAlreadyRetunedOneLine
                    ? `Dòng #${targetRetuneEval.lineNumber} đã khóa Chuyển âm nhưng đang bị +${targetRetuneEval.badPt} điểm xấu ([${targetRetuneEval.labelVi}]). Mỗi tuần 1 lần, hãy Chuyển âm lại Dòng #${targetRetuneEval.lineNumber} lấy [${suggestedTargetsText}] ➔ Điểm xấu sẽ giảm từ ${rawBadPoints.toFixed(1)} xuống ${badPointsAfterOneRetune.toFixed(1)}/2.0!`
                    : `Điểm xấu hiện tại: ${rawBadPoints.toFixed(1)}/2.0. Hãy dùng quyền Chuyển âm vào Dòng #${targetRetuneEval.lineNumber} [${targetRetuneEval.labelVi}] để tìm [${suggestedTargetsText}] ➔ Điểm xấu sau tẩy còn ${badPointsAfterOneRetune.toFixed(1)}/2.0!`;
            } else {
                verdictAction = `Món đồ đã tối ưu hết mức của dòng Chuyển âm (#${(item.retunedLineIndex ?? 0) + 2}), tổng điểm xấu chốt hạ: ${rawBadPoints.toFixed(1)}/2.0 (Dùng tốt).`;
            }
        } else {
            const tierMeta = tierOptions.find(t => t.tier === item.tier);
            if (item.tier <= 96 || tierMeta?.isArsenal) {
                verdictTitle = `📦 KHÔNG TẨY THÊM - CẤT VÀO KHO VŨ KHÍ (BẬC ${item.tier})`;
                verdictColor = 'amber';
                verdictAction = `Đồ Bậc ${item.tier} có ${rawBadPoints.toFixed(1)} điểm xấu. Không tốn nguyên liệu Chuyển âm, hãy đưa vào Kho Vũ Khí (Arsenal) để lấy chỉ số cộng thẳng!`;
            } else if (slot1Eval && slot1Eval.badPt === 0) {
                verdictTitle = `🔄 GIỮ PHÔI GỐC #1 NGON & DÙNG [GEAR TUNING RESET] (ĐỒ BẬC ${item.tier})`;
                verdictColor = 'amber';
                verdictAction = `Dòng #1 gốc [${slot1Eval.labelVi}] rất đẹp (0 xấu), nhưng các dòng giữa có quá nhiều dòng xấu (${rawBadPoints.toFixed(1)} xấu, dù Chuyển âm 1 dòng vẫn còn ${badPointsAfterOneRetune.toFixed(1)} > 2.0). Hãy dùng [Gear Tuning Reset] để mở lại 4 dòng giữa!`;
            } else {
                verdictTitle = "🗑️ PHÔI NHIỀU DÒNG XẤU (>2.0 ĐIỂM XẤU KỂ CẢ SAU KHI CHUYỂN ÂM)";
                verdictColor = 'rose';
                verdictAction = `Kể cả khi Chuyển âm 1 dòng ở cụm giữa ra chỉ số T1, món đồ vẫn còn ${badPointsAfterOneRetune.toFixed(1)} điểm xấu (>2.0).`;
            }
        }

        return {
            badPoints: rawBadPoints,
            badPointsAfterOneRetune,
            lineEvaluations,
            slot1Eval,
            bestTargetLineToRetune: targetRetuneEval,
            retunePoolPreview,
            availableGoodTargets,
            hasValidGodLine,
            missingRequiredGodLine,
            setWarning,
            attuneTrap,
            verdictTitle,
            verdictColor,
            verdictAction,
            crossSpecHints
        };
    };

    const currentSlotEquipped = equipped[activeSlot];
    const activeGearEval = useMemo(
        () => evaluateGear(activeEditingGear),
        [activeEditingGear, baseline, loadoutSummary, reqAgi, reqPhys, reqSilk, statOptions, attunementOptions, gearSetOptions, tierOptions, selectedSpec, activeTalentsMeta]
    );

    const comparisonDelta = useMemo(() => {
        const sumStat = (item: GearItem, key: string) => {
            const lines = [item.slot1, ...(item.tuningLines || [])];
            return lines.filter(l => l.statKey === key).reduce((acc, cur) => acc + (Number(cur.value) || 0), 0);
        };

        const targetGear = editorMode === 'compare_new' ? candidateGear : currentSlotEquipped;
        const t1Key = activeTalentsMeta.t1.linkedStatKey;
        const t3Key = activeTalentsMeta.t3.linkedStatKey;

        const deltaAgi = sumStat(targetGear, t1Key) - sumStat(currentSlotEquipped, t1Key);
        const deltaSilk = sumStat(targetGear, t3Key) - sumStat(currentSlotEquipped, t3Key);
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
    }, [candidateGear, currentSlotEquipped, baseline, editorMode, reqAgi, reqSilk, activeTalentsMeta]);

    // 🟢 QUÉT ẢNH AI OCR ĐÃ TÍCH HỢP responseMimeType: 'application/json' VÀ TỰ NHẬN DIỆN ĐUÔI ẢNH
    const runGeminiOcr = async (base64DataUrl: string) => {
        setPreviewImage(base64DataUrl);
        setIsScanning(true);

        try {
            const mimeMatch = base64DataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
            const detectedMimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            const base64Clean = base64DataUrl.split(',')[1];

            const statKeysCatalog = statOptions.map(o => `${o.key}: ${o.labelVi} / ${o.labelEn}`).join('\n');
            const setKeysCatalog = gearSetOptions.map(s => `${s.key}: ${s.labelVi}`).join('\n');

            const promptText = `Bạn là AI OCR chuyên đọc ảnh chụp màn hình trang bị game Where Winds Meet (Yến Vân Thập Lục Thanh).
QUY TẮC TỐI QUAN TRỌNG VỀ THỨ TỰ 6 DÒNG TRÊN TRANG BỊ:
1. Trang bị có 5 dòng chấm tròn (•) nối nhau bằng đường kẻ dọc và 1 dòng biểu tượng hoa thị/thoi (❖) ở dưới cùng (tổng cộng 6 dòng).
2. TUYỆT ĐỐI GIỮ NGUYÊN THỨ TỰ TỪ TRÊN XUỐNG DƯỚI TRONG ẢNH! KHÔNG ĐƯỢC tự ý đảo dòng T0 hay dòng màu vàng lên làm "slot1"!
   - "slot1": BẮT BUỘC là dòng chấm tròn (•) ĐẦU TIÊN trên cùng (Dòng #1 gốc sinh ra của phôi, ví dụ: "Tấn công vô hình tối đa 41.5" -> FORMLESS_ATK: 41.5).
   - "tuningLines": BẮT BUỘC là mảng gồm 4 dòng chấm tròn (•) TIẾP THEO theo đúng thứ tự từ trên xuống dưới (Dòng #2, Dòng #3, Dòng #4, Dòng #5).
   - "attunementKey" & "attunementValue": BẮT BUỘC là dòng có biểu tượng (❖) ở dưới cùng (Dòng #6 Định Âm, ví dụ: "Xuyên phá ngoại công 10.7" -> PHYS_PEN: 10.7).
3. Từ điển đồng nghĩa bản dịch Việt hóa mới:
   - "Tấn công vô hình tối đa" / "Vô Tướng Công" = FORMLESS_ATK
   - "Mẫn" / "Nhanh nhẹn" / "Ngự" = AGILITY
   - "Tăng hiệu quả Võ học Tán" / "Võ học Cửu Trùng Xuân Sắc" = ART_UMBRELLA_BOOST
   - "Thế" = MOMENTUM
   - "Công kích Ngoại công tối đa" / "Tấn công ngoại công tối đa" = MAX_PHYS_ATK
   - "Kình" / "Lực" / "Sức mạnh" = POWER
   - "Liễu khói dày đặc" / "Thời Vũ" = Mistwillow

Hãy trả về DUY NHẤT 1 JSON object chuẩn xác theo cấu trúc sau:
{
  "name": "Tên món đồ trong ảnh",
  "slot": "umbrella | fan | disc | pendant | helm | chest | greaves | bracers",
  "tier": 100,
  "gearSet": "MÃ_SET",
  "slot1": { "statKey": "MÃ_STAT_DÒNG_1_TRÊN_CÙNG", "value": 41.5 },
  "tuningLines": [
    { "statKey": "MÃ_STAT_DÒNG_2", "value": 47.3 },
    { "statKey": "MÃ_STAT_DÒNG_3", "value": 6.7 },
    { "statKey": "MÃ_STAT_DÒNG_4", "value": 44.6 },
    { "statKey": "MÃ_STAT_DÒNG_5", "value": 85.0 }
  ],
  "attunementKey": "PHYS_PEN | UMBRELLA_PROJECTILE_BOOST | TRAP_LIGHT_HEAVY | TRAP_MARTIAL_SKILL | TRAP_FAN_SPECIAL | TRAP_FAN_CHARGED",
  "attunementValue": 10.7
}
Danh mục MÃ_SET:
${setKeysCatalog}
Danh mục MÃ_STAT:
${statKeysCatalog}`;

            if (!geminiApiKey.trim()) {
                alert("💡 Để AI tự động điền thông số từ ảnh, đại hiệp hãy dán Gemini API Key vào ô cấu hình phía trên!");
                setIsScanning(false);
                return;
            }

            const activeModelName = geminiModel.trim() || 'gemini-3.5-flash-lite';
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${activeModelName}:generateContent?key=${geminiApiKey.trim()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    generationConfig: {
                        responseMimeType: 'application/json',
                        temperature: 0.1
                    },
                    contents: [{
                        parts: [
                            { text: promptText },
                            { inlineData: { mimeType: detectedMimeType, data: base64Clean } }
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
                tier: Number(parsed.tier) || prev.tier,
                gearSet: parsed.gearSet || prev.gearSet,
                slot1: parsed.slot1 || prev.slot1,
                tuningLines: Array.isArray(parsed.tuningLines) && parsed.tuningLines.length > 0 ? parsed.tuningLines : prev.tuningLines,
                retunedLineIndex: null,
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
    }, [geminiApiKey, geminiModel, activeSlot, editorMode, statOptions, gearSetOptions]);

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

        if (oldItem && oldItem.tier <= 96) {
            nextArsenal = [oldItem, ...nextArsenal];
        }

        const nextEquipped = {
            ...equipped,
            [activeSlot]: normalizeGearItemLines({ ...candidateGear, slot: activeSlot })
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
        const slotDisp = getSlotDisplayInfo(slotMeta, activeEditingGear);
        const colorInt = activeGearEval.verdictColor === 'emerald' ? 0x10b981 : activeGearEval.verdictColor === 'amber' ? 0xf59e0b : 0xef4444;
        const slot1Stat = statOptions.find(o => o.key === activeEditingGear.slot1.statKey);

        const embed = {
            title: `${slotDisp.icon} GIÁM ĐỊNH THẦN KHÍ: ${activeEditingGear.name} (Bậc ${activeEditingGear.tier})`,
            description: `**Đại hiệp:** \`${currentIngame}\` • **Hệ phái:** \`${selectedSpec}\`\n**Phán quyết:** **${activeGearEval.verdictTitle}**\n> ${activeGearEval.verdictAction}`,
            color: colorInt,
            fields: [
                {
                    name: `📌 Vị Trí & Bộ Set (${slotDisp.title})`,
                    value: `Bộ: **${gearSetOptions.find(s => s.key === activeEditingGear.gearSet)?.labelVi || activeEditingGear.gearSet}**\nĐiểm xấu hiện tại: **${activeGearEval.badPoints.toFixed(1)}** ➔ Sau khi tẩy 1 dòng: **${activeGearEval.badPointsAfterOneRetune.toFixed(1)} / 2.0**`,
                    inline: false
                },
                {
                    name: '🔒 Dòng #1 (Dòng Gốc Sinh Ra - Không Tẩy Lẻ)',
                    value: `${slot1Stat ? formatStatForSpec(slot1Stat) : activeEditingGear.slot1.statKey}: **+${activeEditingGear.slot1.value}**`,
                    inline: true
                },
                {
                    name: '❖ Dòng Cuối (Định Âm Khóa Cuối)',
                    value: `${attunementOptions.find(a => a.key === activeEditingGear.attunementKey)?.labelVi || activeEditingGear.attunementKey} (**+${activeEditingGear.attunementValue}**)`,
                    inline: true
                }
            ],
            footer: { text: 'Thanh Long Sơn Trang • WWM Gear Optimizer Hub' },
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

    const currentSlotMeta = SLOTS_CONFIG.find(s => s.key === activeSlot)!;
    const currentSlotDisplay = getSlotDisplayInfo(currentSlotMeta, activeEditingGear);

    const t1LineCount = loadoutSummary.byKeyCount[activeTalentsMeta.t1.linkedStatKey] || 0;
    const t2LineCount = loadoutSummary.byKeyCount[activeTalentsMeta.t2.linkedStatKey] || 0;
    const t3LineCount = loadoutSummary.byKeyCount[activeTalentsMeta.t3.linkedStatKey] || 0;

    return (
        <section className="space-y-6 animate-in fade-in duration-300 pb-16">
            {statusBanner && (
                <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg">
                    <span>{statusBanner}</span>
                    <button onClick={() => setStatusBanner(null)} className="text-emerald-400 hover:text-white">✕</button>
                </div>
            )}

            {/* THANH ĐẦU */}
            <div className="bg-[#090d16] border border-emerald-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-amber-300 to-amber-500">
                            ⚔️ Thần Khí Các · Giám Định & Tối Ưu Đồ Võ Học
                        </h2>
                        <p className="text-xs text-zinc-400 mt-1">
                            Hồ sơ: <b className="text-amber-300">{currentIngame}</b> • Hệ phái đang chọn: <b className="text-emerald-400">{selectedSpec || "Đang tải..."}</b>
                            {hasUnsavedChanges && <span className="ml-2 text-amber-400 font-bold animate-pulse">● (Có thay đổi chưa lưu lên Mây)</span>}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => setShowStatDictModal(true)}
                            className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
                        >
                            <span>⚙️ Tàng Kinh Các (Dòng / Set / Bậc / Vũ Khí / Tâm Pháp)</span>
                        </button>

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
                            disabled={isSavingCloud || viewingUserId !== currentUserId}
                            onClick={() => saveBuildToCloud()}
                            className={`px-4 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${hasUnsavedChanges
                                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-bounce'
                                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                }`}
                        >
                            {isSavingCloud ? "⏳ Đang lưu..." : "☁️ Lưu Hồ Sơ Lên Mây"}
                        </button>
                    </div>
                </div>

                {/* DANH SÁCH VÕ HỌC */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            Chọn Nhánh Võ Học ({voHocList.length} hệ phái — Các dòng tự động sắp xếp chuẩn T0 ➔ T1 ➔ T2 ➔ T3 theo hệ đang chọn):
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                setDictTab('vohoc');
                                setShowStatDictModal(true);
                            }}
                            className="text-[10px] text-emerald-400 hover:underline font-bold cursor-pointer"
                        >
                            + Thêm / Sửa Nhánh Võ Học
                        </button>
                    </div>

                    {voHocList.length === 0 ? (
                        <div className="text-xs text-amber-400 py-2 animate-pulse">
                            🔮 Đang tải danh sách Võ Học...
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {voHocList.map((specName) => {
                                const isSelected = selectedSpec === specName;
                                const countInSpec = Object.keys(wwmBuilds?.[specName] || {}).length;

                                return (
                                    <button
                                        key={specName}
                                        type="button"
                                        onClick={() => {
                                            setHasUnsavedChanges(false);
                                            setSelectedSpec(specName);
                                        }}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${isSelected
                                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                                                : 'bg-zinc-900/70 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                                            }`}
                                    >
                                        <span>{(specName.includes('Kéo Tơ') || specName.includes('Khiên Ty')) ? '☂️' : (specName.includes('Chuông') || specName.includes('Chung Minh') || specName.includes('Minh Kim')) ? '🗡️' : (specName.includes('Xé Đá') || specName.includes('Liệt Thạch')) ? '🪓' : '⚔️'}</span>
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
                    )}
                </div>
            </div>

            {/* KHU VỰC 1: 3 THIÊN PHÚ VÕ HỌC ĐỘNG THEO TỪNG HỆ PHÁI */}
            <div className="bg-[#090d16] border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-5">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                    <div>
                        <h3 className="text-base font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                            🔒 Quy Tắc #1: Khóa Cứng 100% Thiên Phú Võ Học — Hệ [{selectedSpec}]
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            Bấm trực tiếp vào các ô số để nhập chỉ số nhân vật, hoặc bấm nút <b>✏️ Sửa Khung 3 Thiên Phú</b> để tùy biến tên chỉ số cho từng hệ phái.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsEditingTalentMeta(!isEditingTalentMeta)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${isEditingTalentMeta
                                    ? 'bg-amber-500 text-zinc-950 border-amber-400'
                                    : 'bg-zinc-900 text-amber-300 border-amber-500/40 hover:bg-amber-500/15'
                                }`}
                        >
                            {isEditingTalentMeta ? '✅ Xong Chỉnh Sửa Khung' : `✏️ Sửa Khung 3 Thiên Phú`}
                        </button>

                        {isEditingTalentMeta && (
                            <button
                                type="button"
                                onClick={handleSaveSpecTalentTemplateToCloud}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black cursor-pointer shadow-md"
                            >
                                💾 Lưu Làm Chuẩn Chung Cho Hệ [{selectedSpec}]
                            </button>
                        )}

                        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={baseline.simulate23}
                                onChange={(e) => updateBaselineField({ simulate23: e.target.checked })}
                                className="accent-amber-400"
                            />
                            <span>🔥 Mô phỏng Đột Phá Mốc Mùa Mới</span>
                        </label>

                        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={baseline.arsenal96Active}
                                onChange={(e) => updateBaselineField({ arsenal96Active: e.target.checked })}
                                className="accent-emerald-400"
                            />
                            <span>📦 Đã lắp Kho Vũ Khí (Arsenal)</span>
                        </label>
                    </div>
                </div>

                {/* 3 THẺ TIẾN TRÌNH THIÊN PHÚ VÕ HỌC */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* THIÊN PHÚ 1 */}
                    <div className={`p-4 rounded-2xl border ${baseline.agility >= reqAgi ? 'bg-zinc-900/60 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500'}`}>
                        <div className="flex justify-between items-start gap-2 mb-2">
                            <div className="flex-1">
                                {isEditingTalentMeta ? (
                                    <div className="space-y-1.5 mb-2">
                                        <input
                                            type="text"
                                            value={activeTalentsMeta.t1.badgeText}
                                            onChange={(e) => updateTalentCardMeta('t1', { badgeText: e.target.value })}
                                            placeholder="Nhãn hiệu ứng Thiên Phú 1..."
                                            className="w-full bg-zinc-950 border border-emerald-500/40 rounded px-2 py-1 text-[10px] font-bold text-emerald-300"
                                        />
                                        <input
                                            type="text"
                                            value={activeTalentsMeta.t1.statTitle}
                                            onChange={(e) => updateTalentCardMeta('t1', { statTitle: e.target.value })}
                                            placeholder="Tên chỉ số Thiên Phú 1..."
                                            className="w-full bg-zinc-950 border border-amber-500/40 rounded px-2 py-1 text-xs font-black text-zinc-100"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">{activeTalentsMeta.t1.badgeText}</div>
                                        <div className="text-sm font-black text-zinc-100">{activeTalentsMeta.t1.statTitle}</div>
                                    </>
                                )}
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${baseline.agility >= reqAgi ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500 text-white'}`}>
                                {baseline.agility >= reqAgi ? '100% ĐẠT' : `THIẾU ${(reqAgi - baseline.agility).toFixed(0)}`}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 my-2">
                            <div className="flex-1">
                                <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">✏️ Chỉ số của bạn:</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={baseline.agility}
                                    onChange={(e) => updateBaselineField({ agility: Number(e.target.value) })}
                                    className="w-full bg-zinc-950 border border-amber-500/40 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-sm font-mono font-black text-amber-300 focus:outline-none"
                                />
                            </div>
                            <span className="text-zinc-500 font-bold pt-4">/</span>
                            <div className="w-28">
                                <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">🎯 {activeTalentsMeta.t1.reqLabel}</span>
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

                        {isEditingTalentMeta ? (
                            <div className="mt-2 space-y-1.5 pt-2 border-t border-zinc-800">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-400">Dòng liên kết:</span>
                                    <select
                                        value={activeTalentsMeta.t1.linkedStatKey}
                                        onChange={(e) => updateTalentCardMeta('t1', { linkedStatKey: e.target.value })}
                                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[10px] text-amber-300"
                                    >
                                        {statOptions.map(o => <option key={o.key} value={o.key}>{formatStatForSpec(o)}</option>)}
                                    </select>
                                    <input
                                        type="number"
                                        value={activeTalentsMeta.t1.recommendedLines}
                                        onChange={(e) => updateTalentCardMeta('t1', { recommendedLines: Number(e.target.value) })}
                                        className="w-12 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1 text-[10px] text-center font-mono text-emerald-300"
                                        title="Số dòng khuyến nghị trên đồ"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={activeTalentsMeta.t1.noteTemplate}
                                    onChange={(e) => updateTalentCardMeta('t1', { noteTemplate: e.target.value })}
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300"
                                    placeholder="Ghi chú hướng dẫn..."
                                />
                            </div>
                        ) : (
                            <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                                {activeTalentsMeta.t1.noteTemplate} Hiện trên 8 món có: <b className="text-emerald-400">{t1LineCount}/{activeTalentsMeta.t1.recommendedLines} dòng</b>.
                            </p>
                        )}
                    </div>

                    {/* THIÊN PHÚ 2 */}
                    <div className={`p-4 rounded-2xl border ${baseline.minPhysical >= reqPhys ? 'bg-zinc-900/60 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500'}`}>
                        <div className="flex justify-between items-start gap-2 mb-2">
                            <div className="flex-1">
                                {isEditingTalentMeta ? (
                                    <div className="space-y-1.5 mb-2">
                                        <input
                                            type="text"
                                            value={activeTalentsMeta.t2.badgeText}
                                            onChange={(e) => updateTalentCardMeta('t2', { badgeText: e.target.value })}
                                            className="w-full bg-zinc-950 border border-emerald-500/40 rounded px-2 py-1 text-[10px] font-bold text-emerald-300"
                                        />
                                        <input
                                            type="text"
                                            value={activeTalentsMeta.t2.statTitle}
                                            onChange={(e) => updateTalentCardMeta('t2', { statTitle: e.target.value })}
                                            className="w-full bg-zinc-950 border border-amber-500/40 rounded px-2 py-1 text-xs font-black text-zinc-100"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">{activeTalentsMeta.t2.badgeText}</div>
                                        <div className="text-sm font-black text-zinc-100">{activeTalentsMeta.t2.statTitle}</div>
                                    </>
                                )}
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${baseline.minPhysical >= reqPhys ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500 text-white'}`}>
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
                                <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">🎯 {activeTalentsMeta.t2.reqLabel}</span>
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

                        {isEditingTalentMeta ? (
                            <div className="mt-2 space-y-1.5 pt-2 border-t border-zinc-800">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-400">Dòng liên kết:</span>
                                    <select
                                        value={activeTalentsMeta.t2.linkedStatKey}
                                        onChange={(e) => updateTalentCardMeta('t2', { linkedStatKey: e.target.value })}
                                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[10px] text-amber-300"
                                    >
                                        {statOptions.map(o => <option key={o.key} value={o.key}>{formatStatForSpec(o)}</option>)}
                                    </select>
                                    <input
                                        type="number"
                                        value={activeTalentsMeta.t2.recommendedLines}
                                        onChange={(e) => updateTalentCardMeta('t2', { recommendedLines: Number(e.target.value) })}
                                        className="w-12 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1 text-[10px] text-center font-mono text-emerald-300"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={activeTalentsMeta.t2.noteTemplate}
                                    onChange={(e) => updateTalentCardMeta('t2', { noteTemplate: e.target.value })}
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300"
                                />
                            </div>
                        ) : (
                            <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                                {activeTalentsMeta.t2.noteTemplate} ({baseline.minPhysical}/{reqPhys} • Đang có <b className="text-amber-300">{t2LineCount} dòng</b>).
                            </p>
                        )}
                    </div>

                    {/* THIÊN PHÚ 3 */}
                    <div className={`p-4 rounded-2xl border ${baseline.minSilkbind >= reqSilk ? 'bg-zinc-900/60 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500'}`}>
                        <div className="flex justify-between items-start gap-2 mb-2">
                            <div className="flex-1">
                                {isEditingTalentMeta ? (
                                    <div className="space-y-1.5 mb-2">
                                        <input
                                            type="text"
                                            value={activeTalentsMeta.t3.badgeText}
                                            onChange={(e) => updateTalentCardMeta('t3', { badgeText: e.target.value })}
                                            className="w-full bg-zinc-950 border border-emerald-500/40 rounded px-2 py-1 text-[10px] font-bold text-emerald-300"
                                        />
                                        <input
                                            type="text"
                                            value={activeTalentsMeta.t3.statTitle}
                                            onChange={(e) => updateTalentCardMeta('t3', { statTitle: e.target.value })}
                                            className="w-full bg-zinc-950 border border-amber-500/40 rounded px-2 py-1 text-xs font-black text-zinc-100"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">{activeTalentsMeta.t3.badgeText}</div>
                                        <div className="text-sm font-black text-zinc-100">{activeTalentsMeta.t3.statTitle}</div>
                                    </>
                                )}
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${baseline.minSilkbind >= reqSilk ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500 text-white'}`}>
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
                                <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">🎯 {activeTalentsMeta.t3.reqLabel}</span>
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

                        {isEditingTalentMeta ? (
                            <div className="mt-2 space-y-1.5 pt-2 border-t border-zinc-800">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-400">Dòng liên kết:</span>
                                    <select
                                        value={activeTalentsMeta.t3.linkedStatKey}
                                        onChange={(e) => updateTalentCardMeta('t3', { linkedStatKey: e.target.value })}
                                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[10px] text-amber-300"
                                    >
                                        {statOptions.map(o => <option key={o.key} value={o.key}>{formatStatForSpec(o)}</option>)}
                                    </select>
                                    <input
                                        type="number"
                                        value={activeTalentsMeta.t3.recommendedLines}
                                        onChange={(e) => updateTalentCardMeta('t3', { recommendedLines: Number(e.target.value) })}
                                        className="w-12 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1 text-[10px] text-center font-mono text-emerald-300"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={activeTalentsMeta.t3.noteTemplate}
                                    onChange={(e) => updateTalentCardMeta('t3', { noteTemplate: e.target.value })}
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300"
                                />
                            </div>
                        ) : (
                            <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                                {activeTalentsMeta.t3.noteTemplate} (Đang có <b className="text-emerald-400">{t3LineCount} dòng</b> trên đồ).
                            </p>
                        )}
                    </div>
                </div>

                {/* 3 RATES SỐ VÀNG & CẤU HÌNH GEMINI-3.5-FLASH-LITE / WEBHOOK */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2 border-t border-zinc-800/60">
                    {/* 🟢 BẢNG THUỘC TÍNH PHÁN ĐỊNH & ĐỐI CHIẾU KHÁNG CẤP ĐỘ (RESISTANCE) */}
                    <div className="lg:col-span-12 space-y-3 bg-zinc-950/70 p-4 rounded-2xl border border-zinc-800/90">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                            <div>
                                <div className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                                    <span>⚖️ Bảng Thuộc Tính Phán Định (Không Khóa Trần 100% Để Soi Phần Trăm Bị Thừa)</span>
                                </div>
                                <p className="text-[11px] text-zinc-400 mt-0.5">
                                    Công thức Kháng <b className="text-rose-400">{baseline.resistanceRate ?? 85}%</b>: Chí mạng & Hiểu ý chia cho <b className="text-emerald-400">{critAffDivisor}</b> (×{(1 / critAffDivisor).toFixed(4)}) • Chính xác chia cho <b className="text-emerald-400">{precisionDivisor}</b> (Cần <b>{(100 * precisionDivisor).toFixed(1)}%</b> Trắng = <b>100%</b> Vàng).
                                </p>
                            </div>

                            {/* 🟢 CHỌN MỐC KHÁNG HOẶC GÕ TRỰC TIẾP % KHÁNG (SẴN SÀNG CHO LV. 20+) */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase">🛡️ Kháng Cấp Độ:</span>
                                <select
                                    value={resistanceOptions.some(r => r.rate === Number(baseline.resistanceRate ?? 85)) ? Number(baseline.resistanceRate ?? 85) : "custom"}
                                    onChange={(e) => {
                                        if (e.target.value === "custom") return;
                                        const resVal = Number(e.target.value);
                                        const cDiv = 1 + resVal / 100;
                                        const pDiv = 1 + (resVal / 100) * 0.4;
                                        updateBaselineField({
                                            resistanceRate: resVal,
                                            precisionRate: +((baseline.rawPrecisionRate ?? 134.5) / pDiv).toFixed(1),
                                            critRate: +((baseline.rawCritRate ?? 117.6) / cDiv).toFixed(1),
                                            affinityRate: +((baseline.rawAffinityRate ?? 37.6) / cDiv).toFixed(1),
                                        });
                                    }}
                                    className="bg-zinc-900 border border-rose-500/40 rounded-xl px-2.5 py-1.5 text-xs font-bold text-rose-300"
                                >
                                    {resistanceOptions.map(opt => (
                                        <option key={opt.rate} value={opt.rate}>{opt.labelVi}</option>
                                    ))}
                                    {!resistanceOptions.some(r => r.rate === Number(baseline.resistanceRate ?? 85)) && (
                                        <option value="custom">⚡ Tùy chỉnh: {baseline.resistanceRate}% Resistance</option>
                                    )}
                                </select>

                                {/* Ô GÕ SỐ % KHÁNG TRỰC TIẾP (DÙ LÊN LV.20 HAY BẤT KỲ % NÀO CŨNG TÍNH ĐƯỢC NGAY) */}
                                <div className="flex items-center bg-zinc-900 border border-amber-500/40 rounded-xl px-2 py-1">
                                    <input
                                        type="number"
                                        step="1"
                                        value={baseline.resistanceRate ?? 85}
                                        onChange={(e) => {
                                            const resVal = Math.max(0, Number(e.target.value));
                                            const cDiv = 1 + resVal / 100;
                                            const pDiv = 1 + (resVal / 100) * 0.4;
                                            updateBaselineField({
                                                resistanceRate: resVal,
                                                precisionRate: +((baseline.rawPrecisionRate ?? 134.5) / pDiv).toFixed(1),
                                                critRate: +((baseline.rawCritRate ?? 117.6) / cDiv).toFixed(1),
                                                affinityRate: +((baseline.rawAffinityRate ?? 37.6) / cDiv).toFixed(1),
                                            });
                                        }}
                                        className="w-12 bg-transparent text-xs font-mono font-black text-amber-300 text-center focus:outline-none"
                                        title="Nhập trực tiếp % Kháng bất kỳ (VD: 85, 95, 105...)"
                                    />
                                    <span className="text-[10px] font-bold text-zinc-400">%</span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const label = window.prompt("Nhập tên mốc Kháng mới (VD: Lv. 20/21 (Lv. 105): 105% Resistance):", "Lv. 20/21 (Lv. 105): 105% Resistance");
                                        if (!label) return;
                                        const rateStr = window.prompt("Nhập số % Kháng của mốc này (VD: 105):", "105");
                                        const numRate = Number(rateStr);
                                        if (isNaN(numRate) || numRate <= 0) return;

                                        const currentRes = wwmData?.CUSTOM_RESISTANCE_TIERS || {};
                                        setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                                            CUSTOM_RESISTANCE_TIERS: {
                                                ...currentRes,
                                                [String(numRate)]: { rate: numRate, labelVi: label.trim() }
                                            }
                                        }, { merge: true });
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-[10px] font-black text-rose-300 cursor-pointer"
                                    title="Thêm mốc cấp độ kháng mới (Lv. 20+) lên Firebase"
                                >
                                    + Thêm Mốc Lv.20+
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            {/* 1. TỶ LỆ CHÍNH XÁC (HIỂN THỊ CẢ SỐ VƯỢT TRẦN >100% ĐỂ BIẾT DƯ BAO NHIÊU) */}
                            <div className={`p-3 rounded-xl border ${
                                baseline.precisionRate < 98
                                    ? 'bg-rose-950/40 border-rose-500'
                                    : baseline.precisionRate > 103.5
                                        ? 'bg-amber-950/30 border-amber-500/60'
                                        : 'bg-zinc-900/70 border-emerald-500/40'
                            }`}>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-zinc-200 uppercase">🎯 1. Tỷ Lệ Chính Xác</span>
                                    <span className="text-[9px] font-mono text-zinc-400">Trần: 100%</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                                    <div>
                                        <span className="text-[9px] text-zinc-500 block">Số Trắng (%)</span>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={baseline.rawPrecisionRate ?? 134.5}
                                            onChange={(e) => {
                                                const rawVal = Number(e.target.value);
                                                updateBaselineField({
                                                    rawPrecisionRate: rawVal,
                                                    precisionRate: calcYellowPrecision(rawVal)
                                                });
                                            }}
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs font-mono font-bold text-zinc-100"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[9px] text-amber-400 block font-bold">Số Vàng Thực (%)</span>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={baseline.precisionRate}
                                            onChange={(e) => {
                                                const yVal = Number(e.target.value);
                                                updateBaselineField({
                                                    precisionRate: yVal,
                                                    rawPrecisionRate: +(yVal * precisionDivisor).toFixed(1)
                                                });
                                            }}
                                            className="w-full bg-zinc-950 border border-amber-500/50 rounded px-2 py-1 text-xs font-mono font-black text-amber-300"
                                        />
                                    </div>
                                </div>
                                <div className="text-[10px] mt-1.5 font-medium">
                                    {baseline.precisionRate > 100.0 ? (
                                        <span className={baseline.precisionRate > 103.5 ? "text-amber-300 font-bold" : "text-emerald-300"}>
                                            {baseline.precisionRate > 103.5 ? '⚠️ ' : '✅ '}
                                            Đạt 100% (Đang thừa <b>+{precisionOvercap}%</b> Vàng ≈ <b>+{((baseline.rawPrecisionRate ?? 134.5) - 100 * precisionDivisor).toFixed(1)}%</b> Trắng)
                                        </span>
                                    ) : baseline.precisionRate >= 98.0 ? (
                                        <span className="text-emerald-300">
                                            ✅ Chuẩn (Thiếu nhẹ <b>{(100 - baseline.precisionRate).toFixed(1)}%</b> Vàng)
                                        </span>
                                    ) : (
                                        <span className="text-rose-400 font-bold">
                                            🚨 Thiếu <b>{(100 - baseline.precisionRate).toFixed(1)}%</b> Vàng (Bị nhảy Trầy xước!)
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* 2. TỶ LỆ CHÍ MẠNG */}
                            <div className="p-3 rounded-xl border bg-zinc-900/70 border-amber-500/30">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-zinc-200 uppercase">💥 2. Tỷ Lệ Chí Mạng</span>
                                    <span className="text-[9px] font-mono text-zinc-400">×{(1 / critAffDivisor).toFixed(4)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                                    <div>
                                        <span className="text-[9px] text-zinc-500 block">Số Trắng (%)</span>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={baseline.rawCritRate ?? 117.6}
                                            onChange={(e) => {
                                                const rawVal = Number(e.target.value);
                                                updateBaselineField({
                                                    rawCritRate: rawVal,
                                                    critRate: calcYellowCritOrAff(rawVal)
                                                });
                                            }}
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs font-mono font-bold text-zinc-100"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[9px] text-amber-400 block font-bold">Số Vàng (%)</span>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={baseline.critRate}
                                            onChange={(e) => {
                                                const yVal = Number(e.target.value);
                                                updateBaselineField({
                                                    critRate: yVal,
                                                    rawCritRate: +(yVal * critAffDivisor).toFixed(1)
                                                });
                                            }}
                                            className="w-full bg-zinc-950 border border-amber-500/50 rounded px-2 py-1 text-xs font-mono font-black text-amber-300"
                                        />
                                    </div>
                                </div>
                                <div className="text-[10px] text-zinc-400 mt-1.5">
                                    Kèm Crit trực tiếp: <b className={totalEffectiveCrit > 80.5 ? "text-rose-400" : "text-amber-300"}>{totalEffectiveCrit}% / 80%</b>
                                </div>
                            </div>

                            {/* 3. TỶ LỆ HIỂU Ý */}
                            <div className="p-3 rounded-xl border bg-zinc-900/70 border-zinc-800">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-zinc-200 uppercase">🌀 3. Tỷ Lệ Hiểu Ý</span>
                                    <span className="text-[9px] font-mono text-zinc-400">×{(1 / critAffDivisor).toFixed(4)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                                    <div>
                                        <span className="text-[9px] text-zinc-500 block">Số Trắng (%)</span>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={baseline.rawAffinityRate ?? 37.6}
                                            onChange={(e) => {
                                                const rawVal = Number(e.target.value);
                                                updateBaselineField({
                                                    rawAffinityRate: rawVal,
                                                    affinityRate: calcYellowCritOrAff(rawVal)
                                                });
                                            }}
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs font-mono font-bold text-zinc-100"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[9px] text-amber-400 block font-bold">Số Vàng (%)</span>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={baseline.affinityRate}
                                            onChange={(e) => {
                                                const yVal = Number(e.target.value);
                                                updateBaselineField({
                                                    affinityRate: yVal,
                                                    rawAffinityRate: +(yVal * critAffDivisor).toFixed(1)
                                                });
                                            }}
                                            className="w-full bg-zinc-950 border border-amber-500/50 rounded px-2 py-1 text-xs font-mono font-black text-amber-300"
                                        />
                                    </div>
                                </div>
                                <div className="text-[10px] text-emerald-400 mt-1.5">
                                    Phẩm cấp tại [{selectedSpec}]: <b>{resolveStatGroupForSpec(statOptions.find(s => s.key === 'AFFINITY_RATE') || DEFAULT_STAT_OPTIONS[8], selectedSpec)}</b>
                                </div>
                            </div>

                            {/* 4. TỶ LỆ TRỰC TIẾP */}
                            <div className="p-3 rounded-xl border bg-zinc-900/70 border-zinc-800">
                                <div className="text-[10px] font-bold text-amber-300 uppercase">⚡ 4. Tỷ Lệ Trực Tiếp</div>
                                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                                    <div>
                                        <span className="text-[9px] text-amber-400 block">Crit Trực Tiếp</span>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={baseline.directCritRate ?? 9.2}
                                            onChange={(e) => updateBaselineField({ directCritRate: Number(e.target.value) })}
                                            className="w-full bg-zinc-950 border border-amber-500/40 rounded px-2 py-1 text-xs font-mono font-black text-amber-300"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[9px] text-cyan-400 block">Hiểu Ý Trực Tiếp</span>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={baseline.directAffinityRate ?? 0.0}
                                            onChange={(e) => updateBaselineField({ directAffinityRate: Number(e.target.value) })}
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs font-mono font-bold text-cyan-300"
                                        />
                                    </div>
                                </div>
                                <div className="text-[10px] text-zinc-400 mt-1.5">
                                    Không bị trừ bởi {baseline.resistanceRate ?? 85}% Kháng
                                </div>
                            </div>

                            {/* 5. TỶ LỆ CHÍ MẠNG HIỂU Ý CUỐI CÙNG (CỘT MỐC 100%) */}
                            <div className={`p-3 rounded-xl border-2 flex flex-col justify-between ${
                                finalCritAffinityRate > 100.5
                                    ? 'bg-rose-950/40 border-rose-500'
                                    : finalCritAffinityRate >= 90
                                        ? 'bg-emerald-950/30 border-emerald-500/60'
                                        : 'bg-zinc-900/80 border-amber-500/40'
                            }`}>
                                <div>
                                    <div className="text-[10px] font-black text-emerald-400 uppercase">🔥 5. Chí Mạng Hiểu Ý Cuối</div>
                                    <div className="text-xl font-black font-mono text-amber-300 mt-1">
                                        {finalCritAffinityRate}% <span className="text-xs text-zinc-400 font-normal">/ 100%</span>
                                    </div>
                                </div>
                                <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 my-1">
                                    <div
                                        className={`h-full ${finalCritAffinityRate > 100.5 ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-400 to-emerald-400'}`}
                                        style={{ width: `${Math.min(100, finalCritAffinityRate)}%` }}
                                    />
                                </div>
                                <div className="text-[10px] font-bold">
                                    {finalCritAffinityRate > 100.5 ? (
                                        <span className="text-rose-400">⚠️ Tràn bàn tròn &gt;100% (Thừa +{(finalCritAffinityRate - 100).toFixed(1)}%)!</span>
                                    ) : finalCritAffinityRate >= 95 ? (
                                        <span className="text-emerald-300">💎 Chuẩn Build Tối Thượng (Sát 100%)!</span>
                                    ) : (
                                        <span className="text-amber-300">✨ Còn trống {(100 - finalCritAffinityRate).toFixed(1)}% tới trần 100%</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                        <div>
                            <label className="block text-[10px] font-bold text-emerald-400 uppercase mb-1">🤖 Model AI OCR:</label>
                            <input
                                type="text"
                                value={geminiModel}
                                onChange={(e) => {
                                    setGeminiModel(e.target.value);
                                    localStorage.setItem('tl_gemini_model', e.target.value);
                                }}
                                placeholder="gemini-3.5-flash-lite"
                                className="w-full bg-zinc-900 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-mono font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">🔑 Gemini API Key:</label>
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
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">📤 Discord Webhook:</label>
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

            {/* KHU VỰC 2 & 3: LƯỚI 8 MÓN ĐANG MẶC (TRÁI) & BÀN CHỈNH SỬA / GIÁM ĐỊNH ĐỒ (PHẢI) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* CỘT TRÁI (5 CỘT): 8 MÓN ĐANG MẶC */}
                <div className="lg:col-span-5 bg-[#090d16] border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                        <div>
                            <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider">
                                🛡️ 8 Món Đang Mặc ({currentIngame})
                            </h3>
                            <p className="text-[11px] text-zinc-400">
                                Nhấp vào món bất kỳ để <b>Sửa các dòng của món đang mặc</b> hoặc <b>Đối chiếu phôi mới</b>
                            </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={handleClearAll8Slots}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold cursor-pointer"
                            >
                                🧹 Làm Trống 8 Món
                            </button>
                            <button
                                type="button"
                                onClick={handleLoadSampleBiS8Slots}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold cursor-pointer"
                            >
                                ✨ Nạp Mẫu BiS
                            </button>
                        </div>
                    </div>

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
                            <div className="text-[10px] text-zinc-500 truncate">{activeTalentsMeta.t1.statTitle.split('(')[0]}</div>
                            <div className={`text-xs font-black font-mono ${t1LineCount >= activeTalentsMeta.t1.recommendedLines ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {t1LineCount} / {activeTalentsMeta.t1.recommendedLines} dòng
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {SLOTS_CONFIG.map((slot) => {
                            const item = normalizeGearItemLines(equipped[slot.key]);
                            const ev = evaluateGear(item);
                            const isSelected = activeSlot === slot.key;
                            const disp = getSlotDisplayInfo(slot, item);
                            const setLabel = gearSetOptions.find(s => s.key === item.gearSet)?.labelVi.split('(')[0].trim() || item.gearSet;

                            return (
                                <div
                                    key={slot.key}
                                    onClick={() => handleSelectSlot(slot.key)}
                                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${isSelected
                                            ? 'bg-emerald-950/30 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                            : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'
                                        }`}
                                >
                                    <div className="flex justify-between items-start gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">{disp.icon}</span>
                                            <div>
                                                <div className="text-xs font-black text-zinc-100">{disp.title}</div>
                                                <div className="text-[10px] text-emerald-400 font-semibold">
                                                    Bậc {item.tier} • {setLabel}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black block ${ev.badPointsAfterOneRetune <= 0.5 ? 'bg-emerald-500/20 text-emerald-300' : ev.badPointsAfterOneRetune <= 2.0 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                                                }`}>
                                                {ev.badPoints.toFixed(1)} ➔ {ev.badPointsAfterOneRetune.toFixed(1)} xấu
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-2 pt-2 border-t border-zinc-800/70 text-[10px] text-amber-300 font-medium truncate">
                                        🔒 #1: {statOptions.find(o => o.key === item.slot1.statKey)?.labelVi || item.slot1.statKey} (+{item.slot1.value})
                                    </div>
                                    <div className="mt-1 text-[9px] text-zinc-400 truncate">
                                        #2–#{item.tuningLines.length + 1}: {item.tuningLines.map(l => statOptions.find(o => o.key === l.statKey)?.labelEn.split(' ')[0] || l.statKey).join(' • ')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="pt-3 border-t border-zinc-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                                📦 Kho Vũ Khí (Arsenal Bảo Toàn)
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">{arsenal96.length} món bảo toàn</span>
                        </div>
                        {arsenal96.length === 0 ? (
                            <p className="text-[11px] text-zinc-500 italic bg-zinc-950/60 p-3 rounded-xl border border-dashed border-zinc-800">
                                Tuyệt đối KHÔNG phân tách (dismantle) đồ cũ có Mastery cao! Khi đại hiệp thay đồ bậc mới vào người, đồ cũ sẽ tự động cất vào đây để kích hoạt Thiên Phú 3.
                            </p>
                        ) : (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {arsenal96.map((g, idx) => (
                                    <div key={idx} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 flex justify-between items-center text-xs">
                                        <span className="text-amber-300 font-bold">{g.name} (Bậc {g.tier} • {g.gearSet})</span>
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

                {/* CỘT PHẢI (7 CỘT): CẤU TRÚC 6 DÒNG CHUẨN XÁC */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-[#090d16] border border-emerald-500/30 rounded-3xl p-5 shadow-xl space-y-5">

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setEditorMode('edit_equipped')}
                                className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${editorMode === 'edit_equipped'
                                        ? 'bg-emerald-500 text-zinc-950 shadow-md'
                                        : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                            >
                                <span>✏️ Chế Độ 1: Sửa Món Đang Mặc ({currentSlotDisplay.icon})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditorMode('compare_new')}
                                className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${editorMode === 'compare_new'
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
                                        ? `🛠️ Đang Chỉnh Sửa 6 Dòng Của: ${currentSlotDisplay.title}`
                                        : `🔍 Đang Soi Phôi Mới Nhặt So Với: ${currentSlotDisplay.title}`}
                                </h3>
                                <p className="text-xs text-zinc-400">
                                    Danh sách dòng tự động xếp theo <b>🌟 [T0] ➔ ⚔️ [T1] ➔ 🌪️ [T2] ➔ ❌ [T3]</b> của nhánh <b className="text-amber-300">{selectedSpec}</b>.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowStatDictModal(true)}
                                    className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold cursor-pointer transition-all"
                                >
                                    ⚙️ Đổi Bậc T1/T2/T3 Theo Hệ
                                </button>

                                <label className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold cursor-pointer text-center transition-all">
                                    {isScanning ? "⏳ AI đang đọc 6 dòng..." : "📷 Tải Ảnh / Ctrl+V"}
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
                        </div>

                        {previewImage && (
                            <div className="flex items-center gap-4 bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                                <img src={previewImage} alt="Gear Preview" className="w-20 h-20 object-cover rounded-xl border border-amber-500/30" />
                                <div className="text-xs text-zinc-300 space-y-1">
                                    <div className="font-bold text-emerald-400">✅ Đã nạp ảnh chụp màn hình trang bị!</div>
                                    <p className="text-[11px] text-zinc-500">AI đọc đúng thứ tự từ trên xuống dưới: Dòng đầu tiên vào #1, 4 dòng tiếp theo vào #2–#5, dòng ❖ cuối vào Định Âm.</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-950/70 p-4 rounded-2xl border border-zinc-800/80">
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Vị trí món đồ (8 Ô chuẩn):</label>
                                <select
                                    value={activeSlot}
                                    onChange={(e) => handleSelectSlot(e.target.value as SlotKey)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
                                >
                                    {SLOTS_CONFIG.map(s => {
                                        const disp = getSlotDisplayInfo(s, equipped[s.key]);
                                        return (
                                            <option key={s.key} value={s.key}>{disp.icon} {disp.title}</option>
                                        );
                                    })}
                                </select>
                            </div>

                            {currentSlotMeta.isWeaponSlot ? (
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[10px] font-bold text-amber-400 uppercase">⚔️ Loại Vũ Khí (Đa hệ phái):</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDictTab('weapon');
                                                setShowStatDictModal(true);
                                            }}
                                            className="text-[10px] text-emerald-400 hover:underline font-bold cursor-pointer"
                                        >
                                            + Thêm vũ khí
                                        </button>
                                    </div>
                                    <select
                                        value={activeEditingGear.weaponType || getDefaultWeaponForSpec(selectedSpec, activeSlot)}
                                        onChange={(e) => updateActiveEditingGear(g => ({ ...g, weaponType: e.target.value }))}
                                        className="w-full bg-zinc-900 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
                                    >
                                        {weaponTypeOptions.map(w => (
                                            <option key={w.key} value={w.key}>{w.icon} {w.labelVi} ({w.labelEn})</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Tên món đồ (Tùy chỉnh):</label>
                                    <input
                                        type="text"
                                        value={activeEditingGear.name}
                                        onChange={(e) => updateActiveEditingGear(g => ({ ...g, name: e.target.value }))}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 font-bold"
                                    />
                                </div>
                            )}

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Bậc trang bị (Tier):</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDictTab('tier');
                                            setShowStatDictModal(true);
                                        }}
                                        className="text-[10px] text-amber-400 hover:underline font-bold cursor-pointer"
                                    >
                                        + Thêm Bậc Mới
                                    </button>
                                </div>
                                <select
                                    value={activeEditingGear.tier}
                                    onChange={(e) => updateActiveEditingGear(g => ({ ...g, tier: Number(e.target.value) }))}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 font-bold"
                                >
                                    {tierOptions.map(t => (
                                        <option key={t.tier} value={t.tier}>{t.labelVi}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Bộ Set Trang Bị:</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDictTab('gearset');
                                            setShowStatDictModal(true);
                                        }}
                                        className="text-[10px] text-emerald-400 hover:underline font-bold cursor-pointer"
                                    >
                                        + Thêm / Sửa Bộ Set
                                    </button>
                                </div>
                                <select
                                    value={activeEditingGear.gearSet}
                                    onChange={(e) => updateActiveEditingGear(g => ({ ...g, gearSet: e.target.value }))}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold"
                                >
                                    {gearSetOptions.map(s => (
                                        <option key={s.key} value={s.key}>{s.labelVi}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* HỆ THỐNG DÒNG TRANG BỊ */}
                        <div className="space-y-3">
                            {/* DÒNG #1: DÒNG GỐC SINH RA ĐÃ CÓ */}
                            <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-3.5">
                                <div className="flex flex-wrap justify-between items-center gap-2 mb-1.5">
                                    <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <span>🔒 Dòng #1 (Dòng Gốc Sinh Ra Đã Có — Không Tẩy Lẻ Được):</span>
                                    </span>
                                    <span className="text-[10px] text-zinc-400">
                                        Chấm điểm dòng #1: <b className={activeGearEval.slot1Eval?.badPt === 0 ? "text-emerald-300" : "text-amber-300"}>
                                            +{activeGearEval.slot1Eval?.badPt.toFixed(1) || 0} điểm xấu
                                        </b>
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-bold text-amber-400 w-7">#1</span>
                                    <select
                                        value={activeEditingGear.slot1.statKey}
                                        onChange={(e) => {
                                            const opt = statOptions.find(o => o.key === e.target.value);
                                            updateActiveEditingGear(g => ({
                                                ...g,
                                                slot1: { statKey: e.target.value, value: opt ? opt.defaultVal : 41.5 }
                                            }));
                                        }}
                                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
                                    >
                                        {statOptions.map(o => (
                                            <option key={o.key} value={o.key}>{formatStatForSpec(o)}</option>
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

                            {/* CÁC DÒNG MỞ TUNING (#2, #3, #4, #5...) — CHO PHÉP THÊM / BỚT DÒNG & KHÓA 1 QUYỀN RETUNE */}
                            <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5">
                                <div className="flex flex-wrap justify-between items-center gap-2">
                                    <div>
                                        <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider block">
                                            🛠️ Các Dòng Mở Tuning (#2, #3, #4, #5) — Chỉ Được Tẩy Lại (Retune) Duy Nhất 1 Dòng:
                                        </span>
                                        <span className="text-[10px] text-zinc-400">
                                            Chọn <b>[🎯 Đã Tẩy]</b> ở 1 dòng bất kỳ để khóa các dòng còn lại, hoặc dùng nút <b>[+ Thêm ô dòng]</b> / <b>[✕]</b> để thêm bớt dòng.
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {activeEditingGear.retunedLineIndex !== null && activeEditingGear.retunedLineIndex !== undefined && (
                                            <button
                                                type="button"
                                                onClick={() => updateActiveEditingGear(g => ({ ...g, retunedLineIndex: null }))}
                                                className="text-[10px] px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold cursor-pointer"
                                            >
                                                🔄 Bỏ khóa Retune
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDictTab('tuning');
                                                setShowStatDictModal(true);
                                            }}
                                            className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold cursor-pointer"
                                        >
                                            ⚙️ Đổi Bậc T1/T2/T3 / +Dòng mới
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateActiveEditingGear(g => ({
                                                ...g,
                                                tuningLines: [...g.tuningLines, { statKey: 'MAX_PHYS_ATK', value: 45 }]
                                            }))}
                                            className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold cursor-pointer"
                                        >
                                            + Thêm ô dòng (#{activeEditingGear.tuningLines.length + 2})
                                        </button>
                                    </div>
                                </div>

                                {activeEditingGear.tuningLines.map((tLine, idx) => {
                                    const lineNo = idx + 2;
                                    const isSelectedRetune = activeEditingGear.retunedLineIndex === idx;
                                    const isLockedByOtherRetune = activeEditingGear.retunedLineIndex !== null && activeEditingGear.retunedLineIndex !== undefined && activeEditingGear.retunedLineIndex !== idx;
                                    const isRecommendedToRetune = activeGearEval.bestTargetLineToRetune?.lineNumber === lineNo;

                                    return (
                                        <div
                                            key={idx}
                                            className={`flex flex-wrap sm:flex-nowrap items-center gap-2 p-1.5 rounded-xl border transition-all ${isSelectedRetune
                                                    ? 'bg-emerald-950/30 border-emerald-500/50'
                                                    : isRecommendedToRetune
                                                        ? 'bg-amber-950/20 border-amber-500/40'
                                                        : 'border-transparent'
                                                }`}
                                        >
                                            <span className="text-xs font-mono font-bold text-zinc-400 w-6">#{lineNo}</span>
                                            <select
                                                value={tLine.statKey}
                                                onChange={(e) => {
                                                    const opt = statOptions.find(o => o.key === e.target.value);
                                                    updateActiveEditingGear(g => {
                                                        const nextLines = [...g.tuningLines];
                                                        nextLines[idx] = { statKey: e.target.value, value: opt ? opt.defaultVal : 45 };
                                                        return { ...g, tuningLines: nextLines };
                                                    });
                                                }}
                                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 font-medium"
                                            >
                                                {statOptions.map(o => (
                                                    <option key={o.key} value={o.key}>{formatStatForSpec(o)}</option>
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
                                                className="w-24 bg-zinc-900 border border-amber-500/40 rounded-xl px-2 py-1.5 text-xs font-mono font-bold text-amber-300 text-center"
                                            />

                                            <button
                                                type="button"
                                                onClick={() => updateActiveEditingGear(g => ({
                                                    ...g,
                                                    retunedLineIndex: g.retunedLineIndex === idx ? null : idx
                                                }))}
                                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black shrink-0 cursor-pointer transition-all border ${isSelectedRetune
                                                        ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-sm'
                                                        : isLockedByOtherRetune
                                                            ? 'bg-zinc-900/60 text-zinc-600 border-zinc-800'
                                                            : isRecommendedToRetune
                                                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                                                                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                                                    }`}
                                                title="Trong các dòng mở Tuning, bạn chỉ được phép tẩy lại (Retune) duy nhất 1 dòng!"
                                            >
                                                {isSelectedRetune
                                                    ? '🎯 Đã Tẩy (1/1)'
                                                    : isLockedByOtherRetune
                                                        ? '🔒 Khóa'
                                                        : isRecommendedToRetune
                                                            ? '💡 Nên Tẩy'
                                                            : 'Tẩy dòng này'}
                                            </button>

                                            {activeEditingGear.tuningLines.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => updateActiveEditingGear(g => ({
                                                        ...g,
                                                        tuningLines: g.tuningLines.filter((_, i) => i !== idx),
                                                        retunedLineIndex: g.retunedLineIndex === idx ? null : g.retunedLineIndex
                                                    }))}
                                                    className="text-zinc-500 hover:text-rose-400 px-1.5 text-xs font-bold cursor-pointer"
                                                    title="Xóa ô dòng này"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* DÒNG CUỐI: ĐỊNH ÂM KHÓA CUỐI (ATTUNEMENT) */}
                            <div className={`rounded-2xl p-3.5 border ${activeGearEval.attuneTrap ? 'bg-rose-950/30 border-rose-500' : 'bg-cyan-950/20 border-cyan-500/30'}`}>
                                <div className="flex flex-wrap justify-between items-center gap-2 mb-1.5">
                                    <span className="text-[11px] font-black text-cyan-400 uppercase tracking-wider">
                                        ❖ Dòng #{activeEditingGear.tuningLines.length + 2} · Định Âm Khóa Cuối (Attunement):
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDictTab('attunement');
                                            setShowStatDictModal(true);
                                        }}
                                        className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-bold cursor-pointer"
                                    >
                                        ✍️ Sửa tên / +Thêm Định Âm mới
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-bold text-cyan-400 w-7">#{activeEditingGear.tuningLines.length + 2}</span>
                                    <select
                                        value={activeEditingGear.attunementKey}
                                        onChange={(e) => updateActiveEditingGear(g => ({ ...g, attunementKey: e.target.value }))}
                                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-cyan-300 font-bold"
                                    >
                                        {attunementOptions.map(a => (
                                            <option key={a.key} value={a.key}>{a.labelVi}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={activeEditingGear.attunementValue || 0}
                                        onChange={(e) => updateActiveEditingGear(g => ({ ...g, attunementValue: Number(e.target.value) }))}
                                        placeholder="Chỉ số"
                                        className="w-24 bg-zinc-950 border border-cyan-500/40 rounded-xl px-2 py-2 text-xs font-mono font-bold text-cyan-300 text-center"
                                    />
                                </div>
                                {activeGearEval.attuneTrap && (
                                    <div className="mt-2 text-xs font-bold text-rose-400 bg-rose-950/60 px-3 py-2 rounded-xl border border-rose-500/40">
                                        {activeGearEval.attuneTrap}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* HỘP PHÁN QUYẾT */}
                        <div className={`rounded-2xl p-5 border-2 shadow-xl space-y-3 ${activeGearEval.verdictColor === 'emerald'
                                ? 'bg-emerald-950/30 border-emerald-500/60'
                                : activeGearEval.verdictColor === 'amber'
                                    ? 'bg-amber-950/30 border-amber-500/60'
                                    : 'bg-rose-950/30 border-rose-500/60'
                            }`}>
                            <div className="flex flex-wrap justify-between items-center gap-2">
                                <h4 className={`text-base font-black tracking-wide ${activeGearEval.verdictColor === 'emerald' ? 'text-emerald-300' : activeGearEval.verdictColor === 'amber' ? 'text-amber-300' : 'text-rose-300'
                                    }`}>
                                    {activeGearEval.verdictTitle}
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 rounded-full bg-zinc-950 border border-zinc-700 text-xs font-mono font-bold text-zinc-400">
                                        Hiện tại: {activeGearEval.badPoints.toFixed(1)} xấu
                                    </span>
                                    <span className="px-3 py-1 rounded-full bg-zinc-950 border border-amber-500/50 text-xs font-mono font-black text-amber-400">
                                        Sau Tẩy 1 Dòng: {activeGearEval.badPointsAfterOneRetune.toFixed(1)} / 2.0
                                    </span>
                                </div>
                            </div>

                            <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                                {activeGearEval.verdictAction}
                            </p>

                            {/* 🟢 BẢNG XEM TRƯỚC KẾT QUẢ CHUYỂN ÂM (BỂ 6 DÒNG CỐ ĐỊNH — MỖI TUẦN 1 LẦN, KHÔNG CÓ T0) */}
                            <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
                                    <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider">
                                        🎲 Xem Trước Bể 6 Dòng Chuyển Âm — Nhánh [{selectedSpec}] (1 Lần/Tuần • Không Có T0)
                                    </span>
                                    <span className="text-[10px] text-zinc-400">
                                        Các dòng đã có trên đồ sẽ tự động bị làm mờ (Loại trừ trùng lặp)
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {activeGearEval.retunePoolPreview.map((pItem) => (
                                        <div
                                            key={pItem.statKey}
                                            className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                                                pItem.isGreyedOut
                                                    ? 'bg-zinc-900/30 border-zinc-800/60 opacity-40'
                                                    : pItem.isGoodTarget
                                                        ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                                                        : 'bg-zinc-900/80 border-zinc-700'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-1">
                                                <span className={`text-[11px] font-bold truncate ${
                                                    pItem.isGreyedOut ? 'text-zinc-500 line-through' : pItem.isGoodTarget ? 'text-emerald-300' : 'text-zinc-200'
                                                }`}>
                                                    {pItem.nameVi}
                                                </span>
                                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-950 text-amber-300 shrink-0">
                                                    {pItem.tier}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[10px] font-mono text-zinc-400">{pItem.rangeText}</span>
                                                <span className="text-[9px] font-black">
                                                    {pItem.isGreyedOut ? '🔒 Đã có trên đồ' : pItem.isGoodTarget ? '🌟 Cửa Sáng Nên Lấy' : '⚠️ Tránh'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {activeGearEval.crossSpecHints.length > 0 && (
                                <div className="bg-zinc-950/80 border border-amber-500/30 rounded-xl p-2.5 text-[11px] text-amber-300">
                                    💡 <b>Gợi ý Đa Hệ Võ Học:</b> {activeGearEval.crossSpecHints.join(' • ')}
                                </div>
                            )}

                            {editorMode === 'compare_new' && (
                                <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3.5 space-y-2">
                                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                        ⚖️ Độ Chênh Lệch (Delta) Nếu Thay Món Này Vào [{currentSlotDisplay.title}]:
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                                        <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                                            <span className="text-[10px] text-zinc-500 block truncate">{activeTalentsMeta.t1.statTitle}</span>
                                            <span className={`font-black ${comparisonDelta.deltaAgi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {comparisonDelta.deltaAgi >= 0 ? `+${comparisonDelta.deltaAgi}` : comparisonDelta.deltaAgi} (➔ {comparisonDelta.newTotalAgi})
                                            </span>
                                        </div>
                                        <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                                            <span className="text-[10px] text-zinc-500 block truncate">{activeTalentsMeta.t3.statTitle}</span>
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
                                        ? `💾 Lưu Cập Nhật Món [${currentSlotDisplay.title}] Lên Mây`
                                        : `⚡ Thay Phôi Này Vào [${currentSlotDisplay.title}] & Lưu Mây`}
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
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                            <div>
                                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">
                                    📜 Bộ 4 Tâm Pháp Đang Trang Bị (Inner Ways — Hệ [{selectedSpec}])
                                </h3>
                                <p className="text-[11px] text-zinc-400">
                                    Chọn trực tiếp từ kho <b className="text-emerald-400">{tamPhapList.length} Tâm Pháp</b> trên mây, hoặc bấm <b>+ Thêm / Sửa Tâm Pháp</b> để bổ sung Tâm Pháp mới.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDictTab('tamphap');
                                        setShowStatDictModal(true);
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-bold cursor-pointer"
                                >
                                    ✍️ Quản Lý / +Thêm Tâm Pháp Mới
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveSpecInnerWaysTemplate}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold cursor-pointer"
                                    title="Lưu 4 Tâm Pháp đang chọn làm mẫu mặc định cho hệ phái này"
                                >
                                    💾 Đặt Làm Mẫu Cho Hệ [{selectedSpec}]
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(['slot1', 'slot2', 'slot3', 'slot4'] as const).map((sKey, idx) => (
                                <div key={sKey} className="p-3.5 rounded-2xl bg-zinc-950 border border-emerald-500/30 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-emerald-400 font-bold uppercase">Ô Tâm Pháp {idx + 1}</span>
                                        <select
                                            value={innerWays[sKey].tier}
                                            onChange={(e) => {
                                                setHasUnsavedChanges(true);
                                                setInnerWays({ ...innerWays, [sKey]: { ...innerWays[sKey], tier: Number(e.target.value) } });
                                            }}
                                            className="bg-zinc-900 border border-amber-500/40 rounded-lg px-2 py-0.5 text-xs text-amber-300 font-mono font-bold"
                                        >
                                            {[1, 2, 3, 4, 5, 6].map(t => <option key={t} value={t}>Tier {t}</option>)}
                                        </select>
                                    </div>

                                    <select
                                        value={tamPhapList.some(tp => tp.display === innerWays[sKey].name) ? innerWays[sKey].name : ""}
                                        onChange={(e) => {
                                            if (!e.target.value) return;
                                            setHasUnsavedChanges(true);
                                            setInnerWays({ ...innerWays, [sKey]: { ...innerWays[sKey], name: e.target.value } });
                                        }}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-bold"
                                    >
                                        <option value="">-- Chọn từ Kho Tâm Pháp ({tamPhapList.length}) --</option>
                                        {tamPhapList.map(tp => (
                                            <option key={tp.id} value={tp.display}>{tp.display}</option>
                                        ))}
                                    </select>

                                    <input
                                        type="text"
                                        value={innerWays[sKey].name}
                                        onChange={(e) => {
                                            setHasUnsavedChanges(true);
                                            setInnerWays({ ...innerWays, [sKey]: { ...innerWays[sKey], name: e.target.value } });
                                        }}
                                        placeholder="Hoặc tự gõ tên Tâm Pháp tại đây..."
                                        className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-200"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL TÀNG KINH CÁC: 7 HẠNG MỤC */}
            {showStatDictModal && (
                <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-emerald-500/40 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
                            <div>
                                <h3 className="text-lg font-black text-amber-400">
                                    ⚙️ Tàng Kinh Các · Quản Lý Dòng, Set, Bậc, Vũ Khí, Võ Học & Tâm Pháp
                                </h3>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    Các dòng tự động sắp xếp chuẩn từ <b>T0 ➔ T1 ➔ T2 ➔ T3</b> theo nhánh Võ Học đang chọn!
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowStatDictModal(false)}
                                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer"
                            >
                                ✕ Đóng
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2 p-3 bg-zinc-950/60 border-b border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setDictTab('tuning')}
                                className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer ${dictTab === 'tuning' ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400'
                                    }`}
                            >
                                🛠️ 1. Dòng Tẩy Luyện ({statOptions.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setDictTab('attunement')}
                                className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer ${dictTab === 'attunement' ? 'bg-cyan-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400'
                                    }`}
                            >
                                🔮 2. Dòng Định Âm ({attunementOptions.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setDictTab('gearset')}
                                className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer ${dictTab === 'gearset' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400'
                                    }`}
                            >
                                🛡️ 3. Bộ Set ({gearSetOptions.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setDictTab('tier')}
                                className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer ${dictTab === 'tier' ? 'bg-rose-500 text-white' : 'bg-zinc-900 text-zinc-400'
                                    }`}
                            >
                                🔥 4. Bậc Tier ({tierOptions.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setDictTab('weapon')}
                                className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer ${dictTab === 'weapon' ? 'bg-purple-500 text-white' : 'bg-zinc-900 text-zinc-400'
                                    }`}
                            >
                                ⚔️ 5. Vũ Khí ({weaponTypeOptions.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setDictTab('vohoc')}
                                className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer ${dictTab === 'vohoc' ? 'bg-sky-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400'
                                    }`}
                            >
                                🥋 6. Nhánh Võ Học ({voHocList.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setDictTab('tamphap')}
                                className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer ${dictTab === 'tamphap' ? 'bg-indigo-500 text-white' : 'bg-zinc-900 text-zinc-400'
                                    }`}
                            >
                                📜 7. Tâm Pháp ({tamPhapList.length})
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
                            {dictTab === 'tuning' && (
                                <>
                                    <form onSubmit={handleSaveCustomTuningStat} className="lg:col-span-5 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3 h-fit">
                                        <div className="text-xs font-black text-emerald-400 uppercase">
                                            {editingStatItem.key ? `✏️ Đang sửa mã: ${editingStatItem.key}` : '➕ Thêm Dòng Tẩy Luyện Mới'}
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Mã định danh (Để trống tự tạo):</label>
                                            <input
                                                type="text"
                                                value={editingStatItem.key}
                                                onChange={(e) => setEditingStatItem({ ...editingStatItem, key: e.target.value })}
                                                placeholder="VD: MAX_BELLSTRIKE_ATK"
                                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-amber-400 uppercase mb-1">Tên dòng thuần túy (Không cần gõ [T1/T2]):</label>
                                            <input
                                                type="text"
                                                required
                                                value={editingStatItem.labelVi}
                                                onChange={(e) => setEditingStatItem({ ...editingStatItem, labelVi: e.target.value })}
                                                placeholder="VD: Công Kích Minh Kim Tối Đa (Bellstrike Attack)"
                                                className="w-full bg-zinc-900 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-emerald-400 uppercase mb-1">Áp dụng Phân Nhóm này cho:</label>
                                            <select
                                                value={editingStatScope}
                                                onChange={(e) => setEditingStatScope(e.target.value as any)}
                                                className="w-full bg-zinc-900 border border-emerald-500/40 rounded-xl px-2.5 py-2 text-xs text-emerald-300 font-bold"
                                            >
                                                <option value="current_spec">🎯 Chỉ riêng hệ [{selectedSpec}]</option>
                                                <option value="all_specs">🌐 Toàn bộ tất cả hệ Võ Học</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Phân Nhóm tại [{selectedSpec}]:</label>
                                                <select
                                                    value={editingStatItem.group}
                                                    onChange={(e) => setEditingStatItem({ ...editingStatItem, group: e.target.value as StatGroupTier })}
                                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-2 text-xs text-amber-300 font-bold"
                                                >
                                                    <option value="T0">🌟 T0 (God Line - 0 xấu)</option>
                                                    <option value="T1">⚔️ T1 (Chuẩn - 0 xấu)</option>
                                                    <option value="T2">🌪️ T2 (Tình huống - 0.5 xấu)</option>
                                                    <option value="T3">❌ T3 (Rác / Lệch hệ - 1.0 xấu)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Số mặc định:</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={editingStatItem.defaultVal}
                                                    onChange={(e) => setEditingStatItem({ ...editingStatItem, defaultVal: Number(e.target.value) })}
                                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button type="button" onClick={() => setEditingStatItem({ key: '', labelVi: '', labelEn: '', group: 'T1', specGroups: {}, defaultVal: 40, unit: '', crossSpecHint: '' })} className="px-3 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer">Làm mới</button>
                                            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase cursor-pointer">💾 Lưu & Sắp Xếp</button>
                                        </div>
                                    </form>
                                    <div className="lg:col-span-7 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                                        <div className="text-[11px] text-zinc-400 mb-1">
                                            Đang sắp xếp chuẩn <b>T0 ➔ T1 ➔ T2 ➔ T3</b> theo hệ: <b className="text-emerald-400">{selectedSpec}</b>
                                        </div>
                                        {statOptions.map((item) => {
                                            const effGroup = resolveStatGroupForSpec(item, selectedSpec);
                                            return (
                                                <div key={item.key} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold text-zinc-100 truncate">
                                                            <span className="text-amber-300 mr-1.5">{TIER_BADGE_PREFIX[effGroup]}</span>
                                                            {item.labelVi}
                                                        </div>
                                                        <div className="text-[10px] text-zinc-500 font-mono">
                                                            Mã: {item.key} • Bậc tại [{selectedSpec}]: <b className="text-emerald-400">{effGroup}</b>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingStatItem({
                                                                ...item,
                                                                group: effGroup
                                                            })}
                                                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer"
                                                        >
                                                            ✏️ Sửa
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteTuningStat(item)}
                                                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold cursor-pointer"
                                                            title="Xóa dòng này khỏi danh sách"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            {dictTab === 'attunement' && (
                                <>
                                    <form onSubmit={handleSaveCustomAttunement} className="lg:col-span-5 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3 h-fit">
                                        <div className="text-xs font-black text-cyan-400 uppercase">
                                            {editingAttuneItem.key ? `✏️ Đang sửa: ${editingAttuneItem.key}` : '➕ Thêm Dòng Định Âm Mới'}
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-cyan-400 uppercase mb-1">Tên hiển thị Định Âm:</label>
                                            <input
                                                type="text"
                                                required
                                                value={editingAttuneItem.labelVi}
                                                onChange={(e) => setEditingAttuneItem({ ...editingAttuneItem, labelVi: e.target.value })}
                                                placeholder="VD: ✅ Định Âm Chuẩn Vũ Khí Mới"
                                                className="w-full bg-zinc-900 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-cyan-300 font-bold"
                                            />
                                        </div>
                                        <label className="flex items-center gap-2 pt-1 cursor-pointer">
                                            <input type="checkbox" checked={editingAttuneItem.isBiS} onChange={(e) => setEditingAttuneItem({ ...editingAttuneItem, isBiS: e.target.checked })} className="accent-emerald-400" />
                                            <span className="text-xs text-zinc-300 font-bold">Là Định Âm Chuẩn (Không báo lỗi bẫy)</span>
                                        </label>
                                        <div className="flex gap-2 pt-2">
                                            <button type="button" onClick={() => setEditingAttuneItem({ key: '', labelVi: '', labelEn: '', side: 'both', isBiS: true, trapWarning: '' })} className="px-3 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer">Làm mới</button>
                                            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-zinc-950 font-black text-xs uppercase cursor-pointer">💾 Lưu Định Âm</button>
                                        </div>
                                    </form>
                                    <div className="lg:col-span-7 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                                        {attunementOptions.map((item) => (
                                            <div key={item.key} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-zinc-100 truncate">{item.labelVi}</div>
                                                    <div className="text-[10px] text-zinc-500 font-mono">Mã: {item.key}</div>
                                                </div>
                                                <button type="button" onClick={() => setEditingAttuneItem({ ...item })} className="px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-bold shrink-0 cursor-pointer">✏️ Sửa</button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {dictTab === 'gearset' && (
                                <>
                                    <form onSubmit={handleSaveCustomGearSet} className="lg:col-span-5 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3 h-fit">
                                        <div className="text-xs font-black text-amber-400 uppercase">
                                            {editingSetItem.key ? `✏️ Đang sửa Bộ Set: ${editingSetItem.key}` : '➕ Thêm Bộ Trang Bị (Set) Mới'}
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Mã Set (Để trống tự tạo):</label>
                                            <input
                                                type="text"
                                                value={editingSetItem.key}
                                                onChange={(e) => setEditingSetItem({ ...editingSetItem, key: e.target.value })}
                                                placeholder="VD: CrimsonMoon"
                                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-amber-400 uppercase mb-1">Tên Bộ Set (Tiếng Việt / Anh):</label>
                                            <input
                                                type="text"
                                                required
                                                value={editingSetItem.labelVi}
                                                onChange={(e) => setEditingSetItem({ ...editingSetItem, labelVi: e.target.value })}
                                                placeholder="VD: Bộ Huyết Nguyệt (4 Vũ Khí Trái)"
                                                className="w-full bg-zinc-900 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Cảnh báo nếu có:</label>
                                            <input
                                                type="text"
                                                value={editingSetItem.warningText || ''}
                                                onChange={(e) => setEditingSetItem({ ...editingSetItem, warningText: e.target.value })}
                                                placeholder="Tùy chọn..."
                                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-300"
                                            />
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button type="button" onClick={() => setEditingSetItem({ key: '', labelVi: '', labelEn: '', side: 'both', warningText: '' })} className="px-3 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer">Làm mới</button>
                                            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-black text-xs uppercase cursor-pointer">💾 Lưu Bộ Set</button>
                                        </div>
                                    </form>
                                    <div className="lg:col-span-7 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                                        {gearSetOptions.map((item) => (
                                            <div key={item.key} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-emerald-300 truncate">{item.labelVi}</div>
                                                    <div className="text-[10px] text-zinc-500 font-mono">Mã: {item.key}</div>
                                                </div>
                                                <button type="button" onClick={() => setEditingSetItem({ ...item })} className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold shrink-0 cursor-pointer">✏️ Sửa</button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {dictTab === 'tier' && (
                                <>
                                    <form onSubmit={handleSaveCustomTier} className="lg:col-span-5 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3 h-fit">
                                        <div className="text-xs font-black text-rose-400 uppercase">
                                            ➕ Thêm / Sửa Bậc Trang Bị (Tier)
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Con số Bậc (VD: 105, 110, 96...):</label>
                                            <input
                                                type="number"
                                                required
                                                value={editingTierItem.tier}
                                                onChange={(e) => {
                                                    const t = Number(e.target.value);
                                                    setEditingTierItem({ ...editingTierItem, tier: t, labelVi: `🔥 Bậc ${t} (Mới)` });
                                                }}
                                                className="w-full bg-zinc-900 border border-rose-500/40 rounded-xl px-3 py-2 text-sm text-amber-300 font-mono font-black"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Nhãn hiển thị:</label>
                                            <input
                                                type="text"
                                                required
                                                value={editingTierItem.labelVi}
                                                onChange={(e) => setEditingTierItem({ ...editingTierItem, labelVi: e.target.value })}
                                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 font-bold"
                                            />
                                        </div>
                                        <label className="flex items-center gap-2 pt-1 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(editingTierItem.isArsenal)}
                                                onChange={(e) => setEditingTierItem({ ...editingTierItem, isArsenal: e.target.checked })}
                                                className="accent-amber-400"
                                            />
                                            <span className="text-xs text-zinc-300 font-bold">Là bậc đồ cũ dùng để cất vào Kho Vũ Khí (Arsenal)</span>
                                        </label>
                                        <button type="submit" className="w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs uppercase cursor-pointer">
                                            💾 Lưu Bậc Trang Bị
                                        </button>
                                    </form>
                                    <div className="lg:col-span-7 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                                        {tierOptions.map((item) => (
                                            <div key={item.tier} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-xs font-bold text-zinc-100">{item.labelVi}</div>
                                                    <div className="text-[10px] text-zinc-500 font-mono">Tier: {item.tier} • {item.isArsenal ? '📦 Đồ Arsenal' : '🔥 Đồ Chính'}</div>
                                                </div>
                                                <button type="button" onClick={() => setEditingTierItem({ ...item })} className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-bold cursor-pointer">✏️ Sửa</button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {dictTab === 'weapon' && (
                                <>
                                    <form onSubmit={handleSaveCustomWeapon} className="lg:col-span-5 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3 h-fit">
                                        <div className="text-xs font-black text-purple-400 uppercase">
                                            {editingWeaponItem.key ? `✏️ Đang sửa Vũ Khí: ${editingWeaponItem.key}` : '➕ Thêm Loại Vũ Khí Mới'}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Icon:</label>
                                                <input
                                                    type="text"
                                                    value={editingWeaponItem.icon}
                                                    onChange={(e) => setEditingWeaponItem({ ...editingWeaponItem, icon: e.target.value })}
                                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-center text-base"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Mã Vũ Khí (Tùy chọn):</label>
                                                <input
                                                    type="text"
                                                    value={editingWeaponItem.key}
                                                    onChange={(e) => setEditingWeaponItem({ ...editingWeaponItem, key: e.target.value })}
                                                    placeholder="VD: BOW_NEW"
                                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-purple-400 uppercase mb-1">Tên Vũ Khí (Tiếng Việt):</label>
                                            <input
                                                type="text"
                                                required
                                                value={editingWeaponItem.labelVi}
                                                onChange={(e) => setEditingWeaponItem({ ...editingWeaponItem, labelVi: e.target.value })}
                                                placeholder="VD: Cung Tiễn / Đàn Cổ Cầm"
                                                className="w-full bg-zinc-900 border border-purple-500/40 rounded-xl px-3 py-2 text-xs text-purple-300 font-bold"
                                            />
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button type="button" onClick={() => setEditingWeaponItem({ key: '', labelVi: '', labelEn: '', icon: '⚔️' })} className="px-3 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer">Làm mới</button>
                                            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-black text-xs uppercase cursor-pointer">💾 Lưu Vũ Khí</button>
                                        </div>
                                    </form>
                                    <div className="lg:col-span-7 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                                        {weaponTypeOptions.map((item) => (
                                            <div key={item.key} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-xl">{item.icon}</span>
                                                    <div>
                                                        <div className="text-xs font-bold text-zinc-100">{item.labelVi}</div>
                                                        <div className="text-[10px] text-zinc-500 font-mono">Mã: {item.key}</div>
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => setEditingWeaponItem({ ...item })} className="px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-bold cursor-pointer">✏️ Sửa</button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {dictTab === 'vohoc' && (
                                <>
                                    <form onSubmit={handleSaveVoHocList} className="lg:col-span-5 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3 h-fit">
                                        <div className="text-xs font-black text-sky-400 uppercase">
                                            {editingVoHocIndex !== null ? `✏️ Đang sửa Võ Học #${editingVoHocIndex}` : '➕ Thêm Nhánh Võ Học Mới'}
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-sky-400 uppercase mb-1">Tên Nhánh Võ Học:</label>
                                            <input
                                                type="text"
                                                required
                                                value={newVoHocName}
                                                onChange={(e) => setNewVoHocName(e.target.value)}
                                                placeholder="VD: Khiên Ty (Trống Eo)"
                                                className="w-full bg-zinc-900 border border-sky-500/40 rounded-xl px-3 py-2 text-xs text-sky-300 font-bold"
                                            />
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            {editingVoHocIndex !== null && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingVoHocIndex(null);
                                                        setNewVoHocName("");
                                                    }}
                                                    className="px-3 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer"
                                                >
                                                    Hủy sửa
                                                </button>
                                            )}
                                            <button
                                                type="submit"
                                                className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-black text-xs uppercase cursor-pointer"
                                            >
                                                💾 Lưu Nhánh Võ Học
                                            </button>
                                        </div>
                                    </form>
                                    <div className="lg:col-span-7 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                                        {voHocList.map((vhName, idx) => (
                                            <div key={idx} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-500 font-mono text-[10px]">#{idx}</span>
                                                    <span className="text-xs font-bold text-zinc-100">{vhName}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingVoHocIndex(idx);
                                                            setNewVoHocName(vhName);
                                                        }}
                                                        className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 text-xs font-bold cursor-pointer"
                                                    >
                                                        ✏️ Sửa
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteVoHoc(idx)}
                                                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-bold cursor-pointer"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {dictTab === 'tamphap' && (
                                <>
                                    <form onSubmit={handleSaveTamPhapToMap} className="lg:col-span-5 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3 h-fit">
                                        <div className="text-xs font-black text-indigo-400 uppercase">
                                            {editingTamPhap.id ? `✏️ Đang sửa Tâm Pháp [${editingTamPhap.id}]` : '➕ Thêm Tâm Pháp Mới Vào TAM_PHAP_MAP'}
                                        </div>
                                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                                            Bạn chỉ cần nhập <b>Tên Tiếng Việt</b> và <b>Tên Tiếng Anh</b> (để trống ô Mã ID hệ thống sẽ tự tạo mã sạch).
                                        </p>
                                        <div>
                                            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Mã ID / Key (Để trống tự tạo):</label>
                                            <input
                                                type="text"
                                                value={editingTamPhap.id}
                                                onChange={(e) => setEditingTamPhap({ ...editingTamPhap, id: e.target.value })}
                                                placeholder="Tự động tạo nếu để trống..."
                                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-amber-400 uppercase mb-1">Tên Tâm Pháp (Tiếng Việt):</label>
                                            <input
                                                type="text"
                                                value={editingTamPhap.vi}
                                                onChange={(e) => setEditingTamPhap({ ...editingTamPhap, vi: e.target.value })}
                                                placeholder="VD: Dịch Thủy Ca / Hoa Vũ Mãn Thiên"
                                                className="w-full bg-zinc-900 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Tên Tâm Pháp (Tiếng Anh):</label>
                                            <input
                                                type="text"
                                                value={editingTamPhap.en}
                                                onChange={(e) => setEditingTamPhap({ ...editingTamPhap, en: e.target.value })}
                                                placeholder="VD: Morale Chant / Blossom Barrage"
                                                className="w-full bg-zinc-900 border border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-indigo-300 font-bold"
                                            />
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setEditingTamPhap({ id: '', vi: '', en: '' })}
                                                className="px-3 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer"
                                            >
                                                Làm mới
                                            </button>
                                            <button
                                                type="submit"
                                                className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs uppercase cursor-pointer"
                                            >
                                                💾 Lưu Vào TAM_PHAP_MAP
                                            </button>
                                        </div>
                                    </form>

                                    <div className="lg:col-span-7 space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                                        <input
                                            type="text"
                                            value={tamPhapSearch}
                                            onChange={(e) => setTamPhapSearch(e.target.value)}
                                            placeholder="🔍 Tìm nhanh Tâm Pháp theo tên Việt, Anh hoặc ID..."
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200"
                                        />
                                        {tamPhapList
                                            .filter(tp => tp.display.toLowerCase().includes(tamPhapSearch.toLowerCase()) || tp.id.toLowerCase().includes(tamPhapSearch.toLowerCase()))
                                            .map((item) => (
                                                <div key={item.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold text-amber-300 truncate">{item.vi || item.en}</div>
                                                        <div className="text-[11px] text-indigo-300 truncate">{item.en} <span className="text-zinc-600 font-mono">[{item.id}]</span></div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingTamPhap({ id: item.id, vi: item.vi, en: item.en })}
                                                        className="px-3 py-1.5 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-xs font-bold shrink-0 cursor-pointer"
                                                    >
                                                        ✏️ Sửa
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}