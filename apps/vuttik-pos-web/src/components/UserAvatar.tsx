import React, { useState } from 'react';

interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  className?: string;
  onClick?: () => void;
}

export default function UserAvatar({ src, alt, className = "w-full h-full", onClick }: UserAvatarProps) {
  const [error, setError] = useState(false);
  const fallbackSrc = '/user_unknown.jpeg';

  return (
    <div className={`relative ${className}`} onClick={onClick}>
      <img
        src={error ? fallbackSrc : (src || fallbackSrc)}
        alt={alt || 'Avatar'}
        className="w-full h-full rounded-full object-cover bg-gray-100 dark:bg-gray-800"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={(e) => {
          setError(true);
          const target = e.target as HTMLImageElement;
          if (!target.src.includes('data:image/svg+xml')) {
            target.src = fallbackSrc;
          }
        }}
      />
    </div>
  );
}
