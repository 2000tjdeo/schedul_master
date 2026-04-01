import { useState, useEffect } from 'react';

export default function useViewMode() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    let frameId = null;
    const handleResize = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        setWidth(window.innerWidth);
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1280;
  const isDesktop = width >= 1280;

  return { isMobile, isTablet, isDesktop, width };
}
