<script lang="ts">
  import { syncState } from '$lib/state/timesync.svelte';
  import type { Palette, SortStrategy, TimeFormat } from '$lib/domain/types';
  import { DateTime } from 'luxon';
  import {
    ChevronLeft,
    ChevronRight,
    Calendar,
    Share2,
    Check,
    Plus,
    X,
    ArrowUpDown
  } from 'lucide-svelte';

  let copied = $state(false);

  const formattedDate = $derived(
    DateTime.fromISO(syncState.selectedDate).toFormat('ccc, LLL d, yyyy')
  );

  const meetingDuration = $derived.by(() => {
    if (!syncState.meeting) return null;
    const diff = syncState.meeting.endHourIndex - syncState.meeting.startHourIndex;
    return diff % 1 === 0 ? `${diff}h` : `${diff.toFixed(1)}h`;
  });

  const palettes: { id: Palette; label: string; color: string }[] = [
    { id: 'gray', label: 'Gray', color: '#64748b' },
    { id: 'teal', label: 'Teal', color: '#14b8a6' },
    { id: 'indigo', label: 'Indigo', color: '#6366f1' },
    { id: 'pink', label: 'Pink', color: '#ec4899' }
  ];

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch {
      // Fallback
      prompt('Copy this link:', window.location.href);
    }
  }

  function handleDateChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.value) {
      syncState.setSelectedDate(target.value);
    }
  }
</script>

