import React, { useEffect, useState } from 'react';
import styles from './progressbar.module.css';

const CustomProgressBar = ({ totalValue }) => {
  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    if (totalValue <= 0) {
      setPercentage(0);  // Set percentage to 0 when totalValue is 0
      return;
    }
  
    const targetPercentage = Math.min((totalValue / 10) * 100, 100);
  
    const interval = setInterval(() => {
      setPercentage((prevPercentage) => {
        const increment = 1;
  
        if (prevPercentage + increment >= targetPercentage) {
          clearInterval(interval);
          return targetPercentage;
        }
  
        return prevPercentage + increment;
      });
    }, 10);
  
    return () => clearInterval(interval);
  }, [totalValue]);

  return (
    <div>
      <div className={styles.text}>{percentage}%</div>
      <div className={styles.container}>
        
        <div className={styles.progress} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
};

export default CustomProgressBar;
