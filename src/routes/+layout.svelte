<script lang="ts">
  import '../app.css';

  let { children } = $props();
</script>

<div class="main-bg-grid" aria-hidden="true"></div>
<main>
  {@render children()}
</main>
