import { useEffect, useState } from 'react';
import { navigate } from '../../router';
import { useMachines, useStatuses } from '../../tv/hooks/usePlantData';
import {
  createDefaultProfile,
  deleteProfile,
  ensureProfilesLoaded,
  saveProfile,
  useProfileState,
} from '../../tv/profile/profileStore';
import type { TvProfile } from '../../tv/types';
import { IconGear } from '../common/Icons';
import { Wordmark } from '../common/Wordmark';
import { MachinesColumn } from './MachinesColumn';
import { PlaybackColumn } from './PlaybackColumn';
import { SectionsColumn } from './SectionsColumn';

type ProfileMode = { kind: 'idle' } | { kind: 'new' | 'rename'; name: string } | { kind: 'confirmDelete' };

/** /tv/settings */
export function SettingsScreen() {
  const { machines, error: machinesError } = useMachines();
  const statuses = useStatuses(10_000);
  const profileState = useProfileState();
  const [drafts, setDrafts] = useState<Record<string, TvProfile>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [valid, setValid] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mode, setMode] = useState<ProfileMode>({ kind: 'idle' });

  useEffect(() => {
    if (machines) void ensureProfilesLoaded(machines);
  }, [machines]);

  useEffect(() => {
    document.title = 'TV settings · Polyhose';
    return () => {
      document.title = 'Polyhose Machine TV';
    };
  }, []);

  const currentId = selectedId ?? profileState.activeId;
  const saved = profileState.profiles.find((p) => p.id === currentId);
  const draft = (currentId && drafts[currentId]) || saved || null;
  const allProfiles = [
    ...profileState.profiles.map((p) => drafts[p.id] ?? p),
    ...Object.values(drafts).filter((d) => !profileState.profiles.some((p) => p.id === d.id)),
  ];

  const update = (patch: Partial<TvProfile> | ((p: TvProfile) => Partial<TvProfile>)) => {
    if (!draft) return;
    setDrafts((all) => {
      const base = all[draft.id] ?? draft;
      return { ...all, [draft.id]: { ...base, ...(typeof patch === 'function' ? patch(base) : patch) } };
    });
  };

  const backToTv = (id?: string) => {
    const params = new URLSearchParams(window.location.search);
    if (id && params.has('profile')) params.set('profile', id);
    const qs = params.toString();
    navigate(qs ? `/tv?${qs}` : '/tv');
  };

  const onSave = async () => {
    if (!draft || !valid) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveProfile({ ...draft, updatedBy: 'tv-settings' });
      backToTv(draft.id);
    } catch (e) {
      console.error('[TV] save failed', e);
      setSaveError('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const onProfileConfirm = async () => {
    if (!draft) return;
    if (mode.kind === 'new' && machines) {
      const name = mode.name.trim() || 'New TV';
      const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tv'}-${Date.now().toString(36)}`;
      const created = createDefaultProfile(machines, id, name);
      setDrafts((all) => ({ ...all, [id]: created }));
      setSelectedId(id);
    } else if (mode.kind === 'rename') {
      const name = mode.name.trim();
      if (name) update({ name });
    } else if (mode.kind === 'confirmDelete') {
      const id = draft.id;
      setDrafts((all) => {
        const { [id]: _removed, ...rest } = all;
        return rest;
      });
      if (profileState.profiles.some((p) => p.id === id)) await deleteProfile(id);
      setSelectedId(null);
    }
    setMode({ kind: 'idle' });
  };

  const ready = machines && draft && profileState.status === 'ready';

  return (
    <div className="settings" data-theme="day">
      <header className="set-header">
        <Wordmark size={30} />
        <span className="tv-header-divider" />
        <div className="set-title">
          <h1>TV settings</h1>
          <p className="muted">
            Choose machines, sections and timing for this TV · opened from the <IconGear size={14} /> button on the control bar
          </p>
        </div>

        <div className="set-profile">
          <div className="card-label">TV profile</div>
          {mode.kind === 'new' || mode.kind === 'rename' ? (
            <div className="set-profile-edit">
              <input
                autoFocus
                value={mode.name}
                placeholder="e.g. Braider hall TV"
                onChange={(e) => setMode({ ...mode, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void onProfileConfirm();
                  if (e.key === 'Escape') setMode({ kind: 'idle' });
                }}
                aria-label="Profile name"
              />
              <button type="button" className="btn btn-sm btn-primary" onClick={() => void onProfileConfirm()}>
                {mode.kind === 'new' ? 'Add' : 'Rename'}
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setMode({ kind: 'idle' })}>
                Cancel
              </button>
            </div>
          ) : mode.kind === 'confirmDelete' ? (
            <div className="set-profile-edit">
              <span>Delete “{draft?.name}”?</span>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => void onProfileConfirm()}>
                Delete
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setMode({ kind: 'idle' })}>
                Keep
              </button>
            </div>
          ) : (
            <div className="set-profile-edit">
              <select
                value={currentId ?? ''}
                onChange={(e) => setSelectedId(e.target.value)}
                aria-label="TV profile"
                disabled={!ready}
              >
                {allProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="set-profile-actions">
                <button type="button" className="link" onClick={() => setMode({ kind: 'new', name: '' })} disabled={!ready}>
                  Add
                </button>
                <button type="button" className="link" onClick={() => draft && setMode({ kind: 'rename', name: draft.name })} disabled={!ready}>
                  Rename
                </button>
                <button type="button" className="link link-danger" onClick={() => setMode({ kind: 'confirmDelete' })} disabled={!ready || allProfiles.length < 2}>
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="set-actions">
          {saveError && <span className="field-error">{saveError}</span>}
          <button type="button" className="btn" onClick={() => backToTv()}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void onSave()} disabled={!ready || !valid || saving}>
            {saving ? 'Saving…' : 'Save & apply'}
          </button>
        </div>
      </header>

      {profileState.source === 'cache' && (
        <div className="set-banner">Server unreachable · showing the copy saved on this device. Saving keeps changes on this device only.</div>
      )}

      {!ready ? (
        <div className="set-loading">{machinesError ? `Cannot load machines · ${machinesError}` : 'Loading…'}</div>
      ) : (
        <div className="set-grid" key={draft.id}>
          <MachinesColumn draft={draft} update={update} machines={machines} statuses={statuses} />
          <SectionsColumn draft={draft} update={update} />
          <PlaybackColumn draft={draft} update={update} machines={machines} statuses={statuses} onValidity={setValid} />
        </div>
      )}
    </div>
  );
}
