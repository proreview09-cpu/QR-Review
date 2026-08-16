const router = require('express').Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  exportCategories,
  importCategories,
  downloadTemplate,
  generatePrompt
} = require('../controllers/categoryController');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files allowed'));
    }
  }
});

router.use(auth(['admin']));

router.get('/', getCategories);
router.get('/template', downloadTemplate);
router.get('/export', exportCategories);
router.get('/:id', getCategory);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);
router.post('/import', upload.single('file'), importCategories);
router.post('/generate-prompt', generatePrompt);

module.exports = router;