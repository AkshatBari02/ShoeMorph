import { gql } from '@apollo/client';

const GET_USER_ORDER = gql`
  query {
    getUserOrders {
      id
      purchasedBy
      datePurchased
      paymentMethod
      paymentStatus
      paymentId
      totalAmount
      orderProducts {
        productId
        productPrice
        size
        color
        isCustomSize
      }
    }
  }
`;

const GET_ALL_ORDERS = gql`
  query {
    getAllOrders {
      id
      purchasedBy
      datePurchased
      paymentMethod
      paymentStatus
      paymentId
      totalAmount
      orderProducts {
        productId
        productPrice
        size
        color
        isCustomSize
      }
    }
  }
`;

export { GET_USER_ORDER, GET_ALL_ORDERS };
