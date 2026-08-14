const OpenAI = require('openai');
const Setting = require('../models/Setting');
const TokenUsage = require('../models/TokenUsage');
const AIProviderStatus = require('../models/AIProviderStatus');

const REVIEW_TONES = {
  professional: 'formal and business-like',
  friendly: 'warm and approachable',
  casual: 'relaxed and conversational',
  enthusiastic: 'excited and energetic',
  grateful: 'thankful and appreciative',
  humorous: 'light-hearted and funny',
};

const LANGUAGES = {
  english: 'English',
  gujarati: 'Gujarati (ગુજરાતી)',
  hindi: 'Hindi (हिन्दी)',
};

const PROMPT_VARIABLES = [
  'shopName',
  'businessName',
  'ownerName',
  'address',
  'phone',
  'reviewTone',
  'language',
  'reviewCount',
];

async function getAIProviders() {
  const providersSetting = await Setting.findOne({ key: 'aiProviders' });
  const configuredProviders = Array.isArray(providersSetting?.value)
    ? providersSetting.value.filter((provider) => provider.enabled !== false && provider.apiKey)
    : [];

  if (configuredProviders.length) return configuredProviders;

  const openaiSetting = await Setting.findOne({ key: 'openaiApiKey' });
  const openaiApiKey = openaiSetting?.value || process.env.OPENAI_API_KEY;
  return openaiApiKey && openaiApiKey !== 'your_openai_api_key_here'
    ? [{ provider: 'openai', apiKey: openaiApiKey, enabled: true }]
    : [];
}

async function getGeneralPrompt() {
  const setting = await Setting.findOne({ key: 'generalReviewPrompt' });
  return setting?.value || '';
}

function resolvePrompt(generalPrompt, customPrompt, promptMode) {
  if (promptMode === 'override') return customPrompt || generalPrompt;
  if (promptMode === 'combine') {
    return [generalPrompt, customPrompt].filter(Boolean).join('\n');
  }
  return generalPrompt;
}

function replacePromptVariables(prompt, values) {
  if (!prompt) return '';
  return prompt.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (match, key) => {
    if (!PROMPT_VARIABLES.includes(key)) return match;
    return String(values[key] ?? '');
  });
}

function parseReviews(text) {
  if (!text) throw new Error('Provider returned an empty response');
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start < 0 || end < start) throw new Error('Provider did not return a JSON array');

  const reviews = JSON.parse(cleaned.slice(start, end + 1));
  if (!Array.isArray(reviews) || reviews.some((review) => typeof review !== 'string' || !review.trim())) {
    throw new Error('Provider returned an invalid review array');
  }
  return reviews.map((review) => review.trim());
}

async function requestProvider(provider, prompt) {
  const providerName = provider.provider;

  if (providerName === 'openai' || providerName === 'groq') {
    const client = new OpenAI({
      apiKey: provider.apiKey,
      ...(providerName === 'groq' ? { baseURL: 'https://api.groq.com/openai/v1' } : {}),
    });
    const model = provider.model || (providerName === 'groq' ? 'llama-3.1-8b-instant' : 'gpt-4o-mini');
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 1.2,
      max_tokens: 3000,
    });
    return {
      text: response.choices?.[0]?.message?.content,
      usage: response.usage,
      model: response.model || model,
    };
  }

  if (providerName === 'gemini') {
    const model = provider.model || 'gemini-1.5-flash';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(provider.apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 1.2, maxOutputTokens: 3000 },
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `Gemini request failed (${response.status})`);
    return {
      text: data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join(''),
      usage: {
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata?.totalTokenCount || 0,
      },
      model,
    };
  }

  if (providerName === 'anthropic') {
    const model = provider.model || 'claude-3-5-haiku-latest';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 3000,
        temperature: 1.2,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `Anthropic request failed (${response.status})`);
    return {
      text: data.content?.map((part) => part.text || '').join(''),
      usage: {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      model,
    };
  }

  throw new Error(`Unsupported AI provider: ${providerName}`);
}

