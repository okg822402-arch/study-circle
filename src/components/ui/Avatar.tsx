import React, { useState } from 'react';

export interface AvatarProps {
  initials: string;
  name?: string;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  bgColor?: string;
  className?: string;
  border?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  name,
  avatarUrl,
  size = 'md',
  bgColor = '#3D7A8A',
  className = '',
  border = false,
}) => {
  const [imgError, setImgError] = useState(false);

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-20 h-20 text-2xl font-bold',
  };

  return (
    <div
      title={name}
      style={{ backgroundColor: avatarUrl && !imgError ? 'transparent' : bgColor }}
      className={`
        rounded-full flex items-center justify-center font-bold text-white shrink-0 select-none overflow-hidden
        ${sizes[size]}
        ${border ? 'ring-2 ring-white' : ''}
        ${className}
      `}
    >
      {avatarUrl && !imgError ? (
        <img
          src={avatarUrl}
          alt={name || initials}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover rounded-full"
          onError={() => setImgError(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
};
