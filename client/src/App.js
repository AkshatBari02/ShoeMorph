import React from 'react';
import { Footer, MoblieMenu } from './components';
import { Route, Routes } from 'react-router-dom';
import { HomePage, ShopPage, ProductPage } from './pages';

function App() {
  return (
    <>
      <MoblieMenu />
      <Routes>
        <Route exact path='/' element={<HomePage />} />
        <Route path='/shop' element={<ShopPage />} />
        <Route path='/shop/:id' element={<ProductPage />} />
      </Routes>
      <Footer />
    </>
  );
}

export default App;
