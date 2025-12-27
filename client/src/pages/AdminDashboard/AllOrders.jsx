import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import styled from 'styled-components';
import Loading from '../../assets/mui/Loading';
import MuiError from '../../assets/mui/Alert';
import { GET_ALL_ORDERS } from '../../graphql/Queries/orderQueries';
import { GET_SINGLE_PRODUCT } from '../../graphql/Queries/productQueries';
import { UPDATE_ORDER_PAYMENT_STATUS } from '../../graphql/Mutations/orderMutation';
import { mobile } from '../../responsive';
import moment from 'moment';

const AllOrders = () => {
  const { loading, data, error, refetch } = useQuery(GET_ALL_ORDERS, {
    pollInterval: 5000,
  });

  if (loading) return <Loading />;
  if (error) return <MuiError type="error" value={error.message} />;

  const orders = data?.getAllOrders || [];

  // Group orders by order ID to show payment info per order
  const ordersWithDetails = orders.map(order => ({
    ...order,
    totalItems: order.orderProducts.length,
  }));

  const displaySize = (size, isCustomSize) => {
    if (isCustomSize) {
      return `Custom: L:${size.left}cm R:${size.right}cm`;
    }
    const sizeArray = Array.isArray(size) ? size : [size];
    return `${sizeArray.join(', ')} US`;
  };

  return (
    <Wrapper>
      <HeaderSection>
        <Title>All Orders</Title>
        <SubTitleRow>
          <SubTitle>Total Orders: {orders.length}</SubTitle>
          <SubTitle>Revenue: ${orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toFixed(2)}</SubTitle>
        </SubTitleRow>
      </HeaderSection>

      <TableContainer>
        <Table>
          <thead>
            <tr>
              <Th>Order ID</Th>
              <Th>User ID</Th>
              <Th>Date</Th>
              <Th>Items</Th>
              <Th>Total</Th>
              <Th>Payment</Th>
              <Th>Status</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {ordersWithDetails.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                displaySize={displaySize}
                refetch={refetch}
              />
            ))}
          </tbody>
        </Table>

        {ordersWithDetails.length === 0 && (
          <NoOrders>No orders found</NoOrders>
        )}
      </TableContainer>
    </Wrapper>
  );
};

export default AllOrders;

const ProductItemDetails = ({ productId, item }) => {
  const { data, loading } = useQuery(GET_SINGLE_PRODUCT, {
    variables: { productId: productId },
    skip: !productId,
  });

  const product = data?.getProductById;

  if (loading) return <ProductItem>Loading product details...</ProductItem>;
  if (!product) return <ProductItem>Product not found</ProductItem>;

  return (
    <ProductItem>
      <ProductImageContainer>
        <ProductImage src={product.image} alt={product.title} />
      </ProductImageContainer>
      <ProductDetails>
        <ProductTitle>{product.title}</ProductTitle>
        <ProductMeta>Brand: {product.brand} | Model: {product.model}</ProductMeta>
        <ProductInfoRow>
          <ColorDisplay>
            <ColorCircle color={item.color} />
            {item.color}
          </ColorDisplay>
          <ProductDetail>Size: {Array.isArray(item.size) ? item.size.join(', ') : JSON.stringify(item.size)}</ProductDetail>
          <ProductDetail>Price: ${item.productPrice}</ProductDetail>
          {item.isCustomSize && <CustomBadge>Custom Size</CustomBadge>}
        </ProductInfoRow>
      </ProductDetails>
    </ProductItem>
  );
};

const OrderRow = ({ order, refetch }) => {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [updatePaymentStatus, { error }] = useMutation(UPDATE_ORDER_PAYMENT_STATUS, {
    onCompleted() {
      setUpdating(false);
      refetch();
    },
  });

  const handleStatusChange = (newStatus) => {
    setUpdating(true);
    updatePaymentStatus({
      variables: {
        orderId: order.id,
        paymentStatus: newStatus,
      },
    });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Paid': return '#4caf50';
      case 'Pending': return '#ff9800';
      case 'Failed': return '#f44336';
      default: return '#999';
    }
  };

  return (
    <>
      <Tr>
        <Td>
          <IdText>{order.id}</IdText>
        </Td>
        <Td>
          <IdText>{order.purchasedBy}</IdText>
        </Td>
        <Td>
          <DateText>{moment(order.datePurchased).format('MMM DD, YYYY')}</DateText>
        </Td>
        <Td>
          <ItemsCount onClick={() => setExpanded(!expanded)}>
            {order.totalItems} items {expanded ? '▲' : '▼'}
          </ItemsCount>
        </Td>
        <Td>
          <Price>${order.totalAmount?.toFixed(2) || '0.00'}</Price>
        </Td>
        <Td>
          <PaymentMethod method={order.paymentMethod}>
            {order.paymentMethod || 'N/A'}
          </PaymentMethod>
        </Td>
        <Td>
          <PaymentStatus color={getStatusColor(order.paymentStatus)}>
            {order.paymentStatus || 'N/A'}
          </PaymentStatus>
        </Td>
        <Td>
          {order.paymentMethod === 'COD' && order.paymentStatus === 'Pending' && (
            <ActionButton
              onClick={() => handleStatusChange('Paid')}
              disabled={updating}
            >
              {updating ? 'Updating...' : 'Mark Paid'}
            </ActionButton>
          )}
          {order.paymentStatus === 'Paid' && '✓ Completed'}
        </Td>
      </Tr>
      {expanded && (
        <Tr>
          <Td colSpan="8">
            <ExpandedDetails>
              <DetailsTitle>Order Items:</DetailsTitle>
              {order.orderProducts.map((item, idx) => (
                <ProductItemDetails
                  key={idx}
                  productId={item.productId}
                  item={item}
                />
              ))}
            </ExpandedDetails>
          </Td>
        </Tr>
      )}
      {error && (
        <Tr>
          <Td colSpan="8">
            <MuiError type="error" value={error.message} />
          </Td>
        </Tr>
      )}
    </>
  );
};

