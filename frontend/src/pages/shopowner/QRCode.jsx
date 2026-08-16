import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function QRCode() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/shop/my-shop').then(({ data }) => setData(data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f7f9fd]"><div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" /></div>;
  if (!data) return <p className="min-h-screen bg-[#f7f9fd] p-8 text-center text-red-500">Failed to load.</p>;

  const { shop } = data;
  const reviewLink = `${window.location.origin}/review/${shop._id}`;

  return (
    <div className="min-h-screen bg-[#f7f9fd] text-[#17182d]">
      <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-[#e9edf5] bg-white/90 px-5 backdrop-blur-xl md:px-10">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-gradient-to-br from-indigo-600 to-violet-500 text-sm font-extrabold text-white shadow-lg shadow-indigo-200">QR</span>
          <span><strong className="block text-[17px] font-extrabold tracking-tight">QR <span className="text-indigo-600">Review</span></strong><small className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Business growth</small></span>
        </div>
        <Link to="/dashboard" className="ml-1 rounded-xl border border-[#e7eaf2] px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50">Back to dashboard</Link>
      </header>

      <main className="mx-auto max-w-[760px] px-5 py-10 md:px-10">
        <section className="mb-8">
          <p className="mb-2 text-sm font-semibold text-indigo-600">Customer station</p>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Your QR code</h1>
          <p className="mt-2 text-sm text-slate-500">Print this and display it at your counter. Customers scan it to leave a review.</p>
        </section>

        <section className="rounded-2xl border border-[#e9edf5] bg-white p-8 text-center shadow-[0_8px_28px_rgba(41,45,54,0.05)]">
          <h3 className="text-xl font-extrabold">{shop.shopName}</h3>
          <p className="mb-6 text-sm text-slate-400">Scan this QR code to leave a review</p>

          {shop.qrCodeData ? (
            <div className="mb-6">
              <img src={shop.qrCodeData} alt={`QR Code for ${shop.shopName}`} className="mx-auto h-72 w-72 rounded-xl border-4 border-[#f1f3f9]" />
              <a href={shop.qrCodeData} download={`qrcode-${shop.shopName}.png`} className="mt-4 inline-block rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700">
                Download QR code
              </a>
            </div>
          ) : (
            <p className="mb-4 italic text-slate-400">QR code not generated yet. Contact admin.</p>
          )}

          <div className="border-t border-[#edf0f5] pt-6 mt-6">
            <p className="mb-2 text-sm text-slate-500">Or share this link directly:</p>
            <div className="mx-auto flex max-w-md items-center gap-2">
              <input readOnly value={reviewLink} className="input flex-1 bg-slate-50 text-center text-sm" />
              <button onClick={() => { navigator.clipboard.writeText(reviewLink); toast.success('Link copied!'); }} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Copy</button>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
          <h4 className="mb-2 text-sm font-extrabold text-indigo-800">How to use:</h4>
          <ol className="list-inside list-decimal space-y-1 text-sm text-indigo-700">
            <li>Print the QR code and display it at your shop counter</li>
            <li>Customers scan the QR code with their phone camera</li>
            <li>They see AI-generated review options</li>
            <li>Customer taps "Copy" on any review - it copies to clipboard</li>
            <li>Google review page opens - they paste and submit!</li>
          </ol>
        </section>
      </main>
    </div>
  );
}