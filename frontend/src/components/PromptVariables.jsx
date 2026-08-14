export const PROMPT_VARIABLES = [
  { token: '{shopName}', label: 'Shop name' },
  { token: '{businessName}', label: 'Business name' },
  { token: '{ownerName}', label: 'Owner name' },
  { token: '{address}', label: 'Address' },
  { token: '{phone}', label: 'Phone' },
  { token: '{reviewTone}', label: 'Tone' },
  { token: '{language}', label: 'Language' },
  { token: '{reviewCount}', label: 'Review count' },
];

export default function PromptVariables({ onInsert }) {
  return (
    <div className="mt-2">
      <p className="text-xs text-gray-400 mb-2">Click a variable to add it to the prompt:</p>
      <div className="flex flex-wrap gap-2">
        {PROMPT_VARIABLES.map(({ token, label }) => (
          <button
            key={token}
            type="button"
            title={label}
            onClick={() => onInsert(token)}
            className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs hover:bg-blue-100"
          >
            {token}
          </button>
        ))}
      </div>
    </div>
  );
}
