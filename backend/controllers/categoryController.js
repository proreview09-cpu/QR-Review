const Category = require('../models/Category');
const Shop = require('../models/Shop');
const Review = require('../models/Review');
const { generateReviews } = require('../services/openaiService');
const { log } = require('../services/logService');
const XLSX = require('xlsx');

exports.getCategories = async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const filter = {};
    if (activeOnly === 'true') filter.isActive = true;
    const categories = await Category.find(filter).sort({ name: 1 });
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description, defaultPrompt, defaultTone, defaultLanguage, isActive, reviewPoolMin, reviewBatchSize } = req.body;
    const category = await Category.create({
      name,
      description: description || '',
      defaultPrompt: defaultPrompt || '',
      defaultTone: defaultTone || 'friendly',
      defaultLanguage: defaultLanguage || 'english',
      isActive: isActive !== undefined ? isActive : true,
      reviewPoolMin: reviewPoolMin || 50,
      reviewBatchSize: reviewBatchSize || 50,
    });
    log('CREATE', 'category', `Created category "${name}"`, { performedBy: req.user.email, category: category._id });
    res.status(201).json({ category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    log('UPDATE', 'category', `Updated category "${category.name}"`, { performedBy: req.user.email, category: category._id });
    res.json({ category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    log('DELETE', 'category', `Deleted category "${category.name}"`, { performedBy: req.user.email, category: category._id });
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.downloadTemplate = async (req, res) => {
  try {
    const worksheet = XLSX.utils.json_to_sheet([
      { name: 'Restaurant', description: 'Restaurants and cafes', defaultPrompt: '', defaultTone: 'friendly', defaultLanguage: 'english', isActive: true, reviewPoolMin: 50, reviewBatchSize: 50 },
      { name: 'Medical', description: 'Doctors, clinics, hospitals', defaultPrompt: '', defaultTone: 'professional', defaultLanguage: 'english', isActive: true, reviewPoolMin: 50, reviewBatchSize: 50 },
      { name: 'Retail', description: 'Shops and retail stores', defaultPrompt: '', defaultTone: 'casual', defaultLanguage: 'english', isActive: true, reviewPoolMin: 50, reviewBatchSize: 50 },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Categories');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=categories-template.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.uploadCategories = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const results = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const name = (row.name || row.Name || '').toString().trim();
      if (!name) {
        results.skipped++;
        continue;
      }

      try {
        const existing = await Category.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
        const payload = {
          name,
          description: (row.description || row.Description || '').toString().trim(),
          defaultPrompt: (row.defaultPrompt || row['Default Prompt'] || '').toString().trim(),
          defaultTone: (row.defaultTone || row['Default Tone'] || 'friendly').toString().trim().toLowerCase(),
          defaultLanguage: (row.defaultLanguage || row['Default Language'] || 'english').toString().trim().toLowerCase(),
          isActive: row.isActive !== undefined ? row.isActive : true,
          reviewPoolMin: Number(row.reviewPoolMin || row['Review Pool Min'] || 50),
          reviewBatchSize: Number(row.reviewBatchSize || row['Review Batch Size'] || 50),
        };

        if (existing) {
          await Category.findByIdAndUpdate(existing._id, payload);
          results.updated++;
        } else {
          await Category.create(payload);
          results.created++;
        }
      } catch (err) {
        results.errors.push(`Row ${i + 2}: ${err.message}`);
      }
    }

    log('UPLOAD', 'category', `Excel upload: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`, { performedBy: req.user.email });
    res.json({ ...results, message: `Processed ${data.length} rows: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.generateCategoryPrompt = async (req, res) => {
  try {
    const { name, description } = req.body;
    const categoryName = name || req.params.id ? await Category.findById(req.params.id).then(c => c?.name || '') : '';

    const prompt = `Generate a short AI prompt (1-2 sentences) that a business owner can use to generate authentic Google reviews for a "${categoryName || 'business'}". Include the category context (e.g., "a restaurant", "a medical clinic"). Keep it concise and natural.`;

    const generatedPrompt = await generateCategoryPromptViaAI(prompt);
    res.json({ prompt: generatedPrompt });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

async function generateCategoryPromptViaAI(instruction) {
  const Setting = require('../models/Setting');
  const OpenAI = require('openai');
  const setting = await Setting.findOne({ key: 'openaiApiKey' });
  const apiKey = setting?.value || process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return `"A satisfied customer who just visited [SHOP_NAME] shares their experience: highlight the service, quality, and atmosphere. Write in a natural, conversational tone."`;
  }

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: instruction }],
      temperature: 0.7,
      max_tokens: 200,
    });

    const text = response.choices[0].message.content.trim().replace(/```/g, '').trim();
    return text;
  } catch (err) {
    console.error('AI prompt generation failed:', err.message);
    return `"A satisfied customer who just visited [SHOP_NAME] shares their experience with the service, quality, and overall experience. Write in a natural, conversational tone."`;
  }
}

exports.getCategoryGenerationStats = async (req, res) => {
  try {
    const totalCategories = await Category.countDocuments();
    const activeCategories = await Category.countDocuments({ isActive: true });

    const shopsPerCategory = await Shop.aggregate([
      { $match: { category: { $exists: true, $ne: null } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      { $project: { name: '$category.name', shopCount: '$count', _id: 0 } },
      { $sort: { shopCount: -1 } },
    ]);

    res.json({
      totalCategories,
      activeCategories,
      shopsPerCategory,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
