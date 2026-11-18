const AppError = require('../utils/AppError');

// Rejects malformed ids before they hit the database
module.exports = (req, res, next) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
    return next(new AppError(`Invalid product id: ${req.params.id}`, 400));
  }
  next();
};
