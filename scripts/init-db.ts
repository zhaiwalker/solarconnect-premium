import {initializeDatabase} from '../server/store';
await initializeDatabase();
console.log('Solarconnect database initialized. Existing data preserved.');
