import { useMutation, useQuery } from '@apollo/client';
import React, {useEffect, useState} from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import MuiError from '../assets/mui/Alert';
import Loading from '../assets/mui/Loading';
import { Navbar } from '../components';
import CartItems from '../components/CartItems';
import PaymentOptions from '../components/PaymentOptions';

import { CREATE_ORDER } from '../graphql/Mutations/orderMutation';
import { GET_USER_CART } from '../graphql/Queries/cartQueries';
import { GET_USER_ORDER } from '../graphql/Queries/orderQueries';
import { GET_PRODUCTS } from '../graphql/Queries/productQueries';
import { mobile } from '../responsive';
import { validateShippingAddress } from '../utils/validators';

const OrderPage = () => {
  const { userInfo, isLoading } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [orderSuccess, setOrderSuccess] = useState(false);

  const { loading, data, error: cartError } = useQuery(GET_USER_CART, {
    variables: { userId: userInfo?.id },
  });
  const cartProducts = data?.getUserCart?.cartProducts;

  const { city, address, country, postalCode, phoneNumber } =
    !isLoading && userInfo?.shippingAddress;
  const { errors } = validateShippingAddress(
    city,
    address,
    country,
    postalCode,
    phoneNumber
  );
  const errorsLength = Object.keys(errors).length;

  const [completeOrder, { loading: orderLoading, error: orderError }] =
    useMutation(CREATE_ORDER, {
      onCompleted(data) {
        console.log('Order completed successfully:', data);
        setOrderSuccess(true);
        setTimeout(() => {
          navigate('/history');
        }, 2000);
      },
      onError(error) {
        console.error('Order creation failed:', error);
        console.error('GraphQL Error:', error.graphQLErrors);
        console.error('Network Error:', error.networkError);
      },
      refetchQueries: [
        {
          query: GET_USER_CART,
          variables: { userId: userInfo?.id },
          awaitRefetchQueries: true,
        },
        {
          query: GET_PRODUCTS,
        },
        {
          query: GET_USER_ORDER,
        },
      ],
    });

  useEffect(() => {
    // Only redirect if cart is empty AND we're not currently processing or showing success
    if (data?.getUserCart?.cartProducts && data.getUserCart.cartProducts.length < 1 && !orderLoading && !orderSuccess) {
      navigate('/history');
    }
  }, [data?.getUserCart, navigate, orderLoading, orderSuccess]);

  const calculateTotal = () => {
    if (!cartProducts) return 0;
    return cartProducts.reduce((total, item) => {
      const quantity = item.isCustomSize ? 1 : (Array.isArray(item.size) ? item.size.length : 1);
      return total + (item.productPrice * quantity);
    }, 0);
  };

  const deliveryTax = 10.0;
  const salesTax = 5.0;
  const subtotal = calculateTotal();
  const totalAmount = subtotal + deliveryTax + salesTax;

  const handlePaymentComplete = (paymentMethod, paymentId) => {
    console.log('Payment completed:', { paymentMethod, paymentId, totalAmount });
    completeOrder({
      variables: {
        paymentMethod,
        paymentId,
        totalAmount,
      },
    }).catch(err => {
      console.error('Mutation error:', err);
    });
  };

  return (
    <div className='section-center'>
      <Navbar />
      <Wrapper>
        {loading ? (
          <Loading />
        ) : cartError ? (
          <ErrorContainer>
            <MuiError type='error' value={cartError.message || 'Failed to load cart'} />
          </ErrorContainer>
        ) : orderLoading ? (
          <Loading />
        ) : orderSuccess ? (
            <SuccessContainer>
              <MuiError type='success'>
                Order placed successfully! Redirecting to order history...
              </MuiError>
            </SuccessContainer>
          ) : orderError ? (
            <ErrorContainer>
              <MuiError
                type='error'
                value={orderError.message || 'Something went wrong, Please try again later..'}
              />
              <ErrorDetails>
                {orderError.graphQLErrors?.map((err, i) => (
                  <p key={i} style={{ color: 'red', fontSize: '0.9rem' }}>
                    {err.message}
                  </p>
                ))}
              </ErrorDetails>
            </ErrorContainer>
        ) : errorsLength > 0 ? (
          <ErrorContainer>
            <MuiError type='error'>{errors.general}</MuiError>
            <Link className='shipping_link' to='/shipping'>
              <Button>Go to profile</Button>
            </Link>
          </ErrorContainer>
        ) : (
          <LoadingContainer>
            <Container>
              <OrderInfo>
                <Title>SHIPPING ADDRESS</Title>
                <ShippingDetails>
                  <p><strong>Address:</strong> {address}</p>
                  <p><strong>City:</strong> {city}</p>
                  <p><strong>Postal Code:</strong> {postalCode}</p>
                  <p><strong>Country:</strong> {country}</p>
                  <p><strong>Phone:</strong> {phoneNumber}</p>
                </ShippingDetails>
                
                <Title>ORDER ITEMS</Title>
                <CartContainer>
                  {cartProducts?.map((cartItem, index) => (
                    <CartItems key={index} orderPage {...cartItem} />
                  ))}
                </CartContainer>

                <OrderSummarySection>
                  <SummaryRow>
                    <SummaryLabel>Subtotal:</SummaryLabel>
                    <SummaryValue>${subtotal.toFixed(2)}</SummaryValue>
                  </SummaryRow>
                  <SummaryRow>
                    <SummaryLabel>Delivery:</SummaryLabel>
                    <SummaryValue>${deliveryTax.toFixed(2)}</SummaryValue>
                  </SummaryRow>
                  <SummaryRow>
                    <SummaryLabel>Sales Tax:</SummaryLabel>
                    <SummaryValue>${salesTax.toFixed(2)}</SummaryValue>
                  </SummaryRow>
                  <SummaryDivider />
                  <SummaryRow total>
                    <SummaryLabel>Total Amount:</SummaryLabel>
                    <SummaryValue>${totalAmount.toFixed(2)}</SummaryValue>
                  </SummaryRow>
                </OrderSummarySection>
              </OrderInfo>
            </Container>
            
            <PaymentContainer>
              <PaymentOptions
                totalAmount={totalAmount}
                onPaymentComplete={handlePaymentComplete}
                disabled={orderLoading}
              />
            </PaymentContainer>
          </LoadingContainer>
        )}
      </Wrapper>
    </div>
  );
};

