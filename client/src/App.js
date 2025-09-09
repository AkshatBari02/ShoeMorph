import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <div className="App">
        <div className="container">
          <h1>Sneakers Shop</h1>
          <p>Welcome to our premium sneakers collection!</p>
        </div>
      </div>
    </Provider>
  );
}

export default App;
