<script lang="ts">
  import { syncState } from '$lib/state/timesync.svelte';
  import { getTimezoneRowData } from '$lib/domain/timezone';
  import TimeDial from './TimeDial.svelte';
  import {
    Home,
    Trash2,
    ArrowUpCircle,
    ChevronUp,
    ChevronDown
  } from 'lucide-svelte';

  let {
    timezoneId,
    isHome,
    rowIndex,
    totalRows
  }: {
    timezoneId: string;
    isHome: boolean;
    rowIndex: number;
    totalRows: number;
  } = $props();

  let rowData = $derived(
    getTimezoneRowData(
      timezoneId,
      syncState.homeZone,
      syncState.selectedDate,
      syncState.timeFormat
    )
  );
</script>

<div class="tz-row" class:is-home={isHome}>
  <!-- Left Side: City Info Sidebar (300px) -->
  <div class="info-cell">
    <div class="row-actions">
      {#if isHome}
        <span class="home-indicator" title="Home Timezone">
          <Home size={16} />
        </span>
      {:else}
        <button
          type="button"
          class="action-btn make-home"
          onclick={() => syncState.setHome(timezoneId)}
          title="Set as home timezone"
          aria-label="Set as home timezone"
        >
          <ArrowUpCircle size={15} />
        </button>

        {#if rowIndex > 0}
          <button
            type="button"
            class="action-btn"
            onclick={() => syncState.moveTimezone(rowIndex, 'up')}
            title="Move up"
            aria-label="Move up"
          >
            <ChevronUp size={14} />
          </button>
        {/if}

        {#if rowIndex < totalRows - 1}
          <button
            type="button"
            class="action-btn"
            onclick={() => syncState.moveTimezone(rowIndex, 'down')}
            title="Move down"
            aria-label="Move down"
          >
            <ChevronDown size={14} />
          </button>
        {/if}

        <button
          type="button"
          class="action-btn danger"
          onclick={() => syncState.removeTimezone(timezoneId)}
          title="Remove timezone"
          aria-label="Remove timezone"
        >
          <Trash2 size={14} />
        </button>
      {/if}
    </div>

    <div class="labels">
      <div class="city-name" title={rowData.city}>{rowData.city}</div>
      <div class="region-label">{rowData.region} • {rowData.abbr}</div>
    </div>

    <div class="time-meta">
      <div class="live-clock">{rowData.currentLocalTime}</div>
      <div
        class="offset-diff"
        class:plus={rowData.diffFromHomeHours > 0}
        class:minus={rowData.diffFromHomeHours < 0}
      >
        {rowData.diffFromHomeFormatted}
      </div>
    </div>
  </div>

  <!-- Right Side: 24 Dials CSS Grid -->
  <div class="dials-strip">
    {#each rowData.dials as dial, i}
      <TimeDial {dial} timeFormat={syncState.timeFormat} />
    {/each}
  </div>
</div>

<style>
  .tz-row {
    display: grid;
    grid-template-columns: 300px 1fr;
    align-items: stretch;
    border-bottom: 1px solid var(--border-subtle);
    background: var(--bg-surface);
    transition: background 0.1s ease;
  }

  .tz-row:hover {
    background: var(--bg-surface-alt);
  }

  .tz-row.is-home {
    background: var(--bg-surface);
    border-left: 3px solid var(--text-main);
  }

  /* Left Info Sidebar */
  .info-cell {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
    border-right: 1px solid var(--border-subtle);
    overflow: hidden;
  }

  .row-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }

  .home-indicator {
    color: var(--text-main);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    background: transparent;
    border-radius: 4px;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.1s ease, background 0.1s ease;
  }

  .action-btn:hover {
    color: var(--text-main);
    background: var(--border-subtle);
  }

  .action-btn.make-home:hover {
    color: #22c55e;
  }

  .action-btn.danger:hover {
    color: #ef4444;
  }

  .labels {
    flex: 1;
    min-width: 0;
  }

  .city-name {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .region-label {
    font-size: 0.68rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .time-meta {
    text-align: right;
    flex-shrink: 0;
  }

  .live-clock {
    font-size: 0.82rem;
    font-weight: 600;
    font-family: monospace;
    color: var(--text-main);
  }

  .offset-diff {
    font-size: 0.68rem;
    font-weight: 500;
    color: var(--text-muted);
  }

  .offset-diff.plus {
    color: #16a34a;
  }

  .offset-diff.minus {
    color: #ef4444;
  }

  /* Right Dials Grid */
  .dials-strip {
    display: grid;
    grid-template-columns: repeat(24, 1fr);
    gap: 2px;
    padding: 6px 10px;
    position: relative;
    align-items: center;
  }
</style>
