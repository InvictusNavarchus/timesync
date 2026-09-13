<script lang="ts">
  import { syncState } from '$lib/state/timesync.svelte';
  import { onDestroy } from 'svelte';

  let trackRef = $state<HTMLDivElement | null>(null);
  let isDragging = $state(false);
  let dragMode = $state<'create' | 'move' | 'resize-left' | 'resize-right'>('create');
  let dragStartHour = $state(0);
  let origStart = $state(0);
  let origEnd = $state(0);

  let leftPercent = $derived(
    syncState.meeting ? (syncState.meeting.startHourIndex / 24) * 100 : 0
  );

  let widthPercent = $derived(
    syncState.meeting
      ? ((syncState.meeting.endHourIndex - syncState.meeting.startHourIndex) / 24) * 100
      : 0
  );

  let durationText = $derived.by(() => {
    if (!syncState.meeting) return '';
    const diff = syncState.meeting.endHourIndex - syncState.meeting.startHourIndex;
    return diff % 1 === 0 ? `${diff}h` : `${diff.toFixed(1)}h`;
  });

  function getHourFromEvent(e: MouseEvent): number {
    if (!trackRef) return 0;
    const rect = trackRef.getBoundingClientRect();
    const rawRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    // Snap to 30-minute intervals (48 segments across 24 hours)
    return Math.round(rawRatio * 48) / 2;
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging || !syncState.meeting) return;
    const currentHour = getHourFromEvent(e);

    if (dragMode === 'create') {
      if (currentHour >= dragStartHour) {
        syncState.meeting = {
          startHourIndex: dragStartHour,
          endHourIndex: Math.min(24, Math.max(currentHour, dragStartHour + 0.5))
        };
      } else {
        syncState.meeting = {
          startHourIndex: Math.max(0, currentHour),
          endHourIndex: Math.max(currentHour + 0.5, dragStartHour)
        };
      }
    } else if (dragMode === 'move') {
      const delta = currentHour - dragStartHour;
      const duration = origEnd - origStart;
      let newStart = origStart + delta;
      let newEnd = origEnd + delta;

      if (newStart < 0) {
        newStart = 0;
        newEnd = duration;
      }
      if (newEnd > 24) {
        newEnd = 24;
        newStart = 24 - duration;
      }

      syncState.meeting = {
        startHourIndex: Math.round(newStart * 2) / 2,
        endHourIndex: Math.round(newEnd * 2) / 2
      };
    } else if (dragMode === 'resize-left') {
      const newStart = Math.min(syncState.meeting.endHourIndex - 0.5, Math.max(0, currentHour));
      syncState.meeting = {
        startHourIndex: newStart,
        endHourIndex: syncState.meeting.endHourIndex
      };
    } else if (dragMode === 'resize-right') {
      const newEnd = Math.max(syncState.meeting.startHourIndex + 0.5, Math.min(24, currentHour));
      syncState.meeting = {
        startHourIndex: syncState.meeting.startHourIndex,
        endHourIndex: newEnd
      };
    }
  }

  function handleMouseUp() {
    if (isDragging) {
      isDragging = false;
      syncState.syncToUrl();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
  }

  function handleTrackMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    const hour = getHourFromEvent(e);
    dragStartHour = hour;
    syncState.meeting = {
      startHourIndex: hour,
      endHourIndex: Math.min(24, hour + 1)
    };
    isDragging = true;
    dragMode = 'create';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleBoxMouseDown(e: MouseEvent) {
    if (e.button !== 0 || !syncState.meeting) return;
    e.stopPropagation();
    isDragging = true;
    dragMode = 'move';
    dragStartHour = getHourFromEvent(e);
    origStart = syncState.meeting.startHourIndex;
    origEnd = syncState.meeting.endHourIndex;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleLeftHandleMouseDown(e: MouseEvent) {
    if (e.button !== 0 || !syncState.meeting) return;
    e.stopPropagation();
    isDragging = true;
    dragMode = 'resize-left';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleRightHandleMouseDown(e: MouseEvent) {
    if (e.button !== 0 || !syncState.meeting) return;
    e.stopPropagation();
    isDragging = true;
    dragMode = 'resize-right';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
  });
</script>

<!-- The outer overlay sits across the dials column with padding matching the dials strip -->
<div
  class="overlay-outer"
  onmousedown={handleTrackMouseDown}
  role="presentation"
>
  <div class="overlay-track" bind:this={trackRef}>
    {#if syncState.meeting}
      <div
        class="selection-box"
        style:left="{leftPercent}%"
        style:width="{widthPercent}%"
        onmousedown={handleBoxMouseDown}
        role="slider"
        aria-label="Meeting selection window"
        aria-valuemin={0}
        aria-valuemax={24}
        aria-valuenow={syncState.meeting.startHourIndex}
        tabindex="0"
      >
        <div
          class="handle handle-left"
          onmousedown={handleLeftHandleMouseDown}
          role="presentation"
        ></div>

        <div class="selection-pill">
          <span class="duration-text">{durationText}</span>
        </div>

        <div
          class="handle handle-right"
          onmousedown={handleRightHandleMouseDown}
          role="presentation"
        ></div>
      </div>
    {/if}
  </div>
</div>

<style>
  .overlay-outer {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 300px; /* Offset to align precisely with dials column */
    right: 0;
    padding: 0 10px; /* Aligns with dials-strip padding: 6px 10px */
    cursor: crosshair;
    z-index: 20;
    user-select: none;
  }

  .overlay-track {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .selection-box {
    position: absolute;
    top: 0;
    bottom: 0;
    background: var(--scrubber-bg);
    border-left: 2px dashed var(--scrubber-border);
    border-right: 2px dashed var(--scrubber-border);
    cursor: move;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 6px;
    z-index: 25;
    transition: background 0.1s ease;
  }

  .selection-box:hover {
    background: rgba(34, 197, 94, 0.2);
  }

  .selection-pill {
    background: var(--bg-surface);
    border: 1px solid var(--scrubber-border);
    box-shadow: var(--shadow-sm);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text-main);
    pointer-events: none;
    white-space: nowrap;
  }

  .handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 8px;
    cursor: ew-resize;
    z-index: 30;
  }

  .handle-left {
    left: -4px;
  }

  .handle-right {
    right: -4px;
  }

  .handle:hover {
    background: rgba(34, 197, 94, 0.4);
  }
</style>
