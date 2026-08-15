const Category = require('../models/Category');
const xlsx = require('xlsx');
const { log } = require('../services/logService');

exports.getCategories = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, isActive } = req.query;
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
        'Parent Category': cat.parentCategory ? cat.parentCategory.toString() : '',
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
    const data = xlsx.utils.sheet_to_json(worksheet.Sheets[sheetName]);
    
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
        'Parent Category': '',
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
        'Parent Category': '',
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
        'Parent Category': '',
        'Active': 'Yes',
        'Display Order': 3,
        'Icon': '💇',
        'Color': '#EC4899'
      }
    ];
    
    const worksheet = xlsx.utils.json_to_sheet(sampleData);
    xlsx.utils.book_append_sheet(xlsx.utils.book_new(), xlsx.utils.json_to_sheet(sampleData), 'Categories Template');
    
    const buffer = xlsx.write(xlsx.utils.book_new(), { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=category-template.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};