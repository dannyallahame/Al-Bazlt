// خادم معاينة محلي - ALBAZLT ALRMADY
// يعمل على الجهاز وعلى الشبكة المحلية (للتصفح من الموبايل)
// يدعم HTTP Range (206) لضمان تشغيل الفيديو على جميع المتصفحات وأجهزة iPhone/iOS
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function contentType(p) {
  return types[path.extname(p).toLowerCase()] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const fp = path.join(__dirname, p);

  fs.stat(fp, (serr, stats) => {
    if (serr || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found: ' + p);
      return;
    }

    const range = req.headers.range;

    // دعم طلبات النطاق (Range) — ضروري لتشغيل الفيديو خصوصًا على iOS
    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      let start = match && match[1] ? parseInt(match[1], 10) : 0;
      let end = match && match[2] ? parseInt(match[2], 10) : stats.size - 1;
      if (isNaN(start)) start = 0;
      if (isNaN(end) || end >= stats.size) end = stats.size - 1;
      if (start > end) {
        res.writeHead(416, { 'Content-Range': 'bytes */' + stats.size });
        res.end();
        return;
      }
      res.writeHead(206, {
        'Content-Type': contentType(fp),
        'Accept-Ranges': 'bytes',
        'Content-Range': 'bytes ' + start + '-' + end + '/' + stats.size,
        'Content-Length': end - start + 1
      });
      fs.createReadStream(fp, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType(fp),
      'Accept-Ranges': 'bytes',
      'Content-Length': stats.size
    });
    fs.createReadStream(fp).pipe(res);
  });
});

function start(port) {
  server.once('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.log('المنفذ ' + port + ' مشغول، أحاول المنفذ التالي...');
      start(port + 1);
    } else {
      throw err;
    }
  });
  server.listen(port, '0.0.0.0', () => {
    const localUrl = 'http://127.0.0.1:' + port + '/';
    console.log('========================================================');
    console.log('  المعاينة على جهازك:     ' + localUrl);
    for (const name of Object.keys(os.networkInterfaces())) {
      for (const net of os.networkInterfaces()[name]) {
        if ((net.family === 'IPv4' || net.family === 4) && !net.internal) {
          console.log('  المعاينة من الموبايل:   http://' + net.address + ':' + port + '/');
        }
      }
    }
    console.log('  (نفس شبكة الواي فاي على الجهازين)');
    console.log('  أغلق هذه النافذة لإيقاف الخادم.');
    console.log('========================================================');
    exec('start "" "' + localUrl + '"');
  });
}

start(8099);