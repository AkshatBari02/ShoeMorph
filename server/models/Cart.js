import mongoose from 'mongoose';

const cartSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },

  cartProducts: [
    {
      productId: {
        type: String,
        required: true,
      },
      size: {
        type: mongoose.Schema.Types.Mixed, // Can be [Number] or Object {left, right}
        required: true,
      },
      color: {
        type: String,
        required: true,
      },
      productPrice: {
        type: Number,
        required: true,
      },
      isCustomSize: {
        type: Boolean,
        default: false,
      },
    },
  ],
});

export default mongoose.model('Cart', cartSchema);
