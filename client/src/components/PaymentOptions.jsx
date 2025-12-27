import React, { useState } from 'react';
import styled from 'styled-components';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import MuiError from '../assets/mui/Alert';

const PaymentOptions = ({ totalAmount, onPaymentComplete, disabled }) => {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [sdkReady, setSdkReady] = useState(false);

  // Replace with your actual Sandbox Client ID from Business Account
  const PAYPAL_CLIENT_ID = 'AfrXaZQPFKRhOm_ZX0CztR8lsWS_B_OVTb7--Qw9Y5IlyASyB9z7mr6uxj18NhXLV0BdFiiXZhMcZekF';

  const handleCODPayment = () => {
    onPaymentComplete('COD', null);
  };

  const initialOptions = {
    'client-id': PAYPAL_CLIENT_ID,
    currency: 'USD',
    intent: 'capture',
    'enable-funding': 'venmo',
    'disable-funding': 'card,credit',
    'data-sdk-integration-source': 'integrationbuilder_sc',
  };

  return (
    <Wrapper>
      <Title>Select Payment Method</Title>
      
      <PaymentMethodContainer>
        <PaymentMethodButton
          type="button"
          selected={paymentMethod === 'COD'}
          onClick={() => {
            setPaymentMethod('COD');
            setPaymentError('');
          }}
          disabled={disabled}
        >
          <MethodIcon>💵</MethodIcon>
          <MethodText>
            <MethodTitle>Cash on Delivery</MethodTitle>
            <MethodDesc>Pay when you receive the order</MethodDesc>
          </MethodText>
        </PaymentMethodButton>

        <PaymentMethodButton
          type="button"
          selected={paymentMethod === 'PayPal'}
          onClick={() => {
            setPaymentMethod('PayPal');
            setPaymentError('');
          }}
          disabled={disabled}
        >
          <MethodIcon>💳</MethodIcon>
          <MethodText>
            <MethodTitle>PayPal</MethodTitle>
            <MethodDesc>Pay securely with PayPal</MethodDesc>
          </MethodText>
        </PaymentMethodButton>
      </PaymentMethodContainer>

      {paymentError && (
        <MuiError type="error" value={paymentError} />
      )}

      {paymentMethod === 'COD' && (
        <CODSection>
          <CODInfo>
            <InfoIcon>ℹ️</InfoIcon>
            <InfoText>
              Your order will be delivered to your address. Please keep the exact amount ready for payment.
            </InfoText>
          </CODInfo>
          <ConfirmButton 
            type="button"
            onClick={handleCODPayment}
            disabled={disabled}
          >
            Place Order (Cash on Delivery)
          </ConfirmButton>
        </CODSection>
      )}

      {paymentMethod === 'PayPal' && (
        <PayPalSection>
          <PayPalInfo>
            <InfoIcon>ℹ️</InfoIcon>
            <InfoText>
              <strong>Sandbox Test Mode:</strong> Use your PayPal sandbox personal account to complete payment.
            </InfoText>
          </PayPalInfo>
          
          <TestCredentials>
            <h4>🧪 Sandbox Test Accounts</h4>
            <CredentialRow>
              <strong>Buyer (Personal):</strong> sb-lypgw47825137@personal.example.com
            </CredentialRow>
            <CredentialRow>
              <strong>Get Password:</strong> <a href="https://developer.paypal.com/dashboard/accounts" target="_blank" rel="noopener noreferrer">PayPal Developer Dashboard</a>
            </CredentialRow>
          </TestCredentials>

          <PayPalScriptProvider options={initialOptions}>
            <PayPalButtons
              style={{
                layout: 'vertical',
                color: 'gold',
                shape: 'rect',
                label: 'paypal',
                height: 45,
              }}
              disabled={disabled}
              forceReRender={[totalAmount]}
              createOrder={(data, actions) => {
                console.log('Creating PayPal order...', { totalAmount });
                return actions.order.create({
                  purchase_units: [
                    {
                      amount: {
                        currency_code: 'USD',
                        value: totalAmount.toFixed(2),
                      },
                      description: `ShoeMorph Order - Total: $${totalAmount.toFixed(2)}`,
                    },
                  ],
                  application_context: {
                    shipping_preference: 'NO_SHIPPING',
                    brand_name: 'ShoeMorph',
                    locale: 'en-US',
                    user_action: 'PAY_NOW',
                  },
                });
              }}
              onApprove={async (data, actions) => {
                console.log('Payment approved, capturing...', data);
                try {
                  const details = await actions.order.capture();
                  console.log('Payment captured successfully:', details);
                  onPaymentComplete('PayPal', details.id);
                } catch (error) {
                  console.error('Payment capture error:', error);
                  setPaymentError(`Payment failed: ${error.message || 'Unknown error'}. Please try again.`);
                }
              }}
              onError={(err) => {
                console.error('PayPal Button Error:', err);
                setPaymentError(`PayPal Error: ${err.message || 'Connection issue'}. Please refresh and try again.`);
              }}
              onCancel={(data) => {
                console.log('Payment cancelled by user:', data);
                setPaymentError('Payment was cancelled. You can try again when ready.');
              }}
              onInit={(data, actions) => {
                console.log('PayPal SDK initialized');
                setSdkReady(true);
              }}
            />
          </PayPalScriptProvider>

          {!sdkReady && (
            <LoadingText>⏳ Loading PayPal SDK...</LoadingText>
          )}
        </PayPalSection>
      )}

      {!paymentMethod && (
        <SelectPrompt>👆 Please select a payment method to continue</SelectPrompt>
      )}
    </Wrapper>
  );
};

