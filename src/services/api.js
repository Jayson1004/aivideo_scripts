import axios from 'axios';
import { useSettings } from '../composables/useSettings';

const { settings } = useSettings();

// An axios instance for calls to our own backend (e.g., file saving)
const localApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:8000',
  timeout: 600000,
});
export const api = localApi; // Export for backward compatibility if needed elsewhere
export const API_BASE = localApi.defaults.baseURL;


// --- Helper function for decoding data URLs ---
function data_url_to_bytes(data_url) {
  const [header, encoded] = data_url.split(',', 2);
  const mime_type = header.split(';')[0].split(':')[1];
  const data = atob(encoded); // Use atob for base64 decoding in browser
  const bytes = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    bytes[i] = data.charCodeAt(i);
  }
  return { mime_type, bytes };
}


// --- API Definitions ---

export const ImagesAPI = {
  apicoreGenerateOne: async (prompt, model, token, aspectRatio, size, baseimgs = [], image_style, image_quality) => {
    if (!token) throw new Error('API token is required');

    const headers = { 'Authorization': `Bearer ${token}` };
    
    // --- YUNWU PROVIDER ---
    if (model.includes('dall-e') || model.includes('gpt-image')) {
      if (baseimgs.length > 0) {
        if (model.includes('dall-e')) {
            throw new Error("DALL-E models do not support base images (image editing).");
        }
        // Image Editing with GPT model
        const formData = new FormData();
        let basePrompt = '请对应参考参数image里的图片：';
        baseimgs.forEach((img, i) => {
            basePrompt += `图${i + 1} (${img.name}), `;
            const { mime_type, bytes } = data_url_to_bytes(img.url);
            formData.append('image', new Blob([bytes], { type: mime_type }), `image_${i+1}.png`);
        });
        
        formData.append('prompt', `${basePrompt}帮我根据描述生成新的一张图: ${prompt}`);
        formData.append('model', model);
        formData.append('n', "1");
        formData.append('size', size);
        
        const { data } = await axios.post('/proxy/yunwu/v1/images/edits', formData, { headers });
        if (data.data && data.data[0]?.url) return data.data[0].url;
        if (data.data && data.data[0]?.b64_json) return `data:image/png;base64,${data.data[0].b64_json}`;
        throw new Error("Image generation failed or returned unexpected format.");

      } else {
        // Text-to-Image with DALL-E or GPT
        const payload = {
            prompt: prompt,
            n: 1,
            model: model,
            size: size,
            response_format: "b64_json",
            style: image_style,
            quality: image_quality,
        };
        const { data } = await axios.post('/proxy/yunwu/v1/images/generations', payload, { headers });
        if (data.data && data.data[0]?.b64_json) {
            return `data:image/png;base64,${data.data[0].b64_json}`;
        }
        throw new Error("Image generation failed or returned no data.");
      }
    } 
    // --- YUNWU SEEDREAM ---
    else if (model.includes('seedream')) {
      const payload = {
        model: "doubao-seedream-4-0-250828",
        prompt: prompt,
        size: size,
        stream: false,
        response_format: "url",
      };
      const { data } = await axios.post('/proxy/yunwu/v1/images/generations', payload, { headers });
      if (data.data && data.data[0]?.url) return data.data[0].url;
      throw new Error("Seedream generation failed.");
    }
    // --- YUNWU GEMINI ---
    else if (model.includes('gemini')) {
      const payload = {
          contents: [{ role: "user", parts: [{"text": `generate a picture: ${prompt}`}] }],
          generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
              imageConfig: {"aspectRatio": aspectRatio}
          }
      };
      // Handling base images for Gemini
      if (baseimgs.length > 0) {
        let basePrompt = '请对应参考以下图片：';
        baseimgs.forEach((img, i) => { basePrompt += `图${i + 1} (${img.name}), ` });
        
        const imageParts = baseimgs.map(img => {
            const [, encoded] = img.url.split(',', 2);
            const mime_type = img.url.split(';')[0].split(':')[1];
            return { inline_data: { mime_type, data: encoded }};
        });
        payload.contents[0].parts = [{"text": `${basePrompt}帮我根据描述生成新的一张图: ${prompt}`}, ...imageParts];
      }

      const { data } = await axios.post(`/proxy/yunwu/v1beta/models/${model}:generateContent`, payload, { headers });
      if (data.candidates && data.candidates[0].content.parts) {
        const imagePart = data.candidates[0].content.parts.find(p => p.inlineData);
        if (imagePart) {
          return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        }
      }
      throw new Error("Gemini image generation failed.");
    }
    
    throw new Error(`Unsupported image generation model: ${model}`);
  }
}