function recordTokenUsage(shopId, provider, model, usage, reviewsGenerated, success) {
  if (!shopId) return;
  TokenUsage.create({
    shop: shopId,
    provider,
    model,
    promptTokens: usage?.prompt_tokens || 0,
    completionTokens: usage?.completion_tokens || 0,
    totalTokens: usage?.total_tokens || 0,
    reviewsGenerated: success ? reviewsGenerated : 0,
    success,
  }).catch(console.error);
}

function updateProviderStatus(provider, status, error = '') {
  const now = new Date();
  const update = {
    $set: {
      status,
      lastAttemptAt: now,
      ...(status === 'active' ? { lastSuccessAt: now, lastError: '' } : {}),
      ...(status === 'failed' ? { lastFailureAt: now, lastError: error.slice(0, 500) } : {}),
    },
    ...(status === 'active'
      ? { $set: { status, lastAttemptAt: now, lastSuccessAt: now, lastError: '', consecutiveFailures: 0 } }
      : { $inc: { consecutiveFailures: 1 } }),
  };
  return AIProviderStatus.findOneAndUpdate(
    { provider },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).catch((statusError) => console.error('AI status update failed:', statusError.message));
}

function generatePrompt(shopName, businessName, tone, count, language, generalPrompt, customPrompt, promptMode) {
  const toneDesc = REVIEW_TONES[tone] || 'friendly';
  const langName = LANGUAGES[language] || 'English';
  const specificInstructions = resolvePrompt(generalPrompt, customPrompt, promptMode);
  return `You are a real customer who just visited "${shopName}". Write ${count} short Google reviews in ${langName}.

BUSINESS-SPECIFIC INSTRUCTIONS:
${specificInstructions || 'Use only the business details and tone provided below.'}

CRITICAL RULES:
- Write like a REAL person - use casual language, typos ok, short sentences
- Maximum 3 lines, around 40-50 words only
- MUST naturally mention "${shopName}" in the review
- Tone: ${toneDesc}
- Each review should feel unique and authentic
- Vary sentence structure - some excited, some simple, some detailed
- No hashtags, no emojis, no greetings like "Dear", no sign-offs
- No generic phrases like "highly recommend" in every review
- Mix up opening words (don't start all with "Great" or "Amazing")
- Do not invent specific facts, offers, products, or experiences that are not supported by the instructions

Return ONLY JSON array: ["review1","review2",...]`;
}

async function generateReviews(shopName, businessName, tone, count = 10, language = 'english', shopId = null, customPrompt = '', promptMode = 'general', promptContext = {}) {
  const providers = await getAIProviders();
  if (!providers.length) {
    return generateMockReviews(count, language);
  }

  const generalPrompt = await getGeneralPrompt();
  const variables = {
    shopName,
    businessName,
    reviewTone: tone,
    language,
    reviewCount: count,
    ...promptContext,
  };
  const resolvedGeneralPrompt = replacePromptVariables(generalPrompt, variables);
  const resolvedCustomPrompt = replacePromptVariables(customPrompt, variables);
  const prompt = generatePrompt(shopName, businessName, tone, count, language, resolvedGeneralPrompt, resolvedCustomPrompt, promptMode);

  for (const provider of providers) {
    try {
      const result = await requestProvider(provider, prompt);
      const reviews = parseReviews(result.text);
      recordTokenUsage(shopId, provider.provider, result.model, result.usage, count, true);
      updateProviderStatus(provider.provider, 'active');
      console.log(`Review generation succeeded with ${provider.provider}`);
      return reviews;
    } catch (err) {
      recordTokenUsage(shopId, provider.provider, provider.model || provider.provider, null, 0, false);
      updateProviderStatus(provider.provider, 'failed', err.message);
      console.error(`${provider.provider} failed, trying next provider:`, err.message);
    }
  }

  console.error('All configured AI providers failed, using mock reviews');
  return generateMockReviews(count, language);
}

