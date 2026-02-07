// Centralized configuration file for environment variables
// All environment variables should be accessed through this config

const config = {
  // GraphQL API URL
  graphqlUrl: process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:4000/graphql',
  
  // Foot Measurement API URL
  footMeasurementApiUrl: process.env.REACT_APP_FOOT_MEASUREMENT_API_URL || 'http://localhost:8000',
  
  // PayPal Configuration
  paypal: {
    clientId: process.env.REACT_APP_PAYPAL_CLIENT_ID || '',
  },
  
  // Cloudinary Configuration
  cloudinary: {
    cloudName: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || '',
    uploadPreset: process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || '',
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || ''}/image/upload`,
  },
};

export default config;
