<template>
  <div style="padding:16px;">
    <el-page-header content="分镜图片生成" @back="goBack">
      <template #extra>
        <div style="display: flex; align-items: center; gap: 16px;">
          <el-button @click="showHistoryDialog = true">历史记录</el-button>
          <el-button @click="exportTexts" v-if="scenes.length > 0">一键导出文案</el-button>
          <el-button @click="router.push('/prompt-generator')">返回提示词生成</el-button>
        </div>
      </template>
    </el-page-header>
    
    <el-card style="margin-top:12px;">
      
      <el-form :model="form" label-width="80px" inline>
        <el-form-item label="API Key">
          <el-input v-model="token" placeholder="API_KEY" style="width:400px" />
        </el-form-item>
        <el-form-item label="提供方">
          <el-select v-model="provider" placeholder="提供方" style="width:300px">
            <!-- $0.048000 -->
            <el-option label="yunwu(gpt-image-1-all)($0.08)(质量好)" value="gpt-image-1-all" />
            <el-option label="yunwu(dall-e-3)($0.048,不能垫图,限时特惠，质量不太好)" value="dall-e-3" />
            <el-option label="yunwu(gpt-4o-image-vip)($0.12)(质量好)" value="gpt-4o-image-vip" />
            <!-- sora-image -->
            <!-- $0.09 -->
            <el-option label="yunwu(gemini-2.5-flash-image-preview)($0.09)(质量好)" value="gemini-2.5-flash-image-preview" />
            <!-- seedream $0.240000-->
            <el-option label="yunwu(seedream)($0.24)" value="doubao-seedream-4-0-250828" />

            <!-- gemini 官方生图 -->
            <el-option label="Gemini Imagen (官方)" value="gemini-imagen" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="图片设置">
          
          <el-select v-if="provider.includes('gemini')" v-model="aspectRatio" placeholder="图片比例" style="width:160px; margin-right: 8px;">
            <el-option label="16:9" value="16:9" />
            <el-option label="9:16" value="9:16" />
            <el-option label="1:1" value="1:1" />
          </el-select>
          <el-select v-if="provider.includes('gemini-imagen') || provider.includes('seedream')" v-model="imageSize" placeholder="图片尺寸" style="width:160px">
            
            <el-option label="1K" value="1K" />
            <el-option label="2K" value="2K" />
            <el-option label="4K" value="4K" />
          </el-select>
          <!-- gpt 生图 -->
          <el-select v-if="provider.includes('gpt-')" v-model="imageSize" placeholder="图片尺寸" style="width:160px">
            <el-option label="1536x1024(4:3)" value="1536x1024" />
            <el-option label="1024x1536(3:4)" value="1024x1536" />
            <el-option label="1024x1024(1:1)" value="1024x1024" />
          </el-select>
          <el-select v-if="provider.includes('dall-e-')" v-model="imageSize" placeholder="图片尺寸" style="width:160px">
            <el-option label="1792x1024(16:9)" value="1792x1024" />
            <el-option label="1024x1792(9:16)" value="1024x1792" />
            <el-option label="1024x1024(1:1)" value="1024x1024" />
          </el-select>
        </el-form-item>
        <el-form-item label="图片风格" v-if="provider.includes('dall-e-') || provider.includes('gpt-')">
          <el-select v-model="image_style" placeholder="选择图片风格" style="width:160px;">
            <el-option v-for="style in style_options" :key="style.value" :label="style.label" :value="style.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="图片风格" v-else>
          <el-select v-model="imageStyle" placeholder="选择图片风格" style="width:160px;">
            <el-option v-for="style in styleOptions" :key="style.value" :label="style.label" :value="style.value" />
          </el-select>
        </el-form-item>
        <!-- image_quality 高清开关 -->
        <el-form-item label="图片质量" v-if="provider.includes('dall-e-') || provider.includes('gpt-')">
          <el-switch
            v-model="image_quality"
            active-text="高清"
            inactive-text="普通"
            active-value="hd"
            inactive-value="standard"
          />
        </el-form-item>
        <el-form-item label="启用垫图">
          <el-switch v-model="enableBaseImage" />
        </el-form-item>
        <el-form-item label="全局垫图">
          <el-upload
            action="#"
            list-type="picture-card"
            :auto-upload="false"
            :on-change="handleGlobalImageChange"
            :on-remove="handleGlobalImageRemove"
            :file-list="globalBaseImages"
            multiple
          >
            <el-icon><Plus /></el-icon>
            <template #file="{ file }">
              <div >
                <img class="el-upload-list__item-thumbnail" :src="file.url" alt="" />
                <span class="el-upload-list__item-actions">
                  <span
                    class="el-upload-list__item-preview"
                    @click="previewImage(file.url)"
                  >
                    <el-icon><zoom-in /></el-icon>
                  </span>
                  <span
                    v-if="!file.disabled"
                    class="el-upload-list__item-delete"
                    @click="handleGlobalImageRemove(file)"
                  >
                    <el-icon><Delete /></el-icon>
                  </span>
                </span>
              </div>
              <el-input v-model="file.name" @keydown.delete.stop placeholder="输入名称" size="small" style="position: absolute; left:0; width: 130px; margin-top: 5px;" @input="(value) => { const img = globalBaseImages.find(i => i.uid === file.uid); if (img) img.name = value; }" />
            </template>
          </el-upload>
        </el-form-item>
      </el-form>

      <el-divider />

      <div v-if="peoples.length > 0" style="margin-bottom: 12px;">
        <h3>角色垫图生成</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
          <el-card v-for="(person, index) in peoples" :key="index" style="width: 200px;">
            <template #header>
              <div class="card-header">
                <span>{{ person.name }}</span>
                <el-button type="primary" size="small" @click="generateCharacterImage(person)" :loading="characterImageLoading[person.name]">生成图片</el-button>
              </div>
            </template>
            <p>{{ person.description }}</p>
          </el-card>
        </div>
      </div>

      <el-table :data="scenes" style="width:100%" size="small">
        <el-table-column label="#" width="50">
          <template #default="{ $index }">{{ $index+1 }}</template>
        </el-table-column>
        <el-table-column label="提示词" min-width="300">
          <template #default="{ row }">
            <el-input v-model="row.image_prompt" type="textarea" :rows="5" placeholder="请输入图片生成提示词..." />
          </template>
        </el-table-column>
        <el-table-column label="生成的图片">
          <template #default="{ row, $index }">
            <div v-if="row.images && row.images.length > 0" style="display:flex; gap:8px; flex-wrap:wrap; padding: 8px 0;">
              <div v-for="(img, idx) in row.images" :key="idx" style="position:relative; border:1px solid #e0e0e0; border-radius:6px; overflow:hidden; width: 120px; height: 90px;">
                <img :src="img" style="width:100%; height:100%; object-fit:cover; cursor:pointer;" @click="previewImage(img)" />
                <div style="position:absolute; top:0; right:0; background: rgba(0,0,0,0.5); padding: 2px;">
                  <el-button-group>
                    <el-button size="small" type="primary" :icon="Download" style="width: 24px; height: 24px;" @click="handleDownload(img, $index, idx)" />
                    <el-button size="small" type="danger" :icon="Delete" style="width: 24px; height: 24px;" @click="removeImage($index, idx)" />
                  </el-button-group>
                </div>
              </div>
            </div>
            <div v-else style="color:#999; font-size:12px; padding:20px; text-align:center; border:1px dashed #ddd; border-radius:4px; margin: 8px 0;">未生成图片</div>
          </template>
        </el-table-column>
        <el-table-column label="旁白" min-width="300">
          <template #default="{ row }">
            <el-input v-model="row.narration" type="textarea" :rows="5" placeholder="请输入旁白文本..." />
          </template>
        </el-table-column>
        <el-table-column label="视频镜头" min-width="100">
          <template #default="{ row }">
            <el-input v-model="row.video_promt" type="textarea" :rows="5" placeholder="请输入视频镜头..." />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ $index }">
            <div style="display:flex; flex-direction: column; gap:8px;">
              <el-button size="small" @click="generateImageForScene($index)" :loading="imageLoading[$index]">生成图片</el-button>
              <el-button size="small" @click="regenerateImageForScene($index)" :loading="imageLoading[$index]">重新生成</el-button>
              <el-button size="small" type="danger" @click="remove($index)">删除此镜</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top:12px; display:flex; gap:8px;">
        <el-button @click="add">新增分镜</el-button>
        <el-button @click="clearAll">清空所有</el-button>
        <el-button type="primary" :loading="isBatchGenerating" @click="generateAllImages">批量生成所有图片</el-button>
        <el-button type="success" @click="downloadAllImages" :disabled="scenes.every(s => !s.images || s.images.length === 0)">批量下载所有图片</el-button>
        
      </div>
    </el-card>

    <!-- 图片预览对话框 -->
    <el-dialog v-model="showImagePreview" title="图片预览" width="70%">
      <img v-if="previewImageUrl" :src="previewImageUrl" style="width:100%; height:auto; border-radius: 8px;" />
      <template #footer>
        <el-button @click="showImagePreview=false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- History Dialog -->
    <el-dialog v-model="showHistoryDialog" title="历史记录" width="70%">
      <el-table :data="savedStories" style="width: 100%" max-height="60vh">
        <el-table-column prop="topic" label="故事主题" min-width="200" />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button size="small" @click="loadStory(row.key, true)">加载</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ImagesAPI } from '../services/api'