function generateMockReviews(count, language = 'english') {
  const pools = {
    english: [
      "honestly this shop is a lifesaver. staff is super chill and they actually know what they're doing. prices won't break your bank either",
      "been going here for a while now and still haven't found a reason to complain. everything's just right every single time",
      "ok so i was a bit skeptical at first but man was i wrong. the quality is legit. you can tell they care about what they do",
      "not gonna lie this place surprised me. quick service, clean place, and they didn't try to upsell me random stuff. respect",
      "finally a place that gets it. no drama, no nonsense, just good honest work. the kind of shop you tell your friends about",
      "bro this spot is actually fire. walked in not knowing what to expect and left with a smile. definitely coming back",
      "tbh i don't usually write reviews but these folks earned it. everything was smooth and they treated me like a regular",
      "went there on a friend's recommendation and now i get why. proper quality and the vibes are just right. solid experience",
      "look i've tried a bunch of places around here and this one just hits different. consistent quality, fair pricing. can't ask for more",
      "you know that feeling when you find a place that just works? yeah that's this shop. no fuss, no stress, just good service",
      "honestly don't understand how they keep it this good every time. maybe they just genuinely enjoy what they do. shows in the work",
      "came in with a problem, left with a solution. that's the kind of service that keeps people coming back. simple as that",
      "straight up one of the better experiences i've had in a minute. no complaints whatsoever. keep doing your thing guys",
      "if you're reading this just go already. been putting it off myself and now i'm kicking myself for not coming sooner",
      "real talk - it's hard to find good service these days but this place delivers. no cap, no gimmicks, just quality",
      "first time customer and they made it feel like i've been coming for years. that's rare. definitely earned a loyal customer",
      "not much to say except they got it right. everything from how they greet you to how they handle your request. top class",
      "would give 6 stars if i could. the little things matter and these guys pay attention to all of them. impressed",
      "heard about this place through word of mouth and the hype is real. walked in curious, walked out as a fan. simple as that",
      "sometimes you just need a place that doesn't mess around and gets the job done right. this is that place. period",
    ],
    gujarati: [
      "sachu kahu to aa shop ekdam best che. staff pan saras ane kaam pan ekdam dhagash. paisa vasool experience",
      "ghana samay thi avu chu ane haju sudhi koi fariyad nathi. badhu j vyavasthit ane time par thay che",
      "pehla to doubt hatu pan have khabar padi ke sachu kam kare che aa loko. quality ma koi compromise nai",
      "sarkhu che bhai. badhu time par thayu ane bau maja no response. have to ahiya j avanu",
      "mitra e kidhu tu ek var ahiya jaine jo. have khabar padi ke kem bolto to. saras che ekdam",
      "nikki ne avyo tya kaam thai gayu. koi nakhro nai, koi bahano nai. siddhu sadhu kam",
      "biji jagya e karta ahiya alag j feeling avi. saras service, mitra jevo vyavhar. have regular chu hu",
      "mobile ma review lakhvano man nai thato pan aa loko mate karu chu. deserve kare che bhai",
      "best che bhai best. ghana divas thi shodh hti avi jagya ni. madi gai have to fikar nai",
      "saras anubhav rahyo. have biji jagya e javani jarur nai pade. ahiya j badhu mali jase",
    ],
    hindi: [
      "sach batau to yeh dukaan kamaal ki hai. staff bindaas aur kaam bhi ek number. paisa vasool jagah hai",
      "kaafi time se aa raha hoon aur ab tak koi shikayat nahi. sab kuch time pe aur sahi hota hai",
      "pehle thoda doubt tha lekin ab pata chala ki asli kaam karte hain ye log. quality mein compromise nahi",
      "badhiya hai bhai. sab time pe hua aur bahut accha response mila. ab to yahi aana hai",
      "dost ne bola tha ek baar yahan jaake dekho. ab samjha ke kyun bol raha tha. badhiya hai ekdum",
      "nikal ke aaya to kaam ho gaya. koi natak nahi, koi bahana nahi. seedha saadha kaam",
      "doosri jagahon se yahan alag hi feeling aayi. badhiya service, dost jaisa vyavhaar. ab regular hoon",
      "phone mein review likhne ka man nahi tha lekin inke liye kar raha hoon. deserve karte hain",
      "best hai bhai best. kaafi din se aisi jagah ki talaash thi. mil gayi to ab tension nahi",
      "badhiya anubhav raha. ab doosri jagah jaane ki zaroorat nahi. yahi sab mil jaayega",
    ],
  };

  const mockReviews = pools[language] || pools.english;
  let result = [];
  let pool = [...mockReviews];
  for (let i = 0; i < count; i++) {
    if (pool.length === 0) pool = [...mockReviews];
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

module.exports = { generateReviews };
