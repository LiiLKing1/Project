import React from 'react';
import { useSettings } from '../context/SettingsContext';

const CurrencyDisplay = ({ amount, overrideCurrency }) => {
  const { settings } = useSettings();
  
  const currency = overrideCurrency || settings.currency || 'UZS';
  const showUsdConversion = settings.showUsdConversion;
  const usdRate = settings.usdRate || 12500;
  const rubRate = settings.rubRate || 140;

  const formatUZS = (v) => new Intl.NumberFormat('uz-UZ').format(v || 0) + ' UZS';

  let formattedMain = '';
  if (currency === 'UZS') {
    formattedMain = formatUZS(amount);
  } else if (currency === 'USD') {
    formattedMain = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  } else if (currency === 'RUB') {
    formattedMain = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(amount || 0);
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1.2' }}>
      <span>{formattedMain}</span>
      {currency === 'USD' && showUsdConversion && (
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>
          ~{formatUZS((amount || 0) * usdRate)}
        </span>
      )}
      {currency === 'RUB' && showUsdConversion && (
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>
          ~{formatUZS((amount || 0) * rubRate)}
        </span>
      )}
    </div>
  );
};

export default CurrencyDisplay;
