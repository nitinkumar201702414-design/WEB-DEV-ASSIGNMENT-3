// Usage: npm run seed            -> inserts 12 sample products (clears existing ones)
//        npm run seed:destroy    -> removes all products
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Product = require('./models/Product');

const products = [
  { name: 'Wireless Mouse', sku: 'ELEC-MS-101', category: 'Electronics', price: 799, quantity: 25, reorderLevel: 10, supplier: 'Logitech' },
  { name: 'Mechanical Keyboard', sku: 'ELEC-KB-102', category: 'Electronics', price: 3499, quantity: 8, reorderLevel: 10, supplier: 'Redragon' },
  { name: 'Bluetooth Speaker', sku: 'ELEC-SP-103', category: 'Electronics', price: 2499, quantity: 40, reorderLevel: 15, supplier: 'boAt' },
  { name: 'Laptop 15 inch', sku: 'ELEC-LP-104', category: 'Electronics', price: 54999, quantity: 3, reorderLevel: 5, supplier: 'HP India' },
  { name: 'Cotton T-Shirt', sku: 'APRL-TS-201', category: 'Apparel', price: 499, quantity: 60, reorderLevel: 20, supplier: 'Allen Solly' },
  { name: 'Denim Jacket', sku: 'APRL-JK-202', category: 'Apparel', price: 2299, quantity: 18, reorderLevel: 10, supplier: 'Levis' },
  { name: 'Study Table', sku: 'FURN-TB-812', category: 'Furniture', price: 3999, quantity: 2, reorderLevel: 4, supplier: 'IKEA India' },
  { name: 'Office Chair', sku: 'FURN-CH-813', category: 'Furniture', price: 6499, quantity: 12, reorderLevel: 5, supplier: 'Godrej Interio' },
  { name: 'Gel Pen Pack of 15', sku: 'STNY-PN-713', category: 'Stationery', price: 120, quantity: 40, reorderLevel: 20, supplier: 'Cello Pens' },
  { name: 'A4 Notebook (200 pages)', sku: 'STNY-NB-714', category: 'Stationery', price: 90, quantity: 15, reorderLevel: 25, supplier: 'Classmate' },
  { name: 'Basmati Rice 5kg', sku: 'GROC-RC-901', category: 'Groceries', price: 650, quantity: 30, reorderLevel: 10, supplier: 'India Gate' },
  { name: 'Olive Oil 1L', sku: 'GROC-OL-902', category: 'Groceries', price: 899, quantity: 4, reorderLevel: 8, supplier: 'Borges' },
];

(async () => {
  try {
    await connectDB();
    await Product.deleteMany({});
    if (process.argv.includes('--destroy')) {
      console.log('All products removed');
    } else {
      await Product.create(products);
      console.log(`Seeded ${products.length} products`);
    }
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
