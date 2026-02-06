import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/panels/Sidebar';
import Canvas from './components/Canvas';
import './index.css';

function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Toolbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, position: 'relative' }}>
          <Canvas />
        </div>
      </div>
    </div>
  );
}

export default App;
