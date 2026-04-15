/**
 * Maps a percentage (0–100) to an HSL color.
 *
 * Zones:
 *   0–40%   → green  (hue ~130)
 *   40–75%  → yellow (hue ~80 → 20)
 *   75–100% → red    (hue ~20 → 0)
 *
 * Interpolates hue linearly within each zone.
 * Lightness dims at extremes to deepen the tone.
 */
function percentToColor(percent) {
  let hue;

  if (percent <= 40) {
    // 0% → hue 130 (deep green), 40% → hue 80 (yellow-green)
    hue = 130 - (percent / 40) * 50;
  } else if (percent <= 75) {
    // 40% → hue 80 (yellow-green), 75% → hue 20 (orange-red)
    hue = 80 - ((percent - 40) / 35) * 60;
  } else {
    // 75% → hue 20 (orange), 100% → hue 0 (deep red)
    hue = 20 - ((percent - 75) / 25) * 20;
  }

  const sat = 80;

  let brightness;
  if (percent <= 15) {
    brightness = 28 + (percent / 15) * 7;          // 28→35 (dark green)
  } else if (percent >= 88) {
    brightness = 35 - ((percent - 88) / 12) * 10;  // 35→25 (dark red)
  } else {
    brightness = 40;
  }

  return `hsl(${hue.toFixed(1)}, ${sat}%, ${brightness}%)`;
}

async function update() {
  try {
    const res = await fetch('/api/pool');
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const percent = Math.min(100, Math.max(0, data.percent));
    const color = percentToColor(percent);

    document.getElementById('bar').style.width           = `${percent}%`;
    document.getElementById('bar').style.backgroundColor = color;
    document.getElementById('percent-label').textContent = `${percent.toFixed(1)}%`;
    document.getElementById('percent-label').style.color = color;
    document.getElementById('pool-name').textContent     = data.pool;
    document.getElementById('used-label').textContent    = `${data.used_human} / ${data.total_human}`;

  } catch (error) {
    document.getElementById('root').innerHTML =
      `<div class="error">${error.message}</div>`;
  }
}

update();
setInterval(update, 30000);