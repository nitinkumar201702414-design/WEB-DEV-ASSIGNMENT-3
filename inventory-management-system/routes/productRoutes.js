const express = require('express');
const ctrl = require('../controllers/productController');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

// Static routes MUST come before '/:id' so they are not treated as ids
router.get('/low-stock', ctrl.getLowStock);
router.get('/summary', ctrl.getSummary);

router.route('/').get(ctrl.getProducts).post(ctrl.createProduct);

router.patch('/:id/stock', validateObjectId, ctrl.adjustStock);

router
  .route('/:id')
  .get(validateObjectId, ctrl.getProductById)
  .put(validateObjectId, ctrl.updateProduct)
  .delete(validateObjectId, ctrl.deleteProduct);

module.exports = router;
