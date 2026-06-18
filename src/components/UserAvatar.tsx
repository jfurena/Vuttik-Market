import React, { useState } from 'react';

interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  className?: string;
  onClick?: () => void;
}

export default function UserAvatar({ src, alt, className = "w-full h-full", onClick }: UserAvatarProps) {
  const [error, setError] = useState(false);
  const fallbackSrc = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSI4IiByPSI1Ii8+PHBhdGggZD0iTTIwIDIxYTggOCAwIDAgMC0xNiAwIi8+PC9zdmc+';

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
