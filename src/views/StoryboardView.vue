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
        <el-form-item label="视频设置">
          <el-select v-model="videoProvider" placeholder="视频提供方" style="width:160px; margin-right: 8px;">
            <el-option label="yunwu-sora" value="yunwu-sora" />
            <el-option label="kie-sora" value="kie-sora" />
          </el-select>
          <el-input v-if="videoProvider=='kie-sora'" v-model="kietoken" placeholder="kie token" style="width:300px" />
          <el-select v-model="videoSize" placeholder="视频尺寸" style="width:160px; margin-right: 8px;">
            <el-option label="9:16" value="9x16" />
            <el-option label="16:9" value="16x9" />
            <el-option label="1:1" value="1x1" />
            <el-option label="4:3" value="4x3" />
            <el-option label="3:4" value="3x4" />
          </el-select>
          <el-select v-model="videoSeconds" placeholder="视频时长" style="width:120px; margin-right: 8px;">
            <el-option label="10s" value="10" />
            <el-option label="15s" value="15" />
          </el-select>
          <el-switch v-model="videoIsPrivate" active-text="私有" style="margin-right: 8px;"/>
          <el-switch v-model="videoWatermark" active-text="水印"/>
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
        <el-table-column label="视频生成" width="150">
          <template #default="{ row, $index }">
            <div v-if="row.videoId">
              <p>ID: {{ row.videoId }}</p>
              <p>Status: {{ row.videoStatus }}</p>
              <el-progress :percentage="row.videoProgress" v-if="row.videoStatus !== 'completed'" />
              <a :href="row.videoUrl" target="_blank" v-if="row.videoUrl">查看视频</a>
              <el-button size="small" @click="checkVideoStatus($index)" :loading="videoGenerationLoading[$index]">刷新状态</el-button>
            </div>
            <el-button v-else size="small" @click="generateVideoForScene($index)" :loading="videoGenerationLoading[$index]">生成视频</el-button>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ $index }">
            <div style="display:flex; flex-direction: column; gap:8px;">
              <el-button size="small" @click="generateImageForScene($index)" :loading="imageLoading[$index]">生成图片</el-button>
              <!-- <el-button size="small" @click="regenerateImageForScene($index)" :loading="imageLoading[$index]">重新生成</el-button> -->
              <el-button size="small" type="danger" @click="remove($index)">删除此镜</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top:12px; display:flex; gap:8px;">
        <el-button @click="add">新增分镜</el-button>
        <el-button @click="clearAll">清空所有</el-button>
        <el-button type="primary" :loading="isBatchGenerating" @click="generateAllImages">批量生成所有图片</el-button>
        
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
import { ImagesAPI, FileAPI, VideosAPI } from '../services/api'
import { Delete, Plus, ZoomIn } from '@element-plus/icons-vue'

const router = useRouter()
const goBack = () => router.push('/prompt-generator');
const scenes = ref([
  { image_prompt: '', narration: '',video_promt: '', images: [], videoId: null, videoStatus: '', videoProgress: 0, videoUrl: null, videoProvider: '' }
])
const provider = ref('gpt-image-1-all')
const kietoken = ref(localStorage.getItem('kiee_token')||'')
const token = ref('')
const imageSize = ref('1024x1792')
const aspectRatio = ref('9:16')
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
  { label: 'Roblox像素风', value: 'Roblox pixel' },
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

const videoProvider = ref('yunwu-sora')
const videoSize = ref('9x16')
const videoSeconds = ref('10')
const videoIsPrivate = ref(true)
const videoWatermark = ref(false)
const videoGenerationLoading = ref({})
const videoPollingTimers = ref({}) // New ref to store polling timers

watch([provider, token], ([p, t]) => {
 if (p === 'gemini-imagen') {
   localStorage.setItem('gemini_api_key', t)
  aspectRatio.value = '16:9'
 } else {
   if(p == 'dall-e-3') {
     imageSize.value = '1024x1792'
   } else {
     imageSize.value = '1024x1536'
   }
   localStorage.setItem('apicore_token', t)
 }
})
watch(kietoken, (k)=>{
  localStorage.setItem('kiee_token', k)
})

