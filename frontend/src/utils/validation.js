/**
 * Validation utilities for frontend
 */

export const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push("Mínimo 8 caracteres");
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("Uma letra minúscula");
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("Uma letra maiúscula");
  }
  
  if (!/\d/.test(password)) {
    errors.push("Um número");
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Um caractere especial");
  }
  
  const commonPasswords = [
    'password', '123456', '12345678', 'qwerty', 'abc123',
    'senha123', 'senha', 'admin', 'root'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push("Senha muito comum");
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors,
    strength: getPasswordStrength(password)
  };
};

const getPasswordStrength = (password) => {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
  
  if (strength <= 2) return { level: 'fraca', color: '#ef4444' };
  if (strength <= 4) return { level: 'média', color: '#f59e0b' };
  return { level: 'forte', color: '#10b981' };
};

export const sanitizeInput = (text, maxLength = 1000) => {
  if (!text) return '';
  
  // Remove null bytes
  text = text.replace(/\x00/g, '');
  
  // Limit length
  text = text.substring(0, maxLength);
  
  // Basic XSS prevention
  text = text.replace(/<script/gi, '&lt;script');
  text = text.replace(/javascript:/gi, '');
  text = text.replace(/onerror=/gi, '');
  text = text.replace(/onclick=/gi, '');
  
  return text.trim();
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateCNPJ = (cnpj) => {
  if (!cnpj) return true;
  
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  return true;
};

export const validateCPF = (cpf) => {
  if (!cpf) return true;
  
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  return true;
};

export const formatCNPJ = (value) => {
  const cleaned = value.replace(/\D/g, '');
  return cleaned
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .substring(0, 18);
};

export const formatCPF = (value) => {
  const cleaned = value.replace(/\D/g, '');
  return cleaned
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
    .substring(0, 14);
};

export const formatPhone = (value) => {
  const cleaned = value.replace(/\D/g, '');
  
  if (cleaned.length <= 10) {
    return cleaned
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  
  return cleaned
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .substring(0, 15);
};
