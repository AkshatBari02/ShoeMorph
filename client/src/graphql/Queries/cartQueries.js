import { gql } from '@apollo/client';

const GET_USER_CART = gql`
  query {
    getUserCart {
      userId
      cartProducts {
        productId
        size
        color
        productPrice
        isCustomSize
        id
      }
    }
  }
`;
export { GET_USER_CART };
