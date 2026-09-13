<script lang="ts">
  import { syncState } from '$lib/state/timesync.svelte';
  import { onDestroy } from 'svelte';

  const DEFAULT_DIAL_WIDTH = 32; // 32px per hour
  const HALF_DIAL_WIDTH = 16;    // 16px per 30 minutes
  const TOTAL_DIALS_WIDTH = 768; // 24 * 32px

  let trackRef = $state<HTMLDivElement | null>(null);

  let isLocked = $state(false);
  let isDragging = $state(false);
  let dragSide = $state<'left' | 'right' | 'box' | null>(null);
  let mouseX = $state(0);
  let windowWidth = $state(DEFAULT_DIAL_WIDTH);
  let dragStartX = $state(0);
  let initialMouseX = $state(0);
  let initialWidth = $state(DEFAULT_DIAL_WIDTH);

  // Sync state when meeting is set via URL or initialized
  $effect(() => {
    if (syncState.meeting) {
      const startPx = (syncState.meeting.startHourIndex) * DEFAULT_DIAL_WIDTH;
      const widthPx = (syncState.meeting.endHourIndex - syncState.meeting.startHourIndex) * DEFAULT_DIAL_WIDTH;
      mouseX = startPx;
      windowWidth = Math.max(HALF_DIAL_WIDTH, widthPx);
      isLocked = true;
    } else if (!isDragging && isLocked) {
      isLocked = false;
    }
  });

  function getSnappedX(clientX: number): number {
    if (!trackRef) return 0;
    const rect = trackRef.getBoundingClientRect();
    const rawX = Math.max(0, Math.min(TOTAL_DIALS_WIDTH - DEFAULT_DIAL_WIDTH, clientX - rect.left));
    const dialIndex = Math.floor(rawX / DEFAULT_DIAL_WIDTH);
    return dialIndex * DEFAULT_DIAL_WIDTH;
  }

  function handleTrackMouseMove(e: MouseEvent) {
    if (isLocked || isDragging) return;
    mouseX = getSnappedX(e.clientX);
    windowWidth = DEFAULT_DIAL_WIDTH;
  }

  function handleTrackMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;

    if (!isLocked) {
      // Lock into place
      const snapped = getSnappedX(e.clientX);
      mouseX = snapped;
      windowWidth = DEFAULT_DIAL_WIDTH;
      isLocked = true;
      commitMeetingState();
    } else {
      // Click outside while locked clears selection
      isLocked = false;
      syncState.clearMeeting();
    }
  }

  function handleBoxMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();

    isDragging = true;
    dragSide = 'box';
    dragStartX = e.clientX;
    initialMouseX = mouseX;
    initialWidth = windowWidth;

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
  }

  function handleResizeMouseDown(e: MouseEvent, side: 'left' | 'right') {
    if (e.button !== 0) return;
    e.stopPropagation();

    isDragging = true;
    dragSide = side;
    dragStartX = e.clientX;
    initialMouseX = mouseX;
    initialWidth = windowWidth;

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
  }

  function handleGlobalMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;

    if (dragSide === 'box') {
      const snappedDelta = Math.round(dx / HALF_DIAL_WIDTH) * HALF_DIAL_WIDTH;
      const newX = Math.max(0, Math.min(TOTAL_DIALS_WIDTH - windowWidth, initialMouseX + snappedDelta));
      mouseX = newX;
      commitMeetingState();
    } else if (dragSide === 'right') {
      const snappedDelta = Math.round(dx / HALF_DIAL_WIDTH) * HALF_DIAL_WIDTH;
      const newWidth = Math.max(HALF_DIAL_WIDTH, Math.min(TOTAL_DIALS_WIDTH - mouseX, initialWidth + snappedDelta));
      windowWidth = newWidth;
      commitMeetingState();
    } else if (dragSide === 'left') {
      const snappedDelta = Math.round(dx / HALF_DIAL_WIDTH) * HALF_DIAL_WIDTH;
      const potentialNewX = initialMouseX + snappedDelta;
      const potentialWidth = initialWidth - snappedDelta;
      if (potentialNewX >= 0 && potentialWidth >= HALF_DIAL_WIDTH) {
        mouseX = potentialNewX;
        windowWidth = potentialWidth;
        commitMeetingState();
      }
    }
  }

  function handleGlobalMouseUp() {
    isDragging = false;
    dragSide = null;
    commitMeetingState();
    window.removeEventListener('mousemove', handleGlobalMouseMove);
    window.removeEventListener('mouseup', handleGlobalMouseUp);
  }

  function commitMeetingState() {
    const startHour = mouseX / DEFAULT_DIAL_WIDTH;
    const endHour = (mouseX + windowWidth) / DEFAULT_DIAL_WIDTH;
    syncState.setMeeting({
      startHourIndex: startHour,
      endHourIndex: endHour
    });
  }

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  });
</script>

<!-- The overlay container is aligned with the 768px dials column -->
<div
  class="overlay-container"
  onmousemove={handleTrackMouseMove}
  onmousedown={handleTrackMouseDown}
  role="presentation"
>
  <div class="overlay-track" bind:this={trackRef}>
    <div
      class="selection-frame"
      class:is-locked={isLocked}
      style:left="{mouseX}px"
      style:width="{windowWidth}px"
      onmousedown={handleBoxMouseDown}
      role="presentation"
    >
      <!-- Left resize handle -->
      <div
        class="resize-handle left"
        onmousedown={(e) => handleResizeMouseDown(e, 'left')}
        role="presentation"
      ></div>

      <!-- Right resize handle -->
      <div
        class="resize-handle right"
        onmousedown={(e) => handleResizeMouseDown(e, 'right')}
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
    z-index: 25;
  }

  .resize-handle.left {
    left: -4px;
  }

  .resize-handle.right {
    right: -4px;
  }
</style>
