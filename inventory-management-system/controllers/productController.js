const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const ALLOWED_FIELDS = ['name', 'sku', 'category', 'price', 'quantity', 'reorderLevel', 'supplier'];
const SORTABLE_FIELDS = ['name', 'sku', 'category', 'price', 'quantity', 'reorderLevel', 'createdAt', 'updatedAt'];

const pickAllowed = (body = {}) =>
  ALLOWED_FIELDS.reduce((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stockValueExpr = { $multiply: ['$price', '$quantity'] };

// POST /api/products
exports.createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(pickAllowed(req.body));
  res.status(201).json(product);
});

// GET /api/products?category=&supplier=&search=&minPrice=&maxPrice=&inStock=&sort=&page=&limit=
exports.getProducts = asyncHandler(async (req, res) => {
  const { category, supplier, search, minPrice, maxPrice, inStock, sort } = req.query;
  const filter = {};

  if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
  if (supplier) filter.supplier = new RegExp(escapeRegex(supplier), 'i');
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { sku: rx }];
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) {
      if (isNaN(Number(minPrice))) throw new AppError('minPrice must be a number', 400);
      filter.price.$gte = Number(minPrice);
    }
    if (maxPrice !== undefined) {
      if (isNaN(Number(maxPrice))) throw new AppError('maxPrice must be a number', 400);
      filter.price.$lte = Number(maxPrice);
    }
  }

  if (inStock !== undefined) {
    if (!['true', 'false'].includes(inStock)) throw new AppError("inStock must be 'true' or 'false'", 400);
    filter.quantity = inStock === 'true' ? { $gt: 0 } : 0;
  }

  // Sorting: ?sort=-price,name  (whitelisted fields only)
  const sortObj = {};
  (sort || '-createdAt').split(',').forEach((raw) => {
    const field = raw.trim().replace(/^-/, '');
    if (!field) return;
    if (!SORTABLE_FIELDS.includes(field)) {
      throw new AppError(`Cannot sort by '${field}'. Allowed: ${SORTABLE_FIELDS.join(', ')}`, 400);
    }
    sortObj[field] = raw.trim().startsWith('-') ? -1 : 1;
  });
  sortObj._id = 1; // stable ordering across pages

  // Pagination
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  res.json({
    total,
    page,
    totalPages: Math.ceil(total / limit),
    count: products.length,
    products,
  });
});

// GET /api/products/:id
exports.getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found', 404);
  res.json(product);
});

// PUT /api/products/:id  (partial update of any product fields)
exports.updateProduct = asyncHandler(async (req, res) => {
  const updates = pickAllowed(req.body);
  if (Object.keys(updates).length === 0) {
    throw new AppError('Provide at least one valid field to update', 400);
  }

  const product = await Product.findByIdAndUpdate(req.params.id, updates, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!product) throw new AppError('Product not found', 404);
  res.json(product);
});

// PATCH /api/products/:id/stock   body: { "change": 10 }  (+ restock, - sale)
exports.adjustStock = asyncHandler(async (req, res) => {
  let { change } = req.body;
  if (typeof change === 'string' && change.trim() !== '') change = Number(change);

  if (!Number.isInteger(change) || change === 0) {
    throw new AppError("'change' must be a non-zero whole number (positive = restock, negative = sale)", 400);
  }

  // Atomic update: a sale only succeeds if enough stock exists, so quantity can never go negative
  const filter = { _id: req.params.id };
  if (change < 0) filter.quantity = { $gte: -change };

  const product = await Product.findOneAndUpdate(
    filter,
    { $inc: { quantity: change } },
    { returnDocument: 'after', runValidators: true }
  );

  if (!product) {
    const exists = await Product.exists({ _id: req.params.id });
    if (!exists) throw new AppError('Product not found', 404);
    throw new AppError('Insufficient stock for this sale', 400);
  }

  res.json({ message: 'Stock updated', product });
});

// DELETE /api/products/:id
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new AppError('Product not found', 404);
  res.json({ message: 'Product deleted', id: product.id });
});

// GET /api/products/low-stock   (quantity <= reorderLevel) - aggregation
exports.getLowStock = asyncHandler(async (req, res) => {
  const lowStockItems = await Product.aggregate([
    { $match: { $expr: { $lte: ['$quantity', '$reorderLevel'] } } },
    { $addFields: { stockValue: stockValueExpr, id: { $toString: '$_id' } } },
    { $sort: { quantity: 1, name: 1 } },
  ]);

  res.json({ count: lowStockItems.length, lowStockItems });
});

// GET /api/products/summary   (category-wise inventory summary) - aggregation
exports.getSummary = asyncHandler(async (req, res) => {
  const summary = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalStockValue: { $sum: stockValueExpr },
        avgPrice: { $avg: '$price' },
      },
    },
    { $addFields: { avgPrice: { $round: ['$avgPrice', 2] } } },
    { $sort: { totalStockValue: -1 } },
  ]);

  res.json({ categories: summary.length, summary });
});
