<template>
  <div class="settings-panel">
    <h2>API Key Settings</h2>
    <div class="setting">
      <label for="gemini-key">Gemini API Key:</label>
      <input id="gemini-key" v-model="settings.geminiApiKey" type="password" />
    </div>
    <div class="setting">
      <label for="yunwu-key">Yunwu API Key:</label>
      <input id="yunwu-key" v-model="settings.yunwuApiKey" type="password" />
    </div>
    <div class="setting">
      <label for="kie-key">Kie API Key:</label>
      <input id="kie-key" v-model="settings.kieApiKey" type="password" />
    </div>
    <div class="setting">
      <label for="bookworm-key">书虫 API Key:</label>
      <input id="bookworm-key" v-model="settings.bookwormApiKey" type="password" />
    </div>
    <button @click="saveSettings">Save</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useSettings } from '../composables/useSettings';

const { settings, saveSettings } = useSettings();
</script>

<style scoped>
.settings-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  border: 1px solid #ccc;
  padding: 20px;
  z-index: 1000;
}
.setting {
  margin-bottom: 10px;
}
label {
  display: block;
  margin-bottom: 5px;
}
input {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}
</style>
