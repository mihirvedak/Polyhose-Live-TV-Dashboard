import { useEffect, useMemo } from 'react';
import { navigate } from '../../router';
import { tvDataSource } from '../../services/tvDataSource';
import { useControlBar } from '../../tv/hooks/useControlBar';
import { useKiosk, useStageScale, STAGE_H, STAGE_W } from '../../tv/hooks/useKiosk';
import { isStale, useMachineData } from '../../tv/hooks/useMachineData';
import { useNow } from '../../tv/hooks/useNow';
import { useMachines, useStatuses } from '../../tv/hooks/usePlantData';
import { useRotation } from '../../tv/hooks/useRotation';
import { resolveTheme } from '../../tv/lib/layout';
import { buildPlaylist } from '../../tv/lib/rotation';
import { activeProfile, ensureProfilesLoaded, useProfileState } from '../../tv/profile/profileStore';
import { ControlBar } from './ControlBar';
import { MachineBody } from './MachineScreen';
import { TvFooter } from './TvFooter';
import { TvHeader } from './TvHeader';

/** /tv · kiosk machine screen */
export function TvScreen() {
  useKiosk();
  const scale = useStageScale();
  const now = useNow(1000);
  const { machines, error: machinesError } = useMachines();
  const profileState = useProfileState();
  const statuses = useStatuses(5000);

  useEffect(() => {
    if (machines) void ensureProfilesLoaded(machines);
  }, [machines]);

  const profile = activeProfile(profileState);
  const enabledCount = profile?.machines.filter((m) => m.enabled).length ?? 0;

  const playlist = useMemo(
    () => (profile && machines ? buildPlaylist(profile, machines, statuses) : []),
    [profile, machines, statuses],
  );

  const rotation = useRotation(playlist, statuses, profile?.jumpToDown ?? false);
  const current = rotation.current;
  const machine = machines?.find((m) => m.id === current?.machineId) ?? null;
  const data = useMachineData(machine?.id ?? null);
  const { visible, barHandlers } = useControlBar(profile?.hideControlsAfterMs ?? 3000);

  // Keyboard and TV remote
  const { prev, next, togglePlay, stop } = rotation;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const onButton = e.target instanceof HTMLButtonElement;
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === ' ' && !onButton) {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'Escape') stop();
      else if (e.key === 's' || e.key === 'S') navigate('/tv/settings');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, togglePlay, stop]);

  const theme = resolveTheme(profile?.theme ?? 'auto', now);
  const position = playlist.length ? rotation.state.index + 1 : 0;
  const nextMachine = machines?.find((m) => m.id === rotation.nextItem?.machineId);
  const stale = isStale(data, now.getTime());

  let content;
  if (machinesError && !machines) {
    content = <EmptyState title="Cannot reach I/O Sense" sub={`${machinesError} · retrying every 10 s`} />;
  } else if (!machines || profileState.status === 'loading') {
    content = <EmptyState title="Loading machines…" />;
  } else if (!enabledCount) {
    content = <EmptyState title="No machines selected for this TV" sub="open Settings (⚙)" />;
  } else if (!playlist.length || !machine || !current) {
    content = <EmptyState title="No machine to show right now" sub="all selected machines have no signal or no sections · open Settings (⚙)" />;
  } else {
    content = (
      <>
        <TvHeader machine={machine} live={data.live?.machineId === machine.id ? data.live : null} now={now} isMock={tvDataSource.kind === 'mock'} />
        <MachineBody
          machine={machine}
          sections={current.sections}
          live={data.live?.machineId === machine.id ? data.live : null}
          detail={data.detail?.machineId === machine.id ? data.detail : null}
          now={now}
        />
        <TvFooter
          lastSuccess={data.lastSuccess}
          stale={stale}
          now={now}
          progress={rotation.progress}
          nextName={nextMachine?.name ?? null}
          position={position}
          total={playlist.length}
        />
      </>
    );
  }

  return (
    <div className={`tv-root${visible ? '' : ' is-idle'}`} data-theme={theme}>
      <div
        className="tv-stage"
        data-theme={theme}
        style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        <div className="tv-content">{content}</div>
        <ControlBar
          visible={visible}
          mode={rotation.state.mode}
          position={position}
          total={playlist.length}
          machineName={machine?.name ?? null}
          seconds={current?.seconds ?? null}
          canStep={playlist.length > 1}
          onPrev={rotation.prev}
          onToggle={rotation.togglePlay}
          onStop={rotation.stop}
          onNext={rotation.next}
          onSettings={() => navigate('/tv/settings')}
          barHandlers={barHandlers}
        />
      </div>
    </div>
  );
}

function EmptyState({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="tv-empty">
      <div className="tv-empty-title">{title}</div>
      {sub && <div className="tv-empty-sub">{sub}</div>}
    </div>
  );
}
