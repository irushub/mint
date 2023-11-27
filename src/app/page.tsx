// components/MyComponent.jsx

import React from 'react';
import styles from './page.module.css';
const MyComponent = () => {
  return (
    <div className={styles.bodyStyles}>
      <video className={styles.videoBackground} autoPlay loop muted>
        <source src="/background.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className={styles.centerBox}>
        <img src="/1.png" alt="Your Image" />
        <div className={styles.buttonContainer}>
          <button className={styles.button}>Mint 1</button>
          <button className={styles.button}>Mint 5</button>
          <button className={styles.button}>Mint 10</button>
          <button className={styles.button}>Mint 20</button>
        </div>
      </div>
    </div>
  );
};

export default MyComponent;
