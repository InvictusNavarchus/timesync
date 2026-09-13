<script lang="ts">
  import { syncState } from '$lib/state/timesync.svelte';
  import { DateTime } from 'luxon';
  import { Clock, Sun, Moon, Github } from 'lucide-svelte';
  import { onDestroy, onMount } from 'svelte';

  let currentTime = $state(DateTime.now().setZone(syncState.homeZone));
  let timer: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    timer = setInterval(() => {
      currentTime = DateTime.now().setZone(syncState.homeZone);
    }, 1000);
  });

  onDestroy(() => {
    if (timer) clearInterval(timer);
  });

  let formattedTime = $derived(
    syncState.timeFormat === '24h'
      ? currentTime.toFormat('HH:mm:ss')
      : currentTime.toFormat('h:mm:ss a')
  );

  let homeAbbr = $derived(currentTime.toFormat('ZZZZ'));
</script>

<header class="app-header">
  <div class="brand">
    <div class="logo-icon">
      <Clock size={20} />
    </div>
    <div class="brand-text">
      <h1 class="title">Timesync</h1>
      <span class="subtitle">Global timezone converter & meeting coordinator</span>
    </div>
  </div>

  <div class="header-right">
    <div class="live-clock" title="Current time in home timezone ({syncState.homeZone})">
      <span class="clock-label">Home Time</span>
      <span class="clock-value">{formattedTime} <span class="clock-abbr">{homeAbbr}</span></span>
    </div>

    <button
      type="button"
      class="icon-btn"
      onclick={() => syncState.toggleTheme()}
      title={syncState.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-label="Toggle theme"
    >
      {#if syncState.theme === 'light'}
        <Moon size={18} />
      {:else}
        <Sun size={18} />
      {/if}
    </button>

    <a
      href="https://github.com/InvictusNavarchus/timesync"
      target="_blank"
      rel="noopener noreferrer"
      class="icon-btn"
      title="View on GitHub"
      aria-label="GitHub repository"
    >
      <Github size={18} />
    </a>
  </div>
</header>

<style>
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-subtle);
    background: var(--bg-surface);
    margin-bottom: 1.5rem;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .logo-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-subtle);
    color: var(--text-main);
  }

  .title {
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.02em;
    color: var(--text-main);
  }

  .subtitle {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .live-clock {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    padding: 0.25rem 0.75rem;
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
  }

  .clock-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    font-weight: 600;
  }

  .clock-value {
    font-family: monospace;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-main);
  }

  .clock-abbr {
    font-size: 0.75rem;
    font-weight: normal;
    color: var(--text-muted);
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 6px;
    border: 1px solid var(--border-subtle);
    background: var(--bg-surface);
    color: var(--text-muted);
    cursor: pointer;
    text-decoration: none;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }

  .icon-btn:hover {
    background: var(--bg-surface-alt);
    color: var(--text-main);
    border-color: var(--border-strong);
  }

  @media (max-width: 640px) {
    .app-header {
      padding: 0.75rem 1rem;
    }
    .subtitle {
      display: none;
    }
    .live-clock {
      display: none;
    }
  }
</style>