export default PaymentOptions;

const Wrapper = styled.div`
  width: 100%;
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  color: var(--clr-primary);
  margin-bottom: 1.5rem;
  text-align: center;
`;

const PaymentMethodContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const PaymentMethodButton = styled.button`
  display: flex;
  align-items: center;
  padding: 1.5rem;
  border: 2px solid ${props => props.selected ? 'var(--clr-primary)' : '#e0e0e0'};
  border-radius: 8px;
  background: ${props => props.selected ? '#f0f7ff' : 'white'};
  cursor: pointer;
  transition: all 0.3s;

  &:hover:not(:disabled) {
    border-color: var(--clr-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const MethodIcon = styled.div`
  font-size: 2rem;
  margin-right: 1rem;
`;

const MethodText = styled.div`
  text-align: left;
  flex: 1;
`;

const MethodTitle = styled.div`
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--clr-primary);
  margin-bottom: 0.25rem;
`;

const MethodDesc = styled.div`
  font-size: 0.9rem;
  color: #666;
`;

const CODSection = styled.div`
  margin-top: 1rem;
`;

const PayPalSection = styled.div`
  margin-top: 1rem;
`;

const CODInfo = styled.div`
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  background: #fff9c4;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const PayPalInfo = styled.div`
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  background: #e3f2fd;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const InfoIcon = styled.span`
  font-size: 1.5rem;
  margin-right: 0.75rem;
`;

const InfoText = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: #333;
  line-height: 1.5;
`;

const ConfirmButton = styled.button`
  width: 100%;
  padding: 1rem;
  background-color: var(--clr-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;

  &:hover:not(:disabled) {
    background-color: var(--clr-primary-2);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SelectPrompt = styled.div`
  text-align: center;
  padding: 2rem;
  color: #666;
  font-style: italic;
`;

const TestCredentials = styled.div`
  background: #fff3cd;
  border: 2px dashed #ffc107;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  
  h4 {
    margin: 0 0 0.75rem 0;
    color: #856404;
  }
`;

const CredentialRow = styled.div`
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: #333;
  
  strong {
    margin-right: 0.5rem;
    color: #856404;
  }
  
  a {
    color: #0066cc;
    text-decoration: underline;
    
    &:hover {
      color: #004499;
    }
  }
`;

const LoadingText = styled.div`
  text-align: center;
  padding: 1.5rem;
  color: #666;
  font-size: 0.95rem;
`;
