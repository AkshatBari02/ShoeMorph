import React, { useState } from 'react';
import styled from 'styled-components';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { mobile } from '../responsive';

const CustomSizeModal = ({ isOpen, onClose, onSizeCalculated }) => {
  const [leftFootImage, setLeftFootImage] = useState(null);
  const [rightFootImage, setRightFootImage] = useState(null);
  const [leftFootPreview, setLeftFootPreview] = useState(null);
  const [rightFootPreview, setRightFootPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [calculatedSize, setCalculatedSize] = useState(null);

  const handleImageUpload = (event, foot) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file');
        return;
      }

      if (foot === 'left') {
        setLeftFootImage(file);
        setLeftFootPreview(URL.createObjectURL(file));
      } else {
        setRightFootImage(file);
        setRightFootPreview(URL.createObjectURL(file));
      }
      setError('');
    }
  };

  const measureFootSize = async (imageFile) => {
    const formData = new FormData();
    formData.append('file', imageFile);

    const response = await fetch('http://localhost:8000/measure-foot', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to measure foot size');
    }

    const data = await response.json();
    return data.feet_size_cm;
  };

  const handleCalculateSize = async () => {
    if (!leftFootImage || !rightFootImage) {
      setError('Please upload both foot images');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Make two separate API calls
      const [leftFootSize, rightFootSize] = await Promise.all([
        measureFootSize(leftFootImage),
        measureFootSize(rightFootImage),
      ]);

      const sizeData = {
        left: leftFootSize.toFixed(2),
        right: rightFootSize.toFixed(2),
      };

      setCalculatedSize(sizeData);
    } catch (err) {
      setError(err.message || 'Error calculating shoe size. Please try again.');
      console.error('Measurement error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (calculatedSize) {
      onSizeCalculated(calculatedSize);
      setCalculatedSize(null);
      handleClose();
    }
  };

  const handleClose = () => {
    setLeftFootImage(null);
    setRightFootImage(null);
    setLeftFootPreview(null);
    setRightFootPreview(null);
    setCalculatedSize(null);
    setError('');
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Overlay onClick={handleClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <Title>Custom Shoe Size Measurement</Title>
          <CloseButton onClick={handleClose}>
            <CloseIcon />
          </CloseButton>
        </ModalHeader>

        <ModalContent>
          <InfoAlert>
            Please upload clear images of both feet placed on white paper with a
            reference object (credit card or A4 paper) for accurate measurements.
          </InfoAlert>

          {error && <ErrorAlert>{error}</ErrorAlert>}

          <UploadGrid>
            {/* Left Foot Upload */}
            <UploadSection>
              <SubTitle>Left Foot Image</SubTitle>
              <UploadCard>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="left-foot-upload"
                  type="file"
                  onChange={(e) => handleImageUpload(e, 'left')}
                />
                <label htmlFor="left-foot-upload" style={{ cursor: 'pointer', width: '100%' }}>
                  {leftFootPreview ? (
                    <PreviewImage src={leftFootPreview} alt="Left foot" />
                  ) : (
                    <UploadPlaceholder>
                      <CloudUploadIcon style={{ fontSize: 48, color: '#999' }} />
                      <PlaceholderText>Click to upload left foot image</PlaceholderText>
                    </UploadPlaceholder>
                  )}
                </label>
              </UploadCard>
            </UploadSection>

            {/* Right Foot Upload */}
            <UploadSection>
              <SubTitle>Right Foot Image</SubTitle>
              <UploadCard>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="right-foot-upload"
                  type="file"
                  onChange={(e) => handleImageUpload(e, 'right')}
                />
                <label htmlFor="right-foot-upload" style={{ cursor: 'pointer', width: '100%' }}>
                  {rightFootPreview ? (
                    <PreviewImage src={rightFootPreview} alt="Right foot" />
                  ) : (
                    <UploadPlaceholder>
                      <CloudUploadIcon style={{ fontSize: 48, color: '#999' }} />
                      <PlaceholderText>Click to upload right foot image</PlaceholderText>
                    </UploadPlaceholder>
                  )}
                </label>
              </UploadCard>
            </UploadSection>
          </UploadGrid>

          {calculatedSize && (
            <ResultBox>
              <ResultTitle>Calculated Measurements:</ResultTitle>
              <ResultText>Left Foot Size: {calculatedSize.left} cm</ResultText>
              <ResultText>Right Foot Size: {calculatedSize.right} cm</ResultText>
            </ResultBox>
          )}
        </ModalContent>

        <ModalActions>
          <CancelButton onClick={handleClose} disabled={loading}>
            Cancel
          </CancelButton>
          {!calculatedSize ? (
            <CalculateButton
              onClick={handleCalculateSize}
              disabled={loading || !leftFootImage || !rightFootImage}
            >
              {loading ? 'Calculating...' : 'Calculate Size'}
            </CalculateButton>
          ) : (
            <ConfirmButton onClick={handleConfirm}>
              Confirm
            </ConfirmButton>
          )}
        </ModalActions>
      </ModalContainer>
    </Overlay>
  );
};

export default CustomSizeModal;

// Styled Components
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 10px;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  ${mobile({ width: '95%', maxHeight: '95vh' })}
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  ${mobile({ fontSize: '1.2rem' })}
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  
  &:hover {
    background-color: #f0f0f0;
    border-radius: 50%;
  }
`;

const ModalContent = styled.div`
  padding: 1.5rem;
`;

const InfoAlert = styled.div`
  background-color: #e3f2fd;
  border-left: 4px solid #2196f3;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
  line-height: 1.5;
`;

const ErrorAlert = styled.div`
  background-color: #ffebee;
  border-left: 4px solid #f44336;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 4px;
  color: #c62828;
`;

const UploadGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  ${mobile({ gridTemplateColumns: '1fr', gap: '1rem' })}
`;

const UploadSection = styled.div``;

const SubTitle = styled.h3`
  margin-bottom: 0.5rem;
  font-size: 1rem;
`;

const UploadCard = styled.div`
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  transition: border-color 0.3s;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: var(--clr-mocha-3);
  }
`;

const UploadPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const PlaceholderText = styled.p`
  margin-top: 0.5rem;
  color: #666;
  font-size: 0.9rem;
`;

const PreviewImage = styled.img`
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
  border-radius: 4px;
`;

const ResultBox = styled.div`
  background-color: #e8f5e9;
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 1rem;
`;

const ResultTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #2e7d32;
`;

const ResultText = styled.p`
  margin: 0.5rem 0;
  font-size: 1rem;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e0e0e0;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 5px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  border: none;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background-color: #f5f5f5;
  color: #333;

  &:hover:not(:disabled) {
    background-color: #e0e0e0;
  }
`;

const CalculateButton = styled(Button)`
  background-color: var(--clr-mocha-3);
  color: white;

  &:hover:not(:disabled) {
    background-color: var(--clr-mocha-2);
  }
`;

const ConfirmButton = styled(Button)`
  background-color: #4caf50;
  color: white;

  &:hover:not(:disabled) {
    background-color: #45a049;
  }
`;
