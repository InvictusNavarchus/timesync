<script lang="ts">
  import { syncState } from '$lib/state/timesync.svelte';
  import { getConsecutiveDates } from '$lib/domain/timezone';
  import { searchTimezones, getTimezoneSearchItem, type TimezoneSearchItem } from '$lib/domain/search';
  import type { Palette, SortStrategy } from '$lib/domain/types';
  import type { SavedPreset } from '$lib/state/persistence';
  import { exportStateJson, importStateJson } from '$lib/state/persistence';
  import { DateTime } from 'luxon';
  import {
    Calendar as CalendarIcon,
    Copy,
    Check,
    Search,
    Paintbrush,
    ArrowUpDown,
    ArrowLeftToLine,
    ArrowRightToLine,
    X,
    Clock,
    Bookmark,
    Plus,
    Trash2,
    Download,
    Upload
  } from 'lucide-svelte';

  // Search state
  let searchQuery = $state('');
  let isSearchFocused = $state(false);

  // Palette popup state
  let isPaletteOpen = $state(false);

  // Sort popup state
  let isSortOpen = $state(false);

  const sortOptions: { id: SortStrategy; label: string }[] = [
    { id: 'custom', label: 'Order Added' },
    { id: 'offset-asc', label: 'West → East (Ascending)' },
    { id: 'offset-desc', label: 'East → West (Descending)' },
    { id: 'name', label: 'City Name (A–Z)' }
  ];

  // Copy URL state
  let isCopied = $state(false);

  // Date state
  const consecutiveDates = $derived(getConsecutiveDates(syncState.selectedDate, 4));
  const currentMonthLabel = $derived(
    DateTime.fromISO(syncState.selectedDate).toFormat('LLL')
  );

  // Meeting minutes
  const totalMeetingMinutes = $derived.by(() => {
    if (!syncState.meeting) return 0;
    return Math.round((syncState.meeting.endHourIndex - syncState.meeting.startHourIndex) * 60);
  });

  // Search results
  const searchResults = $derived(searchTimezones(searchQuery, 15));
  const recentItems = $derived(
    syncState.recents
      .filter((id) => DateTime.now().setZone(id).isValid)
      .map((id) => getTimezoneSearchItem(id))
  );

  const paletteOptions: { id: Palette; color: string }[] = [
    { id: 'gray', color: '#71717a' },
    { id: 'teal', color: '#14b8a6' },
    { id: 'indigo', color: '#6366f1' },
    { id: 'pink', color: '#ec4899' },
    { id: 'blue', color: '#3b82f6' },
    { id: 'purple', color: '#a855f7' }
  ];

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      isCopied = true;
      setTimeout(() => (isCopied = false), 1200);
    } catch {
      prompt('Copy URL:', window.location.href);
    }
  }

  function handleAddSearched(item: TimezoneSearchItem) {
    syncState.addTimezone(item.id);
    searchQuery = '';
    isSearchFocused = false;
  }

  function handleDateInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.value) {
      syncState.setSelectedDate(input.value);
    }
  }

  // Presets state
  let isPresetsOpen = $state(false);
  let newPresetName = $state('');
  let pinCurrentDate = $state(false);

  function handleSavePreset() {
    syncState.savePreset(newPresetName, pinCurrentDate);
    newPresetName = '';
    pinCurrentDate = false;
  }

  function handleLoadPreset(preset: SavedPreset) {
    syncState.loadPreset(preset);
    isPresetsOpen = false;
  }

  function handleExportJson() {
    const state = syncState.getExportState();
    const jsonStr = exportStateJson(state);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = DateTime.now().toISODate() || 'backup';
    a.download = `timesync-backup-${dateStr}.json`;
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  async function handleImportJson(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = importStateJson(text);
      if (res.success && res.state) {
        syncState.importBackup(res.state);
        isPresetsOpen = false;
      } else {
        alert(res.error || 'Failed to import backup file.');
      }
    } catch {
      alert('Failed to read backup file.');
    } finally {
      target.value = '';
    }
  }
