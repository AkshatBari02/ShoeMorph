import { useLazyQuery, useQuery } from '@apollo/client';
import React, { useState } from 'react';
import styled from 'styled-components';
import MuiError from '../../assets/mui/Alert';
import {AutoComplete} from '../../assets/mui/AutoComplete';
import { GET_PRODUCT_BY_ID, GET_PRODUCTS } from '../../graphql/Queries/productQueries';
import Loading from '../../assets/mui/Loading';
import { EditItemForm } from '../AdminDashboard';

const EditItem = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [product, setProduct] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const { loading: productsLoading, data: productsData, error: productsError } = useQuery(GET_PRODUCTS);

  const [getProduct, { loading, error }] = useLazyQuery(GET_PRODUCT_BY_ID, {
    onCompleted({ getProductById }) {
      setProduct(getProductById);
      setErrorMsg('');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedProduct) {
      getProduct({ variables: { productId: selectedProduct.id } });
    }
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setErrorMsg('');
  };

  const allProducts = productsData?.getProducts || [];

  return (
    <>
      {product ? (
        <EditItemForm product={product} />
      ) : (
        <Wrapper>
          {loading || productsLoading ? (
            <Loading />
          ) : (
            <Form onSubmit={handleSubmit}>
              <Title>Search and select a product to edit</Title>
              <AutoComplete
                options={allProducts}
                value={selectedProduct}
                getOptionLabel={(option) => option ? `${option.title} - ${option.brand} (${option.model})` : ''}
                onChange={(event, value) => handleProductSelect(value)}
                label="Select Product"
                placeholder="Search by product name, brand, or model..."
                sx={{ width: '100%', marginBottom: '1rem' }}
              />
              <Button type='submit' disabled={!selectedProduct}>Edit Product</Button>
              {errorMsg ? (
                <MuiError type='error'>{errorMsg}</MuiError>
              ) : error ? (
                <MuiError type='error'>{error.message}</MuiError>
              ) : productsError ? (
                <MuiError type='error'>{productsError.message}</MuiError>
              ) : (
                ''
              )}
            </Form>
          )}
        </Wrapper>
      )}
    </>
  );
};

export default EditItem;

const Wrapper = styled.div`
  display: flex;
  width: 80%;
  margin: 2rem 3rem;
`;

const Form = styled.form``;
const Title = styled.h2``;
const Button = styled.button`
  color: white;
  cursor: pointer;
  font-weight: 500;
  letter-spacing: 1px;
  margin-top: 1rem;
  background-color: var(--clr-primary);
  border-radius: 12px;
  padding: 6px;
  transition: all 0.3s;
  width: 50%;
  &:hover {
    background-color: var(--clr-primary-2);
  }
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    opacity: 0.6;
  }
`;
