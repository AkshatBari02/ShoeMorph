import { gql } from '@apollo/client';

const CREATE_ORDER = gql`
  mutation CreateOrder($paymentMethod: String!, $paymentId: String, $totalAmount: Float!) {
    createOrder(paymentMethod: $paymentMethod, paymentId: $paymentId, totalAmount: $totalAmount) {
      id
      purchasedBy
      datePurchased
      paymentMethod
      paymentStatus
      paymentId
      totalAmount
      orderProducts {
        productId
        size
        color
        productPrice
        isCustomSize
      }
    }
  }
`;

const UPDATE_ORDER_PAYMENT_STATUS = gql`
  mutation UpdateOrderPaymentStatus($orderId: ID!, $paymentStatus: String!) {
    updateOrderPaymentStatus(orderId: $orderId, paymentStatus: $paymentStatus) {
      id
      paymentStatus
    }
  }
`;

export { CREATE_ORDER, UPDATE_ORDER_PAYMENT_STATUS };
