<script lang="ts">
  import { syncState } from '$lib/state/timesync.svelte';
  import { Sun, Moon } from 'lucide-svelte';
</script>

<header class="app-header">
  <div class="brand">
    <h1 class="title">Timesync</h1>
    <span class="tagline">what time works for you?</span>
  </div>

  <div class="actions">
    <a
      href="https://github.com/InvictusNavarchus/timesync"
      target="_blank"
      rel="noopener noreferrer"
      class="icon-btn"
      title="View on GitHub"
      aria-label="GitHub repository"
    >
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
        />
        <path d="M9 18c-4.51 2-5-2-7-2" />
      </svg>
    </a>

    <button
      type="button"
      class="icon-btn"
      onclick={() => syncState.toggleTheme()}
      title={syncState.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-label="Toggle theme"
    >
      {#if syncState.theme === 'light'}
        <Moon size={19} />
      {:else}
        <Sun size={19} />
      {/if}
    </button>
  </div>
</header>

<style>
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    padding: 0 4px;
  }

  .brand {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }

  .title {
    font-size: 2.25rem;
    font-weight: 700;
    line-height: 1;
    color: var(--text-main);
    letter-spacing: -0.02em;
  }

  .tagline {
    font-size: 0.95rem;
    color: var(--text-muted);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--border-primary);
    background: var(--bg-surface);
    color: var(--text-main);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    transition: color 0.15s ease, background 0.15s ease;
    text-decoration: none;
  }

  .icon-btn:hover {
    color: var(--text-muted);
  }

  @media (max-width: 640px) {
    .app-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
  }
</style>
