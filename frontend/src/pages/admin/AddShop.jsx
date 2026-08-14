import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import PromptVariables from '../../components/PromptVariables';

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'casual', label: 'Casual' },
  { value: 'enthusiastic', label: 'Enthusiastic' },
  { value: 'grateful', label: 'Grateful' },
  { value: 'humorous', label: 'Humorous' },
];

const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'gujarati', label: 'Gujarati' },
  { value: 'hindi', label: 'Hindi' },
];

const PROMPT_MODES = [
  { value: 'general', label: 'Use general prompt only' },
  { value: 'combine', label: 'Combine general + shop prompt' },
  { value: 'override', label: 'Override general with shop prompt' },
];

const emptyForm = {
  ownerEmail: '', ownerName: '', ownerPassword: '',
  businessName: '', shopName: '', address: '', phone: '', googleReviewUrl: '',
  reviewTone: 'friendly', language: 'english',
  customPrompt: '', promptMode: 'combine',
  canOwnerSetTone: false, reviewPoolMin: 50, reviewBatchSize: 50,
};

export default function AddShop() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const insertPromptVariable = (variable) => {
    setForm((current) => ({
      ...current,
      customPrompt: `${current.customPrompt}${current.customPrompt && !/\s$/.test(current.customPrompt) ? ' ' : ''}${variable}`,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/admin/shops', form);
      toast.success('Shop created successfully!');
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create shop');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">Shop Created</h2>
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium">Shop created successfully!</p>
          </div>
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-1">Review Link</p>
            <div className="flex items-center gap-2">
              <input readOnly value={result.reviewLink} className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-sm" />
              <button onClick={() => { navigator.clipboard.writeText(result.reviewLink); toast.success('Link copied!'); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Copy</button>
            </div>
          </div>
          {result.warnings?.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm text-yellow-800">
              {result.warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          )}
          <div className="flex gap-3">
            <Link to={`/admin/shops/${result.shop._id}`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">View Shop</Link>
            <button onClick={() => { setResult(null); setForm({ ...emptyForm }); }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Add Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold mb-6">Add New Shop</h2>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3 border-b pb-2">Owner Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Owner Name" hint="Full name of the person who will use this account.">
              <input name="ownerName" value={form.ownerName} onChange={handleChange} required className="input" placeholder="Rajesh Patel" />
            </Field>
            <Field label="Owner Email" hint="This email will be used for shop-owner login.">
              <input name="ownerEmail" type="email" value={form.ownerEmail} onChange={handleChange} required className="input" placeholder="owner@example.com" />
            </Field>
            <Field label="Password" hint="Leave empty to use the default password configured by your system.">
              <input name="ownerPassword" type="password" value={form.ownerPassword} onChange={handleChange} className="input" placeholder="Optional password" />
            </Field>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3 border-b pb-2">Business Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Business Name" hint="Enter the exact name shown on Google Business Profile.">
              <input name="businessName" value={form.businessName} onChange={handleChange} required className="input" placeholder="ABC Stores Pvt Ltd" />
            </Field>
            <Field label="Shop Display Name" hint="Short name customers will see on the review page.">
              <input name="shopName" value={form.shopName} onChange={handleChange} required className="input" placeholder="ABC Stores" />
            </Field>
            <Field label="Phone" hint="Business contact number. Optional.">
              <input name="phone" value={form.phone} onChange={handleChange} className="input" placeholder="+91 9876543210" />
            </Field>
            <Field label="Address" hint="Full shop address. Optional, but useful for context.">
              <input name="address" value={form.address} onChange={handleChange} className="input" placeholder="Shop 12, Main Road, City" />
            </Field>
            <Field label="Google Review URL" hint="Google Business Profile -> Ask for reviews -> Copy link.">
              <input name="googleReviewUrl" value={form.googleReviewUrl} onChange={handleChange} required className="input" placeholder="https://search.google.com/local/writereview?..." />
            </Field>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3 border-b pb-2">Review Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Review Tone" hint="Controls the writing style of generated review templates.">
              <select name="reviewTone" value={form.reviewTone} onChange={handleChange} className="input bg-white">
                {TONES.map((tone) => <option key={tone.value} value={tone.value}>{tone.label}</option>)}
              </select>
            </Field>
            <Field label="Review Language" hint="Language in which ChatGPT should write reviews.">
              <select name="language" value={form.language} onChange={handleChange} className="input bg-white">
                {LANGUAGES.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}
              </select>
            </Field>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Shop-Specific Prompt</label>
              <textarea name="customPrompt" value={form.customPrompt} onChange={handleChange} rows="4" className="input resize-y"
                placeholder="Example: Mention fast delivery, fresh products, helpful staff, and family-friendly service." />
              <p className="hint">Optional instructions only for this shop. Add factual details you want reflected in the reviews.</p>
              <PromptVariables onInsert={insertPromptVariable} />
            </div>
            <Field label="Prompt Behavior" hint="Choose how this shop prompt works with the general admin prompt.">
              <select name="promptMode" value={form.promptMode} onChange={handleChange} className="input bg-white">
                {PROMPT_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
              </select>
            </Field>
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 h-full">
              <input type="checkbox" name="canOwnerSetTone" checked={form.canOwnerSetTone} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <div>
                <label className="text-sm font-medium text-gray-700">Allow owner to change tone/language</label>
                <p className="hint">If unchecked, only admin can change these settings.</p>
              </div>
            </div>
            <Field label="Review Pool Size" hint="Minimum number of unused reviews kept in the queue.">
              <input type="number" name="reviewPoolMin" value={form.reviewPoolMin} onChange={handleChange} min="10" max="500" className="input" />
            </Field>
            <Field label="Generate Batch Size" hint="Number of reviews generated whenever the queue needs refilling.">
              <input type="number" name="reviewBatchSize" value={form.reviewBatchSize} onChange={handleChange} min="10" max="200" className="input" />
            </Field>
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {loading ? 'Creating...' : 'Create Shop'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      <p className="hint">{hint}</p>
    </div>
  );
}
