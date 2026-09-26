import React from 'react';
import { getAvatarUrl, isImageAvatar, DEFAULT_AVATAR } from '../constants/avatars';

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
    <span className={`inline-flex items-center justify-center select-none ${sizeClassName} ${className}`}>
      {avatar || '👨‍🎓'}
    </span>
  );
};
