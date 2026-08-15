const router = require('express').Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  downloadTemplate,
  importCategories,
} = require('../controllers/categoryController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(auth(['admin']));
router.get('/', listCategories);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);
router.get('/template', downloadTemplate);
router.post('/import', upload.single('file'), importCategories);

module.exports = router;