export const PromptAPI = {
  apicoreGenerateTxt: async (prompt, model) => {
    const token = settings.value.yunwuApiKey;
    if (!token) throw new Error('API token is required');
    
    const headers = { 'Authorization': `Bearer ${token}` };
    let url, payload;

    if (model.includes('gpt')) {
        url = '/proxy/yunwu/v1/responses';
        payload = { model, input: [{"role": "user", "content": [{"type": "input_text", "text": prompt}]}], stream: false };
    } else if (model.includes('claude')) {
        url = '/proxy/yunwu/v1/messages';
        payload = { model, messages: [{"role": "user", "content": prompt}], stream: false, max_tokens: 8000 };
    } else if (model.includes('gemini')) {
        url = '/proxy/yunwu/v1/chat/completions';
        payload = { model, messages: [{"role": "user", "content": prompt}], stream: false };
    } else {
        throw new Error(`Unsupported text generation model: ${model}`);
    }

    const response = await axios.post(url, payload, { headers });
    const data = response.data;

    // Extract text based on different response structures
    if (model.includes('claude')) return data.content?.[0]?.text || '';
    if (model.includes('gpt')) return data.output?.find(el => el.type === "message")?.content?.[0]?.text || '';
    if (model.includes('gemini')) return data.choices?.[0]?.message?.content || '';

    return '';
  }
};

export const BookwormAPI = {
  analyze: async (payload) => {
    const token = settings.value.bookwormApiKey;
    if (!token) throw new Error('Bookworm API token is required');
    
    const headers = { 'Authorization': `Bearer ${token}`, "Content-Type": "application/json" };
    const { data } = await axios.post('/proxy/bookworm/v1/chat/completions', payload, { headers });
    if (data.choices && data.choices[0].message) {
      return data.choices[0].message.content;
    }
    return null;
  },
};

export const VideosAPI = {
  generateVideo: async (provider, options = {}) => {
    const token = provider === 'yunwu' ? settings.value.yunwuApiKey : settings.value.kieApiKey;
    if (!token) throw new Error('API token is required for the selected video provider.');

    const headers = { 'Authorization': `Bearer ${token}` };
    let url, payload;

    if (provider === "yunwu") {
        url = '/proxy/yunwu/v1/videos';
        // Yunwu expects form-data for this endpoint
        const formData = new FormData();
        formData.append('model', 'sora-2');
        formData.append('prompt', options.prompt);
        formData.append('seconds', options.seconds);
        formData.append('size', options.size);
        formData.append('watermark', options.watermark);
        formData.append('private', options.is_private);
        payload = formData;
        headers['Content-Type'] = 'multipart/form-data';
    } else if (provider === "kie") {
        url = '/proxy/kie/api/v1/jobs/createTask';
        payload = {
            'model': 'sora-2-text-to-video',
            'callBackUrl': '',
            'input': {
                'prompt': options.prompt,
                'aspect_ratio': options.aspect_ratio,
                'n_frames': String(options.n_frames),
                'remove_watermark': options.remove_watermark,
            },
        };
        headers['Content-Type'] = 'application/json';
    } else {
        throw new Error(`Unsupported video provider: ${provider}`);
    }
    
    const { data } = await axios.post(url, payload, { headers });
    return data;
  },

  getVideoStatus: async (provider, videoId) => {
    const token = provider === 'yunwu' ? settings.value.yunwuApiKey : settings.value.kieApiKey;
    if (!token) throw new Error('API token is required for the selected video provider.');
    
    const headers = { 'Authorization': `Bearer ${token}` };
    let url;
    
    if (provider === "yunwu") {
        url = `/proxy/yunwu/v1/videos/${videoId}`;
    } else if (provider === "kie") {
        url = `/proxy/kie/api/v1/jobs/recordInfo?taskId=${videoId}`;
    } else {
        throw new Error(`Unsupported video provider: ${provider}`);
    }

    const { data } = await axios.get(url, { headers });
    return data;
  }
};


// Local backend APIs - these do not use the proxy
export const FileAPI = {
  saveText: async (topic, filename, content) => {
    const { data } = await localApi.post('/api/save-text', { topic, filename, content });
    return data;
  },
  saveImage: async (topic, filename, imageData) => {
    const { data } = await localApi.post('/api/save-image', { topic, filename, image_data: imageData });
    return data;
  }
};