// watch([scenes, peoples], ([newScenes, newPeoples]) => {
//       const stateToSave = {
//         scenes: newScenes,
//         peoples: newPeoples,
//         currentStoryKey: currentStoryKey.value
//       };
//       try {
//         // Save temporary state for page reloads
//         localStorage.setItem('storyboard_state', JSON.stringify(stateToSave));
//       } catch (error) {
//         if (error.name === 'QuotaExceededError') {
//           ElMessage.error('本地存储空间不足，无法保存当前状态。');
//         } else {
//           console.error('保存状态失败:', error);
//         }
//       }
    
//       // Save back to the main story record for history
//       if (currentStoryKey.value) {
//         try {
//           const storyDataJSON = localStorage.getItem(currentStoryKey.value);
//           if (storyDataJSON) {
//             const storyData = JSON.parse(storyDataJSON);
            
//             storyData.characters = newPeoples.map(p => ({
//               name: p.name,
//               description: p.description
//             }));
    
//             storyData.scenes = newScenes.map(s => ({
//               image_prompt: s.image_prompt,
//               narration: s.narration,
//               video_promt: s.video_promt,
//             }));
            
//             localStorage.setItem(currentStoryKey.value, JSON.stringify(storyData));
//           }
//         } catch (error) {
//           console.error('无法更新历史记录:', error);
//         }
//       }
//     }, { deep: true });

const add = ()=> scenes.value.push({ image_prompt: '', narration: '',video_promt: '', images: [], videoId: null, videoStatus: '', videoProgress: 0, videoUrl: null, videoProvider: '' })
const remove = (idx)=> scenes.value.splice(idx,1)

