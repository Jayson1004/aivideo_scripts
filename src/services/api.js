import axios from 'axios';
import { GoogleGenAI, PersonGeneration } from '@google/genai';
import { radioEmits } from 'element-plus';


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
const base64ToUrl = (base64, mimeType='image/png') => {
  const byteCharacters = atob(base64.replace(/\s/g, ''));
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  const url = URL.createObjectURL(blob);

  return url;
}

const dataURLtoBlob = (dataurl) => {
  let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], {type:mime});
}

export const ImagesAPI = {
  generate: async (prompts, aspectRatio = '16:9', imageSize = '1K', provider = 'gemini', token = '') => {
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
  
  apicoreGenerateBatchTxt: async (prompts, token, model = 'gemini-2.5-flash-image') => {
    const texts = [];
    for (const p of prompts) {
      try { texts.push(await ImagesAPI.apicoreGenerateTxt(p, token, model)); }
      catch (e) { console.error('apicore batch error:', e); texts.push(null); }
    }
    return texts;
  },
  // 直接在前端调用 API Core（无需后端）
  apicoreGenerateOne: async (prompt, token, model = 'gemini-2.5-flash-image-preview', aspectRatio = '16:9', size = '1*1', baseimgs=[], image_style, image_quality, returnBase64 = false) => {

    if (!token) throw new Error('API token is required');
    let payload = {
      stream: false,
      model,
      prompt: prompt,
    };
    if(model.includes('seedream')){
      payload = {
        "model": "doubao-seedream-4-0-250828",
        "prompt": prompt,
        "size": size,
        "sequential_image_generation": "disabled",
        "stream": false,
        "response_format": "url",
        "watermark": true
     };
      const config = {
        method: 'post',
        url: '/v1/images/generations',
        headers: { 
           'Authorization': `Bearer ${token}`, 
           'Content-Type': 'application/json'
        },
        data : JSON.stringify(payload)
     };
     
     
       const response = await axios(config);
       console.log('seedream', response)
       return response.data.data[0].url
        } else if (model.includes('dall') || model.includes('gpt')) {
          // 如果模型是gpt
          if(baseimgs && baseimgs.length > 0) {
            if(model.includes('dall')) {
              alert('dall模型不能垫图，请更换模型')
              return false
            }
            const formdata = new FormData()
            let basePromt = '请对应参考参数image里的图片：'
            baseimgs.forEach((el, index) => {
              basePromt += `图${index + 1} (${el.name}), `;
              let blob = ''
              // if(el.url.includes('blob:')) {
              //   blob = el.url
              // } else {
                 blob = dataURLtoBlob(el.url);
              // }
              formdata.append("image", blob, `image_${index+1}.png`);
            });
            // baseimgs.forEach((baseimg, index) => {
            // });
            formdata.append("prompt", `${basePromt}帮我根据描述生成新的一张图: ${prompt}`);
            formdata.append("model", model);
            formdata.append("n", "1");
            formdata.append("size", size);    
            const config = {
              method: 'post',
              url: '/v1/images/edits',
              headers: { 
                 'Authorization': `Bearer ${token}`,
              },
              data : formdata
           };
            const response = await axios(config);
            let url = ''
            if(response.data.data[0].b64_json) {
                // if (returnBase64) {
                    return `data:image/png;base64,${response.data.data[0].b64_json}`;
              //   }
              // url = base64ToUrl(response.data.data[0].b64_json);
            }else{
              url =response.data.data[0].url;
            } 
            return url
    
          } else {
            payload = {
             "prompt": prompt,
             "n": 1,
             "model": model,
             "size": size,
             "response_format": "b64_json",
             "style": image_style,
             "quality": image_quality,
           };
           const config = {
             method: 'post',
             url: '/v1/images/generations',
             headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json'
             },
             data : JSON.stringify(payload)
          };
           const response = await axios(config);
           let url = ''
            if(response.data.data[0].b64_json) {
                if (returnBase64) {
                    return `data:image/png;base64,${response.data.data[0].b64_json}`;
                }
              url = base64ToUrl(response.data.data[0].b64_json);
            }else{
              url =response.data.data[0].url;
            } 
           return url
    
          }
        } else {
          
          const _object = {
            "contents": [
               {
                  "role": "user",
                  "parts": [
                     {
                        "text":  `generate a picture: ${prompt}`
                     },
                  ]
               }
            ],
            "generationConfig": {
               "responseModalities": [
                  "TEXT", 
                  "IMAGE"
               ],
               "imageConfig": {
                  "aspectRatio": aspectRatio
               }
            }
         }
          if(baseimgs && baseimgs.length > 0){
            let basePromt = '请对应参考以下图片：'
            baseimgs.forEach((el, index) => {
              basePromt += `图${index + 1} (${el.name}), `;
            });
    
            const imageParts = baseimgs.map(baseimg => ({
              // if(baseimg.url.includes('blob:')) {
              //   blob = baseimg.url
              // } else {
              //    blob = dataURLtoBlob(el.url);
              // }
              "inline_data": {
                "mime_type": baseimg.url.split(';')[0].split(':')[1],
                "data": baseimg.url.split(',')[1]
              }
            }));
    
            _object.contents[0].parts = [
              { "text": `${basePromt}帮我根据描述生成新的一张图: ${prompt}` },
              ...imageParts
            ];
          }
          const data = JSON.stringify(_object);      
      var config = {
         method: 'post',
         url: '/v1beta/models/gemini-2.5-flash-image:generateContent?key=',
         headers: { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json'
         },
         data : data
      };
      
      try {
        const response = await axios(config);
        let picData = {}, url = ''
        // if(baseimgs && baseimgs.length > 0) {
          const parts = response.data.candidates[0].content.parts
          const imagePart = parts.find(p => p.inlineData && p.inlineData.data);
          if (imagePart) {
            picData.data = imagePart.inlineData.data;
            picData.mimeType = imagePart.inlineData.mimeType;
            if (returnBase64) {
                return `data:${picData.mimeType};base64,${picData.data}`;
            }
            url = base64ToUrl(picData.data, picData.mimeType);
          } else {
            // Fallback or error handling if no image is returned
            console.error('No image data found in response from Gemini API');
            return null;
          }
        // } else {
        //   picData = response.data.candidates[0].content.parts[0].inlineData;
        //   url = base64ToUrl(picData.data, picData.mimeType);
        // }
        return url;
      } catch (error) {
        console.error('云雾 generate error:', error);
        return null;
      } 
    }
  }
}