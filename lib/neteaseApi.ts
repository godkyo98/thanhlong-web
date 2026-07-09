// @ts-nocheck
// File: lib/neteaseApi.ts

const msgpack = require('@msgpack/msgpack');
const encode = msgpack.encode;
const decode = msgpack.decode;

export const SERVERS_WWM = [
    10001, 10002, 10003, 10004, 10005, 10101, 10102, 10103, 10104, 10105,
    10201, 10202, 10203, 10204, 10205, 10401, 10402, 10403, 10404, 10405,
    10406, 10407, 10408, 10409, 10410
];

export function createPlayerLookupPayload(uidToken: string, playerId: string, hostnum: number) {
    const fieldsEncoded = encode([
        "base", "head", "name_card", "fashion",
        "club", "school", "friend", "settings",
        "common_score_data", "attr", "combat_plan",
        "wear_equips", "equipment", "weapon_list", "kongfu", "xinfa",
        "gameplay_trail", "lunjian", "story_prop", "statistic", "achieve", "item_data"
    ]);
    const pidArrayEncoded = encode([playerId]);
    const uidEncoded = encode(uidToken);

    const mapSize = 3;
    const chunks: number[] = [];
    chunks.push(0x80 | mapSize);

    const fieldsKey = new TextEncoder().encode("fields");
    chunks.push(0xa0 | fieldsKey.length, ...(Array.from(fieldsKey as any) as number[]), ...(Array.from(fieldsEncoded as any) as number[]));

    const hostnumKey = new TextEncoder().encode("hostnum2pids");
    chunks.push(0xa0 | hostnumKey.length, ...(Array.from(hostnumKey as any) as number[]), 0x81);

    if (hostnum < 128) { chunks.push(hostnum); }
    else if (hostnum < 256) { chunks.push(0xcc, hostnum); }
    else if (hostnum < 65536) { chunks.push(0xcd, (hostnum >> 8) & 0xff, hostnum & 0xff); }
    else { chunks.push(0xce, (hostnum >> 24) & 0xff, (hostnum >> 16) & 0xff, (hostnum >> 8) & 0xff, hostnum & 0xff); }

    chunks.push(...Array.from(pidArrayEncoded));

    const uidKey = new TextEncoder().encode("uid");
    chunks.push(0xa0 | uidKey.length, ...Array.from(uidKey), ...Array.from(uidEncoded));

    return new Uint8Array(chunks);
}

export function createBatchLookupPayload(uidToken: string, pids: string[], hostnum: number) {
    const fieldsEncoded = encode([
        "base", "head", "name_card", "fashion",
        "club", "school", "friend", "settings",
        "common_score_data", "attr", "combat_plan",
        "wear_equips", "equipment", "weapon_list", "kongfu", "xinfa",
        "gameplay_trail", "lunjian", "story_prop", "statistic", "achieve", "item_data"
    ]);
    const pidArrayEncoded = encode(pids);
    const uidEncoded = encode(uidToken);

    const mapSize = 3;
    const chunks: number[] = [];
    chunks.push(0x80 | mapSize);

    const fieldsKey = new TextEncoder().encode("fields");
    chunks.push(0xa0 | fieldsKey.length, ...Array.from(fieldsKey), ...Array.from(fieldsEncoded));

    const hostnumKey = new TextEncoder().encode("hostnum2pids");
    chunks.push(0xa0 | hostnumKey.length, ...Array.from(hostnumKey), 0x81);

    if (hostnum < 128) { chunks.push(hostnum); }
    else if (hostnum < 256) { chunks.push(0xcc, hostnum); }
    else if (hostnum < 65536) { chunks.push(0xcd, (hostnum >> 8) & 0xff, hostnum & 0xff); }
    else { chunks.push(0xce, (hostnum >> 24) & 0xff, (hostnum >> 16) & 0xff, (hostnum >> 8) & 0xff, hostnum & 0xff); }

    chunks.push(...Array.from(pidArrayEncoded));

    const uidKey = new TextEncoder().encode("uid");
    chunks.push(0xa0 | uidKey.length, ...Array.from(uidKey), ...Array.from(uidEncoded));

    return new Uint8Array(chunks);
}

