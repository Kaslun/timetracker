import { useEffect } from 'react';
import { useStore, wireGlobalSubscriptions } from './shared/store';
import { windowKind } from './shared/api';
import { PillRoot } from './windows/pill/PillRoot';
import { ExpandedRoot } from './windows/expanded/ExpandedRoot';
import { DashboardRoot } from './windows/dashboard/DashboardRoot';
import { IntroRoot } from './windows/intro/IntroRoot';
import { ToastRoot } from './windows/toast/ToastRoot';
import { SettingsRoot } from './windows/settings/SettingsRoot';
import { CheatsheetRoot } from './windows/cheatsheet/CheatsheetRoot';
import { IntegrationRoot } from './windows/integration/IntegrationRoot';

const TRANSPARENT_WINDOWS = new Set(['pill', 'toast', 'cheatsheet']);

export function Bootstrap() {
  const ready = useStore((s) => s.ready);
  const kind = windowKind();

  useEffect(() => {
    if (TRANSPARENT_WINDOWS.has(kind)) {
      document.body.classList.add('transparent');
      document.documentElement.style.background = 'transparent';
    }
    wireGlobalSubscriptions();
    void useStore.getState().bootstrap();
  }, [kind]);

  if (!ready) {
    return <div className="attensi" style={{ padding: 24, color: 'var(--ink-3)' }}>Loading…</div>;
  }

  switch (kind) {
    case 'pill':       return <PillRoot />;
    case 'expanded':   return <ExpandedRoot />;
    case 'dashboard':  return <DashboardRoot />;
    case 'intro':      return <IntroRoot />;
    case 'toast':      return <ToastRoot />;
    case 'settings':    return <SettingsRoot />;
    case 'cheatsheet':  return <CheatsheetRoot />;
    case 'integration': return <IntegrationRoot />;
    default:            return <ExpandedRoot />;
  }
}
