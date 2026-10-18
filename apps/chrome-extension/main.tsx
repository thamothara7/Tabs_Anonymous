import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { App } from '../../packages/ui/App';
import { makeCharacter } from '../../packages/game-core/fixtures';
import type { TabFact } from '../../packages/game-core/types';
import { snapshot, type TabPort } from './bridge';
import { GroupPreview } from './GroupPreview';
import '../../packages/ui/styles.css';
const port: TabPort = {
  query: (windowId) => chrome.tabs.query({ windowId }),
  group: (tabIds) => chrome.tabs.group({ tabIds: tabIds as [number, ...number[]] }),
  updateGroup: (groupId, title, color) =>
    chrome.tabGroups.update(groupId, { title, color, collapsed: false }),
};
const inArena = window.location.hash === '#arena';
if (!inArena) document.body.classList.add('extension-popup');
function Extension() {
  const [tabs, setTabs] = useState<TabFact[] | null>(null);
  const [windowId, setWindowId] = useState<number | null>(null);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const connect = async () => {
    setError('');
    setBusy(true);
    try {
      const granted = await chrome.permissions.request({ permissions: ['tabs', 'tabGroups'] });
      if (!granted) {
        setError('Permission wasn’t granted. The demo is always available.');
        return;
      }
      const window = await chrome.windows.getCurrent();
      if (window.id === undefined || window.incognito)
        throw new Error('Choose a regular Chrome window to start a session.');
      const data = snapshot(await port.query(window.id), window.id);
      if (!data.length) {
        setError('No eligible tabs in this window. Open a regular website, or try the demo.');
        return;
      }
      setWindowId(window.id);
      setTabs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect. Try the demo.');
    } finally {
      setBusy(false);
    }
  };
  if (demo) return <App />;
  if (tabs && windowId !== null)
    return (
      <>
        <div className="extension-banner">
          LOCAL SESSION · {tabs.length} eligible tabs · {Math.min(tabs.length, 12)} featured
          characters · tab metadata stays on this device
        </div>
        <App
          cast={tabs.slice(0, 12).map(makeCharacter)}
          realMode
          integration={<GroupPreview tabs={tabs} windowId={windowId} port={port} />}
        />
      </>
    );
  return (
    <main className="extension-launch">
      <span className="eyebrow">TABS ANONYMOUS · CHROME EDITION</span>
      <h1>Your tabs have requested a meeting.</h1>
      <p>
        Turn the tabs in this window into an animated support group. We only read titles, URLs,
        pinned state, and audio status, locally on this device. We never read page content or close
        tabs.
      </p>
      {inArena ? (
        <>
          <p>
            Pinned tabs, internal pages, and private tabs are excluded. Up to 12 tabs become
            characters; every eligible tab can appear in the separate grouping preview.
          </p>
          <button className="button orange" disabled={busy} onClick={() => void connect()}>
            {busy ? 'Connecting…' : 'Connect this window'}
            <ShieldCheck size={16} />
          </button>
          <button className="button" disabled={busy} onClick={() => setDemo(true)}>
            Try the fictional demo
          </button>
        </>
      ) : (
        <button
          className="button orange"
          onClick={async () => {
            await chrome.tabs.create({ url: chrome.runtime.getURL('index.html#arena') });
            window.close();
          }}
        >
          Open the therapy room <ArrowUpRight size={16} />
        </button>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="safe-note">
        Real grouping is optional and requires your approval after an exact preview.
      </p>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Extension />);
