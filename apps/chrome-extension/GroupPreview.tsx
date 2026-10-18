import { useState } from 'react';
import { Check, Folder } from 'lucide-react';
import type { TabFact } from '../../packages/game-core/types';
import { applyGroups, propose, type GroupResult, type TabPort } from './bridge';
export function GroupPreview({
  tabs,
  windowId,
  port,
}: {
  tabs: TabFact[];
  windowId: number;
  port: TabPort;
}) {
  const [open, setOpen] = useState(false);
  const [approved, setApproved] = useState(() => new Set(tabs.map((t) => t.browserId!)));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GroupResult | null>(null);
  const plan = propose(tabs);
  const apply = async () => {
    setBusy(true);
    try {
      setResult(await applyGroups(port, plan, approved, windowId));
    } catch (error) {
      setResult({
        applied: [],
        skipped: [],
        errors: [
          error instanceof Error ? error.message : 'Could not rescan tabs. Nothing was applied.',
        ],
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="native-preview">
      <h4>Optional: organize your real tabs</h4>
      <p>
        This is separate from the fictional vote. Review every selected tab below. Existing groups
        may change. Pinned and private tabs are excluded.
      </p>
      {!open ? (
        <button
          className="button"
          onClick={() => {
            setOpen(true);
            setResult(null);
          }}
        >
          <Folder size={15} /> Preview native groups
        </button>
      ) : (
        <>
          {!result &&
            plan.map((g) => (
              <details open key={g.category}>
                <summary>
                  {g.title} · {g.tabs.length} tabs
                </summary>
                <ul>
                  {g.tabs.map((t) => (
                    <li key={t.id}>
                      <label>
                        <input
                          type="checkbox"
                          disabled={busy}
                          checked={approved.has(t.browserId!)}
                          onChange={(e) =>
                            setApproved((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(t.browserId!);
                              else next.delete(t.browserId!);
                              return next;
                            })
                          }
                        />{' '}
                        {t.title} <small>({new URL(t.url).hostname})</small>
                      </label>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          {!result && (
            <>
              <button
                className="button orange"
                disabled={busy || !approved.size}
                onClick={() => void apply()}
              >
                {busy ? 'Applying…' : `Apply to ${approved.size} real tabs`}
              </button>
              <button className="button" disabled={busy} onClick={() => setOpen(false)}>
                Cancel
              </button>
            </>
          )}
          {result && (
            <div role="status">
              {result.applied.map((t) => (
                <p key={t}>✓ {t}</p>
              ))}
              {result.skipped.map((t) => (
                <p key={t}>{t}</p>
              ))}
              {result.errors.map((t) => (
                <p className="group-error" key={t}>
                  {t}
                </p>
              ))}
              {!result.errors.length && !result.skipped.length && (
                <p>
                  <Check size={14} /> Approved groups applied. No tabs were closed.
                </p>
              )}
              {!!result.errors.length && (
                <p>Reload this arena to take a fresh snapshot before trying again.</p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
