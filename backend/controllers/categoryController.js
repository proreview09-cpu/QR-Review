const Category = require('../models/Category');
const xlsx = require('xlsx');
const { log } = require('../services/logService');
const { generateBusinessPrompt } = require('../services/openaiService');

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

exports.getCategories = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, isActive, activeOnly } = req.query;
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    if (activeOnly === 'true') {
      query.isActive = true;
    }
    
    const skip = (page - 1) * limit;
    const categories = await Category.find(query)
      .sort({ displayOrder: 1, name: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Category.countDocuments(query);
    
    res.json({
      categories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ category });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ category });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Excel Export
exports.exportCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ displayOrder: 1, name: 1 });
    
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(
      categories.map(cat => ({
        'Category Name': cat.name,
        'Slug': cat.slug,
        'Description': cat.description || '',
        'AI Prompt': cat.aiPrompt || '',
        'Default Tone': cat.defaultTone || 'friendly',
        'Default Language': cat.defaultLanguage || 'english',
        'Review Pool': cat.reviewPoolMin || 50,
        'Batch Size': cat.reviewBatchSize || 50,
        'Active': cat.isActive ? 'Yes' : 'No',
        'Display Order': cat.displayOrder,
        'Icon': cat.icon || '',
        'Color': cat.color || ''
      }))
    );
    
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Categories');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=categories.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Excel Import
exports.importCategories = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    const results = {
      created: 0,
      updated: 0,
      errors: []
    };
    
    for (const row of data) {
      try {
        const name = row['Category Name'];
        if (!name) {
          results.errors.push(`Missing category name in row`);
          continue;
        }
        
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        const existing = await Category.findOne({ $or: [{ name }, { slug }] });
        
        const categoryData = {
          name: name.trim(),
          slug: slug,
          description: row['Description']?.trim() || '',
          aiPrompt: row['AI Prompt']?.trim() || '',
          defaultPrompt: row['AI Prompt']?.trim() || '',
          defaultTone: row['Default Tone']?.trim() || 'friendly',
          defaultLanguage: row['Default Language']?.trim() || 'english',
          reviewPoolMin: parseInt(row['Review Pool']) || 50,
          reviewBatchSize: parseInt(row['Batch Size']) || 50,
          parentCategory: row['Parent Category'] || null,
          isActive: row['Active'] === 'Yes' || row['Active'] === true,
          displayOrder: parseInt(row['Display Order']) || 0,
          icon: row['Icon']?.trim() || '',
          color: row['Color']?.trim() || ''
        };
        
        if (existing) {
          await Category.findByIdAndUpdate(existing._id, categoryData);
          results.updated++;
        } else {
          await Category.create(categoryData);
          results.created++;
        }
      } catch (err) {
        results.errors.push(`Row "${name}": ${err.message}`);
      }
    }
    
    res.json({
      message: `Import completed. Created: ${results.created}, Updated: ${results.updated}`,
      results
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Download template
exports.downloadTemplate = async (req, res) => {
  try {
    const workbook = xlsx.utils.book_new();
    const sampleData = [
      {
        'Category Name': 'Restaurant',
        'Slug': 'restaurant',
        'Description': 'Food and dining establishments',
        'AI Prompt': 'Focus on food quality, service speed, ambiance, and value for money',
        'Default Tone': 'friendly',
        'Default Language': 'english',
        'Review Pool': 50,
        'Batch Size': 50,
        'Active': 'Yes',
        'Display Order': 1,
        'Icon': '🍽️',
        'Color': '#EF4444'
      },
      {
        'Category Name': 'Retail Store',
        'Slug': 'retail-store',
        'Description': 'Retail shops and boutiques',
        'AI Prompt': 'Focus on product variety, staff helpfulness, pricing, and store cleanliness',
        'Default Tone': 'friendly',
        'Default Language': 'english',
        'Review Pool': 50,
        'Batch Size': 50,
        'Active': 'Yes',
        'Display Order': 2,
        'Icon': '🛍️',
        'Color': '#3B82F6'
      },
      {
        'Category Name': 'Beauty Salon',
        'Slug': 'beauty-salon',
        'Description': 'Beauty and wellness services',
        'AI Prompt': 'Focus on staff expertise, hygiene, results, and customer service',
        'Default Tone': 'friendly',
        'Default Language': 'gujarati',
        'Review Pool': 50,
        'Batch Size': 50,
        'Active': 'Yes',
        'Display Order': 3,
        'Icon': '💇',
        'Color': '#EC4899'
      }
    ];
    
    const worksheet = xlsx.utils.json_to_sheet(sampleData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Categories Template');
    
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=category-template.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate AI prompt for category or shop
exports.generatePrompt = async (req, res) => {
  try {
    const { name, description, shopName, businessName, tone, language } = req.body;
    const targetName = shopName || name;
    const targetBusiness = businessName || name;
    const reviewTone = REVIEW_TONES[tone] || 'friendly and natural';
    const langName = LANGUAGES[language] || 'English';

    if (!targetName) {
      return res.status(400).json({ message: 'Category name or shop name is required' });
    }

    const aiPrompt = await generateBusinessPrompt({ name, description, shopName, businessName, tone, language });
    if (aiPrompt) {
      return res.json({ prompt: aiPrompt, generatedByAI: true });
    }

    const lines = [
      `You are a real customer who just visited "${targetName}"${shopName && targetBusiness && targetBusiness !== targetName ? ` (${targetBusiness})` : ''}.`,
      `Write short Google reviews in ${langName}.`,
      '',
      'BUSINESS-SPECIFIC INSTRUCTIONS:',
    ];

    if (description) {
      lines.push(`- Business type: ${description}`);
    }
    if (shopName) {
      lines.push(`- Shop name: "${shopName}"`);
      lines.push(`- Business name: "${businessName || ''}"`);
    }
    if (name) {
      lines.push(`- Category: ${name}`);
    }
    lines.push(`- Tone: ${reviewTone}`);
    lines.push(`- Language: ${langName}`);
    lines.push(`- Reviews must naturally mention "${shopName || name}"`);

    lines.push(
      '',
      'CRITICAL RULES:',
      '- Write like a REAL person - use casual language, typos ok, short sentences',
      '- Maximum 3 lines and 40 words; usually keep reviews between 20 and 35 words',
      '- MUST naturally mention the shop name in the review',
      '- Each review should feel unique and authentic',
      '- Vary sentence structure - some excited, some simple, some detailed',
      '- No hashtags, no emojis, no greetings like "Dear", no sign-offs',
      '- No generic phrases like "highly recommend" in every review',
      '- Do not invent specific facts, offers, products, or experiences that are not supported by the instructions',
      '',
      'Return ONLY JSON array: ["review1","review2",...]'
    );

    res.json({ prompt: lines.join('\n'), generatedByAI: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};