export function detectServer(pid: string, current: number) {
    if (current && SERVERS_WWM.includes(current)) return current;
    if (pid.startsWith("aRf")) return 10402;
    if (pid.startsWith("aRep")) return 10203;
    if (pid.startsWith("aRe")) return 10103;
    return 10109; 
}

export async function searchPlayerWWM(query: string, uidToken: string) {
    let url = "";
    let payload: any = { uid: uidToken, force_search: false };

    if (/^\d+$/.test(query)) {
        url = "https://h72naxx2gb-ms-prod.easebar.com/flk/find_people/by_number_id";
        payload.number_id = query;
    } else if (query.startsWith("aR")) {
        return { id: query };
    } else {
        url = "https://h72naxx2gb-ms-prod.easebar.com/flk/find_people/by_nickname";
        payload.nickname = query;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { "h72-ms-uid": uidToken, "Content-Type": "application/x-msgpack" },
            body: encode(payload)
        });

        if (!response.ok) return null;
        const buffer = await response.arrayBuffer();
        const result: any = decode(new Uint8Array(buffer));
        return result?.result || null;
    } catch (error) {
        return null;
    }
}

export async function getPlayerInfoNative(uidToken: string, playerId: string, hostnum: number) {
    const url = "https://h72naxx2gb-ms-prod.easebar.com/flk/redis_player/get_players_info";
    const payload = createPlayerLookupPayload(uidToken, String(playerId), hostnum);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                "h72-ms-uid": uidToken,
                "Content-Type": "application/x-msgpack",
                "Connection": "close",
                "Accept-Encoding": "gzip"
            },
            body: payload
        });

        if (!response.ok) return null;
        const buffer = await response.arrayBuffer();
        return decode(new Uint8Array(buffer));
    } catch (error) {
        return null;
    }
}

// 🟢 ẢI THỨ 2: CHUYÊN DÙNG ĐỂ RÚT TRANG BỊ, TÂM PHÁP, KỲ THUẬT TỪ NETEASE
export async function getPlayerCombatPlan(uidToken: string, playerId: string, hostnum: number) {
    const url = "https://h72naxx2gb-ms-prod.easebar.com/equip_service/get_player_combat_plan";
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { "h72-ms-uid": uidToken, "Content-Type": "application/x-msgpack" },
            body: encode({ pid: String(playerId), hostnum: hostnum, uid: uidToken })
        });

        if (!response.ok) return null;
        const buffer = await response.arrayBuffer();
        return decode(new Uint8Array(buffer));
    } catch (error) {
        console.error("❌ Lỗi kéo túi đồ Netease:", error);
        return null;
    }
}

export async function fetchContributionBatch(hostnum: number, pids: string[], uidToken: string) {
    const body = createBatchLookupPayload(uidToken, pids, hostnum);
    const url = "https://h72naxx2gb-ms-prod.easebar.com/flk/redis_player/get_players_info";

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { "h72-ms-uid": uidToken, "Content-Type": "application/x-msgpack" },
            body: body
        });

        if (!response.ok) return {};
        const buffer = await response.arrayBuffer();
        const result: any = decode(new Uint8Array(buffer));
        return result?.result || {};
    } catch (error) {
        console.error("❌ Lỗi fetchContributionBatch:", error);
        return {};
    }
}

export async function findGuildWWM(guildName: string, uidToken: string) {
    const url = "https://h72naxx2gb-ms-prod.easebar.com/flk/club/search_club";
    const payload = { uid: uidToken, name: guildName };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { "h72-ms-uid": uidToken, "Content-Type": "application/x-msgpack" },
            body: encode(payload)
        });

        if (!response.ok) return null;
        const buffer = await response.arrayBuffer();
        const result: any = decode(new Uint8Array(buffer));
        return result?.result || null;
    } catch (error) {
        console.error("❌ Lỗi findGuildWWM:", error);
        return null;
    }
}