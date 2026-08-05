// ===== src/services/profile.js · 求测人档案与八字（纯数据层） =====
import { calcFullBaZi } from '../engine.js';
import { getProfile } from '../storage.js';

/**
 * 由已保存的求测人档案计算完整四柱八字。
 * @returns {object|null} bazi 对象（含 fullText / yearPillar 等），档案缺失或非法时返回 null
 */
export function getBaziFromProfile() {
  try {
    const profile = getProfile();
    if (!profile || !profile.birthDate) return null;
    const parts = profile.birthDate.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    let hour = 12;
    if (profile.birthTime) {
      const tp = profile.birthTime.split(':');
      if (tp.length >= 1) hour = parseInt(tp[0]) || 12;
    }
    const longitude = profile.birthLongitude || 120;
    return calcFullBaZi(year, month, day, hour, longitude);
  } catch (e) { return null; }
}
