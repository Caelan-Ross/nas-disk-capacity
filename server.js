const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3010;

const TRUENAS_HOST = process.env.TRUENAS_HOST || 'truenas.home.arpa';
const TRUENAS_API_KEY = process.env.TRUENAS_API_KEY || '';
const POOL_NAME = process.env.POOL_NAME || 'temp_pool';

app.use(express.static(path.join(__dirname, 'public')));

// Use /pool/dataset root entry for accurate usable ZFS capacity.
// /api/v2.0/pool returns raw vdev totals which double-count parity on RAIDZ.
app.get('/api/pool', (req, res) => {
  const options = {
    hostname: TRUENAS_HOST,
    port: 443,
    path: `/api/v2.0/pool/dataset?id=${encodeURIComponent(POOL_NAME)}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TRUENAS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    rejectUnauthorized: false,
  };

  const request = https.request(options, (response) => {
    let data = '';
    response.on('data', chunk => data += chunk);
    response.on('end', () => {
      if (response.statusCode !== 200) {
        return res.status(response.statusCode).json({
          error: `TrueNAS returned HTTP ${response.statusCode}`,
          detail: data.trim(),
        });
      }
      try {
        const datasets = JSON.parse(data);
        // ?id= returns an array; first entry is the root dataset
        const root = Array.isArray(datasets) ? datasets[0] : datasets;

        if (!root) {
          return res.status(404).json({ error: `Dataset '${POOL_NAME}' not found` });
        }

        const used  = root.used?.parsed ?? 0;
        const avail = root.available?.parsed ?? 0;
        const total = used + avail;
        const percent   = total > 0 ? (used / total) * 100 : 0;

        res.json({
          pool: root.name,
          used_bytes: used,
          total_bytes: total,
          percent: parseFloat(percent.toFixed(2)),
          used_human: formatBytes(used),
          total_human: formatBytes(total),
        });
      } catch (e) {
        res.status(500).json({ error: 'Parse error', detail: e.message });
      }
    });
  });

  request.on('error', (e) => {
    res.status(500).json({ error: 'TrueNAS unreachable', detail: e.message });
  });

  request.end();
});

function formatBytes(bytes) {
  if (bytes === 0 || !bytes) {
    return '0 B';
  }
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

app.listen(PORT, () => {
  console.log(`TrueNAS bar widget running on port ${PORT}`);
  console.log(`Target: ${TRUENAS_HOST} | Pool: ${POOL_NAME}`);
});