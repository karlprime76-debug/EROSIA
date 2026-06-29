import React from 'react';

type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'premium';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  onClick,
  disabled = false,
  className = '',
  children,
}) => {
  const base = 'btn transition-colors duration-150 ease-in-out';
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    premium: 'bg-[#D92D4A] text-white hover:bg-[#D92D4A]/80',
  }[variant];
  return (
    <button
      type="button"
      className={`${base} ${variantClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
