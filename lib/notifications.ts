// lib/notifications.ts
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type WebNotificationType =
    | 'announcement'
    | 'point'
    | 'guild_war'
    | 'event'
    | 'boss'
    | 'pvp'
    | 'boat'
    | 'system';

export type WebTabKey =
    | 'home'
    | 'danhluc'
    | 'talent'
    | 'sattuong'
    | 'soi_acc'
    | 'admin'
    | 'tuvi'
    | 'giftcode'
    | 'point'
    | 'builds'
    | 'pvp'
    | 'thongbao';

export interface WebNotificationItem {
    id: string;
    type: WebNotificationType;
    title: string;
    message: string;
    categoryLabel?: string;
    actor?: string;
    targetId?: string;
    targetName?: string;
    delta?: number;
    balanceAfter?: number;
    linkTab?: WebTabKey;
    pinned?: boolean;
    source?: 'bot' | 'web';
    createdAt: number;
}

export interface WebNotificationsDoc {
    items?: WebNotificationItem[];
    updatedAt?: number;
}

const NOTIF_DOC_REF = () => doc(db, 'thanhlong_config', 'web_notifications');
const MAX_REGULAR = 100;
const MAX_PINNED = 20;

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) out[k] = v;
    }
    return out as Partial<T>;
}

export async function pushWebNotificationClient(
    payload: Omit<WebNotificationItem, 'id' | 'createdAt'>
): Promise<WebNotificationItem> {
    const snap = await getDoc(NOTIF_DOC_REF());
    const existing: WebNotificationItem[] =
        snap.exists() && Array.isArray(snap.data()?.items) ? snap.data().items : [];

    const now = Date.now();
    const newItem = stripUndefined({
        id: `${now}_${Math.random().toString(36).slice(2, 7)}`,
        type: payload.type || 'announcement',
        title: payload.title.trim(),
        message: payload.message.trim(),
        categoryLabel: payload.categoryLabel,
        actor: payload.actor || 'Bang Chủ',
        targetId: payload.targetId,
        targetName: payload.targetName,
        delta: payload.delta,
        balanceAfter: payload.balanceAfter,
        linkTab: payload.linkTab,
        pinned: Boolean(payload.pinned),
        source: payload.source || 'web',
        createdAt: now,
    }) as WebNotificationItem;

    const merged = [newItem, ...existing];
    const pinned = merged.filter((it) => it && it.pinned).slice(0, MAX_PINNED);
    const regular = merged.filter((it) => it && !it.pinned).slice(0, MAX_REGULAR);
    const nextItems = [...pinned, ...regular].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    await setDoc(NOTIF_DOC_REF(), {
        items: nextItems,
        updatedAt: now,
    });

    return newItem;
}

export async function updateWebNotificationItems(
    updater: (items: WebNotificationItem[]) => WebNotificationItem[]
): Promise<void> {
    const snap = await getDoc(NOTIF_DOC_REF());
    const existing: WebNotificationItem[] =
        snap.exists() && Array.isArray(snap.data()?.items) ? snap.data().items : [];
    const nextItems = updater(existing);
    await setDoc(NOTIF_DOC_REF(), {
        items: nextItems,
        updatedAt: Date.now(),
    });
}

export function formatViDateTime(ts?: number): string {
    if (!ts) return '—';
    try {
        return new Date(ts).toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '—';
    }
}

export function formatRelativeVi(ts?: number): string {
    if (!ts) return '';
    const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 60) return 'Vừa xong';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay} ngày trước`;
    return formatViDateTime(ts);
}
