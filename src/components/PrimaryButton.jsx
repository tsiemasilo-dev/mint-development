const PrimaryButton = ({
  ariaLabel,
  onClick,
  children,
  className = 'glass-btn mr-2',
  type = 'button',
  disabled = false,
}) => (
  <button
    type={type}
    onClick={onClick}
    className={className}
    aria-label={ariaLabel}
    disabled={disabled}
    style={disabled ? { opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' } : undefined}
  >
    {children}
  </button>
);

export default PrimaryButton;
