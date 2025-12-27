import React, { useState } from 'react';
import { Navbar, Stars, CustomSizeModal } from '../components';
import { useMutation, useQuery } from '@apollo/client';
import { GET_SINGLE_PRODUCT } from '../graphql/Queries/productQueries';
import Loading from '../assets/mui/Loading';
import MuiError from '../assets/mui/Alert';
import styled from 'styled-components';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { ADD_TO_CART } from '../graphql/Mutations/cartMutations';
import { useDispatch, useSelector } from 'react-redux';
import { GET_USER_CART } from '../graphql/Queries/cartQueries';
import { mobile } from '../responsive';

const ProductPage = () => {
  const [product, setProduct] = useState('');
  const [shoeSize, setShoeSize] = useState([]);
  const [selectedColor, setSelectedColor] = useState('');
  const [customSize, setCustomSize] = useState(null);
  const [isCustomSize, setIsCustomSize] = useState(false);
  const [success, setSuccess] = useState(false);
  const [customSizeModalOpen, setCustomSizeModalOpen] = useState(false);

  const userInfo = useSelector((state) => state.user.userInfo);

  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const userId = userInfo && userInfo.id;

  const { loading, data, error } = useQuery(GET_SINGLE_PRODUCT, {
    variables: { productId: id },
    pollInterval: 1000,
  });

  const { data: cart } = useQuery(GET_USER_CART, {
    variables: { userId: userInfo?.id },
  });

  const [cartHandle, { loading: cartLoading, error: cartError }] = useMutation(
    ADD_TO_CART,
    {
      onCompleted() {
        setShoeSize([]);
        setSelectedColor('');
        setCustomSize(null);
        setIsCustomSize(false);
        setSuccess(true);
      },
      refetchQueries: [
        {
          query: GET_USER_CART,
          variables: { userId },
          awaitRefetchQueries: true,
        },
      ],
    }
  );

  useEffect(() => {
    if (data) {
      setProduct(data?.getProductById);
    }
  }, [data, data?.getProductById, dispatch]);

  const { image, title, price, rates, inStock, brand, model, size } = product;

  const filteredCartProducts = cart?.getUserCart.cartProducts.filter(
    (c) => c.productId === id && c.color === selectedColor
  );
  const filteredSizesFromCart = filteredCartProducts
    ?.filter(c => !c.isCustomSize)
    ?.flatMap((c) => c.size);
  const hasCustomSizeInCart = filteredCartProducts?.some(c => c.isCustomSize);
  const matchUserId = userId === cart?.getUserCart.userId;

  const handleCustomSizeClick = () => {
    if (!userId) {
      navigate(`/login?redirect=${id}`);
    } else {
      setCustomSizeModalOpen(true);
    }
  };

  const handleSizeCalculated = (sizeData) => {
    setCustomSize(sizeData);
    setIsCustomSize(true);
    setShoeSize([]); // Clear regular size selection
  };

  const handleRegularSizeSelect = (selectedSize) => {
    if (shoeSize.includes(selectedSize)) {
      setShoeSize(shoeSize.filter(s => s !== selectedSize));
    } else {
      setShoeSize([...shoeSize, selectedSize]);
    }
    setIsCustomSize(false);
    setCustomSize(null);
  };

  const onClickHandler = () => {
    if (!userId) {
      navigate(`/login?redirect=${id}`);
      return;
    }

    if (!selectedColor) {
      // No color selected
      return;
    }

    if (!isCustomSize && shoeSize.length === 0) {
      // No size selected
      return;
    }

    if (isCustomSize && !customSize) {
      // Custom size not calculated
      return;
    }

    const sizeValue = isCustomSize ? customSize : shoeSize;

    cartHandle({
      variables: {
        userId,
        productId: id,
        size: sizeValue,
        color: selectedColor,
        productPrice: data?.getProductById.price,
        isCustomSize: isCustomSize,
      },
    });
  };

  const clearCustomSize = () => {
    setCustomSize(null);
    setIsCustomSize(false);
  };
  
    return (
      <Wrapper>
        <Navbar />
        {loading ? (
          <Loading />
        ) : error ? (
          <MuiError type='error' value={error.message} />
        ) : (
          <ProductContainer>
            <ImageContainer>
              <Image src={image} />
            </ImageContainer>
            <InfoContainer>
              <Title>{title}</Title>
              <Stars stars={rates} />
              <Price>${price}</Price>
              <Lorem>
                Experience premium quality and authentic style with this carefully selected
                footwear. Each pair is crafted with attention to detail, ensuring comfort
                and durability. Choose your perfect size or get custom measurements for
                an ideal fit. Available in multiple colors to match your style.
              </Lorem>
              <Info>
                Available:<span>{inStock ? 'In stock' : 'Out of stock'}</span>
              </Info>
              <Info>
                Brand:<span>{brand}</span>
              </Info>
              <Info>
                Model:<span>{model}</span>
              </Info>

              {inStock && product.color && product.color.length > 0 && (
                <Info>
                  Colors:
                  <ColorSelectionContainer>
                    {product.color.map((colorOption, index) => (
                      <ColorButton
                        key={index}
                        color={colorOption}
                        className={selectedColor === colorOption ? 'active' : ''}
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedColor(colorOption);
                        }}
                        title={colorOption}
                      />
                    ))}
                  </ColorSelectionContainer>
                </Info>
              )}
  
              {inStock ? (
              <Info>
                Sizes:
                <SizeContainer>
                  {size?.map((sizeOption, index) => (
                    <SizeButton
                      className={
                        !isCustomSize && shoeSize.includes(sizeOption) ? 'active' : ''
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        handleRegularSizeSelect(sizeOption);
                      }}
                      key={index}
                      disabled={
                        isCustomSize ||
                        (matchUserId &&
                          filteredCartProducts &&
                          filteredSizesFromCart?.includes(sizeOption))
                      }
                    >
                      {`${sizeOption} US`}
                    </SizeButton>
                  ))}
                </SizeContainer>
              </Info>
            ) : (
              ''
            )}

            {/* Custom Size Section */}
            {inStock && (
              <CustomSizeSection>
                <CustomSizeButton
                  onClick={handleCustomSizeClick}
                  disabled={hasCustomSizeInCart}
                >
                  {hasCustomSizeInCart
                    ? 'Custom Size Already in Cart'
                    : '📏 Get Custom Size Measurement'}
                </CustomSizeButton>

                {isCustomSize && customSize && (
                  <CustomSizeDisplay>
                    <CustomSizeTitle>✓ Custom Measured Size Selected</CustomSizeTitle>
                    <CustomSizeInfo>
                      Left: {customSize.left} cm | Right: {customSize.right} cm
                    </CustomSizeInfo>
                    <ClearCustomButton onClick={clearCustomSize}>
                      Use Regular Size Instead
                    </ClearCustomButton>
                  </CustomSizeDisplay>
                )}
                </CustomSizeSection>
              )}
  
              <hr />
              <Button
                    className={`${inStock ? '' : 'btn-disabled'}`}
                    style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}
                    disabled={
                      cartLoading ||
                      !inStock ||
                      !selectedColor ||
                      (!isCustomSize && shoeSize.length === 0) ||
                      (isCustomSize && !customSize)
                    }
                    onClick={onClickHandler}
                  >
                    {inStock ? 'ADD TO CART' : 'Out of stock'}
                  </Button>
      
                  {cartLoading ? (
                    <Loading />
                  ) : cartError ? (
                    <MuiError type='error' width={'100%'} value={cartError.message} />
                  ) : success ? (
                    <MuiError type='success'>
                      Item added to the cart!
                      <Link
                        style={{ textDecoration: 'underline', margin: '0.5rem' }}
                        to='/cart'
                      >
                        Visit cart
                      </Link>
                    </MuiError>
                  ) : (
                ''
              )}
          </InfoContainer>
        </ProductContainer>
      )}

      <CustomSizeModal
        isOpen={customSizeModalOpen}
        onClose={() => setCustomSizeModalOpen(false)}
        onSizeCalculated={handleSizeCalculated}
      />
    </Wrapper>
  );
};

