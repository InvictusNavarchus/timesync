<script lang="ts">
  import { syncState } from '$lib/state/timesync.svelte';
  import { getTimezoneRowData } from '$lib/domain/timezone';
  import TimeDial from './TimeDial.svelte';
  import { Home, Trash2 } from 'lucide-svelte';

  let {
    timezoneId,
    isHome
  }: {
    timezoneId: string;
    isHome: boolean;
  } = $props();

  let rowData = $derived(
    getTimezoneRowData(
      timezoneId,
      syncState.homeZone,
      syncState.selectedDate,
      syncState.timeFormat,
      syncState.meeting,
      syncState.now
    )
  );

  let diffNum = $derived(rowData.diffFromHomeHours);
</script>

<div
  class="timezone-row"
  class:is-home={isHome}
  role="group"
>
  <!-- Left Side: City Info Sidebar (340px) -->
  <div class="info-cell">
    <div class="left-meta">
      <!-- Icon or Offset (swaps with trash on hover or focus) -->
      <div class="action-slot">
        {#if isHome}
          <div class="home-icon" title="Home Timezone">
            <Home size={18} strokeWidth={1.75} />
          </div>
        {:else}
          <div
            class="diff-badge"
            class:positive={diffNum > 0}
            class:negative={diffNum < 0}
          >
            {rowData.diffFromHomeFormatted}
          </div>
          <button
            type="button"
            class="trash-btn"
            onclick={() => syncState.removeTimezone(timezoneId)}
            title="Remove timezone"
            aria-label="Remove {rowData.city} timezone"
          >
            <Trash2 size={18} strokeWidth={1.75} />
          </button>
        {/if}
      </div>

      <!-- City & Region -->
      <div class="city-details">
        <div class="city-name-line">
          <span class="city-name">{rowData.city}</span>
          <sup class="abbr-badge">{rowData.abbr}</sup>
        </div>
        <span class="region-subtext">{rowData.region}</span>
      </div>
    </div>

    <!-- Right of Info Cell: Clock & Date -->
    <div class="time-details">
      {#if rowData.meetingTimeRange}
        <div class="clock-display meeting">
          {rowData.meetingTimeRange.start} - {rowData.meetingTimeRange.end}
        </div>
        <div class="date-subtext">{rowData.meetingTimeRange.date}</div>
      {:else}
        <div class="clock-display">{rowData.currentLocalTime}</div>
        <div class="date-subtext">{rowData.currentDateFormatted}</div>
      {/if}
    </div>
  </div>

  <!-- Right Side: 768px Seamless 24-Dials Strip -->
  <div class="dials-track">
    {#each rowData.dials as dial, i}
      <TimeDial
        {dial}
        timeFormat={syncState.timeFormat}
        isFirst={i === 0}
        isLast={i === 23}
      />
    {/each}
  </div>
</div>

<style>
  .timezone-row {
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 8px;
    height: 76px;
    align-items: center;
    padding: 8px 12px;
    border-radius: 6px;
    transition: background 0.1s ease;
  }

  .timezone-row:nth-child(odd) {
    background: var(--bg-surface-alt);
  }

  .timezone-row:nth-child(even) {
    background: var(--bg-surface);
  }

  /* Info Cell (340px) */
  .info-cell {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    padding-right: 12px;
  }

  .left-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .action-slot {
    width: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;
  }

  .home-icon {
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .trash-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    transition: color 0.15s ease, opacity 0.15s ease;
    padding: 2px;
    position: absolute;
    inset: 0;
    margin: auto;
    opacity: 0;
    pointer-events: none;
  }

  .timezone-row:hover .trash-btn,
  .trash-btn:focus-visible {
    opacity: 1;
    pointer-events: auto;
  }

  .trash-btn:hover {
    color: #ef4444;
  }

  .diff-badge {
    font-size: 0.78rem;
    font-weight: 500;
    font-family: monospace;
    color: var(--text-muted);
    transition: opacity 0.15s ease;
  }

  .timezone-row:hover .diff-badge,
  .action-slot:focus-within .diff-badge {
    opacity: 0;
  }

  .diff-badge.positive {
    color: #22c55e;
  }

  .diff-badge.negative {
    color: #ef4444;
  }

  .city-details {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .city-name-line {
    display: flex;
    align-items: baseline;
    gap: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .city-name {
    font-size: 0.92rem;
    font-weight: 500;
    color: var(--text-main);
  }

  .abbr-badge {
    font-size: 0.65rem;
    color: var(--text-muted);
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    padding: 1px 4px;
    top: -0.25em;
  }

  .region-subtext {
    font-size: 0.8rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Time details on the right of info-cell */
  .time-details {
    text-align: right;
    flex-shrink: 0;
  }

  .clock-display {
    font-size: 0.88rem;
    font-weight: 600;
    font-family: monospace;
    color: var(--text-main);
    letter-spacing: -0.02em;
  }

  .clock-display.meeting {
    font-size: 0.78rem;
  }

  .date-subtext {
    font-size: 0.72rem;
    color: var(--text-muted);
    white-space: nowrap;
  }

  /* Dials Track (768px seamless width) */
  .dials-track {
    width: 768px;
    height: 38px;
    display: flex;
    align-items: center;
    border-radius: 6px;
    position: relative;
  }
</style>
