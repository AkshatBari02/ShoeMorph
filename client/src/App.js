import React from 'react';
import { Footer, MoblieMenu } from './components';
import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';

function App() {
  return (
    <>
      <MoblieMenu />
      <Routes>
        <Route exact path='/' element={<HomePage />} />
      </Routes>
      <Footer />
    </>
  );
}

export default App;
