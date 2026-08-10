const QRCode = require('qrcode');

async function generateQR(shopId, frontendUrl) {
  const url = `${frontendUrl}/review/${shopId}`;
  const qrDataUrl = await QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
  return { url, qrDataUrl };
}

module.exports = { generateQR };
