<script lang="ts">
  import { syncState } from '$lib/state/timesync.svelte';
  import { DateTime } from 'luxon';
  import { onDestroy, onMount } from 'svelte';

  const DEFAULT_DIAL_WIDTH = 32; // 32px per hour
  const HALF_DIAL_WIDTH = 16;    // 16px per 30 minutes
  const TOTAL_DIALS_WIDTH = 768; // 24 * 32px

  let trackRef = $state<HTMLDivElement | null>(null);

  function getHomeCurrentHour(): number {
    try {
      const now = DateTime.now().setZone(syncState.homeZone);
      return now.isValid ? now.hour : 0;
    } catch {
      return 0;
    }
  }

  let isLocked = $state(false);
  let isDragging = $state(false);
  let dragSide = $state<'left' | 'right' | 'box' | null>(null);
  let mouseX = $state(getHomeCurrentHour() * DEFAULT_DIAL_WIDTH);
  let windowWidth = $state(DEFAULT_DIAL_WIDTH);
  let dragStartX = $state(0);
  let initialMouseX = $state(0);
  let initialWidth = $state(DEFAULT_DIAL_WIDTH);

  // Sync state when meeting is set via URL or initialized
  $effect(() => {
    if (syncState.meeting) {
      const startPx = syncState.meeting.startHourIndex * DEFAULT_DIAL_WIDTH;
      const widthPx = (syncState.meeting.endHourIndex - syncState.meeting.startHourIndex) * DEFAULT_DIAL_WIDTH;
      mouseX = startPx;
      windowWidth = Math.max(HALF_DIAL_WIDTH, widthPx);
      isLocked = true;
    } else if (!isDragging) {
      isLocked = false;
      // When no meeting is active, default highlight is home's current hour
      mouseX = getHomeCurrentHour() * DEFAULT_DIAL_WIDTH;
      windowWidth = DEFAULT_DIAL_WIDTH;
    }
  });

  // Keep home hour highlight updated every 30 seconds if unlocked
  let clockInterval: ReturnType<typeof setInterval> | null = null;
  onMount(() => {
    clockInterval = setInterval(() => {
      if (!isLocked && !isDragging) {
        mouseX = getHomeCurrentHour() * DEFAULT_DIAL_WIDTH;
      }
    }, 30000);
  });

  function getSnappedX(clientX: number): number {
    if (!trackRef) return 0;
    const rect = trackRef.getBoundingClientRect();
    const rawX = Math.max(0, Math.min(TOTAL_DIALS_WIDTH - DEFAULT_DIAL_WIDTH, clientX - rect.left));
    const dialIndex = Math.floor(rawX / DEFAULT_DIAL_WIDTH);
    return dialIndex * DEFAULT_DIAL_WIDTH;
  }

  function handleTrackPointerMove(e: PointerEvent) {
    if (isLocked || isDragging) return;
    mouseX = getSnappedX(e.clientX);
    windowWidth = DEFAULT_DIAL_WIDTH;
  }

  function handleTrackPointerLeave() {
    if (isLocked || isDragging) return;
    // Snap back to home's current hour on pointer leave
    mouseX = getHomeCurrentHour() * DEFAULT_DIAL_WIDTH;
    windowWidth = DEFAULT_DIAL_WIDTH;
  }

  function handleTrackPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;

    if (!isLocked) {
      // Lock into place
      const snapped = getSnappedX(e.clientX);
      mouseX = snapped;
      windowWidth = DEFAULT_DIAL_WIDTH;
      isLocked = true;
      commitMeetingState(true);
    } else {
      // Click outside while locked clears selection
      isLocked = false;
      syncState.clearMeeting();
      mouseX = getHomeCurrentHour() * DEFAULT_DIAL_WIDTH;
      windowWidth = DEFAULT_DIAL_WIDTH;
    }
  }

  function handleBoxPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();

    isDragging = true;
    dragSide = 'box';
    dragStartX = e.clientX;
    initialMouseX = mouseX;
    initialWidth = windowWidth;

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
  }

  function handleResizePointerDown(e: PointerEvent, side: 'left' | 'right') {
    if (e.button !== 0) return;
    e.stopPropagation();

    isDragging = true;
    dragSide = side;
    dragStartX = e.clientX;
    initialMouseX = mouseX;
    initialWidth = windowWidth;

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
  }

  function handleGlobalPointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;

    if (dragSide === 'box') {
      const snappedDelta = Math.round(dx / HALF_DIAL_WIDTH) * HALF_DIAL_WIDTH;
      const newX = Math.max(0, Math.min(TOTAL_DIALS_WIDTH - windowWidth, initialMouseX + snappedDelta));
      mouseX = newX;
      commitMeetingState(false);
    } else if (dragSide === 'right') {
      const snappedDelta = Math.round(dx / HALF_DIAL_WIDTH) * HALF_DIAL_WIDTH;
      const newWidth = Math.max(HALF_DIAL_WIDTH, Math.min(TOTAL_DIALS_WIDTH - mouseX, initialWidth + snappedDelta));
      windowWidth = newWidth;
      commitMeetingState(false);
    } else if (dragSide === 'left') {
      const snappedDelta = Math.round(dx / HALF_DIAL_WIDTH) * HALF_DIAL_WIDTH;
      const potentialNewX = initialMouseX + snappedDelta;
      const potentialWidth = initialWidth - snappedDelta;
      if (potentialNewX >= 0 && potentialWidth >= HALF_DIAL_WIDTH) {
        mouseX = potentialNewX;
        windowWidth = potentialWidth;
        commitMeetingState(false);
      }
    }
  }

  function handleGlobalPointerUp() {
    isDragging = false;
    dragSide = null;
    commitMeetingState(true);
    window.removeEventListener('pointermove', handleGlobalPointerMove);
    window.removeEventListener('pointerup', handleGlobalPointerUp);
  }

  function commitMeetingState(syncUrl = true) {
    const startHour = mouseX / DEFAULT_DIAL_WIDTH;
    const endHour = (mouseX + windowWidth) / DEFAULT_DIAL_WIDTH;
    syncState.setMeeting(
      {
        startHourIndex: startHour,
        endHourIndex: endHour
      },
      syncUrl
    );
  }

  onDestroy(() => {
    if (clockInterval) clearInterval(clockInterval);
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    }
  });
