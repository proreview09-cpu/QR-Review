const XLSX = require('xlsx');
const Category = require('../models/Category');
const { log } = require('../services/logService');

exports.listCategories = async (req, res) => {
  try {
    await Category.findOneAndUpdate(
      { name: 'Other' },
      { name: 'Other', description: 'Custom business category', isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    const categories = await Category.find().sort({ name: 1 });
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Category name is required' });
    const category = await Category.create({ name, description: req.body.description || '' });
    await log('CREATE', 'category', `Created category "${name}"`, { performedBy: req.user.email, performedByRole: 'admin' });
    res.status(201).json({ category });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Category already exists' });
    res.status(500).json({ message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    await log('UPDATE', 'category', `Updated category "${category.name}"`, { performedBy: req.user.email, performedByRole: 'admin' });
    res.json({ category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    await log('DELETE', 'category', `Disabled category "${category.name}"`, { performedBy: req.user.email, performedByRole: 'admin' });
    res.json({ message: 'Category disabled' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.downloadTemplate = async (req, res) => {
  const worksheet = XLSX.utils.json_to_sheet([
    { name: 'Restaurant', description: 'Food, dining, cafe, or restaurant business' },
    { name: 'Clothing Store', description: 'Fashion and apparel business' },
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Categories');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="category-template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
};

exports.importCategories = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Excel file is required' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    let imported = 0;

    for (const row of rows) {
      const name = String(row.name || row.Name || row.category || row.Category || '').trim();
      if (!name) continue;
      await Category.findOneAndUpdate(
        { name },
        { name, description: String(row.description || row.Description || '').trim(), isActive: true },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      imported += 1;
    }

    await log('CREATE', 'category-import', `Imported ${imported} categories from Excel`, { performedBy: req.user.email, performedByRole: 'admin' });
    res.json({ message: `Imported ${imported} categories`, imported });
  } catch (error) {
    res.status(400).json({ message: `Could not read Excel file: ${error.message}` });
  }
};
