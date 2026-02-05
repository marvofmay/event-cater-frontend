export default interface Avatar {
    avatarType: 'default' | 'custom',
    defaultAvatar?: 'man' | 'woman' | null,
    avatarPath?: string | null
}