</script>

<!-- The overlay container is aligned with the 768px dials column -->
<div
  class="overlay-container"
  onpointermove={handleTrackPointerMove}
  onpointerleave={handleTrackPointerLeave}
  onpointerdown={handleTrackPointerDown}
  role="presentation"
>
  <div class="overlay-track" bind:this={trackRef}>
    <div
      class="selection-frame"
      class:is-locked={isLocked}
      style:left="{mouseX}px"
      style:width="{windowWidth}px"
      onpointerdown={handleBoxPointerDown}
      role="presentation"
    >
      <!-- Left resize handle -->
      <div
        class="resize-handle left"
        onpointerdown={(e) => handleResizePointerDown(e, 'left')}
        role="presentation"
      ></div>

      <!-- Right resize handle -->
      <div
        class="resize-handle right"
        onpointerdown={(e) => handleResizePointerDown(e, 'right')}
        role="presentation"
      ></div>
    </div>
  </div>
</div>

<style>
  .overlay-container {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 360px; /* Aligned with 340px sidebar + 8px gap + 12px padding */
    width: 768px;
    cursor: pointer;
    z-index: 20;
    user-select: none;
  }

  .overlay-track {
    position: relative;
    width: 100%;
    height: 100%;
  }

  /* Red dotted border matching original */
  .selection-frame {
    position: absolute;
    top: 0;
    bottom: 0;
    border: 2px dotted #ef4444;
    border-radius: 6px;
    pointer-events: all;
    cursor: grab;
    touch-action: none;
    transition: border-color 0.15s ease;
    background: rgba(239, 68, 68, 0.04);
  }

  .selection-frame.is-locked {
    border-color: #22c55e;
    background: rgba(34, 197, 94, 0.05);
  }

  /* Resize handles */
  .resize-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 8px;
    cursor: ew-resize;
    touch-action: none;
    z-index: 25;
  }

  .resize-handle.left {
    left: -4px;
  }

  .resize-handle.right {
    right: -4px;
  }
</style>
