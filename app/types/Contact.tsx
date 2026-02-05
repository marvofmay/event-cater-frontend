export default interface Contact {
    type: 'phone' | 'email' | 'website';
    data: string;
    active: boolean;
}