import { Download, Delete, Plus, ZoomIn } from '@element-plus/icons-vue'

const router = useRouter()
const goBack = () => router.push('/prompt-generator');
const scenes = ref([
  { image_prompt: '', narration: '',video_promt: '', images: [] }
])
const provider = ref('gpt-image-1-all')
const token = ref('')
const imageSize = ref('1792x1024')
const aspectRatio = ref('16:9')
const storyTheme = ref('storyboard')
const imageStyle = ref('') // Default to no style
const styleOptions = ref([
  { label: '无风格', value: '' },
  { label: '3D卡通', value: 'Cartoon Games 3D' },
  { label: '索尼影片', value: 'Sony Pictures Animation' },
  { label: '动漫', value: 'anime style' },
  { label: '像素艺术', value: 'pixel art style' },
  { label: '低多边形', value: 'low poly style' },
  { label: '写实', value: 'photorealistic' },
])

const image_style = ref('natural')
const image_quality = ref('standard')
const style_options = ref([
  { label: '自然', value: 'natural' },
  { label: '超现实和戏剧性', value: 'vivid' }
])

const imageLoading = ref({})
const isBatchGenerating = ref(false)
const showImagePreview = ref(false)
const previewImageUrl = ref('')
const showHistoryDialog = ref(false)
const savedStories = ref([])
const globalBaseImages = ref([]) // { uid, name, url, raw }
const enableBaseImage = ref(true) // New ref for the toggle switch
const characterImageLoading = ref({}) // New ref to track loading state for character images
const currentStoryKey = ref(null)
const peoples = ref([])

