<script lang="ts">
  import { syncState } from '$lib/state/timesync.svelte';
  import { searchTimezones, type TimezoneSearchItem } from '$lib/domain/search';
  import { Search, X, Check, Plus } from 'lucide-svelte';
  import { tick } from 'svelte';

  let query = $state('');
  let selectedIndex = $state(0);
  let inputRef = $state<HTMLInputElement | null>(null);
  let listRef = $state<HTMLDivElement | null>(null);

  let results = $derived(searchTimezones(query, 30));

  $effect(() => {
    if (syncState.searchOpen) {
      query = '';
      selectedIndex = 0;
      tick().then(() => {
        inputRef?.focus();
      });
    }
  });

  function close() {
    syncState.searchOpen = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(results.length - 1, selectedIndex + 1);
      scrollSelectedIntoView();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(0, selectedIndex - 1);
      scrollSelectedIntoView();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = results[selectedIndex];
      if (current) {
        selectItem(current);
      }
    }
  }

  function scrollSelectedIntoView() {
    if (!listRef) return;
    const items = listRef.querySelectorAll('.search-item');
    const target = items[selectedIndex] as HTMLElement;
    if (target) {
      target.scrollIntoView({ block: 'nearest' });
    }
  }

  function selectItem(item: TimezoneSearchItem) {
    syncState.addTimezone(item.id);
    close();
  }
</script>

<svelte:window onkeydown={(e) => {
  if (syncState.searchOpen && e.key === 'Escape') close();
}} />

{#if syncState.searchOpen}
  <div
    class="modal-backdrop"
    onclick={close}
    onkeydown={(e) => e.key === 'Escape' && close()}
    role="presentation"
  >
    <!-- Modal container -->
    <div
      class="modal-panel"
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleKeydown}
      role="dialog"
      aria-modal="true"
      aria-label="Search and add timezones"
      tabindex="-1"
    >
      <!-- Search Input Bar -->
      <div class="search-header">
        <Search size={18} class="search-input-icon" />
        <input
          bind:this={inputRef}
          type="text"
          bind:value={query}
          placeholder="Search city, region, or timezone (e.g. London, NYC, Tokyo)..."
          class="search-input"
        />
        {#if query}
          <button
            type="button"
            class="clear-query-btn"
            onclick={() => { query = ''; inputRef?.focus(); }}
            title="Clear search"
          >
            <X size={16} />
          </button>
        {/if}
        <button
          type="button"
          class="close-modal-btn"
          onclick={close}
          title="Close search"
        >
          <X size={18} />
        </button>
      </div>

      <!-- Results List -->
      <div class="results-list" bind:this={listRef} role="listbox">
        {#if results.length === 0}
          <div class="empty-results">
            No timezones found matching "{query}"
          </div>
        {:else}
          {#each results as item, index}
            {@const isAdded = syncState.timezones.includes(item.id)}
            <div
              class="search-item"
              class:selected={index === selectedIndex}
              class:is-added={isAdded}
              onclick={() => selectItem(item)}
              onmouseenter={() => (selectedIndex = index)}
              role="option"
              aria-selected={index === selectedIndex}
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && selectItem(item)}
            >
              <div class="item-info">
                <span class="item-city">{item.city}</span>
                <span class="item-region">{item.region} • {item.id}</span>
              </div>

              <div class="item-actions">
                <span class="item-offset">{item.offsetStr}</span>
                {#if isAdded}
                  <span class="added-badge">
                    <Check size={13} />
                    Added
                  </span>
                {:else}
                  <span class="add-prompt">
                    <Plus size={13} />
                    Add
                  </span>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <div class="modal-footer">
        <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
        <span><kbd>↵</kbd> to select</span>
        <span><kbd>esc</kbd> to close</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(2px);
    z-index: 100;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 10vh;
  }

  .modal-panel {
    background: var(--bg-surface);
    border: 1px solid var(--border-strong);
    border-radius: 12px;
    width: 90%;
    max-width: 580px;
    box-shadow: var(--shadow-md), 0 20px 25px -5px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 75vh;
  }

  .search-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-subtle);
  }

  :global(.search-input-icon) {
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 0.95rem;
    color: var(--text-main);
    outline: none;
  }

  .clear-query-btn,
  .close-modal-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: 4px;
  }

  .clear-query-btn:hover,
  .close-modal-btn:hover {
    background: var(--bg-surface-alt);
    color: var(--text-main);
  }

  .results-list {
    overflow-y: auto;
    padding: 6px;
    flex: 1;
  }

  .empty-results {
    padding: 2rem 1rem;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .search-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.1s ease;
  }

  .search-item.selected {
    background: var(--bg-surface-alt);
  }

  .item-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .item-city {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-main);
  }

  .item-region {
    font-size: 0.72rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .item-offset {
    font-family: monospace;
    font-size: 0.75rem;
    color: var(--text-muted);
    padding: 2px 6px;
    background: var(--bg-app);
    border-radius: 4px;
  }

  .added-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 0.72rem;
    font-weight: 600;
    color: #16a34a;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(34, 197, 94, 0.1);
  }

  .add-prompt {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-muted);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .search-item:hover .add-prompt {
    color: var(--text-main);
    background: var(--border-subtle);
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    padding: 8px 16px;
    border-top: 1px solid var(--border-subtle);
    background: var(--bg-surface-alt);
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  kbd {
    background: var(--bg-surface);
    border: 1px solid var(--border-strong);
    border-radius: 3px;
    padding: 1px 4px;
    font-size: 0.65rem;
    font-family: inherit;
  }
</style>