const clearAll = () => {
  scenes.value = [{ image_prompt: '', narration: '',video_promt: '', images: [], videoId: null, videoStatus: '', videoProgress: 0, videoUrl: null, videoProvider: '' }]
  peoples.value = []
  ElMessage.success('已清空所有分镜')
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
      
      // Support new format { characters: [], scenes: [] }
      if (data.scenes && Array.isArray(data.scenes)) {
        peoples.value = (data.characters || []).map(c => ({
          name: c.name || '',
          description: c.description || ''
        }));
    
        scenes.value = data.scenes.map(s => ({
          image_prompt: s.image_prompt || '',
          narration: s.narration || '',
          video_promt: s.video_promt || '',
          images: [], // images are not saved in the story, they are generated
          videoId: s.videoId || null,
          videoStatus: s.videoStatus || '',
          videoProgress: s.videoProgress || 0,
          videoUrl: s.videoUrl || null,
          videoProvider: s.videoProvider || '',
        }));
    
        storyTheme.value = localStorage.getItem('script_topic') || localStorage.getItem('story_theme') || data.topic || 'storyboard';
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
    const prompt = character.name + character.description;
    let imageUrl = '';
    if(provider.value.includes('dall-e-') || provider.value.includes('gpt-')) {
      imageUrl = await ImagesAPI.apicoreGenerateOne(prompt + ' 风格：' + image_style.value, token.value, provider.value, aspectRatio.value, imageSize.value, [], image_style.value, image_quality.value, true);
    } else {
      imageUrl = await ImagesAPI.apicoreGenerateOne(prompt + ' 风格：' + imageStyle.value, token.value, provider.value, aspectRatio.value, imageSize.value, [], null, null, true);
    }

    if (imageUrl) {
      const newUid = Date.now() + Math.random().toString(36).substring(2, 9); // Generate a unique ID
      globalBaseImages.value.push({
        uid: newUid,
        name: character.name,
        url: imageUrl,
        raw: null, // No raw file for generated images
      });
      // --- BEGIN MODIFICATION: Save image to backend ---
      try {
        const filename = `${character.name}.png`;
        await FileAPI.saveImage(storyTheme.value, filename, imageUrl);
        // ElMessage.info(`图片 ${filename} 已保存到服务器。`);
      } catch (saveError) {
        console.error('保存图片文件失败:', saveError);
        ElMessage.error('图片生成成功，但保存到服务器失败。');
      }
      // --- END MODIFICATION ---
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

const exportTexts = () => {
  let textToExport = '';
  scenes.value.forEach((scene, index) => {
    textToExport += `## 分镜 ${index + 1}\n\n`;
    textToExport += `**提示词:**\n${scene.image_prompt}\n\n`;
    textToExport += `**旁白:**\n${scene.narration || '无'}\n\n`;
    textToExport += `**视频镜头提示词:**\n${scene.video_promt || '无'}\n\n`;
    
    textToExport += '\n------------------------------------\n\n';
  });

  const blob = new Blob([textToExport], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${localStorage.getItem('script_topic') || localStorage.getItem('story_theme') || 'storyboard'}_export.txt`;
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

      // --- BEGIN MODIFICATION: Save image to backend ---
      try {
        const imageIndex = scenes.value[sceneIndex].images.length; // Get index for unique naming
        const filename = `${sceneIndex + 1}_${imageIndex}.png`;
        await FileAPI.saveImage(storyTheme.value, filename, url);
        ElMessage.info(`图片 ${filename} 已保存到服务器。`);
      } catch (saveError) {
        console.error('保存图片文件失败:', saveError);
        ElMessage.error('图片生成成功，但保存到服务器失败。');
      }
      // --- END MODIFICATION ---

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

const generateVideoForScene = async (sceneIndex) => {
  const scene = scenes.value[sceneIndex];
  
  videoGenerationLoading.value[sceneIndex] = true;
  try {
    const prompt = `${scene.image_prompt} ${scene.video_promt}`.trim();
    if (!prompt) {
      ElMessage.warning('请至少输入图片或视频提示词');
      return;
    }

    scene.videoProvider = videoProvider.value;
    let data;

    if (scene.videoProvider === 'yunwu-sora') {
      const imageUrl = (scene.images && scene.images.length > 0) ? scene.images[0] : null;
      data = await VideosAPI.generateYunwuVideo(
        prompt,
        videoSeconds.value,
        imageUrl,
        videoSize.value,
        videoWatermark.value,
        videoIsPrivate.value,
        token.value
      );
      scene.videoId = data.id;
      scene.videoStatus = data.status;
      scene.videoProgress = data.progress;
    } else if (scene.videoProvider === 'kie-sora') {
      const aspectRatioMap = {
        '9x16': 'portrait',
        '16x9': 'landscape',
        '1x1': 'square',
        '4x3': 'landscape', // Not a perfect match
        '3x4': 'portrait', // Not a perfect match
      };
      const aspectRatio = aspectRatioMap[videoSize.value] || 'landscape';
      data = await VideosAPI.generateKieVideo(
        prompt,
        videoSeconds.value,
        aspectRatio,
        !videoWatermark.value,
        kietoken.value
      );
      if (data.code === 200) {
        scene.videoId = data.data.taskId;
        scene.videoStatus = 'queued';
        scene.videoProgress = 0;
      } else {
        throw new Error(data.message || 'Failed to create video task');
      }
    }

    ElMessage.success(`分镜 ${sceneIndex + 1} 视频生成任务已创建`);
    checkVideoStatus(sceneIndex, true);

  } catch (e) {
    console.error(e);
    ElMessage.error(`分镜 ${sceneIndex + 1} 视频生成失败: ${e.message}`);
  } finally {
    videoGenerationLoading.value[sceneIndex] = false;
  }
}

const checkVideoStatus = async (sceneIndex, isPolling = false) => {
  const scene = scenes.value[sceneIndex];
  if (!scene.videoId) {
    ElMessage.warning('没有视频ID');
    return;
  }

  if (videoPollingTimers.value[sceneIndex]) {
    clearTimeout(videoPollingTimers.value[sceneIndex]);
    delete videoPollingTimers.value[sceneIndex];
  }

  videoGenerationLoading.value[sceneIndex] = true;
  try {
    let data;
    if (scene.videoProvider === 'yunwu-sora') {
      const statusResponse = await VideosAPI.getYunwuVideoStatus(scene.videoId, token.value);
      scene.videoStatus = statusResponse.status;
      scene.videoProgress = statusResponse.progress || 0;

      if (statusResponse.status === 'completed') {
        // const contentResponse = await VideosAPI.getYunwuVideoContent(scene.videoId, token.value);
        if (statusResponse.video_url) {
          scene.videoUrl = statusResponse.video_url;
          ElMessage.success(`分镜 ${sceneIndex + 1} 视频已生成`);
          // Save video URL to backend
          try {
            const filename = `${storyTheme.value}_scene_${sceneIndex + 1}_video.mp4`;
            await FileAPI.saveImage(storyTheme.value, filename, statusResponse.video_url);
            ElMessage.info(`视频 ${filename} 已保存到服务器。`);
          } catch (saveError) {
            console.error('保存视频文件失败:', saveError);
            ElMessage.error('视频生成成功，但保存到服务器失败。');
          }
        } else {
          ElMessage.error(`分镜 ${sceneIndex + 1} 视频生成成功，但未获取到视频URL。`);
        }
      } else if (statusResponse.status === 'failed' || statusResponse.status === 'error') {
        ElMessage.error(`分镜 ${sceneIndex + 1} 视频生成失败: ${statusResponse.status}`);
      } else {
        ElMessage.info(`分镜 ${sceneIndex + 1} 视频状态: ${statusResponse.status}, 进度: ${scene.videoProgress}%`);
        videoPollingTimers.value[sceneIndex] = setTimeout(() => checkVideoStatus(sceneIndex, true), 10000);
      }
    } else if (scene.videoProvider === 'kie-sora') {
      data = await VideosAPI.getKieVideoStatus(scene.videoId, kietoken.value);
      if (data.code === 200) {
        const videoData = data.data;
        scene.videoStatus = videoData.state;
        if (videoData.state === 'success') {
          scene.videoProgress = 100;
          const result = JSON.parse(videoData.resultJson);
          if (result.resultUrls && result.resultUrls.length > 0) {
            scene.videoUrl = result.resultUrls[0];
            ElMessage.success(`分镜 ${sceneIndex + 1} 视频已生成`);
            // Save video URL to backend
            try {
              const filename = `${storyTheme.value}_scene_${sceneIndex + 1}_video.mp4`;
              await FileAPI.saveImage(storyTheme.value, filename, scene.videoUrl);
              ElMessage.info(`视频 ${filename} 已保存到服务器。`);
            } catch (saveError) {
              console.error('保存视频文件失败:', saveError);
              ElMessage.error('视频生成成功，但保存到服务器失败。');
            }
          }
        } else if (videoData.state === 'fail') {
          ElMessage.error(`分镜 ${sceneIndex + 1} 视频生成失败: ${videoData.failMsg}`);
        } else {
          ElMessage.info(`分镜 ${sceneIndex + 1} 视频状态: ${videoData.state}`);
          videoPollingTimers.value[sceneIndex] = setTimeout(() => checkVideoStatus(sceneIndex, true), 10000);
        }
      } else {
        throw new Error(data.message || 'Failed to get video status');
      }
    }
  } catch (e) {
    console.error(e);
    ElMessage.error(`分镜 ${sceneIndex + 1} 视频状态更新失败: ${e.message}`);
  } finally {
    if (!isPolling || scene.videoUrl || scene.videoStatus === 'failed' || scene.videoStatus === 'error' || scene.videoStatus === 'fail' || scene.videoStatus === 'success') {
      videoGenerationLoading.value[sceneIndex] = false;
    }
  }
}

onMounted(() => {
  if (provider.value === 'gemini-imagen') {
    token.value = localStorage.getItem('gemini_api_key') || ''
  } else {
    token.value = localStorage.getItem('apicore_token') || ''
  }
  storyTheme.value = localStorage.getItem('script_topic') || localStorage.getItem('story_theme') || 'storyboard';
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
