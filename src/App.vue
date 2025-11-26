<template>
  <div>
    <router-view />
    <div class="settings-toggle">
      <button @click="toggleSettings">⚙️</button>
    </div>
    <Settings v-if="showSettings" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Settings from './components/Settings.vue';

const showSettings = ref(false);

const toggleSettings = () => {
  showSettings.value = !showSettings.value;
};
</script>

<style scoped>
.settings-toggle {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1010;
}
</style>
