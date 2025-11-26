import axios from 'axios';
import { useSettings } from '../composables/useSettings';

const { settings } = useSettings();

const baseURL = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export const api = axios.create({ baseURL, timeout: 6000000 });
export const API_BASE = baseURL;
export const ImportAPI = {
  importExcel: async (file) => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/import/excel', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  }
};
const dowloadImage = (url,mimeType='image/png', index) =>{
  // Create a filename with date and time
  const now = new Date();
  const timestamp = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') + '_' +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0');
  if(!index) {
    index = Math.ceil(Math.random() * 100)
  }
  const extension = mimeType.split('/')[1] || 'png';
  const filename = `${timestamp}-${index}.${extension}`;

  // Create a link and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Clean up
  document.body.removeChild(link);
}

export const ImagesAPI = {
  generate: async (prompts, aspectRatio = '16:9', imageSize = '1K', provider = 'gemini') => {
    const token = provider === 'gemini' ? settings.value.geminiApiKey : '';
    const { data } = await api.post('/images/generate', {
      prompts,
      aspect_ratio: aspectRatio,
      image_size: imageSize,
      batch_size: 2,
      provider,
      token
    });
    const urls = (data.saved || []).map(x => x.url || x.path);
    return { ...data, urls };
  },
  regenerate: async (prompt, index, aspectRatio = '16:9', imageSize = '1K') => {
    const { data } = await api.post('/images/regenerate', {
      prompt,
      index,
      aspect_ratio: aspectRatio,
      image_size: imageSize
    });
    const urls = (data.saved || []).map(x => x.url || x.path);
    return { ...data, urls };
  },
  
  apicoreGenerateBatchTxt: async (prompts, model = 'gemini-2.5-flash-image') => {
    const texts = [];
    for (const p of prompts) {
      try { texts.push(await ImagesAPI.apicoreGenerateTxt(p, model)); }
      catch (e) { console.error('apicore batch error:', e); texts.push(null); }
    }
    return texts;
  },
  // This function now delegates the complex logic to the backend.
  apicoreGenerateOne: async (prompt, model, token, aspectRatio, size, baseimgs = [], image_style, image_quality, returnBase64 = false) => {
    if (!token) throw new Error('API token is required');

    try {
      const { data } = await api.post('/api/images/generate-external', {
        prompt,
        token,
        model,
        aspect_ratio: aspectRatio,
        size,
        base_imgs: baseimgs,
        image_style,
        image_quality,
        return_base64: returnBase64
      });
      // The backend now returns the direct URL or data URL string
      return data;
    } catch (error) {
      console.error('Error calling backend image generation:', error);
      // Optionally re-throw or handle the error as needed by the UI
      throw error;
    }
  }
}

export const PromptAPI = {
  apicoreGenerateTxt: async (prompt, model) => {
    const token = settings.value.yunwuApiKey;
    if (!token) throw new Error('API token is required');
    try {
      const response = await api.post('/api/text/generate', {
        prompt,
        token,
        model
      }, {
        // Ensure axios returns plain text
        transformResponse: [(data) => data]
      });
      // The backend returns a plain text string
      return response.data;
    } catch (error) {
      console.error('Error calling backend text generation:', error);
      throw error;
    }
  }
};

export const FileAPI = {
  saveText: async (topic, filename, content) => {
    const { data } = await api.post('/api/save-text', { topic, filename, content });
    return data;
  },
  saveImage: async (topic, filename, imageData) => {
    const { data } = await api.post('/api/save-image', { topic, filename, image_data: imageData });
    return data;
  }
};


export const BookwormAPI = {
  analyze: async (payload) => {
    const token = settings.value.bookwormApiKey;
    if (!token) throw new Error('API token is required');

    const { data } = await api.post('/api/bookworm/analyze', { ...payload, token });
    return data;
  },
};

export const VideosAPI = {
  /**
   * @param {'yunwu' | 'kie'} provider
   * @param {object} options
   */
  generateVideo: async (provider, options = {}) => {
    const token = provider === 'yunwu' 
      ? settings.value.yunwuApiKey 
      : settings.value.kieApiKey;
    if (!token) throw new Error('API token is required for the selected video provider.');

    const payload = {
      provider,
      token,
      ...options
    };
// kie const { data } = await axios.post('/api/v1/jobs/createTask', payload, {                                                                                              │
// │ 225 -       headers: {                                                                                                                                                         │
//   │ 226 -         'Content-Type': 'application/json',                                                                                                                              │
//   │ 227 -         'Authorization': `Bearer ${token}`,                                                                                                                              │
//   │ 228 -       },                                                                                                                                                                 │
//   │ 229 -     });                                                                                                                                                                  │
//   │ 230 -                 
    const { data } = await api.post('/api/videos/generate', payload);
    return data;
  },

  /**
   * @param {'yunwu' | 'kie'} provider
   * @param {string} videoId
   */
  getVideoStatus: async (provider, videoId) => {
    const token = provider === 'yunwu' 
      ? settings.value.yunwuApiKey 
      : settings.value.kieApiKey;
    if (!token) throw new Error('API token is required for the selected video provider.');
// axios.get(`/v1/videos/${videoId}`
// Kie  xios.get(`/api/v1/jobs/recordInfo?taskId=${taskId}
    const { data } = await api.get(`/api/videos/status/${provider}/${videoId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return data;
  }
};