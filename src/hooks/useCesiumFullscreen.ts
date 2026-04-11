import { useEffect } from 'react';

/** Adds a fullscreen toggle button to the Cesium viewer container. */
export function useCesiumFullscreen(viewerRef: React.MutableRefObject<any>) {
  useEffect(() => {
    let updateIcon: (() => void) | null = null;
    let buttonContainer: HTMLDivElement | null = null;

    const timer = setTimeout(() => {
      if (!viewerRef.current?.cesiumElement) return;
      const viewer = viewerRef.current.cesiumElement;

      if (viewer.container.querySelector('.app-fullscreen-button')) return;

      buttonContainer = document.createElement('div');
      buttonContainer.className = 'app-fullscreen-button';
      Object.assign(buttonContainer.style, {
        position: 'absolute',
        bottom: '70px',
        right: '10px',
        zIndex: 'var(--z-menu)',
      });

      const button = document.createElement('button');
      button.setAttribute('aria-label', 'Toggle fullscreen');
      Object.assign(button.style, {
        width: '40px',
        height: '40px',
        backgroundColor: 'rgba(48, 51, 54, 0.8)',
        border: '1px solid #444',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        transition: 'background-color 0.2s',
      });

      const ENTER_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
      const EXIT_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`;

      button.innerHTML = ENTER_ICON;

      button.onmouseenter = () => { button.style.backgroundColor = 'rgba(48, 51, 54, 1)'; };
      button.onmouseleave = () => { button.style.backgroundColor = 'rgba(48, 51, 54, 0.8)'; };

      button.onclick = () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            console.error('Error attempting to enable fullscreen:', err.message);
          });
        } else {
          document.exitFullscreen();
        }
      };

      updateIcon = () => {
        button.innerHTML = document.fullscreenElement ? EXIT_ICON : ENTER_ICON;
      };
      document.addEventListener('fullscreenchange', updateIcon);

      buttonContainer.appendChild(button);
      viewer.container.appendChild(buttonContainer);

    }, 500);

    return () => {
      clearTimeout(timer);
      if (updateIcon) {
        document.removeEventListener('fullscreenchange', updateIcon);
      }
      if (buttonContainer?.parentNode) {
        buttonContainer.parentNode.removeChild(buttonContainer);
      }
    };
  }, [viewerRef]);
}
