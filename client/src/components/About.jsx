import React from 'react';
import styled from 'styled-components';
import logo from '../assets/items/adidas_yeezy_700_wave_runner.png';
import image from '../assets/items/nike_jordan_1_travis_mocha_high.png';
import { mobile } from '../responsive';
const About = () => {
  return (
    <Wrapper>
      <AboutContainer>
        <Title>
          <Logo src={logo} />
          About ShoeMorph
        </Title>
        <Info>
          ShoeMorph is your ultimate destination for premium sneakers and footwear.
          <br />We offer an extensive collection of authentic shoes from top brands
          <br /> including Nike, Adidas, Yeezy, Jordan, and more. With our innovative
          <br />
          custom foot measurement technology, you can get the perfect fit every time.
          <br />
          Simply upload images of your feet, and our advanced system calculates
          <br /> your precise measurements for a truly personalized shopping experience.
          <br />
          Browse through our curated selection, choose from multiple colors and sizes,
          <br /> and enjoy seamless shopping with secure checkout. Whether you're looking
          <br /> for the latest releases or timeless classics, ShoeMorph brings style
          <br /> and comfort right to your doorstep.
        </Info>
      </AboutContainer>
      <ImageContainer>
        <Image src={image} />
      </ImageContainer>
    </Wrapper>
  );
};

export default About;

const Wrapper = styled.div`
  display: flex;
  margin-top: 5rem;
`;
const AboutContainer = styled.div`
  ${mobile({
    display: 'flex',
    flexDirection: 'column',
    margin: '0 auto',
    textAlign: 'center',
    width: '100%',
  })}
`;
const Title = styled.h1`
  display: flex;
  align-items: center;
  color: var(--clr-primary);
  ${mobile({ display: 'flex', flexDirection: 'column' })}
`;
const Logo = styled.img`
  width: 10%;
  min-width: 50px;
  margin-right: 1rem;
  ${mobile({ width: '30%' })}
`;

const Info = styled.p`
  color: var(--clr-gray);
  ${mobile({
    margin: '1rem',
  })}
`;

const ImageContainer = styled.div`
  ${mobile({ display: 'none' })}
`;
const Image = styled.img`
  height: 50vh;
  width: 35vw;
  object-fit: cover;
`;
