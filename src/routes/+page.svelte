<script lang="ts">
  import Header from '$lib/components/Header.svelte';
  import ControlBar from '$lib/components/ControlBar.svelte';
  import Board from '$lib/components/Board.svelte';
  import TimezoneSearchModal from '$lib/components/TimezoneSearchModal.svelte';
</script>

<svelte:head>
  <title>Timesync - Timezone Converter & Meeting Planner</title>
  <meta
    name="description"
    content="Effortless visual timezone converter and meeting planner. Compare multiple timezones side-by-side."
  />
</svelte:head>

<div class="page-container">
  <Header />

  <main class="main-content">
    <ControlBar />
    <Board />
  </main>

  <footer class="app-footer">
    <p>
      Timesync • Built with SvelteKit, Luxon & Svelte 5 Runes.
    </p>
    <p class="footer-tip">
      Tip: Drag across the dial grid to highlight an overlapping meeting window across all timezones.
    </p>
  </footer>

  <TimezoneSearchModal />
</div>

<style>
  .page-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .main-content {
    flex: 1;
    max-width: 1320px;
    width: 100%;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .app-footer {
    border-top: 1px solid var(--border-subtle);
    padding: 1.5rem 1rem;
    text-align: center;
    font-size: 0.75rem;
    color: var(--text-muted);
    background: var(--bg-surface);
    margin-top: auto;
  }

  .footer-tip {
    margin-top: 0.25rem;
    font-size: 0.7rem;
    opacity: 0.8;
  }
</style>
