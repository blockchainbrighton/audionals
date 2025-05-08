// app-bootstrap.js
import { setupEffect } from '/content/6addd1c637ee377bd7e3510c7e78ec35a7fb037676f2ef416131067c9d1d4cf6i0';

// Standard setupEffect on page load
window.addEventListener('load', async () => {
  const imgUrl = window.images?.[0] || null;
  if (!imgUrl) {
    console.error('Colour Sweep Player: no image URL provided.');
    return;
  }
  try {
    await setupEffect(imgUrl, 'sweepBrightFwd', 165);
    console.log('Colour sweep ready – click to begin (message from app-bootstrap).');
  } catch (err)
{
    console.error('Failed to prepare colour sweep:', err);
  }
});