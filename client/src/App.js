import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { Footer, Header, Navbar } from './components/index';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <Navbar/>
      <div className="App">
        <div className="container">
          <Header />
          <h1>ShoeMorph</h1>
          <p>Welcome to our premium shoes collection!</p>
        <Footer />
        </div>
      </div>
    </Provider>
  );
}

export default App;
