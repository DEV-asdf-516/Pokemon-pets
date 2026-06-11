const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const assetsDir = path.resolve(__dirname, '..', 'assets')

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const name = Buffer.from(type)
  const body = Buffer.concat([name, data])
  const result = Buffer.alloc(data.length + 12)
  result.writeUInt32BE(data.length, 0)
  body.copy(result, 4)
  result.writeUInt32BE(crc32(body), data.length + 8)
  return result
}

function writePng(filePath, width, height, pixels) {
  const rows = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1)
    rows[rowStart] = 0
    pixels.copy(rows, rowStart + 1, y * width * 4, (y + 1) * width * 4)
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  fs.writeFileSync(filePath, png)
}

function roundedRectContains(x, y, left, top, right, bottom, radius) {
  const cx = Math.max(left + radius, Math.min(right - radius, x))
  const cy = Math.max(top + radius, Math.min(bottom - radius, y))
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2
}

function sampleAppIcon(x, y) {
  if (!roundedRectContains(x, y, 32, 32, 992, 992, 224)) {
    return [0, 0, 0, 0]
  }

  const bgMix = Math.max(0, Math.min(1, (x + y - 200) / 1600))
  let color = [
    255,
    Math.round(245 - 32 * bgMix),
    Math.round(220 - 78 * bgMix),
    255,
  ]
  const dx = x - 512
  const dy = y - 500
  const distance = Math.hypot(dx, dy)

  if (distance <= 350 && dy > 250) {
    color = [124, 49, 29, Math.round(75 * Math.max(0, 1 - (distance - 300) / 50))]
  }
  if (distance <= 330) {
    color = dy < 0
      ? [Math.round(255 - 38 * (x / 1024)), Math.round(103 - 64 * (y / 1024)), 82, 255]
      : [246, 249, 250, 255]
  }
  if (distance > 311 && distance <= 350) {
    color = [32, 37, 43, 255]
  }
  if (distance <= 311 && Math.abs(dy) <= 29) {
    color = [32, 37, 43, 255]
  }
  if (distance <= 126) {
    color = [32, 37, 43, 255]
  }
  if (distance <= 91) {
    color = [32, 37, 43, 255]
  }
  if (distance <= 73) {
    color = [248, 250, 251, 255]
  }

  const highlightDistance = Math.hypot(x - 418, y - 310)
  if (highlightDistance < 92 && distance < 290 && dy < -20) {
    const alpha = 0.22 * Math.max(0, 1 - highlightDistance / 92)
    color = color.map((channel, index) => index === 3 ? channel : Math.round(channel + (255 - channel) * alpha))
  }
  return color
}

function sampleTrayIcon(x, y) {
  const dx = x - 32
  const dy = y - 32
  const distance = Math.hypot(dx, dy)
  const outerRing = distance >= 24 && distance <= 30
  const centerBand = Math.abs(dy) <= 3 && distance <= 27
  const center = distance <= 11
  const centerHole = distance < 5.5
  if (centerHole) {
    return [0, 0, 0, 0]
  }
  return outerRing || centerBand || center ? [0, 0, 0, 255] : [0, 0, 0, 0]
}

function render(filePath, size, sample, sourceSize, supersampling = 4) {
  const pixels = Buffer.alloc(size * size * 4)
  const scale = sourceSize / size
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const total = [0, 0, 0, 0]
      for (let sy = 0; sy < supersampling; sy += 1) {
        for (let sx = 0; sx < supersampling; sx += 1) {
          const color = sample(
            (x + (sx + 0.5) / supersampling) * scale,
            (y + (sy + 0.5) / supersampling) * scale,
          )
          for (let channel = 0; channel < 4; channel += 1) {
            total[channel] += color[channel]
          }
        }
      }
      const samples = supersampling ** 2
      const offset = (y * size + x) * 4
      for (let channel = 0; channel < 4; channel += 1) {
        pixels[offset + channel] = Math.round(total[channel] / samples)
      }
    }
  }
  writePng(filePath, size, size, pixels)
}

fs.mkdirSync(assetsDir, { recursive: true })
render(path.join(assetsDir, 'icon.png'), 1024, sampleAppIcon, 1024, 2)
render(path.join(assetsDir, 'trayTemplate.png'), 16, sampleTrayIcon, 64)
render(path.join(assetsDir, 'trayTemplate@2x.png'), 32, sampleTrayIcon, 64)

console.log('Generated app and tray icons in assets/')
