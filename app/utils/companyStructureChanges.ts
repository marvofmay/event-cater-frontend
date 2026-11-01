export const COMPANY_STRUCTURE_CHANGED = 'company-structure-changed';

export function notifyCompanyStructureChanged() {
    window.dispatchEvent(new Event(COMPANY_STRUCTURE_CHANGED));
    try {
        localStorage.setItem(COMPANY_STRUCTURE_CHANGED, crypto.randomUUID());
    } catch {
        return;
    }
}
