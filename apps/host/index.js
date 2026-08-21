/**
 * @format
 */

// Load the Tailwind utilities into the styling runtime before anything renders.
import './global.css';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
