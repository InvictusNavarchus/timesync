<script lang="ts">
  import type { DialCell, TimeFormat } from '$lib/domain/types';

  let {
    dial,
    timeFormat,
    isFirst,
    isLast
  }: {
    dial: DialCell;
    timeFormat: TimeFormat;
    isFirst?: boolean;
    isLast?: boolean;
  } = $props();
</script>

<div
  class="dial-cell dial-{dial.circleType}"
  class:is-new-day={dial.isNewDay}
  class:rounded-l={isFirst}
  class:rounded-r={isLast}
  title={dial.dayLabel ? `${dial.dayLabel} at ${dial.timeLabel} ${dial.period || ''}` : `${dial.timeLabel} ${dial.period || ''}`}
>
  {#if dial.isNewDay}
    <div class="new-day-stack">
      <span class="nd-dow">{dial.dowLabel?.toUpperCase() || ''}</span>
      <span class="nd-month">{dial.monthLabel || ''}</span>
      <span class="nd-num">{dial.dayNum || ''}</span>
    </div>
  {:else}
    <span class="dial-hour">{dial.timeLabel}</span>
    {#if timeFormat === '12h' && dial.period}
      <span class="dial-period">{dial.period.toLowerCase()}</span>
    {/if}
  {/if}
</div>

<style>
  .dial-cell {
    width: 32px;
    height: 38px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    user-select: none;
    line-height: 1;
    position: relative;
    padding: 1px;
    flex-shrink: 0;
  }

  .rounded-l {
    border-top-left-radius: 6px;
    border-bottom-left-radius: 6px;
  }

  .rounded-r {
    border-top-right-radius: 6px;
    border-bottom-right-radius: 6px;
  }

  /* Daylight Color Phases */
  .dial-dawn {
    background: var(--dial-dawn);
    color: var(--dial-text-dark);
  }

  .dial-midday {
    background: var(--dial-midday);
    color: var(--dial-text-dark);
  }

  .dial-dusk {
    background: var(--dial-dusk);
    color: var(--dial-text-dark);
  }

  .dial-night {
    background: var(--dial-midnight);
    color: var(--dial-text-light);
  }

  .dial-newday {
    background: var(--dial-newday);
    color: var(--dial-text-light);
    font-weight: bold;
  }

  /* Text inside cells */
  .dial-hour {
    font-size: 0.75rem;
    font-weight: 500;
  }

  .dial-period {
    font-size: 0.55rem;
    opacity: 0.75;
  }

  /* Stacked New Day */
  .new-day-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    line-height: 1;
  }

  .nd-dow {
    font-size: 0.55rem;
    color: var(--text-muted);
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .nd-month {
    font-size: 0.62rem;
    font-weight: 600;
  }

  .nd-num {
    font-size: 0.65rem;
    font-weight: 700;
  }
</style>
