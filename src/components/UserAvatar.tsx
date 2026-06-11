import React from 'react';

interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  className?: string;
}

export default function UserAvatar({ src, alt, className = "w-full h-full object-cover" }: UserAvatarProps) {
  const fallbackSrc = '/images/default-avatar.jpeg';
  const imgSource = src || fallbackSrc;

  return (
    <img 
      src={imgSource} 
      alt={alt || 'Avatar'} 
      className={className} 
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        if (!target.src.includes('default-avatar.jpeg')) {
          target.src = fallbackSrc;
        }
      }}
      referrerPolicy="no-referrer"
    />
  );
}
