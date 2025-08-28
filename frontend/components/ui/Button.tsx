import React from "react";

interface ButtonProps {
  text: string;
  onClick?: () => void;
  className?: string;
  outlined?: boolean;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ text, onClick, className = "", outlined = false, disabled = false }) => {
  const baseClasses = "px-4 py-2 rounded-lg font-medium transition-colors duration-200";
  const variantClasses = outlined
    ? "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
    : "bg-blue-600 text-white hover:bg-blue-700";
  
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${disabledClasses} ${className}`}
    >
      {text}
    </button>
  );
};

export default Button;
