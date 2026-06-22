import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface ClickableDateProps {
  date: string | Date | number;
  className?: string;
}

export default function ClickableDate({ date, className }: ClickableDateProps) {
  const [showFullTime, setShowFullTime] = useState<boolean>(() => {
    return localStorage.getItem('vuttik_show_full_time') !== 'false';
  });

  useEffect(() => {
    const handleFormatChange = () => {
      setShowFullTime(localStorage.getItem('vuttik_show_full_time') !== 'false');
    };

    window.addEventListener('vuttik_time_format_changed', handleFormatChange);
    return () => {
      window.removeEventListener('vuttik_time_format_changed', handleFormatChange);
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering any row click events in tables
    const newValue = !showFullTime;
    localStorage.setItem('vuttik_show_full_time', String(newValue));
    window.dispatchEvent(new Event('vuttik_time_format_changed'));
  };

  const parsedDate = new Date(date);
  
  // Format based on preference
  const displayText = showFullTime
    ? format(parsedDate, "dd MMM yyyy, h:mm a", { locale: es })
    : format(parsedDate, "dd MMM yyyy", { locale: es });

  return (
    <span
      onClick={handleClick}
      className={cn(
        "cursor-pointer select-none font-bold text-gray-700 hover:text-blue-600 transition-colors border-b border-dashed border-transparent hover:border-blue-400 active:scale-95 duration-150 inline-block",
        className
      )}
      title="Haz clic para alternar el formato de fecha y hora (Estilo Arkham)"
    >
      {displayText}
    </span>
  );
}
