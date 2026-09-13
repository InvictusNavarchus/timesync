<script lang="ts">
  import { syncState } from '$lib/state/timesync.svelte';
  import TimezoneRow from './TimezoneRow.svelte';
  import { Plus, Trash } from 'lucide-svelte';
  import { DateTime } from 'luxon';
  import { onDestroy, onMount } from 'svelte';

  let nowHome = $state(DateTime.now().setZone(syncState.homeZone));
  let liveTimer: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    liveTimer = setInterval(() => {
      nowHome = DateTime.now().setZone(syncState.homeZone);
    }, 15000);
  });

  onDestroy(() => {
    if (liveTimer) clearInterval(liveTimer);
  });

  // Current time needle position (0% to 100% across the 24-hour strip)
  let nowPercent = $derived.by(() => {
    // Only show needle if selectedDate matches home's current date
    const homeToday = nowHome.toISODate();
    if (syncState.selectedDate !== homeToday) return null;
    const minutesInDay = nowHome.hour * 60 + nowHome.minute;
    return (minutesInDay / 1440) * 100;
  });

  const hourTicks = Array.from({ length: 24 }, (_, i) => i);
</script>

<div class="board-wrapper">
  <div class="board-card">
    <!-- Top Ruler Header -->
    <div class="board-ruler">
      <div class="ruler-info">
        <span class="ruler-title">Timezone / City</span>
      </div>
      <div class="ruler-dials">
        {#each hourTicks as hour}
          <div class="ruler-tick">
            {syncState.timeFormat === '24h'
              ? String(hour).padStart(2, '0')
              : hour === 0
                ? '12a'
                : hour < 12
                  ? `${hour}a`
                  : hour === 12
                    ? '12p'
                    : `${hour - 12}p`}
          </div>
        {/each}
      </div>
    </div>

    <!-- Rows with relative positioning for overlays -->
    <div class="rows-container">
      {#each syncState.sortedTimezones as tzId, index (tzId)}
        <TimezoneRow
          timezoneId={tzId}
          isHome={tzId === syncState.homeZone}
          rowIndex={index}
          totalRows={syncState.sortedTimezones.length}
        />
      {/each}

      <!-- Current Live Time Needle (Home timezone) -->
      {#if nowPercent !== null}
        <div class="now-needle-track">
          <div
            class="now-needle"
            style:left="{nowPercent}%"
            title="Current time ({nowHome.toFormat('HH:mm')})"
          >
            <div class="now-pin"></div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Board Footer / Stats -->
    <div class="board-footer">
      <div class="stats-text">
        <span>{syncState.sortedTimezones.length} timezones displayed</span>
        <span class="bullet">•</span>
        <span>Home: <strong>{syncState.homeZone}</strong></span>
      </div>

      <div class="footer-actions">
        <button
          type="button"
          class="footer-btn"
          onclick={() => (syncState.searchOpen = true)}
        >
          <Plus size={14} />
          <span>Add Timezone</span>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .board-wrapper {
    width: 100%;
    overflow-x: auto;
    margin-bottom: 2rem;
  }

  .board-card {
    min-width: 960px;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }

  /* Ruler Header */
  .board-ruler {
    display: grid;
    grid-template-columns: 300px 1fr;
    background: var(--bg-surface-alt);
    border-bottom: 1px solid var(--border-subtle);
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-muted);
  }

  .ruler-info {
    padding: 8px 14px;
    border-right: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
  }

  .ruler-title {
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .ruler-dials {
    display: grid;
    grid-template-columns: repeat(24, 1fr);
    gap: 2px;
    padding: 6px 10px;
    text-align: center;
  }

  .ruler-tick {
    font-variant-numeric: tabular-nums;
  }

  /* Rows & Overlays */
  .rows-container {
    position: relative;
    display: flex;
    flex-direction: column;
  }

  /* Now Needle Indicator */
  .now-needle-track {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 300px; /* Offset past the 300px sidebar */
    right: 0;
    pointer-events: none;
    z-index: 10;
  }

  .now-needle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #ef4444;
    transform: translateX(-50%);
  }

  .now-pin {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ef4444;
    position: absolute;
    top: -4px;
    left: -3px;
  }

  /* Board Footer */
  .board-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: var(--bg-surface-alt);
    border-top: 1px solid var(--border-subtle);
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .stats-text {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .bullet {
    opacity: 0.5;
  }

  .footer-actions {
    display: flex;
    gap: 8px;
  }

  .footer-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: 5px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-main);
    cursor: pointer;
  }

  .footer-btn:hover {
    border-color: var(--border-strong);
  }
</style>
