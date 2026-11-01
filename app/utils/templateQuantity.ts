import type { TemplateLine } from '@/app/components/catering/types';

export function templateQuantity(rule: TemplateLine['rule'], unit: string, guests: number): number | null {
    const quantity = String(rule.quantity);
    if (!/^\d+(?:\.\d{1,3})?$/.test(quantity) || Number(quantity) <= 0 || Number(quantity) > 1000000) return null;
    const fractional = ['kg', 'l'].includes(unit);
    if (rule.mode === 'fixed') return !fractional && !Number.isInteger(Number(quantity)) ? null : Number(quantity);
    if (rule.mode !== 'per_guest' || !Number.isInteger(guests) || guests < 1 || guests > 1000000
        || !Number.isInteger(rule.perGuests) || !rule.perGuests || rule.perGuests < 1 || rule.perGuests > 1000000
        || !Number.isInteger(rule.reservePercent) || rule.reservePercent < 0 || rule.reservePercent > 100) return null;
    const [whole, fraction = ''] = quantity.split('.');
    const reserve = String(rule.reserveQuantity ?? 0);
    if (!/^\d+(?:\.\d{1,3})?$/.test(reserve) || Number(reserve) < 0 || Number(reserve) > 1000000 || (!fractional && !Number.isInteger(Number(reserve)))) return null;
    if (rule.reservePercent > 0 && Number(reserve) > 0) return null;
    const milliunits = BigInt(whole) * BigInt(1000) + BigInt(fraction.padEnd(3, '0'));
    const step = BigInt(fractional ? 1 : 1000);
    const numerator = milliunits * BigInt(guests) * BigInt(100 + rule.reservePercent);
    const divisor = BigInt(rule.perGuests) * BigInt(100) * step;
    const [reserveWhole, reserveFraction = ''] = reserve.split('.');
    const reserveMilliunits = BigInt(reserveWhole) * BigInt(1000) + BigInt(reserveFraction.padEnd(3, '0'));
    const result = Number((numerator + divisor - BigInt(1)) / divisor * step + reserveMilliunits) / 1000;
    return result <= 1000000 ? result : null;
}