</script>

<svelte:window onclick={(e) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.search-box')) {
    isSearchFocused = false;
  }
  if (!target.closest('.palette-picker-container')) {
    isPaletteOpen = false;
  }
  if (!target.closest('.sort-picker-container')) {
    isSortOpen = false;
  }
  if (!target.closest('.presets-menu-container')) {
    isPresetsOpen = false;
  }
}} />

<div class="menu-bar">
  <!-- Left Controller Box -->
  <div class="controller-card">
    <!-- Sub-left: Format Toggle + Palette + Meeting Minutes (340px) -->
    <div class="controller-left">
      <div class="format-and-palette">
        <!-- 24 / 12 Toggle -->
        <div class="hours-toggle">
          <button
            type="button"
            class="toggle-btn"
            class:active={syncState.timeFormat === '24h'}
            onclick={() => syncState.setTimeFormat('24h')}
          >
            24
          </button>
          <button
            type="button"
            class="toggle-btn"
            class:active={syncState.timeFormat === '12h'}
            onclick={() => syncState.setTimeFormat('12h')}
          >
            12
          </button>
        </div>

        <!-- Paintbrush Palette Picker -->
        <div class="palette-picker-container">
          <button
            type="button"
            class="palette-btn"
            onclick={() => (isPaletteOpen = !isPaletteOpen)}
            title="Change dial color palette"
          >
            <Paintbrush size={18} />
          </button>

          {#if isPaletteOpen}
            <div class="palette-dropdown">
              {#each paletteOptions as pal}
                <button
                  type="button"
                  class="palette-dot"
                  class:active={syncState.palette === pal.id}
                  style:background-color={pal.color}
                  onclick={() => {
                    syncState.setPalette(pal.id);
                    isPaletteOpen = false;
                  }}
                  title={pal.id}
                ></button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Sort Strategy Picker -->
        <div class="sort-picker-container">
          <button
            type="button"
            class="sort-btn"
            class:active={syncState.sortStrategy !== 'custom'}
            onclick={() => (isSortOpen = !isSortOpen)}
            title="Sort timezones"
          >
            <ArrowUpDown size={16} />
          </button>

          {#if isSortOpen}
            <div class="sort-dropdown">
              {#each sortOptions as opt}
                <button
                  type="button"
                  class="sort-option-btn"
                  class:active={syncState.sortStrategy === opt.id}
                  onclick={() => {
                    syncState.setSortStrategy(opt.id);
                    isSortOpen = false;
                  }}
                >
                  <span class="sort-option-label">{opt.label}</span>
                  {#if syncState.sortStrategy === opt.id}
                    <Check size={14} class="sort-check-icon" />
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Meeting Minutes Indicator -->
      {#if totalMeetingMinutes > 0}
        <div class="meeting-minutes">
          <ArrowLeftToLine size={13} class="meeting-arrow" />
          <span class="meeting-num">{totalMeetingMinutes}</span>
          <ArrowRightToLine size={13} class="meeting-arrow" />
          <button
            type="button"
            class="meeting-close-btn"
            onclick={() => syncState.clearMeeting()}
            title="Clear meeting"
          >
            <X size={11} />
          </button>
        </div>
      {/if}
    </div>

    <!-- Sub-right: Calendar + 4 Date Dials + Copy URL -->
    <div class="controller-right">
      <div class="date-dials-group">
        <!-- Calendar icon button with stamped month -->
        <label class="calendar-btn" title="Pick another date">
          <span class="cal-month-stamp">{currentMonthLabel}</span>
          <CalendarIcon size={24} strokeWidth={1.5} />
          <input
            type="date"
            value={syncState.selectedDate}
            onchange={handleDateInput}
            class="hidden-native-date"
          />
        </label>

        <!-- 4 Consecutive Date Dials -->
        <div class="date-pills">
          {#each consecutiveDates as d}
            {@const isSelected = d.iso === syncState.selectedDate}
            <button
              type="button"
              class="date-dial-btn"
              class:active={isSelected}
              onclick={() => syncState.setSelectedDate(d.iso)}
            >
              <span class="dial-day-num">{d.dayNum}</span>
              <span class="dial-day-dow">{d.dow}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Actions Group: Presets & Copy URL -->
      <div class="actions-group">
        <!-- Presets Menu Container -->
        <div class="presets-menu-container">
          <button
            type="button"
            class="preset-menu-btn"
            class:active={isPresetsOpen}
            onclick={() => (isPresetsOpen = !isPresetsOpen)}
            title="Saved Boards & Presets"
          >
            <Bookmark size={12} strokeWidth={2} />
            <span>Boards</span>
            {#if syncState.presets.length > 0}
              <span class="preset-badge">{syncState.presets.length}</span>
            {/if}
          </button>

          {#if isPresetsOpen}
            <div class="presets-dropdown">
              <div class="presets-header">
                <span class="presets-heading">Saved Boards</span>
              </div>

              <!-- Save current board section -->
              <div class="preset-save-section">
                <div class="preset-save-row">
                  <input
                    type="text"
                    bind:value={newPresetName}
                    placeholder="New board name..."
                    class="preset-name-input"
                    onkeydown={(e) => {
                      if (e.key === 'Enter') handleSavePreset();
                    }}
                  />
                  <button
                    type="button"
                    class="preset-save-btn"
                    onclick={handleSavePreset}
                    title="Save current board"
                  >
                    <Plus size={13} />
                    <span>Save</span>
                  </button>
                </div>
                <label class="preset-pin-label">
                  <input
                    type="checkbox"
                    bind:checked={pinCurrentDate}
                    class="preset-pin-checkbox"
                  />
                  <span>Pin current date ({syncState.selectedDate})</span>
                </label>
              </div>

              <!-- Presets list -->
              <div class="presets-list">
                {#if syncState.presets.length === 0}
                  <div class="presets-empty">No saved boards yet</div>
                {:else}
                  {#each syncState.presets as preset (preset.id)}
                    <div class="preset-item">
                      <button
                        type="button"
                        class="preset-load-btn"
                        onclick={() => handleLoadPreset(preset)}
                      >
                        <span class="preset-title">{preset.name}</span>
                        <span class="preset-meta">
                          {preset.timezones.length} {preset.timezones.length === 1 ? 'zone' : 'zones'}
                          {#if preset.meeting}
                            · {Math.round((preset.meeting.endHourIndex - preset.meeting.startHourIndex) * 60)}m meet
                          {/if}
                          {#if preset.pinnedDate}
                            · {preset.pinnedDate}
                          {/if}
                        </span>
                      </button>
                      <button
                        type="button"
                        class="preset-del-btn"
                        onclick={() => syncState.deletePreset(preset.id)}
                        title="Delete board"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  {/each}
                {/if}
              </div>

              <!-- Backup / Tools Footer -->
              <div class="presets-footer">
                <button
                  type="button"
                  class="preset-tool-btn"
                  onclick={handleExportJson}
                  title="Export all boards & settings"
                >
                  <Download size={12} />
                  <span>Export</span>
                </button>
                <label class="preset-tool-btn" title="Import backup JSON">
                  <Upload size={12} />
                  <span>Import</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onchange={handleImportJson}
                    class="hidden-file-input"
                  />
                </label>
              </div>
            </div>
          {/if}
        </div>

        <!-- Copy URL button -->
        <button
          type="button"
          class="copy-url-btn"
          class:copied={isCopied}
          onclick={handleCopyUrl}
          title="Copy shareable link"
        >
          {#if isCopied}
            <Check size={13} />
            <span>Copied</span>
          {:else}
            <Copy size={11} strokeWidth={2} />
            <span>URL</span>
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Right: 300px Inline Search Bar -->
  <div class="search-box">
    <input
      type="text"
      bind:value={searchQuery}
      onfocus={() => (isSearchFocused = true)}
      placeholder="City or Timezone"
      class="search-input"
    />
    <Search size={18} strokeWidth={1.5} class="search-icon" />

    <!-- Floating Dropdown underneath input -->
    {#if isSearchFocused}
      {#if searchQuery.trim().length > 0}
        <div class="search-dropdown">
          {#if searchResults.length === 0}
            <div class="no-results">No timezone found matching "{searchQuery}"</div>
          {:else}
            {#each searchResults as item}
              {@const nowZoned = DateTime.now().setZone(item.id)}
              {@const timeStr = syncState.timeFormat === '24h' ? nowZoned.toFormat('HH:mm') : nowZoned.toFormat('h:mm a')}
              <button
                type="button"
                class="search-item-btn"
                onclick={() => handleAddSearched(item)}
              >
                <div class="item-content">
                  <div class="item-primary-row">
                    <span class="item-city">{item.city}</span>
                    <sup class="item-abbr">{item.abbr}</sup>
                  </div>
                  <div class="item-secondary-row">
                    {#if item.descriptor}
                      <span class="item-descriptor">{item.descriptor}</span>
                    {/if}
                    {#if item.descriptor && item.country && item.country !== item.city}
                      <span class="item-sep">·</span>
                    {/if}
                    {#if item.country && item.country !== item.city}
                      <span class="item-country">{item.country}</span>
                    {/if}
                  </div>
                </div>
                <span class="item-clock">{timeStr}</span>
              </button>
            {/each}
          {/if}
        </div>
      {:else if recentItems.length > 0}
        <div class="search-dropdown">
          <div class="search-section-header">
            <Clock size={12} />
            <span>Recently Added</span>
          </div>
          {#each recentItems as item}
            {@const nowZoned = DateTime.now().setZone(item.id)}
            {@const timeStr = syncState.timeFormat === '24h' ? nowZoned.toFormat('HH:mm') : nowZoned.toFormat('h:mm a')}
            <button
              type="button"
              class="search-item-btn"
              onclick={() => handleAddSearched(item)}
            >
              <div class="item-content">
                <div class="item-primary-row">
                  <span class="item-city">{item.city}</span>
                  <sup class="item-abbr">{item.abbr}</sup>
                </div>
                <div class="item-secondary-row">
                  {#if item.descriptor}
                    <span class="item-descriptor">{item.descriptor}</span>
                  {/if}
                  {#if item.descriptor && item.country && item.country !== item.city}
                    <span class="item-sep">·</span>
                  {/if}
                  {#if item.country && item.country !== item.city}
                    <span class="item-country">{item.country}</span>
                  {/if}
                </div>
              </div>
              <span class="item-clock">{timeStr}</span>
            </button>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .menu-bar {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 8px;
    height: 40px;
    margin-bottom: 1.5rem;
  }

  /* Controller card */
  .controller-card {
    display: grid;
    grid-template-columns: 340px 1fr;
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    padding: 3px;
    height: 100%;
    align-items: center;
  }

  /* Controller left section */
  .controller-left {
    display: grid;
    grid-template-columns: 1fr 140px;
    height: 100%;
    align-items: center;
    border-right: 1px solid var(--border-primary);
    padding-right: 6px;
  }

  .format-and-palette {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 100%;
  }

  /* 24 / 12 Toggle */
  .hours-toggle {
    display: flex;
    width: 72px;
    height: 28px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-app);
    padding: 1px;
  }

  .toggle-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-muted);
    border-radius: 4px;
    transition: all 0.15s ease;
  }

  .toggle-btn:hover {
    color: var(--text-main);
  }

  .toggle-btn.active {
    background: var(--bg-surface);
    color: var(--text-main);
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  }

  /* Palette picker */
  .palette-picker-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .palette-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 28px;
    border-radius: 4px;
    color: var(--text-muted);
    transition: color 0.15s ease, background 0.15s ease;
  }

  .palette-btn:hover {
    color: var(--text-main);
    background: var(--bg-surface);
  }

  .palette-dropdown {
    position: absolute;
    top: 34px;
    left: 0;
    background: var(--bg-surface);
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    padding: 6px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
    z-index: 50;
  }

  .palette-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 0.1s ease;
  }

  .palette-dot:hover {
    transform: scale(1.15);
  }

  .palette-dot.active {
    border-color: var(--text-main);
  }

  /* Sort picker */
  .sort-picker-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .sort-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 4px;
    color: var(--text-muted);
    transition: color 0.15s ease, background 0.15s ease;
  }

  .sort-btn:hover {
    color: var(--text-main);
    background: var(--bg-surface);
  }

  .sort-btn.active {
    color: var(--text-main);
    background: var(--bg-surface);
  }

  .sort-dropdown {
    position: absolute;
    top: 34px;
    left: 0;
    background: var(--bg-surface);
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 204px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
    z-index: 50;
  }

  .sort-option-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 0.74rem;
    font-weight: 500;
    color: var(--text-muted);
    text-align: left;
    transition: all 0.1s ease;
    cursor: pointer;
  }

  .sort-option-btn:hover {
    color: var(--text-main);
    background: var(--bg-surface-alt);
  }

  .sort-option-btn.active {
    color: var(--text-main);
    font-weight: 600;
    background: var(--bg-surface-alt);
  }

  :global(.sort-check-icon) {
    color: var(--text-main);
    flex-shrink: 0;
  }

  /* Meeting minutes */
  .meeting-minutes {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-main);
  }

  :global(.meeting-arrow) {
    color: var(--text-muted);
  }

  .meeting-num {
    padding: 0 4px;
    font-family: monospace;
  }

  .meeting-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    margin-left: 2px;
    border-radius: 3px;
  }

  .meeting-close-btn:hover {
    color: #ef4444;
  }

  /* Controller right section */
  .controller-right {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-left: 8px;
    height: 100%;
  }

  .date-dials-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .calendar-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 32px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-surface);
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.15s ease;
  }

  .calendar-btn:hover {
    color: var(--text-main);
  }

  .cal-month-stamp {
    position: absolute;
    top: 13px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 8px;
    font-weight: 700;
    color: #ef4444;
    text-transform: uppercase;
    pointer-events: none;
  }

  .hidden-native-date {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  .date-pills {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .date-dial-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 32px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-surface);
    color: var(--text-muted);
    line-height: 1.1;
    transition: all 0.12s ease;
  }

  .date-dial-btn:hover {
    color: var(--text-main);
  }

  .date-dial-btn.active {
    background: var(--bg-app);
    color: var(--text-main);
    font-weight: 600;
    border-color: var(--text-muted);
  }

  .dial-day-num {
    font-size: 0.72rem;
    font-weight: 600;
  }

  .dial-day-dow {
    font-size: 0.6rem;
    opacity: 0.8;
  }

  .actions-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Presets menu */
  .presets-menu-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .preset-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 30px;
    padding: 0 10px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-surface);
    color: var(--text-main);
    font-size: 0.72rem;
    font-weight: 600;
    transition: all 0.15s ease;
    cursor: pointer;
  }

  .preset-menu-btn:hover {
    background: var(--bg-app);
  }

  .preset-menu-btn.active {
    background: var(--bg-app);
    border-color: var(--text-muted);
  }

  .preset-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 8px;
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-primary);
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--text-muted);
  }

  .presets-dropdown {
    position: absolute;
    top: 36px;
    right: 0;
    width: 280px;
    background: var(--bg-surface);
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    z-index: 50;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .presets-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-primary);
    background: var(--bg-surface-alt);
  }

  .presets-heading {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
  }

  .preset-save-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--border-primary);
  }

  .preset-save-row {
    display: flex;
    gap: 6px;
  }

  .preset-pin-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.68rem;
    color: var(--text-muted);
    cursor: pointer;
    user-select: none;
  }

  .preset-pin-label:hover {
    color: var(--text-main);
  }

  .preset-pin-checkbox {
    cursor: pointer;
    accent-color: #ef4444;
  }

  .preset-name-input {
    flex: 1;
    min-width: 0;
    height: 28px;
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    padding: 0 8px;
    font-size: 0.75rem;
    color: var(--text-main);
    outline: none;
  }

  .preset-name-input:focus {
    border-color: var(--border-primary);
    background: var(--bg-surface);
  }

  .preset-save-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 10px;
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    background: var(--bg-surface);
    color: var(--text-main);
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease;
    white-space: nowrap;
  }

  .preset-save-btn:hover {
    background: var(--bg-surface-alt);
  }

  .presets-list {
    max-height: 200px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .presets-empty {
    padding: 16px 12px;
    text-align: center;
    font-size: 0.76rem;
    color: var(--text-muted);
  }

  .preset-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    border-bottom: 1px solid var(--border-primary);
    transition: background 0.1s ease;
  }

  .preset-item:last-child {
    border-bottom: none;
  }

  .preset-item:hover {
    background: var(--bg-surface-alt);
  }

  .preset-load-btn {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
  }

  .preset-title {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  .preset-meta {
    font-size: 0.68rem;
    color: var(--text-muted);
  }

  .preset-del-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    color: var(--text-muted);
    border-radius: 4px;
    cursor: pointer;
    transition: color 0.15s ease;
    margin-left: 4px;
    flex-shrink: 0;
    background: none;
    border: none;
  }

  .preset-del-btn:hover {
    color: #ef4444;
  }

  .presets-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    border-top: 1px solid var(--border-primary);
    background: var(--bg-surface-alt);
  }

  .preset-tool-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.68rem;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
    background: none;
    border: none;
  }

  .preset-tool-btn:hover {
    color: var(--text-main);
    background: var(--bg-surface);
  }

  .hidden-file-input {
    display: none;
  }

  /* Copy URL button */
  .copy-url-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 30px;
    padding: 0 10px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-surface);
    color: var(--text-main);
    font-size: 0.72rem;
    font-weight: 600;
    transition: all 0.15s ease;
  }

  .copy-url-btn:hover {
    background: var(--bg-app);
  }

  .copy-url-btn.copied {
    background: #16a34a;
    border-color: #16a34a;
    color: #ffffff;
  }

  /* Search Box (Right Column) */
  .search-box {
    position: relative;
    width: 300px;
    height: 100%;
  }

  .search-input {
    width: 100%;
    height: 100%;
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    padding: 0 34px 0 12px;
    font-size: 0.82rem;
    color: var(--text-main);
    outline: none;
    transition: border-color 0.15s ease;
  }

  .search-input:focus {
    border-color: var(--border-primary);
    background: var(--bg-surface);
  }

  :global(.search-icon) {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    pointer-events: none;
  }

  /* Floating Search Dropdown */
  .search-dropdown {
    position: absolute;
    top: 44px;
    right: 0;
    width: 380px;
    max-height: 420px;
    overflow-y: auto;
    background: var(--bg-surface);
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
    z-index: 50;
  }

  .search-section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px 6px;
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border-primary);
    background: var(--bg-surface-alt);
  }

  .no-results {
    padding: 12px 16px;
    font-size: 0.8rem;
    color: var(--text-muted);
    text-align: center;
  }

  .search-item-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border-primary);
    cursor: pointer;
    text-align: left;
    transition: background 0.1s ease;
  }

  .search-item-btn:last-child {
    border-bottom: none;
  }

  .search-item-btn:hover {
    background: var(--bg-surface-alt);
  }

  .item-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    overflow: hidden;
  }

  .item-primary-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .item-city {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-main);
  }

  .item-abbr {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text-muted);
    border: 1px solid var(--border-primary);
    border-radius: 3px;
    padding: 1px 4px;
    line-height: 1.1;
  }

  .item-secondary-row {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.72rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-descriptor {
    color: var(--text-muted);
  }

  .item-sep {
    opacity: 0.6;
  }

  .item-country {
    color: var(--text-muted);
  }

  .item-clock {
    font-family: monospace;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-main);
    flex-shrink: 0;
    margin-left: 12px;
  }
</style>
