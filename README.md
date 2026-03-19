# ShoeMorph

A web platform for selling customized shoes designed specifically for people with different foot sizes or special needs (handicapped individuals).

## Overview

ShoeMorph addresses a significant gap in the footwear market by providing a platform where users can:
- **Measure their foot size** using AI-powered image processing
- **Order custom-sized shoes** tailored to their specific measurements
- **Purchase shoes with different sizes** for left and right feet

This is particularly helpful for individuals who have feet of different sizes due to medical conditions, injuries, or other reasons.

## Features

### For Customers
- **AI-Powered Foot Measurement**: Upload photos of your feet and get accurate size measurements using computer vision
- **Live AI Camera Measurement (WebXR AR)**: Use guided live camera measurement with on-screen point marking for length, width, and optional height
- **Smart Measurement Method Selection**: Choose between Upload Images and AI Camera directly inside the Custom Size modal
- **AR-Aware Fallback**: If WebXR AR is not supported on a device/browser, the modal automatically keeps the Upload Images workflow available
- **Custom Size Selection**: Order shoes with different sizes for left and right feet
- **Product Browsing**: Filter products by brand, size, color, and price
- **Shopping Cart**: Add products to cart and manage orders
- **Multiple Payment Options**: PayPal integration and Cash on Delivery
- **User Dashboard**: Manage profile, shipping address, and view purchase history
- **Top Picks**: Personalized product recommendations

### For Administrators
- **Product Management**: Add, edit, and manage shoe inventory
- **Order Management**: View and manage all customer orders
- **Image Upload**: Cloudinary integration for product images

## Tech Stack

### Frontend
- **React.js** - UI framework
- **Redux Toolkit** - State management
- **Apollo Client** - GraphQL client
- **Styled Components** - CSS-in-JS styling
- **Material UI** - UI component library
- **React Router** - Navigation

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Apollo Server** - GraphQL server
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication

### Foot Measurement API
- **FastAPI** - Python web framework
- **OpenCV** - Image processing
- **NumPy** - Numerical computing

### Third-Party Services
- **Cloudinary** - Image hosting
- **PayPal** - Payment processing

## Installation

### Prerequisites
- Node.js (v16 or higher)
- Python 3.8+
- MongoDB (local or Atlas)
- npm or yarn

### Clone the Repository
```bash
git clone <repository-url>
cd ShoeMorph
```

### Install Dependencies

**Main Project & Server:**
```bash
npm install --legacy-peer-deps
```

**Client:**
```bash
cd client
npm install --legacy-peer-deps
```

**Foot Measurement API:**
```bash
cd ../shoe-size-measurement\ API
pip install -r requirements.txt
```

## Environment Setup

### Server (.env)
Create a `.env` file in the root directory:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/shoemporph
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
```

### Client (client/.env)
Create a `.env` file in the `client` directory:
```env
REACT_APP_GRAPHQL_URL=http://localhost:5000/graphql
REACT_APP_FOOT_MEASUREMENT_API_URL=http://localhost:8000
REACT_APP_PAYPAL_CLIENT_ID=your_paypal_client_id
REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
REACT_APP_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

## Running the Application

### Start All Services

**Option 1: Run both frontend and backend together**
```bash
npm run dev
```

**Option 2: Run separately**

Terminal 1 - Backend:
```bash
npm run server
```

Terminal 2 - Frontend:
```bash
cd client && npm start
```

Terminal 3 - Foot Measurement API:
```bash
cd shoe-size-measurement\ API
python api.py
```

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend GraphQL**: http://localhost:5000/graphql
- **Foot Measurement API**: http://localhost:8000

## Project Structure

```
ShoeMorph/
├── client/                 # React frontend
│   ├── public/            # Static files
│   └── src/
│       ├── assets/        # Images, fonts, MUI components
│       ├── components/    # Reusable components
│       ├── config/        # Environment configuration
│       ├── features/      # Redux slices
│       ├── graphql/       # GraphQL queries & mutations
│       ├── pages/         # Page components
│       │   ├── AdminDashboard/
│       │   └── UserDashboard/
│       └── utils/         # Helper functions
├── server/                # Node.js backend
│   ├── db/               # Database connection
│   ├── graphql/          # GraphQL schema & resolvers
│   ├── models/           # Mongoose models
│   └── utils/            # Server utilities
└── shoe-size-measurement API/  # Python foot measurement service
    ├── api.py            # FastAPI endpoints
    └── utils.py          # Image processing functions
```

## How Foot Measurement Works

ShoeMorph supports two measurement paths in the Custom Size modal:

### 1) Upload Images (API-based)
1. User uploads photos of their left and right feet
2. Images are sent to the Foot Measurement API
3. OpenCV processes the images:
    - Preprocessing and clustering
    - Edge detection
    - Bounding box calculation
    - Size calculation based on reference
4. Measurements are returned in centimeters

### 2) AI Camera (Client-side Live Measurement)
1. User starts AI Live Camera from the Custom Size modal
2. The app checks device/browser WebXR AR support and camera availability
3. Live video feed is shown with guided overlay for foot placement
4. User measures left and right foot by marking points for:
    - Length (heel to toe)
    - Width (left edge to right edge)
    - Optional height (side profile)
5. The app confirms both-foot measurements and returns left/right values to the size workflow

### Fallback Behavior
- On unsupported devices or browsers, AI Camera is disabled and users continue with Upload Images.
- This keeps the measurement flow available across desktop and mobile environments.

## API Endpoints

### GraphQL (Backend)
- **Queries**: Users, Products, Cart, Orders
- **Mutations**: Auth, Cart management, Order placement, Product CRUD

### Foot Measurement API
- `POST /measure-foot` - Upload image and get foot size
- `GET /health` - Health check endpoint

## Development Guidelines

- Use `--legacy-peer-deps` flag when installing packages
- Follow the existing code structure and naming conventions
- Test changes locally before committing

## License

This project is part of a Final Year Project.

## Contributors

- ShoeMorph Development Team
