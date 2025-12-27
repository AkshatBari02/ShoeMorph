import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import styled from 'styled-components';
import Loading from '../../assets/mui/Loading';
import MuiError from '../../assets/mui/Alert';
import { GET_ALL_ORDERS } from '../../graphql/Queries/orderQueries';
import { GET_SINGLE_PRODUCT } from '../../graphql/Queries/productQueries';
import { mobile } from '../../responsive';
import moment from 'moment';

const AllOrders = () => {
  const [expandedOrders, setExpandedOrders] = useState({});
  
  const { loading, data, error } = useQuery(GET_ALL_ORDERS, {
    pollInterval: 5000,
  });

  if (loading) return <Loading />;
  if (error) return <MuiError type="error" value={error.message} />;

  const orders = data?.getAllOrders || [];

  // Flatten orders to show one row per product
  const flattenedOrders = [];
  orders.forEach(order => {
    order.orderProducts.forEach(product => {
      flattenedOrders.push({
        orderId: order.id,
        userId: order.purchasedBy,
        datePurchased: order.datePurchased,
        ...product
      });
    });
  });

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
          <SubTitle>Total Products Ordered: {flattenedOrders.length}</SubTitle>
        </SubTitleRow>
      </HeaderSection>

      <TableContainer>
        <Table>
          <thead>
            <tr>
              <Th>Order ID</Th>
              <Th>User ID</Th>
              <Th>Date</Th>
              <Th>Product</Th>
              <Th>Color</Th>
              <Th>Size</Th>
              <Th>Price</Th>
            </tr>
          </thead>
          <tbody>
            {flattenedOrders.map((item, index) => (
              <OrderRow
                key={`${item.orderId}-${item.productId}-${index}`}
                item={item}
                displaySize={displaySize}
              />
            ))}
          </tbody>
        </Table>

        {flattenedOrders.length === 0 && (
          <NoOrders>No orders found</NoOrders>
        )}
      </TableContainer>
    </Wrapper>
  );
};

export default AllOrders;

const OrderRow = ({ item, displaySize }) => {
  const [productDetails, setProductDetails] = useState(null);
  
  const { loading, data } = useQuery(GET_SINGLE_PRODUCT, {
    variables: { productId: item.productId },
    onCompleted: (data) => {
      setProductDetails(data.getProductById);
    }
  });

  return (
    <Tr>
      <Td>
        <IdText>{item.orderId}</IdText>
      </Td>
      <Td>
        <IdText>{item.userId}</IdText>
      </Td>
      <Td>
        <DateText>{moment(item.datePurchased).format('MMM DD, YYYY')}</DateText>
      </Td>
      <Td>
        {loading ? (
          'Loading...'
        ) : productDetails ? (
          <ProductInfo>
            <ProductImage src={productDetails.image} alt={productDetails.title} />
            <ProductDetails>
              <ProductTitle>{productDetails.title}</ProductTitle>
              <ProductMeta>Brand: {productDetails.brand}</ProductMeta>
              <ProductMeta>Model: {productDetails.model}</ProductMeta>
              <ProductMeta>Colors: {productDetails.color?.join(', ')}</ProductMeta>
            </ProductDetails>
          </ProductInfo>
        ) : (
          'N/A'
        )}
      </Td>
      <Td>
        <ColorDisplay>
          {item.color ? (
            <>
              <ColorCircle color={item.color} />
              <span>{item.color}</span>
            </>
          ) : (
            <span style={{ color: '#999', fontStyle: 'italic' }}>N/A</span>
          )}
        </ColorDisplay>
      </Td>
      <Td>
        <SizeInfo isCustom={item.isCustomSize}>
          {displaySize(item.size, item.isCustomSize)}
        </SizeInfo>
      </Td>
      <Td>
        <Price>${item.productPrice}</Price>
      </Td>
    </Tr>
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

const ProductImage = styled.img`
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
`;

const ProductDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
`;

const ProductTitle = styled.div`
  font-weight: 600;
  color: var(--clr-primary);
  white-space: normal;
  word-break: break-word;
`;

const ProductMeta = styled.div`
  font-size: 0.8rem;
  color: var(--clr-gray);
  white-space: normal;
`;

const ProductInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 350px;
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
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${props => props.color};
  border: 2px solid #000;
  flex-shrink: 0;
`;

const SizeInfo = styled.div`
  padding: 0.5rem;
  background-color: ${props => props.isCustom ? '#e8f5e9' : '#e3f2fd'};
  border-radius: 4px;
  font-weight: 500;
  color: ${props => props.isCustom ? '#2e7d32' : '#1976d2'};
  font-size: 0.85rem;
  min-width: 150px;
  white-space: normal;
`;

const Price = styled.div`
  font-weight: 600;
  color: var(--clr-red);
  font-size: 1.1rem;
  min-width: 80px;
  white-space: nowrap;
`;

const NoOrders = styled.div`
  text-align: center;
  padding: 3rem;
  font-size: 1.2rem;
  color: var(--clr-gray);
`;
