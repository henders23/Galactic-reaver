/* Galactic Reaver — boot */
'use strict';

/* Fit-to-screen scaler.
   The UI is authored at a fixed design resolution (see --app-w/--app-h in the
   stylesheet) and #app is uniformly scaled so it always fits the user's screen,
   centred with letterbox margins when the aspect ratios differ. Because the map
   canvas re-reads getBoundingClientRect every frame, it keeps rendering at native
   device resolution and stays crisp at any scale. Desktop only — no mobile layout. */
const DESIGN_W = 1600, DESIGN_H = 900;

function fitToScreen() {
  const app = document.getElementById('app');
  if (!app) return;
  const w = window.innerWidth, h = window.innerHeight;
  const scale = Math.min(w / DESIGN_W, h / DESIGN_H);
  const offX = Math.round((w - DESIGN_W * scale) / 2);
  const offY = Math.round((h - DESIGN_H * scale) / 2);
  app.style.transform = 'translate(' + offX + 'px, ' + offY + 'px) scale(' + scale + ')';
}

window.addEventListener('resize', fitToScreen);
window.addEventListener('DOMContentLoaded', () => {
  fitToScreen();
  UI.init();
});
