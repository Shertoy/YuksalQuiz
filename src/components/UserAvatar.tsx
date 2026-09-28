import React from 'react';
import { getAvatarUrl, isImageAvatar, DEFAULT_AVATAR } from '../constants/avatars';

import { User } from 'lucide-react';

interface UserAvatarProps {
  avatar?: string;
  alt?: string;
  className?: string;
  sizeClassName?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar = DEFAULT_AVATAR,
  alt = 'Avatar',
  className = '',
  sizeClassName = 'w-full h-full',
}) => {
  if (isImageAvatar(avatar)) {
    return (
      <img
        src={getAvatarUrl(avatar)}
        alt={alt}
        className={`${sizeClassName} object-cover rounded-full select-none ${className}`}
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).src = getAvatarUrl(DEFAULT_AVATAR);
        }}
      />
    );
  }

  return (
    <span className={`inline-flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 select-none rounded-full ${sizeClassName} ${className}`}>
      <User className="w-1/2 h-1/2" />
    </span>
  );
};