watch([provider, token], ([p, t]) => {
  if (p === 'gemini-imagen') {
    localStorage.setItem('gemini_api_key', t)
   aspectRatio.value = '16:9'
  } else {
    if(p == 'dall-e-3') {
      imageSize.value = '1792x1024'
    } else {
      imageSize.value = '1536x1024'
    }
    localStorage.setItem('apicore_token', t)
  }
})

watch([scenes, peoples], ([newScenes, newPeoples]) => {
  const stateToSave = {
    scenes: newScenes,
    peoples: newPeoples,
    currentStoryKey: currentStoryKey.value
  };
  try {
    // Save temporary state for page reloads
    localStorage.setItem('storyboard_state', JSON.stringify(stateToSave));
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      ElMessage.error('本地存储空间不足，无法保存当前状态。');
    } else {
      console.error('保存状态失败:', error);
    }
  }

  // Save back to the main story record for history
  if (currentStoryKey.value) {
    try {
      const storyDataJSON = localStorage.getItem(currentStoryKey.value);
      if (storyDataJSON) {
        const storyData = JSON.parse(storyDataJSON);
        
        let scenesToSave = newScenes.map(s => ({
          image_prompt: s.image_prompt,
          narration: s.narration,
          video_promt: s.video_promt,
        }));

        if (newPeoples.length > 0) {
            const characterScene = {
                image_prompt: newPeoples.map(p => `${p.name}:${p.description}`),
                narration: '',
                video_promt: ''
            };
            scenesToSave.unshift(characterScene);
        }
        
        storyData.scenes = scenesToSave;
        localStorage.setItem(currentStoryKey.value, JSON.stringify(storyData));
      }
    } catch (error) {
      console.error('无法更新历史记录:', error);
    }
  }
}, { deep: true });

