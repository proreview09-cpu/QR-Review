const OpenAI = require('openai');
const Setting = require('../models/Setting');
const TokenUsage = require('../models/TokenUsage');

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

async function getApiKey() {
  const setting = await Setting.findOne({ key: 'openaiApiKey' });
  return setting?.value || process.env.OPENAI_API_KEY;
}

function generatePrompt(shopName, businessName, tone, count, language, customPrompt) {
  const toneDesc = REVIEW_TONES[tone] || 'friendly';
  const langName = LANGUAGES[language] || 'English';
  if (customPrompt && customPrompt.trim()) {
    const prompt = customPrompt.replace(/\[SHOP_NAME\]/g, shopName);
    return `${prompt}

Shop/Business name: "${shopName}"
Language: ${langName}
Tone: ${toneDesc}
Number of reviews: ${count}

CRITICAL RULES:
- Write like a REAL person - use casual language, typos ok, short sentences
- Maximum 3 lines, around 40-50 words only
- MUST naturally mention "${shopName}" in the review
- Each review should feel unique and authentic
- Vary sentence structure - some excited, some simple, some detailed
- No hashtags, no emojis, no greetings like "Dear", no sign-offs
- No generic phrases like "highly recommend" in every review

Return ONLY JSON array: ["review1","review2",...]`;
  }
  return `You are a real customer who just visited "${shopName}". Write ${count} short Google reviews in ${langName}.

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

Return ONLY JSON array: ["review1","review2",...]`;
}

async function generateReviews(shopName, businessName, tone, count = 10, language = 'english', shopId = null, customPrompt = null) {
  const apiKey = await getApiKey();
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return generateMockReviews(count, language);
  }

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: generatePrompt(shopName, businessName, tone, count, language, customPrompt) }],
      temperature: 1.2,
      max_tokens: 3000,
    });

    if (shopId && response.usage) {
      TokenUsage.create({
        shop: shopId,
        model: 'gpt-4o-mini',
        promptTokens: response.usage.prompt_tokens || 0,
        completionTokens: response.usage.completion_tokens || 0,
        totalTokens: response.usage.total_tokens || 0,
        reviewsGenerated: count,
        success: true,
      }).catch(console.error);
    }

    const text = response.choices[0].message.content.trim();
    const cleaned = text.replace(/```json|```/g, '').trim();
    const reviews = JSON.parse(cleaned);

    if (!Array.isArray(reviews)) throw new Error('Invalid response format');
    return reviews;
  } catch (err) {
    console.error('OpenAI API failed, using mock reviews:', err.message);
    return generateMockReviews(count, language);
  }
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
