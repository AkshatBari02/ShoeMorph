import { gql } from '@apollo/client';

const ADD_TO_CART = gql`
  mutation AddToCart(
    $userId: ID!
    $productId: ID!
    $size: JSON!
    $color: String!
    $productPrice: Int!
    $isCustomSize: Boolean
  ) {
    addToCart(
      userId: $userId
      productId: $productId
      size: $size
      color: $color
      productPrice: $productPrice
      isCustomSize: $isCustomSize
    ) {
      userId
      cartProducts {
        productId
        productPrice
        size
        color
        isCustomSize
        id
      }
    }
  }
`;

const DELETE_FROM_CART = gql`
  mutation DeleteFromCart($id: ID!) {
    deleteProductFromCart(id: $id) {
      userId
      cartProducts {
        id
        productId
        productPrice
        size
        color
        isCustomSize
      }
    }
  }
`;

export { ADD_TO_CART, DELETE_FROM_CART };