export default ProductPage;

const Wrapper = styled.div`
  min-height: 105vh;
`;
const ProductContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  .btn-disabled {
    background-color: #666565;
    &:hover {
      background-color: #666565;
    }
  }
`;

const Button = styled.button`
  background-color: var(--clr-mocha-3);
  color: white;
  border-radius: 5px;
  padding: 0.375rem 0.75rem;
  margin-top: 3rem;
  letter-spacing: 1.5px;
  font-size: 14px;
  transition: all 0.3s;
  border: 1px solid black;
  cursor: pointer;
  &:hover {
    background-color: var(--clr-mocha-2);
  }
`;

const ImageContainer = styled.div`
  flex: 2;
`;
const Image = styled.img`
  width: 450px;
  ${mobile({ width: '350px' })}
  margin-top: 4rem;
`;
const InfoContainer = styled.div`
  flex: 2;
  .active {
    border: 1px solid black;
  }
`;
const Title = styled.h1`
  color: var(--clr-primary);
  font-size: 36px;
  ${mobile({ fontSize: '24px' })}
`;

const Price = styled.p`
  color: var(--clr-mocha-2);
  font-size: 22px;
`;

const Lorem = styled.p`
  letter-spacing: 1px;
  line-height: 1.5rem;
  ${mobile({ marginBottom: '2rem' })}
`;

const Info = styled.div`
  display: grid;
  grid-template-columns: 1fr 5fr;
  width: 100%;
  align-items: center;
  margin-bottom: 2rem;
  font-weight: 600;
  span {
    font-weight: 400;
  }
`;

const SizeContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: 100%;
`;

const SizeButton = styled.button`
  background-color: transparent;
  outline: none;
  margin-left: 0.5rem;
  color: black;
  font-weight: 500;
  font-size: 16px;
  padding: 15px 20px;
  margin-bottom: 10px;
  border: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  :hover {
    border: 1px solid black;
  }
  :disabled {
    color: #b6b6b6;
    border: none;
    pointer-events: none;
  }

  :checked {
    border: 1px solid black;
  }
`;

const ColorSelectionContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  width: 100%;
`;

const ColorButton = styled.button`
  background-color: ${props => props.color};
  width: 35px;
  height: 35px;
  border-radius: 50%;
  border: 2px solid #ddd;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  &:hover {
    border-color: #333;
    transform: scale(1.1);
  }

  &.active {
    border: 3px solid black;
    box-shadow: 0 0 0 2px white, 0 0 0 4px black;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CustomSizeSection = styled.div`
  margin: 1.5rem 0;
`;

const CustomSizeButton = styled.button`
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 0.75rem 1.5rem;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  width: 100%;
  transition: all 0.3s;
  
  &:hover:not(:disabled) {
    background-color: #1976d2;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const CustomSizeDisplay = styled.div`
  background-color: #e8f5e9;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
`;

const CustomSizeTitle = styled.p`
  font-weight: bold;
  color: #2e7d32;
  margin: 0 0 0.5rem 0;
`;

const CustomSizeInfo = styled.p`
  margin: 0 0 0.5rem 0;
  font-size: 14px;
`;

const ClearCustomButton = styled.button`
  background: none;
  border: none;
  color: #1976d2;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
  font-size: 14px;
  
  &:hover {
    color: #1565c0;
  }
`;
