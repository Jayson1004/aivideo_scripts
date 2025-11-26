import { ref, watch } from 'vue';

const SETTINGS_KEY = 'aivideo_settings';

const defaultSettings = {
  geminiApiKey: '',
  yunwuApiKey: '',
  kieApiKey: '',
  bookwormApiKey: '',
};

const settings = ref(loadSettings());

function loadSettings() {
  const savedSettings = localStorage.getItem(SETTINGS_KEY);
  return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings.value));
}

watch(settings, saveSettings, { deep: true });

export function useSettings() {
  return {
    settings,
    saveSettings,
  };
}