export default OrderPage;

const Wrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  min-height: 80vh;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const LoadingContainer = styled.div`
  display: flex;
  width: 100%;
  ${mobile({ display: 'flex', flexDirection: 'column' })}
`;

const OrderInfo = styled.div`
  margin-top: 1rem;
`;

const Title = styled.h1`
  letter-spacing: 1px;
  color: var(--clr-primary-2);
  margin-top: 2rem;
  margin-bottom: 1rem;
`;

const ShippingDetails = styled.div`
  background: #f5f5f5;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  
  p {
    margin: 0.5rem 0;
    font-size: 1rem;
    
    strong {
      color: var(--clr-primary);
      margin-right: 0.5rem;
    }
  }
`;

const CartContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding-right: 0.5rem;
  overflow-y: scroll;
  overflow-x: hidden;
  max-height: 40vh;
  margin-top: 1rem;
  &::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background-color: rgba(0, 0, 0, 0.15);
  }
  &::-webkit-scrollbar {
    width: 2px;
  }
  ${mobile({
    margin: '0 auto',
    padding: '0',
  })}
`;

const OrderSummarySection = styled.div`
  background: #f9f9f9;
  padding: 1.5rem;
  border-radius: 8px;
  margin-top: 2rem;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  font-size: ${props => props.total ? '1.3rem' : '1rem'};
  font-weight: ${props => props.total ? '700' : '400'};
  color: ${props => props.total ? 'var(--clr-primary)' : '#333'};
`;

const SummaryLabel = styled.span``;

const SummaryValue = styled.span`
  color: var(--clr-red);
  font-weight: 600;
`;

const SummaryDivider = styled.hr`
  border: none;
  border-top: 2px solid #ddd;
  margin: 1rem 0;
`;

const PaymentContainer = styled.div`
  display: flex;
  width: 50%;
  align-items: flex-start;
  padding: 2rem;
  ${mobile({
    display: 'flex',
    padding: '1rem',
    width: '100%',
  })}
`;

const SuccessContainer = styled.div`
  display: flex;
  padding: 2rem;
  .shipping_link {
    padding: 1rem;
  }
`;

const ErrorDetails = styled.div`
  margin-top: 1rem;
  min-height: 60vh;
  padding: 2rem;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  .shipping_link {
    padding: 1rem;
  }
`;

const Button = styled.button`
  background-color: var(--clr-mocha-3);
  color: white;
  border-radius: 5px;
  padding: 0.375rem 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-size: 14px;
  transition: all 0.3s;
  border: 1px solid black;
  cursor: pointer;
  &:hover {
    background-color: var(--clr-mocha-2);
  }
`;