const Wrapper = styled.div`
  height: calc(100vh - 120px);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  ${mobile({ padding: '1rem', height: 'auto' })}
`;

const HeaderSection = styled.div`
  flex-shrink: 0;
  margin-bottom: 1rem;
`;

const SubTitleRow = styled.div`
  display: flex;
  gap: 2rem;
  align-items: center;
`;

const Title = styled.h1`
  color: var(--clr-primary);
  ${mobile({ fontSize: '1.5rem' })}
`;

const SubTitle = styled.p`
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: var(--clr-gray);
`;

const TableContainer = styled.div`
  flex: 1;
  width: 100%;
  overflow: auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 10px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

const Table = styled.table`
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  padding: 1rem;
  text-align: left;
  background-color: var(--clr-primary);
  color: white;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 10;
  white-space: nowrap;
`;

const Tr = styled.tr`
  border-bottom: 1px solid #e0e0e0;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f5f5f5;
  }
`;

const Td = styled.td`
  padding: 1rem;
  vertical-align: middle;
  font-size: 0.9rem;
`;

const ItemsCount = styled.div`
  color: var(--clr-primary);
  cursor: pointer;
  font-weight: 500;
  user-select: none;
  
  &:hover {
    text-decoration: underline;
  }
`;

const PaymentMethod = styled.div`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 500;
  text-align: center;
  background: ${props => props.method === 'PayPal' ? '#e3f2fd' : '#fff9c4'};
  color: ${props => props.method === 'PayPal' ? '#1976d2' : '#f57c00'};
  font-size: 0.85rem;
  display: inline-block;
`;

const PaymentStatus = styled.div`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  text-align: center;
  background: ${props => `${props.color}20`};
  color: ${props => props.color};
  font-size: 0.85rem;
  display: inline-block;
`;

const ActionButton = styled.button`
  padding: 0.5rem 1rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;

  &:hover:not(:disabled) {
    background: #45a049;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ExpandedDetails = styled.div`
  padding: 0.2rem 1rem;
  background: #f9f9f9;
  border-radius: 8px;
`;

const DetailsTitle = styled.h4`
  color: var(--clr-primary);
  margin-bottom: 1rem;
`;

const ProductItem = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.5rem;
  background: white;
  border-radius: 6px;
  margin-bottom: 0.75rem;
  border-left: 3px solid var(--clr-primary);
  align-items: center;
`;

const ProductImageContainer = styled.div`
  flex-shrink: 0;
`;

const ProductInfoRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-top: 0.5rem;
`;

const ProductDetail = styled.div`
  font-size: 0.85rem;
  color: #666;
  padding: 0.25rem 0.5rem;
  background: #f5f5f5;
  border-radius: 4px;
`;

const CustomBadge = styled.span`
  background: #4caf50;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const ProductImage = styled.img`
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
`;

const ProductDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
`;

const ProductTitle = styled.div`
  font-weight: 600;
  font-size: 1rem;
  color: var(--clr-primary);
`;

const ProductMeta = styled.div`
  font-size: 0.85rem;
  color: var(--clr-gray);
  font-weight: 500;
`;

const IdText = styled.div`
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: monospace;
  min-width: 200px;
  max-width: 250px;
  word-wrap: break-word;
  white-space: normal;
`;

const DateText = styled.div`
  min-width: 120px;
  white-space: nowrap;
`;

const ColorDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-transform: capitalize;
  font-size: 0.9rem;
  min-width: 100px;
`;

const ColorCircle = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: ${props => props.color};
  border: 2px solid #333;
`;

const Price = styled.div`
  font-weight: 600;
  font-size: 1rem;
  color: #2e7d32;
`;

const NoOrders = styled.div`
  text-align: center;
  padding: 3rem;
  font-size: 1.2rem;
  color: var(--clr-gray);
`;
