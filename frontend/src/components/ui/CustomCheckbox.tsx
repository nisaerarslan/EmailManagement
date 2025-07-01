import React, { useState } from 'react';

interface CustomCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({ 
  id, 
  checked, 
  onChange, 
  onClick,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Combine click handlers to ensure event propagation is stopped
  const handleClick = (e: React.MouseEvent) => {
    // Always stop propagation to prevent email from opening
    e.stopPropagation();
    
    // Call the provided onClick handler if it exists
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div 
      className={`relative ${className}`} 
      style={{ margin: 0 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        onClick={handleClick}
        className="sr-only" // tailwind's equivalent of display: none
      />
      <label
        htmlFor={id}
        className="cursor-pointer relative block w-[18px] h-[18px] transform translate-z-0"
        style={{
          WebkitTapHighlightColor: 'transparent',
        }}
        onClick={handleClick}
      >
        <svg
          width="18px"
          height="18px"
          viewBox="0 0 18 18"
          className="relative z-[1] transition-all duration-200 ease"
          style={{
            fill: 'none',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            stroke: checked ? '#4285f4' : isHovered ? '#4285f4' : '#c8ccd4',
            strokeWidth: 1.5,
            transform: 'translate3d(0, 0, 0)',
          }}
          onClick={handleClick}
        >
          <path
            d="M1,9 L1,3.5 C1,2 2,1 3.5,1 L14.5,1 C16,1 17,2 17,3.5 L17,14.5 C17,16 16,17 14.5,17 L3.5,17 C2,17 1,16 1,14.5 L1,9 Z"
            style={{
              strokeDasharray: 60,
              strokeDashoffset: checked ? 60 : 0,
              transition: checked ? 'all 0.3s linear' : 'none',
            }}
          />
          <polyline
            points="1 9 7 14 15 4"
            style={{
              strokeDasharray: 22,
              strokeDashoffset: checked ? 42 : 66,
              transition: checked ? 'all 0.2s linear' : 'none',
              transitionDelay: checked ? '0.15s' : '0s',
            }}
          />
        </svg>
        {isHovered && (
          <span
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30px] h-[30px] bg-gray-200 dark:bg-gray-700 rounded-full opacity-30 transition-opacity duration-200"
            style={{
              zIndex: 0,
            }}
          />
        )}
      </label>
    </div>
  );
};

export default CustomCheckbox; 