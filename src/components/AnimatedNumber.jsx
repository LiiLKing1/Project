import React, { useState, useEffect, useRef } from 'react';
import NumberFlow from '@number-flow/react';
import { cn } from '../lib/utils';

const AnimatedNumber = ({ value, format, locales, className, prefix = '', suffix = '' }) => {
  const [flashClass, setFlashClass] = useState('');
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value && prevValue.current !== undefined && value !== undefined) {
      if (value > prevValue.current) {
        setFlashClass('text-emerald-500 drop-shadow-sm');
      } else {
        setFlashClass('text-red-500 drop-shadow-sm');
      }
      
      const timer = setTimeout(() => {
        setFlashClass('');
      }, 500); 
      
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
    prevValue.current = value;
  }, [value]);

  return (
    <span className={cn("transition-colors duration-500 inline-flex items-center", flashClass, className)}>
      {prefix && <span className="mr-1">{prefix}</span>}
      <NumberFlow value={value || 0} format={format} locales={locales} />
      {suffix && <span className="ml-1">{suffix}</span>}
    </span>
  );
};

export default AnimatedNumber;