const add = ()=> scenes.value.push({ image_prompt: '', narration: '',video_promt: '', images: [] })
const remove = (idx)=> scenes.value.splice(idx,1)

const clearAll = () => {
  scenes.value = [{ image_prompt: '', narration: '',video_promt: '', images: [] }]
  peoples.value = []
  ElMessage.success('已清空所有分镜')
}
const loadFromPromptGenerator = () => {
  try {
    const stored = localStorage.getItem('storyboard_scenes')
    scenes.value = []
    peoples.value = []
    if (stored) {
      const loadedScenes = JSON.parse(stored)
      if (Array.isArray(loadedScenes) && loadedScenes.length > 1) {
         loadedScenes.map((s,_idx) => {
          if(_idx == 0 && Array.isArray(s.image_prompt)) {
            // Assuming the first scene prompt describes characters
            // Format: CharacterName:Description;CharacterName2:Description2
            const characterStrings = s.image_prompt
            peoples.value = characterStrings.map(str => {
              const [name, description] = str.split(':');
              return { name: name.trim(), description: description ? description.trim() : name.trim() + ' profile image' };
            });
          } else {
            scenes.value.push({ ...s, images: [] });
          }
         });
        ElMessage.success(`已加载 ${loadedScenes.length} 个分镜`)
        localStorage.removeItem('storyboard_scenes')
      } else if (Array.isArray(loadedScenes) && loadedScenes.length === 1) {
        // If only one scene, assume it's character prompt
        const s = loadedScenes[0];
        const characterStrings = s.image_prompt.split(';').filter(str => str.trim() !== '');
          peoples.value = characterStrings.map(str => {
            const [name, description] = str.split(':');
            return { name: name.trim(), description: description ? description.trim() : name.trim() + ' profile image' };
          });
        ElMessage.warning('检测到单个分镜数据，尝试解析为角色信息');
      } else {
        ElMessage.warning('没有可用的分镜数据')
      }
    } else {
      ElMessage.warning('没有找到保存的分镜数据')
    }
  } catch (error) {
    console.error('加载分镜数据失败:', error)
    ElMessage.error('加载失败，数据可能已损坏')
  }
}

const getStoryIndex = () => JSON.parse(localStorage.getItem('story_index') || '[]');

