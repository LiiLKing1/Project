export const formatCurrency = (amount, currency = 'UZS') => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `0 ${currency}`;
  }
  
  const num = Number(amount);
  
  if (currency === 'UZS') {
    return new Intl.NumberFormat('uz-UZ').format(num) + ' UZS';
  } else if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  } else if (currency === 'RUB') {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(num);
  }
  
  return new Intl.NumberFormat('uz-UZ').format(num) + ` ${currency}`;
};

export const formatCompact = (amount) => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0';
  }
  
  const num = Number(amount);
  
  return Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(num);
};
