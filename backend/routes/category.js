const router = require('express').Router();
const auth = require('../middleware/auth');
const Category = require('../models/Category');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  downloadTemplate,
  uploadCategories,
  generateCategoryPrompt,
  getCategoryGenerationStats,
} = require('../controllers/categoryController');
const upload = require('../middleware/upload');

router.use(auth(['admin']));

router.get('/', getCategories);
router.get('/stats', getCategoryGenerationStats);
router.get('/template/download', downloadTemplate);
router.post('/', createCategory);
router.post('/upload', upload.single('file'), uploadCategories);
router.get('/:id', getCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);
router.post('/:id/generate-prompt', generateCategoryPrompt);
router.post('/generate-prompt', generateCategoryPrompt);

module.exports = router;
