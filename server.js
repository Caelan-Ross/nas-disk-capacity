const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3010;
const TRUENAS_HOST = process.env.TRUENAS_HOST || '192.168.1.116';
const TRUENAS_API_KEY = process.env.TRUENAS_API_KEY || '';
const POOL_NAME = process.env.POOL_NAME || 'temp_pool';

app.use(express.static(path.join(__dirname, 'public')));

async function fetchWithRetry(url, options = {}, { retries = 3, delay = 500, backoff = 2 } = {}) {
  let attempt = 0;
  let currentDelay = delay;

  while (attempt < retries) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      attempt++;
      if (attempt >= retries) throw err;
      await new Promise(r => setTimeout(r, currentDelay));
      currentDelay *= backoff;
    }
  }
}

// Use /pool/dataset root entry for accurate usable ZFS capacity.
// /api/v2.0/pool returns raw vdev totals which double-count parity on RAIDZ.
app.get('/api/pool', async (req, res) => {
  const url = `https://${TRUENAS_HOST}/api/v2.0/pool/dataset?id=${encodeURIComponent(POOL_NAME)}`;

  try {
    const response = await fetchWithRetry(url, {
      headers: {
        'Authorization': `Bearer ${TRUENAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const datasets = await response.json();
    const root = Array.isArray(datasets) ? datasets[0] : datasets;

    if (!root) {
      return res.status(404).json({ error: `Dataset '${POOL_NAME}' not found` });
    }

    const used  = root.used?.parsed ?? 0;
    const avail = root.available?.parsed ?? 0;
    const total = used + avail;
    const percent = total > 0 ? (used / total) * 100 : 0;

    res.json({
      pool: root.name,
      used_bytes: used,
      total_bytes: total,
      percent: parseFloat(percent.toFixed(2)),
      used_human: formatBytes(used),
      total_human: formatBytes(total),
    });
  } catch (err) {
    res.status(500).json({ error: 'TrueNAS unreachable', detail: err.message });
  }
});

function formatBytes(bytes) {
  if (bytes === 0 || !bytes) return '0 B';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

app.listen(PORT, () => {
  console.log(`TrueNAS bar widget running on port ${PORT}`);
  console.log(`Target: ${TRUENAS_HOST} | Pool: ${POOL_NAME}`);
});