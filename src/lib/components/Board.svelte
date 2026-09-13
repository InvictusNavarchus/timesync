<script lang="ts">
  import { syncState } from '$lib/state/timesync.svelte';
  import TimezoneRow from './TimezoneRow.svelte';
  import SelectionOverlay from './SelectionOverlay.svelte';
</script>

<div class="board-container">
  {#each syncState.sortedTimezones as tzId (tzId)}
    <TimezoneRow
      timezoneId={tzId}
      isHome={tzId === syncState.homeZone}
    />
  {/each}

  <SelectionOverlay />
</div>

<style>
  .board-container {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 300px;
  }
</style>
