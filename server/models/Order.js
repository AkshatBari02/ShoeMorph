import mongoose from 'mongoose';
import Cart from './Cart.js';
const orderSchema = mongoose.Schema({
  purchasedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  orderProducts: [
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
  datePurchased: {
    type: Date,
  },
  paymentMethod: {
    type: String,
    enum: ['PayPal', 'COD'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed'],
    default: 'Pending',
  },
  paymentId: {
    type: String,
    default: null,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
});

orderSchema.pre('save', async function () {
  const cart = await Cart.findOne({ userId: this.purchasedBy });
  if (cart) {
    cart.cartProducts = [];
  }

  await cart.save();
});

export default mongoose.model('Order', orderSchema);