const loadHistory = () => {
  const index = getStoryIndex();
  savedStories.value = index.map(key => {
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    return { key, topic: data.topic, createdAt: data.createdAt };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const loadStory = (key, closeDialog = true) => {
  const data = JSON.parse(localStorage.getItem(key) || '{}');
  if (data.scenes && Array.isArray(data.scenes)) {
    scenes.value = [];
    peoples.value = [];
    const loadedScenes = data.scenes;

    if (loadedScenes.length > 0) {
        const firstScene = loadedScenes[0];
        let isCharacterScene = false;

        // Check if it's a character scene (either as array or corrupted string)
        if (Array.isArray(firstScene.image_prompt)) {
            isCharacterScene = true;
        } else if (typeof firstScene.image_prompt === 'string' && firstScene.image_prompt.includes(':') && !firstScene.narration && !firstScene.video_promt) {
            isCharacterScene = true;
        }

        if (isCharacterScene) {
            const characterStrings = Array.isArray(firstScene.image_prompt) 
                ? firstScene.image_prompt 
                : firstScene.image_prompt.split(',');

            peoples.value = characterStrings.map(str => {
                const [name, ...descParts] = str.split(':');
                const description = descParts.join(':').trim();
                return { name: name.trim(), description: description || name.trim() + ' profile image' };
            });

            // The rest of the scenes
            scenes.value = loadedScenes.slice(1).map(s => ({
                image_prompt: s.image_prompt || '',
                narration: s.narration || '',
                video_promt: s.video_promt || '',
                images: [],
            }));
        } else {
            // No character scene found, treat all as normal scenes
            scenes.value = loadedScenes.map(s => ({
                image_prompt: s.image_prompt || '',
                narration: s.narration || '',
                video_promt: s.video_promt || '',
                images: [],
            }));
        }
    }

    storyTheme.value = data.topic || 'storyboard';
    currentStoryKey.value = key;
    if (closeDialog) {
      showHistoryDialog.value = false;
    }
    ElMessage.success(`已加载分镜: ${data.topic}`);
  } else {
    ElMessage.warning('此历史记录中没有可用的分镜数据。');
  }
};

const handleGlobalImageChange = (file, fileList) => {
  console.log(file)
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64Url = e.target.result;
    const initialName = file.name.split('.').slice(0, -1).join('.');
    const existingIndex = globalBaseImages.value.findIndex(img => img.uid === file.uid);
    if (existingIndex !== -1) {
      // Update existing file (e.g., if file.url was a blob URL and now it's base64)
      globalBaseImages.value[existingIndex].url = base64Url;
      globalBaseImages.value[existingIndex].name = initialName;
      // globalBaseImages.value[existingIndex].custom_name = custom_name;
      globalBaseImages.value[existingIndex].raw = file.raw;
    } else {
      globalBaseImages.value.push({
        uid: file.uid,
        name: initialName,
        // custom_name: file.custom_name,
        url: base64Url,
        raw: file.raw,
      });
    }
    // ElMessage.success(`垫图 ${file.custom_name} 已添加`);
  };
  reader.readAsDataURL(file.raw);
};

const handleGlobalImageRemove = (file) => {
  globalBaseImages.value = globalBaseImages.value.filter(img => img.uid !== file.uid);
  ElMessage.info(`垫图 ${file.name} 已移除`);
};

const previewImage = (imageUrl) => {
  previewImageUrl.value = imageUrl
  showImagePreview.value = true
}

const removeImage = (sceneIndex, imageIndex) => {
  scenes.value[sceneIndex].images.splice(imageIndex, 1)
}

const generateCharacterImage = async (character) => {
  characterImageLoading.value[character.name] = true;
  try {
    const prompt = character.description;
    let imageUrl = '';
    if(provider.value.includes('dall-e-') || provider.value.includes('gpt-')) {
      imageUrl = await ImagesAPI.apicoreGenerateOne(prompt, token.value, provider.value, aspectRatio.value, imageSize.value, [], image_style.value, image_quality.value, true);
    } else {
      imageUrl = await ImagesAPI.apicoreGenerateOne(prompt, token.value, provider.value, aspectRatio.value, imageSize.value, [], null, null, true);
    }

    if (imageUrl) {
      const newUid = Date.now() + Math.random().toString(36).substring(2, 9); // Generate a unique ID
      globalBaseImages.value.push({
        uid: newUid,
        name: character.name,
        url: imageUrl,
        raw: null, // No raw file for generated images
      });
      ElMessage.success(`角色 ${character.name} 图片生成成功`);
    } else {
      ElMessage.error(`角色 ${character.name} 图片生成失败`);
    }
  } catch (e) {
    console.error(e);
    ElMessage.error(`角色 ${character.name} 图片生成失败: ${e.message}`);
  } finally {
    characterImageLoading.value[character.name] = false;
  }
};

const downloadImage = async (url, filename) => {
  try {
    if (url.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.removeChild(a);
        return;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok.');
    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.removeChild(a);
    window.URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.error('Download failed:', error);
    ElMessage.error('图片下载失败。请尝试右键-图片另存为。');
    window.open(url, '_blank');
  }
};

const handleDownload = (url, sceneIndex, imageIndex) => {
  const now = new Date();
  const timestamp = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') + '_' +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0');
  const filename = `${timestamp}_scene_${sceneIndex + 1}_img_${imageIndex + 1}.png`;
  downloadImage(url, filename);
}

const downloadAllImages = async () => {
  const totalImages = scenes.value.reduce((acc, s) => acc + (s.images?.length || 0), 0);
  if (totalImages === 0) {
    ElMessage.warning('没有可下载的图片。');
    return;
  }
  ElMessage.info(`开始批量下载 ${totalImages} 张图片...`);
  for (let i = 0; i < scenes.value.length; i++) {
    if (scenes.value[i].images) {
      for (let j = 0; j < scenes.value[i].images.length; j++) {
        const imgUrl = scenes.value[i].images[j];
        await handleDownload(imgUrl, i, j);
        await new Promise(resolve => setTimeout(resolve, 300)); // Stagger downloads
      }
    }
  }
}

const exportTexts = () => {
  let textToExport = '';
  scenes.value.forEach((scene, index) => {
    textToExport += `## 分镜 ${index + 1}\n\n`;
    textToExport += `**提示词:**\n${scene.image_prompt}\n\n`;
    textToExport += `**旁白:**\n${scene.narration || '无'}\n\n`;
    textToExport += `**视频镜头提示词:**\n${scene.video_promt || '无'}\n\n`;
    
    if (scene.images && scene.images.length > 0) {
      textToExport += '**图片链接:**\n';
      scene.images.forEach((image) => {
        textToExport += `${image}\n`;
      });
    } else {
      textToExport += '**图片链接:**\n无\n';
    }
    textToExport += '\n------------------------------------\n\n';
  });

  const blob = new Blob([textToExport], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${storyTheme.value || 'storyboard'}_export.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  ElMessage.success('文案已导出为 TXT 文件');
};

const generateImageForScene = async (sceneIndex) => {
  const scene = scenes.value[sceneIndex];
  if (!scene.image_prompt.trim()) {
    ElMessage.warning('请先输入提示词');
    return false;
  }

  let referenceImages = [];
  if (enableBaseImage.value) {
    // Find matching base images only if enabled
    referenceImages = globalBaseImages.value
      .filter(img => scene.image_prompt.includes(img.name))
      .map(img => ({ name: img.name, url: img.url }));

    if (referenceImages.length > 0) {
      const imageNames = referenceImages.map(img => img.name).join(', ');
      ElMessage.info(`分镜 ${sceneIndex + 1} 将使用垫图: ${imageNames}`);
    }
  }
  
  imageLoading.value[sceneIndex] = true;
  try {
    const finalPrompt = imageStyle.value ? `${scene.image_prompt} ${imageStyle.value}` : scene.image_prompt;
    let url = ''
    if(provider.value.includes('dall-e-') || provider.value.includes('gpt-')) {
      url = await ImagesAPI.apicoreGenerateOne(finalPrompt, token.value, provider.value, aspectRatio.value, imageSize.value, referenceImages, image_style.value, image_quality.value);
    } else {
      url = await ImagesAPI.apicoreGenerateOne(finalPrompt, token.value, provider.value, aspectRatio.value, imageSize.value, referenceImages);

    }

    if (url) {
      if (!scenes.value[sceneIndex].images) {
        scenes.value[sceneIndex].images = [];
      }
      scenes.value[sceneIndex].images.push(url);
      ElMessage.success(`分镜 ${sceneIndex + 1} 图片生成成功`);
      return true;
    } else {
      ElMessage.error(`分镜 ${sceneIndex + 1} 图片生成失败`);
      return false;
    }
  } catch (e) {
    console.error(e);
    ElMessage.error(`分镜 ${sceneIndex + 1} 图片生成失败: ${e.message}`);
    return false;
  } finally {
    imageLoading.value[sceneIndex] = false;
  }
}

const regenerateImageForScene = async (sceneIndex) => {
  scenes.value[sceneIndex].images = [];
  return await generateImageForScene(sceneIndex);
}

const generateAllImages = async () => {
  const scenesToGenerate = scenes.value
    .map((s, i) => ({ scene: s, index: i }))
    .filter(item => item.scene.image_prompt.trim() && (!item.scene.images || item.scene.images.length === 0));

  if (scenesToGenerate.length === 0) {
    ElMessage.warning('所有分镜都已有图片，或没有输入提示词。');
    return;
  }

  isBatchGenerating.value = true;
  ElMessage.info(`开始批量生成 ${scenesToGenerate.length} 张图片...`);

  const batchSize = 6;
  let failedScenes = [];

  try {
    for (let i = 0; i < scenesToGenerate.length; i += batchSize) {
      const batch = scenesToGenerate.slice(i, i + batchSize);
      ElMessage.info(`正在生成第 ${i + 1} 到 ${i + batch.length} 张图片...`);
      
      const generationPromises = batch.map(async (item) => {
        const success = await generateImageForScene(item.index);
        if (!success) {
          failedScenes.push(item);
        }
      });
      
      await Promise.all(generationPromises);
      if (scenesToGenerate.length > batchSize) {
        ElMessage.success(`批次 ${Math.floor(i / batchSize) + 1} 已完成。`);
      }
    }

    let retryCount = 0;
    while (failedScenes.length > 0 && retryCount < 3) {
        retryCount++;
        ElMessage.warning(`${failedScenes.length} 张图片生成失败，正在进行第 ${retryCount} 次重试...`);
        
        const currentFailures = [...failedScenes];
        failedScenes = [];

        const retryPromises = currentFailures.map(async (item) => {
            const success = await regenerateImageForScene(item.index);
            if (!success) {
                failedScenes.push(item);
            }
        });
        await Promise.all(retryPromises);
    }

    if (failedScenes.length > 0) {
        ElMessage.error(`${failedScenes.length} 张图片经过3次重试后仍然生成失败。`);
    } else {
        ElMessage.success('所有图片已生成完毕。');
    }

  } catch (e) {
    console.error(e);
    ElMessage.error(`批量生成过程中出现错误: ${e.message}`);
  } finally {
    isBatchGenerating.value = false;
  }
}

onMounted(() => {
  if (provider.value === 'gemini-imagen') {
    token.value = localStorage.getItem('gemini_api_key') || ''
  } else {
    token.value = localStorage.getItem('apicore_token') || ''
  }
  storyTheme.value = localStorage.getItem('story_theme') || 'storyboard';
  loadHistory();

  const fromGenerator = localStorage.getItem('from_prompt_generator');
  const incomingStoryKey = localStorage.getItem('current_story_key');

  if (fromGenerator === 'true') {
    localStorage.removeItem('from_prompt_generator');
    const savedStateJSON = localStorage.getItem('storyboard_state');
    let stateLoaded = false;
    if (savedStateJSON) {
        try {
            const savedState = JSON.parse(savedStateJSON);
            // If the state we have saved belongs to the story we're coming from, load it
            if (savedState.currentStoryKey === incomingStoryKey) {
                scenes.value = savedState.scenes;
                if (savedState.peoples && Array.isArray(savedState.peoples)) {
                  peoples.value = savedState.peoples;
                }
                currentStoryKey.value = savedState.currentStoryKey;
                ElMessage.success('已恢复您对该故事的编辑');
                stateLoaded = true;
            }
        } catch (e) {
            console.error("解析 storyboard_state 失败", e);
        }
    }

    // If we didn't load a previous state (either it didn't exist or was for a different story)
    if (!stateLoaded) {
        if (incomingStoryKey) {
            ElMessage.info('加载新故事分镜...');
            loadStory(incomingStoryKey, false); // This loads the base scenes
            currentStoryKey.value = incomingStoryKey;
        } else {
            // This case should ideally not happen if the generator works correctly
            scenes.value = [{ image_prompt: '', narration: '',video_promt: '', images: [] }];
            currentStoryKey.value = null;
        }
    }
  } else {
    // This is a normal page refresh, not a navigation from the generator
    const savedStateJSON = localStorage.getItem('storyboard_state');
    if (savedStateJSON) {
      try {
        const savedState = JSON.parse(savedStateJSON);
        if (savedState.scenes && Array.isArray(savedState.scenes)) {
          scenes.value = savedState.scenes;
          if (savedState.peoples && Array.isArray(savedState.peoples)) {
            peoples.value = savedState.peoples;
          }
          currentStoryKey.value = savedState.currentStoryKey;
          ElMessage.success('已恢复上次的编辑状态');
        }
      } catch (e) {
        console.error("解析 storyboard_state 失败", e);
        localStorage.removeItem('storyboard_state'); // Clear corrupted state
      }
    }
  }
});

</script>

<style scoped>
.el-button-group {
  display: inline-flex;
  vertical-align: middle;
}
</style>
