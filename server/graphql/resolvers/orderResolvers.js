import Cart from '../../models/Cart.js';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import { auth } from '../../utils/auth.js';
import { UserInputError } from 'apollo-server';

export const order = {
  Query: {
    getUserOrders: async (_, {}, context) => {
      const userAuth = await auth(context);
      const orders = await Order.find({ purchasedBy: userAuth._id }).sort({ datePurchased: -1 });
      
      // Return empty array if no orders, don't throw error
      return orders;
    },

    getAllOrders: async (_, {}, context) => {
      const userAuth = await auth(context);
      
      // Check if user is admin
      if (!userAuth.isAdmin) {
        throw new UserInputError('Permission denied. Admin access required.');
      }

      const orders = await Order.find({}).sort({ datePurchased: -1 });
      return orders;
    },
  },

  Mutation: {
    createOrder: async (_, { paymentMethod, paymentId, totalAmount }, context) => {
      const userAuth = await auth(context);
      const cart = await Cart.findOne({ userId: userAuth._id });
      
      if (!cart || cart.cartProducts.length < 1) {
        throw new UserInputError('No available order!');
      }

      // Validate payment method
      if (!['PayPal', 'COD'].includes(paymentMethod)) {
        throw new UserInputError('Invalid payment method');
      }

      // Store cart products before clearing
      const cartProductsCopy = [...cart.cartProducts];

      const products = await Product.find({
        _id: cartProductsCopy.map((c) => c.productId),
      });
      const topPicksBrands = products.map((p) => p.brand);

      // Only reduce stock for regular sizes, not custom sizes
      for (const cartInfo of cartProductsCopy) {
        if (!cartInfo.isCustomSize && Array.isArray(cartInfo.size)) {
          for (const product of products) {
            if (product._id.toString() === cartInfo.productId) {
              // Remove purchased sizes from available sizes
              product.size = product.size.filter(
                size => !cartInfo.size.includes(size)
              );
              await product.save();
            }
          }
        }
      }

      userAuth.topPicks.push(...topPicksBrands);
      await userAuth.save();

      // Set payment status based on payment method
      let paymentStatus = 'Pending';
      if (paymentMethod === 'PayPal' && paymentId) {
        paymentStatus = 'Paid';
      }

      const newOrder = new Order({
        orderProducts: cartProductsCopy.map(item => ({
          productId: item.productId,
          size: item.size,
          color: item.color,
          productPrice: item.productPrice,
          isCustomSize: item.isCustomSize || false,
        })),
        purchasedBy: userAuth._id,
        datePurchased: new Date(),
        paymentMethod,
        paymentStatus,
        paymentId: paymentId || null,
        totalAmount,
      });
      
      await newOrder.save();
      
      // Clear the cart using atomic update to avoid version conflicts
      await Cart.findOneAndUpdate(
        { userId: userAuth._id },
        { $set: { cartProducts: [] } },
        { new: true }
      );
      
      return newOrder;
    },

    updateOrderPaymentStatus: async (_, { orderId, paymentStatus }, context) => {
      const userAuth = await auth(context);
      
      // Only admin can update payment status
      if (!userAuth.isAdmin) {
        throw new UserInputError('Permission denied. Admin access required.');
      }

      if (!['Pending', 'Paid', 'Failed'].includes(paymentStatus)) {
        throw new UserInputError('Invalid payment status');
      }

      const order = await Order.findById(orderId);
      if (!order) {
        throw new UserInputError('Order not found');
      }

      order.paymentStatus = paymentStatus;
      await order.save();
      
      return order;
    },
  },
};
