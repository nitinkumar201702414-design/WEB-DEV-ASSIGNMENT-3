const mongoose = require('mongoose');

const CATEGORIES = [
  'Electronics',
  'Apparel',
  'Furniture',
  'Stationery',
  'Groceries',
  'Books',
  'Toys',
  'Other',
];

const isInteger = {
  validator: Number.isInteger,
  message: '{PATH} must be a whole number',
};

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters'],
      maxlength: [100, 'Product name cannot exceed 100 characters'],
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9-]+$/, 'SKU can only contain letters, numbers and hyphens'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      enum: {
        values: CATEGORIES,
        message: `Category must be one of: ${CATEGORIES.join(', ')}`,
      },
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      validate: isInteger,
      default: 0,
    },
    reorderLevel: {
      type: Number,
      min: [0, 'Reorder level cannot be negative'],
      validate: isInteger,
      default: 10,
    },
    supplier: {
      type: String,
      trim: true,
      maxlength: [100, 'Supplier name cannot exceed 100 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Total value of stock on hand
productSchema.virtual('stockValue').get(function () {
  return this.price * this.quantity;
});

productSchema.index({ category: 1 });

const Product = mongoose.model('Product', productSchema);
Product.CATEGORIES = CATEGORIES;

module.exports = Product;
