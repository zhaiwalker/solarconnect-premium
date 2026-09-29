import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/manrope';
import App from './App';
import './premium.css';
import './shop/shop.css';
import {ShopProvider} from './shop/ShopContext';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ShopProvider><App /></ShopProvider></React.StrictMode>);
