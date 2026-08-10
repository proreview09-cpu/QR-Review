import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function QRCode() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/shop/my-shop').then(({ data }) => setData(data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  if (!data) return <p className="text-gray-500">Failed to load.</p>;

  const { shop, reviewLink } = data;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Your QR Code</h2>

      <div className="bg-white rounded-lg shadow p-8 text-center">
        <h3 className="text-xl font-semibold mb-2">{shop.shopName}</h3>
        <p className="text-gray-500 mb-6">Scan this QR code to leave a review</p>

        {shop.qrCodeData ? (
          <div className="mb-6">
            <img src={shop.qrCodeData} alt={`QR Code for ${shop.shopName}`} className="mx-auto w-72 h-72 border-4 border-gray-100 rounded-xl" />
            <a href={shop.qrCodeData} download={`qrcode-${shop.shopName}.png`}
              className="inline-block mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
              Download QR Code
            </a>
          </div>
        ) : (
          <p className="text-gray-400 italic mb-4">QR code not generated yet. Contact admin.</p>
        )}

        <div className="border-t pt-6 mt-6">
          <p className="text-sm text-gray-500 mb-2">Or share this link directly:</p>
          <div className="flex items-center gap-2 max-w-md mx-auto">
            <input readOnly value={reviewLink} className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-sm text-center" />
            <button onClick={() => { navigator.clipboard.writeText(reviewLink); toast.success('Link copied!'); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              Copy
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <h4 className="font-semibold text-blue-800 mb-2">How to use:</h4>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Print the QR code and display it at your shop counter</li>
          <li>Customers scan the QR code with their phone camera</li>
          <li>They see 50 AI-generated review options</li>
          <li>Customer taps "Copy" on any review - it copies to clipboard</li>
          <li>Google review page opens - they paste and submit!</li>
        </ol>
      </div>
    </div>
  );
}
