import Product from '../../models/Product.js';
import { UserInputError } from 'apollo-server';
import Cart from '../../models/Cart.js';
import { auth } from '../../utils/auth.js';

export const cart = {
  Query: {
    getUserCart: async (_, {}, context) => {
      const user = await auth(context);
      const cart = await Cart.findOne({ userId: user._id });
      if (!cart) {
        throw new UserInputError('No user cart.');
      }
      return { ...cart._doc, user };
    },
  },
  Mutation: {
    addToCart: async (
      _,
      { userId, productId, size, color, productPrice, isCustomSize = false },
      context
    ) => {
      const userAuth = await auth(context);
      const product = await Product.findById(productId);
      const existCart = await Cart.findOne({ userId: userAuth._id });

      if (!product) {
        throw new UserInputError('No product found');
      }

      // Validate color
      if (!color) {
        throw new UserInputError('You must select a color');
      }
      if (!product.color.includes(color)) {
        throw new UserInputError('Invalid color selection');
      }

      // Validate based on size type
      if (isCustomSize) {
        // Custom size validation
        if (typeof size !== 'object' || !size.left || !size.right) {
          throw new UserInputError('Invalid custom size format');
        }
        
        // Check if custom size already exists in cart for this product with same color
        if (existCart) {
          const hasCustomSize = existCart.cartProducts.some(
            item => item.productId === productId && item.isCustomSize && item.color === color
          );
          if (hasCustomSize) {
            throw new UserInputError('Custom size already added for this product with this color');
          }
        }
      } else {
        // Regular size validation (array)
        if (!Array.isArray(size) || size.length === 0) {
          throw new UserInputError('You must select at least one size');
        }
        
        // Check if sizes exist in product
        const invalidSizes = size.filter(s => !product.size.includes(s));
        if (invalidSizes.length > 0) {
          throw new UserInputError(`Invalid sizes: ${invalidSizes.join(', ')}`);
        }

        // Check if any size already exists in cart with same color
        if (existCart) {
          const existingRegularSizes = existCart.cartProducts
            .filter(item => item.productId === productId && !item.isCustomSize && item.color === color)
            .flatMap(item => item.size);
          
          const duplicateSizes = size.filter(s => existingRegularSizes.includes(s));
          if (duplicateSizes.length > 0) {
            throw new UserInputError(`Size(s) already in cart for this color: ${duplicateSizes.join(', ')}`);
          }
        }
      }

      if (productPrice !== product.price) {
        throw new UserInputError('Wrong Info');
      }

      if (existCart) {
        existCart.cartProducts.push({
          productId,
          size,
          color,
          productPrice,
          isCustomSize,
        });
        await existCart.save();
        return { ...existCart._doc };
      } else {
        return new Cart({
          userId,
          cartProducts: [{ size, color, productId, productPrice, isCustomSize }],
        }).save();
      }
    },

    deleteProductFromCart: async (_, { id }, context) => {
      const userAuth = await auth(context);
      const cart = await Cart.findOne({ userId: userAuth._id });

      if (userAuth?._id.toString() !== cart?.userId.toString()) {
        throw new UserInputError('Permission denied!');
      }
      if (!cart) {
        throw new UserInputError('Bad Input!');
      }

      cart.cartProducts = cart.cartProducts.filter(
        (product) => product._id.toString() !== id.toString()
      );

      await cart.save();

      return { ...cart._doc, userId: userAuth._id };
    },
  },
};
