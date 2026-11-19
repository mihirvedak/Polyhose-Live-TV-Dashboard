import { useEffect } from 'react';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { TvScreen } from './components/tv/TvScreen';
import { navigate, usePathname } from './router';

function App() {
  const path = usePathname().replace(/\/+$/, '') || '/';

  useEffect(() => {
    if (path !== '/tv' && path !== '/tv/settings') navigate('/tv', { replace: true });
  }, [path]);

  if (path === '/tv/settings') return <SettingsScreen />;
  return <TvScreen />;
}

export default App;
