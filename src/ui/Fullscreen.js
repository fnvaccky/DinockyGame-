/**
 * Fullscreen.js - Full screen and landscape lock for playing on phones.
 *
 * Android Chrome and iPad Safari support the Fullscreen API. iPhone Safari does not, so there
 * the game relies on its immersive CSS layout, or on being installed with Add to Home Screen.
 */
const doc = () => (typeof document === 'undefined' ? null : document);

export const isTouchDevice = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
export const canFullscreen = () => Boolean(doc()?.fullscreenEnabled || doc()?.webkitFullscreenEnabled);
export const isFullscreen = () => Boolean(doc()?.fullscreenElement || doc()?.webkitFullscreenElement);
// Launched from the home screen: the browser bars are already gone.
export const isInstalledApp = () => (typeof matchMedia === 'function' && matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) ||
  Boolean(typeof navigator !== 'undefined' && navigator.standalone);

/** Must be called straight from a tap or click; browsers refuse full screen otherwise. */
export async function enterFullscreen(element = doc()?.documentElement) {
  try {
    if (!isFullscreen()) {
      if (element.requestFullscreen) await element.requestFullscreen({ navigationUI: 'hide' });
      else element.webkitRequestFullscreen?.();
    }
    await screen.orientation?.lock?.('landscape');
  } catch { /* Refused (e.g. iPhone Safari or desktop orientation lock); the layout still fills the screen. */ }
}

export async function exitFullscreen() {
  try {
    screen.orientation?.unlock?.();
    if (doc()?.fullscreenElement) await document.exitFullscreen();
    else if (doc()?.webkitFullscreenElement) document.webkitExitFullscreen();
  } catch { /* Already out of full screen. */ }
}
