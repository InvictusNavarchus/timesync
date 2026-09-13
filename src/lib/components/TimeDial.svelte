<script lang="ts">
  import type { DialCell, TimeFormat } from '$lib/domain/types';

  let { dial, timeFormat }: { dial: DialCell; timeFormat: TimeFormat } = $props();

  let [dow, datePart] = $derived(
    dial.dayLabel ? dial.dayLabel.split(', ') : ['', '']
  );
</script>

<div
  class="dial-cell dial-{dial.circleType}"
  class:is-new-day={dial.isNewDay}
  title={dial.dayLabel ? `${dial.dayLabel} at ${dial.timeLabel} ${dial.period || ''}` : `${dial.timeLabel} ${dial.period || ''}`}
>
  {#if dial.isNewDay && dial.dayLabel}
    <div class="new-day-wrapper">
      <span class="new-day-dow">{dow.toUpperCase()}</span>
      <span class="new-day-date">{datePart}</span>
    </div>
  {:else}
    <span class="time-label">{dial.timeLabel}</span>
    {#if timeFormat === '12h' && dial.period}
      <span class="time-period">{dial.period}</span>
    {/if}
  {/if}
</div>

<style>
  .dial-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 38px;
    border-radius: 4px;
    user-select: none;
    transition: transform 0.1s ease, filter 0.1s ease;
    padding: 2px 1px;
    text-align: center;
    position: relative;
  }

  .dial-cell:hover {
    filter: brightness(0.92);
    z-index: 2;
  }

  /* Color types based on daylight phase tokens */
  .dial-dawn {
    background: var(--dial-dawn);
    color: var(--dial-text-dark);
  }

  .dial-midday {
    background: var(--dial-midday);
    color: var(--dial-text-dark);
    border: 1px solid var(--border-subtle);
  }

  .dial-dusk {
    background: var(--dial-dusk);
    color: var(--dial-text-dark);
  }

  .dial-night {
    background: var(--dial-night);
    color: var(--dial-text-light);
  }

  .dial-newday {
    background: var(--dial-newday);
    color: var(--dial-text-light);
    font-weight: 700;
  }

  .time-label {
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  .time-period {
    font-size: 0.55rem;
    line-height: 1;
    opacity: 0.75;
    text-transform: uppercase;
  }

  .new-day-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    line-height: 1;
    gap: 1px;
  }

  .new-day-dow {
    font-size: 0.55rem;
    letter-spacing: 0.05em;
    opacity: 0.85;
  }

  .new-day-date {
    font-size: 0.65rem;
    font-weight: 700;
    white-space: nowrap;
  }
</style>
