const getPasswordStrength = (password) => {
  if (!password) return { level: 0, label: '', color: '', requirements: {} };
  
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password)
  };
  
  const metCount = Object.values(requirements).filter(Boolean).length;
  
  if (metCount === 5) {
    return { level: 3, label: 'Strong', color: '#34C759', requirements };
  } else if (metCount >= 3) {
    return { level: 2, label: 'Medium', color: '#FF9500', requirements };
  } else if (metCount >= 1) {
    return { level: 1, label: 'Weak', color: '#FF3B30', requirements };
  }
  
  return { level: 0, label: '', color: '', requirements };
};

const PasswordStrengthIndicator = ({ password }) => {
  const strength = getPasswordStrength(password);
  
  if (!password) return null;
  
  const requirementsList = [
    { key: 'length', label: 'At least 8 characters' },
    { key: 'uppercase', label: 'At least 1 uppercase letter (A-Z)' },
    { key: 'lowercase', label: 'At least 1 lowercase letter (a-z)' },
    { key: 'number', label: 'At least 1 number (0-9)' },
    { key: 'special', label: 'At least 1 special character' }
  ];
  
  return (
    <div className="password-strength-container">
      <div className="strength-row">
        <div className="strength-bars">
          {[1, 2, 3].map((bar) => (
            <div
              key={bar}
              className="strength-bar"
              style={{
                backgroundColor: bar <= strength.level ? strength.color : 'rgba(150, 150, 150, 0.3)',
              }}
            />
          ))}
        </div>
        <span 
          className="strength-label"
          style={{ color: strength.color }}
        >
          {strength.label}
        </span>
      </div>
      
      <div className="requirements-list">
        {requirementsList.map((req) => (
          <div 
            key={req.key} 
            className={`requirement-item ${strength.requirements[req.key] ? 'met' : 'unmet'}`}
          >
            <span className="requirement-icon">
              {strength.requirements[req.key] ? '✓' : '○'}
            </span>
            <span className="requirement-text">{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export { getPasswordStrength };
export default PasswordStrengthIndicator;
