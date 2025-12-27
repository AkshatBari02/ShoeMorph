import { useMutation, useQuery } from '@apollo/client';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { GET_SINGLE_PRODUCT } from '../graphql/Queries/productQueries';
import Stars from './Stars';
import moment from 'moment';
import { CREATE_REVIEW } from '../graphql/Mutations/productMutation';
import Loading from '../assets/mui/Loading';
import MuiError from '../assets/mui/Alert';
import { mobile } from '../responsive';

const HistoryItems = ({ productId, datePurchased, size, color, isCustomSize }) => {
  const [historyItems, setHistoryItems] = useState([]);
  const [userRates, setUserRates] = useState(0);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setSuccess(false);
    }, 1500);
  }, [success]);

  const getUserRates = (value) => {
    setUserRates(value + 1);
  };

  const [createReview, { error }] = useMutation(CREATE_REVIEW, {
    variables: { productId: productId, userRate: +userRates },
    onCompleted() {
      setSuccess(true);
      setUserRates(0);
    },
  });

  const { loading } = useQuery(GET_SINGLE_PRODUCT, {
    variables: { productId },
    onCompleted({ getProductById }) {
      setHistoryItems(getProductById);
    },
  });

  const { title, image, brand, rates, price } = historyItems;

  const displaySize = () => {
    if (isCustomSize) {
      return (
        <CustomSizeContainer>
          <CustomSizeBadge>✓ Custom Measured</CustomSizeBadge>
          <CustomSizeText>
            L: {size.left}cm | R: {size.right}cm
          </CustomSizeText>
        </CustomSizeContainer>
      );
    }
    
    // Regular size
    const sizeArray = Array.isArray(size) ? size : [size];
    return `Size: ${sizeArray.join(', ')} US`;
  };

  return (
    <Wrapper>
      <Container>
        <ItemsContainer>
          <ImageContainer>
            <Image src={image} />
          </ImageContainer>
          <InfoContainer>
            <Title>{title}</Title>
            <Brand>{brand}</Brand>
            <ColorDisplay>
              Color: <ColorCircle color={color} /> {color}
            </ColorDisplay>
            <Size>{displaySize()}</Size>
            <Price>Price: ${price}</Price>
          </InfoContainer>
        </ItemsContainer>

        <SaleInfo>
          <SaleInfoTitle>Sale Info:</SaleInfoTitle>
          <Info>
            Date Purchased:
            <span>{moment(datePurchased).format('MMMM Do YYYY, h:mm a')}</span>
          </Info>
          <Info>
            Day: <span>{moment(datePurchased).format('dddd')}</span>
          </Info>
          {loading ? (
            <Loading />
          ) : error ? (
            <MuiError width='80%' type='error' value={error.message} />
          ) : success ? (
            <MuiError
              width='80%'
              type='success'
              value={'Thank you for your review!'}
            />
          ) : (
            <RatingContainer>
              <Rate>Rate</Rate>
              <Stars
                stars={rates}
                condition
                getUserRates={getUserRates}
                createReview={createReview}
                userRates={userRates}
              />
            </RatingContainer>
          )}
        </SaleInfo>
      </Container>
    </Wrapper>
  );
};

export default HistoryItems;

const Wrapper = styled.div``;
const Container = styled.div`
  display: flex;
  background-color: #fff;
  width: 100%;
  margin: 2rem 0 0;
  border-radius: 1rem;
  ${mobile({ flexDirection: 'column' })}
`;

const ItemsContainer = styled.div`
  display: flex;
  width: 80%;
  height: 25vh;
  justify-content: space-evenly;
  ${mobile({
    height: '30vh',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  })}
`;

const ImageContainer = styled.div``;
const Image = styled.img`
  height: 25vh;
  ${mobile({ width: '200px', marginTop: '15px' })}
`;

const InfoContainer = styled.div`
  width: 50%;
  margin-top: 0.5rem;
  ${mobile({ margin: '0', width: '90%' })}
`;

const Title = styled.h4``;
const Brand = styled.p`
  font-size: 14px;
  color: var(--clr-gray);
  margin-top: -1rem;
`;
const Size = styled.p`
  font-size: 14px;
  font-weight: 500;
  margin-top: 0.5rem;
`;

const CustomSizeContainer = styled.div`
  margin-top: 0.5rem;
`;

const CustomSizeBadge = styled.div`
  display: inline-block;
  background-color: #4caf50;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  margin-bottom: 0.25rem;
`;

const CustomSizeText = styled.p`
  font-size: 12px;
  color: #333;
  margin: 0.25rem 0;
`;

const ColorDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 14px;
  margin-bottom: 0.5rem;
  text-transform: capitalize;
`;

const ColorCircle = styled.span`
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: ${props => props.color};
  border: 2px solid #ddd;
`;

const Price = styled.h4`
  color: var(--clr-red);
`;

const SaleInfo = styled.div`
  ${mobile({ width: '100%', marginTop: '2rem', padding: '10px' })}
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--clr-border);
  width: 60%;
  padding-top: 0.5rem;
  padding-left: 1rem;
  h4 {
  }
  .info {
    display: flex;
    width: 100%;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }
  span {
    margin-left: 10px;
    font-weight: 400;
  }
`;

const SaleInfoTitle = styled.h4``;

const Info = styled.div`
  display: flex;
  width: 100%;
  margin-bottom: 0.5rem;
  font-weight: 600;
`;

const RatingContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  width: 100%;
`;
const Rate = styled.h3``;
