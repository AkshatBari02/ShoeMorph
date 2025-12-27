import Cart from '../../models/Cart.js';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import { auth } from '../../utils/auth.js';
import { UserInputError } from 'apollo-server';

export const order = {
  Query: {
    getUserOrders: async (_, {}, context) => {
      const userAuth = await auth(context);
      const order = await Order.find({ purchasedBy: userAuth._id });

      if (!order) {
        throw new UserInputError('No order available');
      }
      return order;
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
    createOrder: async (_, {}, context) => {
      const userAuth = await auth(context);
      const cart = await Cart.findOne({ userId: userAuth._id });
      
      if (!cart || cart.cartProducts.length < 1) {
        throw new UserInputError('No available order!');
      }

      const products = await Product.find({
        _id: cart.cartProducts.map((c) => c.productId),
      });
      const topPicksBrands = products.map((p) => p.brand);

      // Only reduce stock for regular sizes, not custom sizes
      for (const cartInfo of cart.cartProducts) {
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

      const newOrder = new Order({
        orderProducts: cart.cartProducts.map(item => ({
          productId: item.productId,
          size: item.size,
          color: item.color,
          productPrice: item.productPrice,
          isCustomSize: item.isCustomSize || false,
        })),
        purchasedBy: userAuth._id,
        datePurchased: new Date(),
      });
      
      await newOrder.save();
      return newOrder;
    },
  },
};
