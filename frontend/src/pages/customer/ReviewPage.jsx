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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
        <div className="text-center text-white">
          <div className="animate-spin h-12 w-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-lg">Loading reviews...</p>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-900">Shop Not Found</h2>
          <p className="text-gray-500 mt-2">This shop may be inactive or does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center text-white mb-8">
          <h1 className="text-3xl font-bold mb-2">{shop.shopName}</h1>
          <p className="text-blue-100 text-lg">Tap any review to copy, then paste it on Google</p>
          <p className="text-blue-200 text-sm mt-1">{reviews.length} reviews available</p>
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
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-lg font-semibold text-gray-900">All reviews used</h3>
            <p className="text-gray-500 mt-1">New reviews are being generated. Refresh the page.</p>
            <button onClick={() => { setLoading(true); loadShop(); }}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Refresh Reviews
            </button>
          </div>
        )}

        <div className="text-center mt-8 text-blue-200 text-sm">
          <p>How it works:</p>
          <ol className="space-y-1 mt-2">
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
      <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-green-300">
        <p className="text-gray-800 leading-relaxed">{review.content}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex text-yellow-400 gap-0.5">{'★'.repeat(5)}</div>
          <button
            onClick={() => onPosted(review._id)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 active:scale-95 transition-all"
          >
            I Posted It!
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">Tap after posting review on Google</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-5 transition-all hover:shadow-xl">
      <p className="text-gray-800 leading-relaxed">{review.content}</p>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex text-yellow-400 gap-0.5">{'★'.repeat(5)}</div>
        <button
          onClick={() => onCopy(review)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all"
        >
          Copy Review
        </button>
      </div>
    </div>
  );
}
