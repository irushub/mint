// Inside SecondPage.js
import React, { useEffect } from 'react';
import styles from './secondpage.module.css';

const SecondPage = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <div>
      <button className={styles.scrolltotop} onClick={scrollToTop}>Go to Top</button>
    </div>
  );
};

export default SecondPage;
