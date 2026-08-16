import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ReviewPage() {
  const { shopId } = useParams();
  const [shop, setShop] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [postedIds, setPostedIds] = useState(new Set());

  useEffect(() => {
    loadShop();
  }, [shopId]);

  const loadShop = async () => {
    try {
      const { data } = await api.get(`/public/shop/${shopId}`);
      setShop(data.shop);
      setReviews(data.reviews);
    } catch {
      toast.error('Shop not found or inactive');
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return Promise.resolve();
  };

  const handleCopy = useCallback(async (review) => {
    try {
      await copyText(review.content);
      setCopiedId(review._id);
      toast.success('Review copied! Google page opening...');

      const { data } = await api.post(`/public/review/${review._id}/copy`);

      setTimeout(() => {
        if (data.googleReviewUrl) {
          window.open(data.googleReviewUrl, '_blank');
        }
      }, 500);

      api.post(`/public/shop/${shopId}/generate`)
        .then(async () => {
          const { data: fresh } = await api.get(`/public/shop/${shopId}`);
          const newReviews = fresh.reviews.filter((r) => !postedIds.has(r._id));
          setReviews(newReviews);
        })
        .catch(() => {});
    } catch (err) {
      if (err.response?.status === 400) {
        toast.error('This review was already used');
        setReviews((prev) => prev.filter((r) => r._id !== review._id));
      } else {
        toast.error('Failed to copy review');
      }
    }
  }, [shopId, postedIds]);

  const handlePosted = useCallback(async (reviewId) => {
    try {
      await api.post(`/public/review/${reviewId}/posted`);
      const newPosted = new Set(postedIds);
      newPosted.add(reviewId);
      setPostedIds(newPosted);
      setCopiedId(null);
      setReviews((prev) => prev.filter((r) => r._id !== reviewId));
      toast.success('Thanks for posting the review!');
    } catch {
      toast.error('Failed to confirm');
    }
  }, [postedIds]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9fd]">
        <div className="text-center text-[#17182d]">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-lg font-semibold">Loading reviews...</p>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9fd] p-4">
        <div className="max-w-md rounded-2xl border border-[#e9edf5] bg-white p-8 text-center shadow-[0_8px_28px_rgba(41,45,54,0.05)]">
          <div className="mb-4 text-6xl">🔒</div>
          <h2 className="text-xl font-extrabold text-[#17182d]">Shop Not Found</h2>
          <p className="mt-2 text-sm text-slate-500">This shop may be inactive or does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fd]">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold text-indigo-600">Leave us a Google review</p>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-[#17182d]">{shop.shopName}</h1>
          <p className="text-lg text-slate-500">Tap any review to copy, then paste it on Google</p>
          <p className="mt-1 text-sm text-slate-400">{reviews.length} reviews available</p>
        </div>

        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review._id}
              review={review}
              onCopy={handleCopy}
              onPosted={handlePosted}
              isCopied={copiedId === review._id}
            />
          ))}
        </div>

        {reviews.length === 0 && (
          <div className="rounded-2xl border border-[#e9edf5] bg-white p-8 text-center shadow-[0_8px_28px_rgba(41,45,54,0.05)]">
            <div className="mb-4 text-4xl">🎉</div>
            <h3 className="text-lg font-extrabold text-[#17182d]">All reviews used</h3>
            <p className="mt-1 text-sm text-slate-500">New reviews are being generated. Refresh the page.</p>
            <button onClick={() => { setLoading(true); loadShop(); }}
              className="mt-4 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700">
              Refresh Reviews
            </button>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-slate-400">
          <p className="font-bold text-slate-500">How it works:</p>
          <ol className="mt-2 space-y-1">
            <li>1. Tap "Copy" on any review you like</li>
            <li>2. Google review page will open</li>
            <li>3. Paste and submit your review!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ review, onCopy, isCopied, onPosted }) {
  if (isCopied) {
    return (
      <div className="rounded-2xl border-2 border-emerald-300 bg-white p-5 shadow-[0_8px_28px_rgba(41,45,54,0.05)]">
        <p className="leading-relaxed text-slate-700">{review.content}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-0.5 text-yellow-400">{'★'.repeat(5)}</div>
          <button
            onClick={() => onPosted(review._id)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 active:scale-95"
          >
            I Posted It!
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-slate-400">Tap after posting review on Google</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#e9edf5] bg-white p-5 shadow-[0_8px_28px_rgba(41,45,54,0.05)] transition-all hover:shadow-xl">
      <p className="leading-relaxed text-slate-700">{review.content}</p>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-0.5 text-yellow-400">{'★'.repeat(5)}</div>
        <button
          onClick={() => onCopy(review)}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 active:scale-95"
        >
          Copy Review
        </button>
      </div>
    </div>
  );
}