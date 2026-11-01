import type Avatar from '@/app/types/Avatar';

export const AVATAR_UPDATED = 'user-avatar-updated';

export function userAvatarUrl(avatar?: Avatar | null): string | undefined {
    if (avatar?.avatarType === 'custom' && avatar.avatarPath) {
        return `${(process.env.NEXT_PUBLIC_BACKEND_URL ?? '').replace(/\/$/, '')}/upload/${avatar.avatarPath}`;
    }
    if (avatar?.avatarType === 'default' && avatar.defaultAvatar) {
        return `/icons/${avatar.defaultAvatar}.png`;
    }
    return undefined;
}