<div class="control-bar">
  <div class="control-group">
    <!-- Format Toggle -->
    <div class="segmented-control" role="group" aria-label="Time Format">
      <button
        type="button"
        class="segment-btn"
        class:active={syncState.timeFormat === '24h'}
        onclick={() => syncState.setTimeFormat('24h')}
      >
        24h
      </button>
      <button
        type="button"
        class="segment-btn"
        class:active={syncState.timeFormat === '12h'}
        onclick={() => syncState.setTimeFormat('12h')}
      >
        12h
      </button>
    </div>

    <!-- Palette Picker -->
    <div class="palette-group" role="group" aria-label="Color Palette">
      {#each palettes as pal}
        <button
          type="button"
          class="palette-swatch"
          class:active={syncState.palette === pal.id}
          style:background-color={pal.color}
          title="{pal.label} palette"
          aria-label="{pal.label} palette"
          onclick={() => syncState.setPalette(pal.id)}
        ></button>
      {/each}
    </div>

    <!-- Meeting Indicator (if active) -->
    {#if meetingDuration}
      <div class="meeting-badge">
        <span class="meeting-label">Meeting:</span>
        <span class="meeting-val">{meetingDuration}</span>
        <button
          type="button"
          class="meeting-clear-btn"
          onclick={() => syncState.clearMeeting()}
          title="Clear meeting selection"
          aria-label="Clear meeting selection"
        >
          <X size={13} />
        </button>
      </div>
    {/if}
  </div>

  <div class="control-group right-controls">
    <!-- Date Navigator -->
    <div class="date-navigator">
      <button
        type="button"
        class="icon-nav-btn"
        onclick={() => syncState.prevDay()}
        title="Previous day"
        aria-label="Previous day"
      >
        <ChevronLeft size={16} />
      </button>

      <label class="date-display" title="Click to choose a date">
        <Calendar size={14} />
        <span class="date-text">{formattedDate}</span>
        <input
          type="date"
          value={syncState.selectedDate}
          onchange={handleDateChange}
          class="hidden-date-input"
        />
      </label>

      <button
        type="button"
        class="icon-nav-btn"
        onclick={() => syncState.nextDay()}
        title="Next day"
        aria-label="Next day"
      >
        <ChevronRight size={16} />
      </button>

      <button
        type="button"
        class="today-btn"
        onclick={() => syncState.today()}
        title="Jump to today"
      >
        Today
      </button>
    </div>

    <!-- Sorting Strategy -->
    <div class="sort-select-wrapper">
      <ArrowUpDown size={14} class="sort-icon" />
      <select
        value={syncState.sortStrategy}
        onchange={(e) => syncState.setSortStrategy((e.target as HTMLSelectElement).value as SortStrategy)}
        class="sort-select"
        aria-label="Sort timezones"
      >
        <option value="custom">Custom Order</option>
        <option value="offset-asc">West → East (Offset Asc)</option>
        <option value="offset-desc">East → West (Offset Desc)</option>
        <option value="name">City Name (A–Z)</option>
      </select>
    </div>

    <!-- Share Link -->
    <button
      type="button"
      class="action-btn"
      class:copied
      onclick={copyShareUrl}
      title="Copy shareable link"
    >
      {#if copied}
        <Check size={15} />
        <span>Copied!</span>
      {:else}
        <Share2 size={15} />
        <span>Share</span>
      {/if}
    </button>

    <!-- Add Timezone Button -->
    <button
      type="button"
      class="action-btn primary"
      onclick={() => (syncState.searchOpen = true)}
    >
      <Plus size={16} />
      <span>Add City</span>
    </button>
  </div>
</div>

<style>
  .control-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 0.6rem 1rem;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    box-shadow: var(--shadow-sm);
    margin-bottom: 1.25rem;
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  /* Segmented format control */
  .segmented-control {
    display: flex;
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    padding: 2px;
  }

  .segment-btn {
    border: none;
    background: transparent;
    padding: 4px 10px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .segment-btn.active {
    background: var(--bg-surface);
    color: var(--text-main);
    box-shadow: var(--shadow-sm);
  }

  /* Palette Swatches */
  .palette-group {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 4px;
  }

  .palette-swatch {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 0.15s ease, border-color 0.15s ease;
    padding: 0;
  }

  .palette-swatch:hover {
    transform: scale(1.15);
  }

  .palette-swatch.active {
    border-color: var(--text-main);
    transform: scale(1.1);
  }

  /* Meeting Badge */
  .meeting-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    border-radius: 6px;
    background: var(--scrubber-bg);
    border: 1px solid var(--scrubber-border);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .meeting-label {
    color: var(--text-muted);
  }

  .meeting-val {
    color: var(--text-main);
  }

  .meeting-clear-btn {
    display: flex;
    align-items: center;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    padding: 1px;
    border-radius: 3px;
  }

  .meeting-clear-btn:hover {
    color: #ef4444;
  }

  /* Date Navigator */
  .date-navigator {
    display: flex;
    align-items: center;
    gap: 3px;
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    padding: 2px 4px;
  }

  .icon-nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--text-muted);
    cursor: pointer;
  }

  .icon-nav-btn:hover {
    background: var(--bg-surface);
    color: var(--text-main);
  }

  .date-display {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-main);
    cursor: pointer;
    border-radius: 4px;
  }

  .date-display:hover {
    background: var(--bg-surface);
  }

  .hidden-date-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
    width: 100%;
  }

  .today-btn {
    border: none;
    background: transparent;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-muted);
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
  }

  .today-btn:hover {
    background: var(--bg-surface);
    color: var(--text-main);
  }

  /* Sort dropdown */
  .sort-select-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  :global(.sort-icon) {
    position: absolute;
    left: 8px;
    color: var(--text-muted);
    pointer-events: none;
  }

  .sort-select {
    appearance: none;
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    padding: 6px 12px 6px 28px;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-main);
    cursor: pointer;
  }

  .sort-select:focus {
    outline: none;
    border-color: var(--border-strong);
  }

  /* Action buttons */
  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 6px;
    border: 1px solid var(--border-subtle);
    background: var(--bg-surface-alt);
    color: var(--text-main);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .action-btn:hover {
    background: var(--bg-surface);
    border-color: var(--border-strong);
  }

  .action-btn.copied {
    border-color: #22c55e;
    color: #16a34a;
  }

  .action-btn.primary {
    background: var(--text-main);
    color: var(--bg-surface);
    border-color: transparent;
  }

  .action-btn.primary:hover {
    opacity: 0.9;
  }

  @media (max-width: 900px) {
    .control-bar {
      flex-direction: column;
      align-items: stretch;
    }
    .right-controls {
      justify-content: space-between;
    }
  }
</style>
