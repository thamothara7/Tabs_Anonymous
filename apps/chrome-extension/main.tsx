import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { App } from '../../packages/ui/App';
import { featuredTabs } from '../../packages/game-core/casting';
import { sessionKey } from '../../packages/game-core/session';
import { encodeSnapshot, restoreSnapshot, SNAPSHOT_KEY } from './session';
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
  const [restoring, setRestoring] = useState(inArena);
  const cast = useMemo(() => featuredTabs(tabs ?? []).map(makeCharacter), [tabs]);
  useEffect(() => {
    if (!inArena) return;
    let cancelled = false;
    const restore = async () => {
      try {
        const raw = sessionStorage.getItem(SNAPSHOT_KEY);
        if (!raw) return;
        const permitted = await chrome.permissions.contains({ permissions: ['tabs', 'tabGroups'] });
        if (!permitted) throw new Error('Reconnect to grant access before restoring your session.');
        const current = await chrome.windows.getCurrent();
        if (current.id === undefined || current.incognito)
          throw new Error('Open a regular window to reconnect.');
        const fresh = snapshot(await port.query(current.id), current.id);
        const restored = restoreSnapshot(raw, fresh, current.id);
        if (!restored)
          throw new Error(
            'Your tabs changed since the saved session. Connect again for a fresh cast.',
          );
        if (!cancelled) {
          setWindowId(current.id);
          setTabs(restored);
        }
      } catch (e) {
        try {
          sessionStorage.removeItem(SNAPSHOT_KEY);
          sessionStorage.removeItem(sessionKey(true));
        } catch {
          /* Optional browser storage. */
        }
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Connect again to start a fresh session.');
      } finally {
        if (!cancelled) setRestoring(false);
      }
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, []);
  const forgetSession = () => {
    try {
      sessionStorage.removeItem(SNAPSHOT_KEY);
      sessionStorage.removeItem(sessionKey(true));
    } catch {
      /* Storage may be unavailable. */
    }
    setTabs(null);
    setWindowId(null);
    setError('');
  };
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
      try {
        sessionStorage.setItem(SNAPSHOT_KEY, encodeSnapshot(data, window.id));
        sessionStorage.removeItem(sessionKey(true));
      } catch {
        /* The session still works without storage. */
      }
      setWindowId(window.id);
      setTabs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect. Try the demo.');
    } finally {
      setBusy(false);
    }
  };
  if (restoring)
    return (
      <main className="extension-launch" role="status">
        <span className="eyebrow">TABS ANONYMOUS</span>
        <h1>Finding your seat…</h1>
        <p>Checking the saved session against the tabs in this window.</p>
      </main>
    );
  if (demo) return <App />;
  if (tabs && windowId !== null)
    return (
      <>
        <div className="extension-banner">
          LOCAL SESSION · {tabs.length} eligible tabs · {Math.min(tabs.length, 12)} featured
          characters · local snapshot · cloud speech is optional
          <button onClick={forgetSession}>Forget session</button>
        </div>
        <App
          cast={cast}
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
            characters; every eligible tab can appear in the separate grouping preview. Progress is
            saved in this tab so you can reload. Use Forget session to clear it.
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
