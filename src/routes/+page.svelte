<script lang="ts">
  import Header from '$lib/components/Header.svelte';
  import ControlBar from '$lib/components/ControlBar.svelte';
  import Board from '$lib/components/Board.svelte';
</script>

<svelte:head>
  <title>Timesync - what time works for you?</title>
  <meta
    name="description"
    content="Effortless visual timezone converter and meeting planner. Compare multiple timezones side-by-side."
  />
</svelte:head>

<div class="page-container">
  <div class="content-wrapper">
    <Header />

    <div class="board-card-container">
      <ControlBar />
      <Board />
    </div>
  </div>
</div>

<style>
  .page-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4rem 1.5rem 3rem;
  }

  .content-wrapper {
    width: 100%;
    max-width: 1180px;
  }

  .board-card-container {
    padding: 1rem 0.6rem;
    border: 1px solid var(--border-primary);
    background: var(--bg-surface);
    border-radius: 6px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  @media (max-width: 640px) {
    .page-container {
      padding: 1.5rem 0.5rem;
    }
  }
</style>
