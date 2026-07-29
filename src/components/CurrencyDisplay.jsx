import React from 'react';
import { useSettings } from '../context/SettingsContext';
import AnimatedNumber from './AnimatedNumber';

const CurrencyDisplay = ({ amount, overrideCurrency, isCost, isSell, inline }) => {
  const { settings } = useSettings();
  
  let currency = overrideCurrency || settings.currency || 'UZS';
  if (isCost && settings.costCurrency) currency = settings.costCurrency;
  if (isSell && settings.sellCurrency) currency = settings.sellCurrency;
  const showUsdConversion = settings.showUsdConversion;
  const usdRate = settings.usdRate || 12500;
  const rubRate = settings.rubRate || 140;

  const renderMain = () => {
    if (currency === 'UZS') {
      return <AnimatedNumber value={amount} locales="uz-UZ" suffix="UZS" />;
    } else if (currency === 'USD') {
      return <AnimatedNumber value={amount} format={{ style: 'currency', currency: 'USD' }} />;
    } else if (currency === 'RUB') {
      return <AnimatedNumber value={amount} locales="ru-RU" format={{ style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }} />;
    }
    return <span>{amount}</span>;
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: inline ? 'row' : 'column', alignItems: inline ? 'center' : 'flex-start', gap: inline ? '6px' : '0', lineHeight: '1.2' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center' }}>
        {renderMain()}
      </div>
      {currency === 'USD' && showUsdConversion && (
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: inline ? '0' : '2px', display: 'inline-flex', alignItems: 'center' }}>
          ~<AnimatedNumber value={(amount || 0) * usdRate} locales="uz-UZ" suffix="UZS" />
        </span>
      )}
      {currency === 'RUB' && showUsdConversion && (
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: inline ? '0' : '2px', display: 'inline-flex', alignItems: 'center' }}>
          ~<AnimatedNumber value={(amount || 0) * rubRate} locales="uz-UZ" suffix="UZS" />
        </span>
      )}
    </div>
  );
};

export default CurrencyDisplay;
