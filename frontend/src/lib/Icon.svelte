<script lang="ts">
  let { name, size = 24, class: className = "" } = $props<{ 
    name: "Duke" | "Assassin" | "Captain" | "Ambassador" | "Contessa" | "Coup" | "Rules" | "Close" | "Copy" | "User" | "Crown" | "Sword" | "Anchor" | "Shuffle" | "Shield" | "Flame" | "Coins" | "Skull" | "Refresh" | "Trash" | "LogOut" | "Info" | "Check" | "Alert" | "Plus" | "Search" | "Lock" | "Globe" | "Target" | "ArrowLeft" | "Zap",
    size?: number,
    class?: string
  }>();

  // Mapping role names to specific icons for convenience
  const roleToIcon: Record<string, any> = {
    "Duke": "Crown",
    "Assassin": "Sword",
    "Captain": "Anchor",
    "Ambassador": "Shuffle",
    "Contessa": "Shield",
    "Coup": "Flame"
  };

  const iconName = roleToIcon[name] || name;
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  class="lucide-icon {className}"
  style="color: currentColor;"
>
  {#if iconName === "Crown"}
    <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
  {:else if iconName === "Sword"}
    <polyline points="14.5 17.5 3 5 7 1.5 14.5 17.5" />
    <path d="m2 19 3 2 2-3" />
    <path d="m19 10 3-3" />
    <path d="M14.5 17.5 18 14l3 3-3.5 3.5-3-3z" />
  {:else if iconName === "Anchor"}
    <path d="M12 22V8" />
    <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
    <circle cx="12" cy="5" r="3" />
  {:else if iconName === "Shuffle"}
    <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
    <path d="m18 2 4 4-4 4" />
    <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
    <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
    <path d="m18 14 4 4-4 4" />
  {:else if iconName === "Shield"}
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
  {:else if iconName === "Flame"}
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 2.1 3 4.4 3 6.5a8 8 0 1 1-16 0c0-2.35.6-4.45 1.7-6.45.6 1.35 1.4 2.15 2.1 2.95.8 1 1.7 2.1 1.7 2.95Z" />
  {:else if iconName === "Rules"}
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
    <path d="M8 7h6" />
    <path d="M8 11h8" />
  {:else if iconName === "Close"}
    <path d="M18 6 6 18" />
    <path d="M6 6l12 12" />
  {:else if iconName === "Copy"}
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  {:else if iconName === "User"}
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  {:else if iconName === "Coins"}
    <circle cx="8" cy="8" r="6" />
    <path d="M18.09 10.37A6 6 0 1 1 10.34 18.06" />
    <path d="M7 6h2v4" />
    <path d="M17 12h2v4" />
  {:else if iconName === "Skull"}
    <path d="m12.5 17-.5-1-.5 1h1z" />
    <path d="M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1h6z" />
    <path d="M12.5 12a.5.5 0 1 0-1 0 .5.5 0 0 0 1 0z" />
    <path d="M18 10a6 6 0 0 0-12 0c0 4.97 4 6.75 6 8 2.03-1.25 6-3.03 6-8z" />
    <circle cx="9" cy="10" r="1" />
    <circle cx="15" cy="10" r="1" />
  {:else if iconName === "Refresh"}
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  {:else if iconName === "Trash"}
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  {:else if iconName === "LogOut"}
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  {:else if iconName === "Info"}
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="16" y2="12" />
    <line x1="12" x2="12.01" y1="8" y2="8" />
  {:else if iconName === "Check"}
    <polyline points="20 6 9 17 4 12" />
  {:else if iconName === "Alert"}
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" x2="12" y1="9" y2="13" />
    <line x1="12" x2="12.01" y1="17" y2="17" />
  {:else if iconName === "Plus"}
    <line x1="12" x2="12" y1="5" y2="19" />
    <line x1="5" x2="19" y1="12" y2="12" />
  {:else if iconName === "Search"}
    <circle cx="11" cy="11" r="8" />
    <line x1="21" x2="16.65" y1="21" y2="16.65" />
  {:else if iconName === "Lock"}
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  {:else if iconName === "Globe"}
    <circle cx="12" cy="12" r="10" />
    <line x1="2" x2="22" y1="12" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  {:else if iconName === "Target"}
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  {:else if iconName === "ArrowLeft"}
    <line x1="19" x2="5" y1="12" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  {:else if iconName === "Zap"}
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  {:else if iconName === "ChevronDown"}
    <polyline points="6 9 12 15 18 9" />
  {:else if iconName === "Sparkles"}
    <path d="m12 3 1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M3 5h4" />
    <path d="M21 17v4" />
    <path d="M19 19h4" />
  {:else if iconName === "ArrowRight"}
    <line x1="5" x2="19" y1="12" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  {/if}
</svg>

<style>
  .lucide-icon {
    display: inline-block;
    vertical-align: middle;
  }
</style>
