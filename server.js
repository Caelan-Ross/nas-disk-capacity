const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3010;

const TRUENAS_HOST = process.env.TRUENAS_HOST || 'truenas.home.arpa';
const TRUENAS_API_KEY = process.env.TRUENAS_API_KEY || '';
const POOL_NAME = process.env.POOL_NAME || 'temp_pool';

app.use(express.static(path.join(__dirname, 'public')));

// Proxy endpoint: fetches pool data from TrueNAS API
app.get('/api/pool', (req, res) => {
  const options = {
    hostname: TRUENAS_HOST,
    port: 443,
    path: '/api/v2.0/pool',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TRUENAS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    rejectUnauthorized: false, // self-signed cert support
  };

  const request = https.request(options, (response) => {
    let data = '';
    response.on('data', chunk => data += chunk);
    response.on('end', () => {
      try {
        const pools = JSON.parse(data);
        const pool = pools.find(p => p.name === POOL_NAME) || pools[0];

        if (!pool) {
          return res.status(404).json({ error: 'Pool not found' });
        }
        const used = pool.size - pool.free;
        const total = pool.size;
        const percent = total > 0 ? (used / total) * 100 : 0;

        res.json({
          pool: pool.name,
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