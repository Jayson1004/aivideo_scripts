<template>
  <div style="padding:16px;">
    <el-page-header content="分镜制作流程" @back="goBack">
      <template #extra>
        <div style="display: flex; align-items: center; gap: 16px;">
          <el-button @click="showHistoryDialog = true">历史记录</el-button>
          <el-button @click="exportToCSV" v-if="scenes.length > 0">导出为CSV</el-button>
          <el-button @click="router.push('/prompt-generator')">返回提示词生成</el-button>
        </div>
      </template>
    </el-page-header>

    <el-input v-model="storyTheme" placeholder="为你的故事起个名字吧" size="large" style="margin-top:16px;">
      <template #prepend>故事主题</template>
    </el-input>

    <el-card style="margin-top:12px;">

      <el-form label-width="80px" inline>
        <el-form-item label="提供方">
          <el-select v-model="provider" placeholder="提供方" style="width:300px">
            <el-option label="yunwu(gpt-image-1-all)($0.08)(质量好)" value="gpt-image-1-all" />
            <el-option label="yunwu(dall-e-3)($0.048,不能垫图,限时特惠，质量不太好)" value="dall-e-3" />
            <el-option label="yunwu(gpt-4o-image-vip)($0.12)(质量好)" value="gpt-4o-image-vip" />
            <el-option label="yunwu(gemini-2.5-flash-image-preview)($0.09)(质量好)" value="gemini-2.5-flash-image" />
            <el-option label="yunwu(gemini-3-pro-image-preview)($0.318)(质量好)" value="gemini-3-pro-image-preview" />
            <el-option label="yunwu(seedream)($0.24)" value="doubao-seedream-4-0-250828" />
            <el-option label="Gemini Imagen (官方)" value="gemini-imagen" />
          </el-select>
        </el-form-item>

        <el-form-item label="图片设置">
          <el-select v-if="provider.includes('gemini')" v-model="aspectRatio" placeholder="图片比例"
            style="width:160px; margin-right: 8px;">
            <el-option label="16:9" value="16:9" />
            <el-option label="9:16" value="9:16" />
            <el-option label="1:1" value="1:1" />
          </el-select>
          <el-select v-if="provider.includes('gemini-imagen') || provider.includes('seedream')" v-model="imageSize"
            placeholder="图片尺寸" style="width:160px">
            <el-option label="1K" value="1K" />
            <el-option label="2K" value="2K" />
            <el-option label="4K" value="4K" />
          </el-select>
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
        <el-form-item label="图片质量" v-if="provider.includes('dall-e-') || provider.includes('gpt-')">
          <el-switch v-model="image_quality" active-text="高清" inactive-text="普通" active-value="hd"
            inactive-value="standard" />
        </el-form-item>
        <el-form-item label="启用垫图">
          <el-switch v-model="enableBaseImage" />
        </el-form-item>
        <el-form-item label="视频设置">
          <el-select v-model="videoProvider" placeholder="视频提供方" style="width:160px; margin-right: 8px;">
            <el-option label="yunwu-sora" value="yunwu-sora" />
            <el-option label="kie-sora" value="kie-sora" />
          </el-select>
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
          <el-switch v-model="videoIsPrivate" active-text="私有" style="margin-right: 8px;" />
          <el-switch v-model="videoWatermark" active-text="水印" />
        </el-form-item>
      </el-form>

      <el-divider />

      <div v-if="peoples.length > 0" style="margin-bottom: 12px;">
        <h3>角色垫图</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 16px;">
          <el-card v-for="person in peoples" :key="person.name" style="width: 240px;">
            <template #header>
              <div class="card-header">
                <span>{{ person.name }}</span>
              </div>
            </template>
            <div class="character-card-content">
              <textarea class="character-desc" v-model="person.description"></textarea>
              <el-image v-if="person.url" :src="person.url" fit="cover" class="character-image" @click="previewImage(person)"/>
              <el-upload
                v-else
                action="#"
                accept=".jpg,.jpeg,.png,.webp"
                :show-file-list="false"
                :auto-upload="false"
                :on-change="(file) => handleCharacterImageChange(file, person)"
                class="character-uploader"
              >
                <el-icon><Plus /></el-icon>
              </el-upload>
              <div class="character-actions">
                <el-button type="primary" size="small" @click="generateCharacterImage(person)" :loading="person.loading">生成</el-button>
                <el-button type="danger" size="small" @click="handleCharacterImageRemove(person)" :disabled="!person.url">删除</el-button>
              </div>
            </div>
          </el-card>
        </div>
      </div>

      <div class="actions-bar">
        <el-checkbox v-model="isAllSelected" :indeterminate="isIndeterminate" @change="handleSelectAllChange">
          全选 ({{ selectedScenes.size }}/{{ scenes.length }})
        </el-checkbox>
        <el-button @click="invertSelection" text>反选</el-button>
        <el-divider direction="vertical" />
        <input type="file" ref="fileInput" @change="handleFileSelected" style="display: none"
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
        <el-button @click="handleImportClick">从Excel导入</el-button>
        <el-button @click="clearAll">清空所有</el-button>
        <el-button type="primary" :loading="isBatchGenerating" :disabled="selectedScenes.size === 0" @click="generateAllImages">批量生成选中图片</el-button>
        <el-button type="primary" :loading="isBatchVideoGenerating" :disabled="selectedScenes.size === 0" @click="generateAllVideos">批量生成选中视频</el-button>
        <el-button type="success" @click="openGlobalModificationDialog">智能修改所有分镜</el-button>
        <el-button @click="sendToExtension">发送到即梦插件</el-button>
      </div>

      <div class="scene-grid">
        <el-card v-for="(scene, index) in scenes" :key="index" class="scene-card">
          <template #header>
            <div class="card-header">
              <el-checkbox v-model="scene.selected" @change="updateSelection" />
              <span>分镜 #{{ index + 1 }}</span>
              <div class="card-actions">
                <el-button :icon="Edit" circle text @click="openSingleModificationDialog(index)" title="智能修改此镜" />
                <el-button :icon="Delete" circle text type="danger" @click="remove(index)" title="删除此镜" />
              </div>
            </div>
          </template>

          <div class="scene-content">
            <div class="prompt-fields">
              <el-input v-model="scene.image_prompt" type="textarea" :rows="6" placeholder="图片提示词..." />
              <el-input v-model="scene.single_frame_video_prompt" type="textarea" :rows="4" placeholder="单帧视频提示词..." />
              <el-input v-model="scene.dual_frame_video_prompt" type="textarea" :rows="1" placeholder="首尾帧视频提示词..." />
              <el-input v-model="scene.subtitle_text" type="textarea" :rows="1" placeholder="字幕..." />
            </div>
            <div class="media-previews">
              <div class="image-preview-wrapper">
                <img v-if="scene.image_url" :src="scene.image_url" class="preview-image"
                  @click="previewImage({ url: scene.image_url }, index)" />
                <el-upload
                  v-else
                  action="#"
                  accept=".jpg,.jpeg,.png,.webp"
                  :show-file-list="false"
                  :auto-upload="false"
                  :on-change="(file) => handleSceneImageChange(file, index)"
                  class="scene-uploader"
                >
                  <el-icon><Plus /></el-icon>
                </el-upload>
                <div class="image-actions">
                  <el-button size="small" @click="generateImageForScene(index)"
                    :loading="imageLoading[index]">生成图片</el-button>
                  <el-button size="small" type="danger" plain @click="removeImage(index)"
                    :disabled="!scene.image_url">删除图片</el-button>
                </div>
              </div>
              <div class="video-preview-wrapper">
                <div v-if="scene.videoUrl" style="position: relative;">
                  <video :src="scene.videoUrl" controls class="preview-video"></video>
                  <el-button :icon="FullScreen" circle text @click="previewVideo(scene)"
                    style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.5);" />
                </div>
                <div v-else-if="scene.videoId" class="video-status-overlay">
                  <p>ID: {{ scene.videoId.slice(0, 8) }}...</p>
                  <el-tooltip :content="scene.videoErrorMessage" placement="top" v-if="scene.videoErrorMessage">
                    <p style="color: red;">状态: {{ scene.videoStatus }}</p>
                  </el-tooltip>
                  <p v-else>状态: {{ scene.videoStatus }}</p>
                  <el-progress :percentage="scene.videoProgress"
                    v-if="['pending', 'processing'].includes(scene.videoStatus)" :stroke-width="5" />
                  <el-button size="small" @click="checkVideoStatus(index)" :loading="videoGenerationLoading[index]"
                    v-if="!['failed', 'error', 'fail', 'completed', 'success'].includes(scene.videoStatus)">刷新</el-button>
                  <el-button size="small" @click="regenerateVideoForScene(index)"
                    :loading="videoGenerationLoading[index]"
                    v-if="['failed', 'error', 'fail'].includes(scene.videoStatus)">重试</el-button>
                </div>
                <div v-else class="preview-placeholder">
                  <el-button size="small" @click="generateVideoForScene(index)"
                    :loading="videoGenerationLoading[index]">生成视频</el-button>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </div>
      <div style="margin-top:12px; display:flex; gap:8px;">
        <el-button @click="add">新增分镜</el-button>
        <input type="file" ref="fileInput" @change="handleFileSelected" style="display: none"
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
        <!-- <el-button type="primary" :loading="isBatchGenerating" @click="generateAllImages">批量生成所有图片</el-button> -->
        <!-- <el-button type="success" @click="showModificationDialog = true">智能修改分镜</el-button> -->

      </div>
    </el-card>

    <!-- 图片预览对话框 -->
    <el-dialog v-model="showImagePreview" title="图片预览" width="70%">
      <img v-if="previewImageUrl" :src="previewImageUrl" style="width:100%; height:auto; border-radius: 8px;" />
      <template #footer>
        <el-button @click="showImagePreview = false">关闭</el-button>
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

    <!-- Modification Dialog -->
    <el-dialog v-model="showModificationDialog" title="智能修改分镜" width="50%">
      <el-form-item label="选择模型">
        <el-select v-model="modificationModel" placeholder="选择模型" style="width:100%">
          <el-option v-for="model in modificationModels" :key="model.value" :label="model.label" :value="model.value" />
        </el-select>
      </el-form-item>
      <el-input v-model="modificationPrompt" :rows="5" type="textarea"
        placeholder="例如：将场景改为夜晚、添加雨效、调整人物表情、改变镜头角度等..." />
      <template #footer>
        <el-button @click="showModificationDialog = false">取消</el-button>
        <el-button type="primary" @click="handleModificationConfirm" :loading="isModifying">
          确认
        </el-button>
      </template>
    </el-dialog>

    <!-- Video Preview Dialog -->
    <el-dialog v-model="showVideoPreviewDialog" :title="`分镜 #${viewingVideoScene?.index + 1} 视频预览`" width="60%">
      <div v-if="viewingVideoScene">
        <video :src="viewingVideoScene.videoUrl" controls style="width: 100%;"></video>
        <el-descriptions title="视频信息" :column="2" border size="small" style="margin-top: 16px;">
          <el-descriptions-item label="视频提示词">{{ viewingVideoScene.single_frame_video_prompt || 'N/A' }}
          </el-descriptions-item>
          <el-descriptions-item label="图片提示词">{{ viewingVideoScene.image_prompt || 'N/A' }}</el-descriptions-item>
          <el-descriptions-item label="提供方">{{ viewingVideoScene.videoProvider }}</el-descriptions-item>
          <el-descriptions-item label="视频ID">{{ viewingVideoScene.videoId }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="showVideoPreviewDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ImagesAPI, FileAPI, VideosAPI, PromptAPI, API_BASE } from '../services/api'
import { Delete, Plus, ZoomIn, Edit, FullScreen } from '@element-plus/icons-vue'
import { useSettings } from '../composables/useSettings'
import * as XLSX from 'xlsx';

const { settings } = useSettings();
const router = useRouter()
const goBack = () => router.push('/prompt-generator');
const fileInput = ref(null);

const createNewScene = (data = {}) => ({
  image_prompt: '',
  single_frame_video_prompt: '',
  dual_frame_video_prompt: '',
  subtitle_text: '',
  image_url: null,
  videoUrl: null,
  videoId: null,
  videoStatus: '',
  videoProgress: 0,
  videoProvider: '',
  videoErrorMessage: '',
  selected: false,
  generationDetails: {},
  ...data,
});

const scenes = ref([createNewScene()]);
const selectedScenes = ref(new Set());
const peoples = ref([]);

// --- Character Extraction and Management ---
const updatePeoplesFromScenes = (scenesToParse) => {
  const characterMap = new Map();
  
  // Preserve existing peoples first
  if (peoples.value && peoples.value.length > 0) {
    peoples.value.forEach(p => {
      if (p && p.name) {
        characterMap.set(p.name, p);
      }
    });
  }

  for (const scene of scenesToParse) {
    if (scene.image_prompt) {
      // Updated regex to handle multiline content correctly using [\s\S]*?
      // Matches "[主体]角色：" followed by any content until the next "[" or end of string.
      const blockMatch = scene.image_prompt.match(/\[主体\]角色：([\s\S]*?)(?=\[|$)/);
      if (blockMatch) {
        const content = blockMatch[1];
        const regex = /([\u4e00-\u9fa5a-zA-Z0-9]+)[(（](.*?)[)）]/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
          const name = match[1].trim().replace(/和|\*/g, '');
          const description = match[2].trim();
          if (name && !characterMap.has(name)) {
            characterMap.set(name, { name, description, url: null, loading: false });
          }
        }
      }
    }
  }
  peoples.value = Array.from(characterMap.values());
};

const handleCharacterImageChange = (file, person) => {
  const personToUpdate = peoples.value.find(p => p.name === person.name);
  if (personToUpdate) {
    const reader = new FileReader();
    reader.onload = (e) => {
      personToUpdate.url = e.target.result;
    };
    reader.readAsDataURL(file.raw);
  }
};

const handleCharacterImageRemove = (person) => {
  const personToUpdate = peoples.value.find(p => p.name === person.name);
  if (personToUpdate) {
    personToUpdate.url = null;
  }
};

const generateCharacterImage = async (person) => {
  const personToUpdate = peoples.value.find(p => p.name === person.name);
  if (!personToUpdate || !personToUpdate.description) {
    return ElMessage.warning('角色描述不能为空');
  }
  personToUpdate.loading = true;
  try {
    const token = provider.value.includes('gemini-imagen') ? settings.value.geminiApiKey : settings.value.yunwuApiKey;
    const model = provider.value;
    const imageUrl = await ImagesAPI.apicoreGenerateOne(personToUpdate.description, model, token, '1:1', imageSize.value, [], image_style.value, image_quality.value);
    if (imageUrl) {
      // Immediately save to backend to avoid OOM
      // Save to 'characters' subdirectory
      const filename = `characters/character_${person.name.replace(/\s+/g, '_')}_${Date.now()}.png`;
      try {
        const saveResponse = await FileAPI.saveImage(storyTheme.value, filename, imageUrl);
        if (saveResponse && saveResponse.web_url) {
           // Use the backend URL (prepend base URL if necessary, assuming relative here)
           const backendUrl = `${API_BASE}${saveResponse.web_url}`;
           personToUpdate.url = backendUrl;
           person.url = backendUrl;
        } else {
           // Fallback if save fails (not recommended for memory)
           personToUpdate.url = imageUrl;
           person.url = imageUrl;
        }
      } catch (saveError) {
        console.error("Failed to save character image to backend:", saveError);
        // Fallback
        personToUpdate.url = imageUrl;
        person.url = imageUrl;
      }
      
      ElMessage.success(`角色 ${person.name} 图片生成成功`);
    }
  } catch (e) {
    console.error(e);
    ElMessage.error(`角色 ${person.name} 图片生成失败: ${e.message}`);
  } finally {
    personToUpdate.loading = false;
  }
};

const handleSceneImageChange = (file, sceneIndex) => {
  if (file.raw) {
    const reader = new FileReader();
    reader.onload = (e) => {
      scenes.value[sceneIndex].image_url = e.target.result;
    };
    reader.readAsDataURL(file.raw);
  }
};

const globalBaseImages = computed(() =>
  peoples.value
    .filter(p => p.url)
    .map(p => ({ name: p.name, url: p.url, uid: p.name }))
);

// --- Selection Logic ---
const isAllSelected = computed({
  get: () => scenes.value.length > 0 && selectedScenes.value.size === scenes.value.length,
  set: (val) => handleSelectAllChange(val)
});

const isIndeterminate = computed(() => selectedScenes.value.size > 0 && selectedScenes.value.size < scenes.value.length);

const updateSelection = () => {
  selectedScenes.value.clear();
  scenes.value.forEach((scene, index) => {
    if (scene.selected) {
      selectedScenes.value.add(index);
    }
  });
};

const handleSelectAllChange = (val) => {
  scenes.value.forEach(scene => scene.selected = val);
  updateSelection();
};

const invertSelection = () => {
  scenes.value.forEach(scene => scene.selected = !scene.selected);
  updateSelection();
};

// --- Import/Export & Basic Operations ---
const handleImportClick = () => {
  fileInput.value.click();
};

const handleFileSelected = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (json.length < 2) {
        ElMessage.warning('文件为空或只有标题行');
        return;
      }

      const newScenes = [];
      for (let i = 1; i < json.length; i++) {
        const row = json[i];
        if (!row[0]?.trim() && !row[1]?.trim()) continue;
        newScenes.push(createNewScene({
          image_prompt: row[0] || '',
          single_frame_video_prompt: row[1] || '',
          dual_frame_video_prompt: row[2] || '',
          subtitle_text: row[3] || '',
        }));
      }

      if (newScenes.length > 0) {
        const now = new Date();
        const safeDateStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}-${now.getMinutes().toString().padStart(2,'0')}`;
        const newTopic = `导入脚本_${safeDateStr}`;
        const newKey = generateStoryKey();

        // Derive peoples from the newly parsed scenes before saving
        const characterMap = new Map();
        for (const scene of newScenes) {
            if (scene.image_prompt) {
                // Updated regex to handle multiline content correctly using [\s\S]*?
                const blockMatch = scene.image_prompt.match(/\[主体\]角色：([\s\S]*?)(?=\[|$)/);
                if (blockMatch) {
                    const content = blockMatch[1];
                    const regex = /([\u4e00-\u9fa5a-zA-Z0-9]+)[(（](.*?)[)）]/g;
                    let match;
                    while ((match = regex.exec(content)) !== null) {
                        const name = match[1].trim().replace(/和|\*/g, '');
                        const description = match[2].trim();
                        if (name && !characterMap.has(name)) {
                            characterMap.set(name, { name, description, url: null, loading: false });
                        }
                    }
                }
            }
        }
        const newPeoples = Array.from(characterMap.values());

        // Create the full story object and save it to localStorage immediately.
        const newStoryData = {
          key: newKey,
          topic: newTopic,
          scenes: newScenes,
          peoples: newPeoples,
          createdAt: new Date().toISOString(),
          form: {}, // Add empty form for consistency
        };
        localStorage.setItem(newKey, JSON.stringify(newStoryData));

        // Now that data is saved, update the history index and UI.
        const index = getStoryIndex();
        index.unshift(newKey);
        saveStoryIndex(index);
        loadHistory();

        // Update the reactive state for the current session.
        currentStoryKey.value = newKey;
        storyTheme.value = newTopic;
        scenes.value = newScenes;
        peoples.value = newPeoples;

        ElMessage.success(`成功导入 ${newScenes.length} 条新分镜，已创建新的脚本记录。`);
      } else {
        ElMessage.warning('在文件中没有找到有效的分镜数据。');
      }

    } catch (error) {
      console.error("文件解析失败:", error);
      ElMessage.error('文件解析失败，请确保文件格式正确。');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsArrayBuffer(file);
};

// --- Refs for UI state and settings ---
const provider = ref('gpt-image-1-all')
const imageSize = ref('1024x1024')
const aspectRatio = ref('1:1')
const imageStyle = ref('')
const styleOptions = ref([{ label: '无风格', value: '' }, { label: '3D卡通', value: 'Cartoon Games 3D' }, { label: '索尼影片', value: 'Sony Pictures Animation' }, { label: '动漫', value: 'anime style' }, { label: '像素艺术', value: 'pixel art style' }, { label: '低多边形', value: 'low poly style' }, { label: '写实', value: 'photorealistic' }, { label: 'Roblox像素风', value: 'Roblox pixel' }])
const image_style = ref('natural')
const image_quality = ref('standard')
const style_options = ref([{ label: '自然', value: 'natural' }, { label: '超现实和戏剧性', value: 'vivid' }])
const isBatchGenerating = ref(false)
const showImagePreview = ref(false)
const previewImageUrl = ref('')
const viewingScene = ref(null);
const showHistoryDialog = ref(false)
const savedStories = ref([])
const enableBaseImage = ref(true)
const currentStoryKey = ref(null)
const videoProvider = ref('yunwu-sora')
const videoSize = ref('9x16')
const videoSeconds = ref('10')
const videoIsPrivate = ref(true)
const videoWatermark = ref(false)
const videoGenerationLoading = ref({}) // Stores loading state for video generation per scene
const videoPollingTimers = ref({}) // Stores timers for polling video status
const imageLoading = ref({}) // Stores loading state for image generation per scene
const showModificationDialog = ref(false)
const modificationPrompt = ref('')
const isModifying = ref(false)
const modifyingSceneIndex = ref(null) // Index of the scene being modified, null for global modification
const modificationModel = ref('gpt-5-2025-08-07');
const modificationModels = ref([
  { label: 'GPT-5 (Default)', value: 'gpt-5-2025-08-07' },
  { label: 'Gemini 3 Pro', value: 'gemini-3-pro-preview' },
  { label: 'Claude Sonnet 4.5 (Thinking)', value: 'claude-sonnet-4-5-20250929-thinking' },
  { label: 'Claude Opus 4.1', value: 'claude-opus-4-1-20250805' }

]);

const showVideoPreviewDialog = ref(false);
const viewingVideoScene = ref(null);

// --- Modification Logic ---
const openSingleModificationDialog = (index) => {
  modifyingSceneIndex.value = index;
  modificationPrompt.value = '';
  showModificationDialog.value = true;
};
const openGlobalModificationDialog = () => {
  modifyingSceneIndex.value = null;
  modificationPrompt.value = '';
  showModificationDialog.value = true;
}
const handleModificationConfirm = async () => {
  if (modifyingSceneIndex.value !== null) await modifySingleScene();
  else await modifyStoryboard();
};
const modifySingleScene = async () => {
  const index = modifyingSceneIndex.value;
  if (index === null || !scenes.value[index]) return ElMessage.error('无效的场景索引');
  if (!modificationPrompt.value.trim()) return ElMessage.warning('请输入修改要求');
  isModifying.value = true;
  try {
    const scene = scenes.value[index];
    const fullPrompt = `你是一个专业的分镜师。请根据修改指令智能修改这个分镜的图片提示词和视频提示词。
      原始分镜：
      图片提示词：${scene.image_prompt}
      视频提示词：${scene.single_frame_video_prompt}

      修改指令：${modificationPrompt.value}

      要求：
      1. 根据修改指令调整图片提示词，保持原有的语言和格式风格
      2. 根据修改指令调整视频提示词，保持原有的语言和格式风格
      3. 分镜内容保持不变
      4. 只修改需要修改的部分，其他内容保持原样

      重要：修改后的提示词必须保持与原始提示词相同的语言（中文或英文）和格式！

      请严格按照以下格式输出两行，不要添加其他内容：

      图片提示词：修改后的图片提示词
      视频提示词：修改后的视频提示词

      请立即开始修改：`;
    // gpt-5-2025-08-07
    const result = await PromptAPI.apicoreGenerateTxt(fullPrompt, modificationModel.value);
    let cleanedResult = result.replace(/<think>.*?<\/think>/g, '');
    const lines = cleanedResult.split('\n').filter(line => line.trim());
    const imageLine = lines.find(line => line.startsWith('图片提示词：'));
    const videoLine = lines.find(line => line.startsWith('视频提示词：'));
    if (imageLine) scenes.value[index].image_prompt = imageLine.replace('图片提示词：', '').trim();
    if (videoLine) scenes.value[index].single_frame_video_prompt = videoLine.replace('视频提示词：', '').trim();
    ElMessage.success(`分镜 ${index + 1} 修改成功！`);
    showModificationDialog.value = false;
  } catch (error) {
    console.error('智能修改分镜失败:', error);
    ElMessage.error('智能修改分镜失败');
  } finally {
    isModifying.value = false;
  }
};
const modifyStoryboard = async () => {
  if (!modificationPrompt.value.trim()) return ElMessage.warning('请输入修改要求');
  isModifying.value = true;
  try {
    const scenesText = scenes.value.map((s, i) => `分镜${i + 1}\n图片提示词：${s.image_prompt}\n视频提示词：${s.single_frame_video_prompt}`).join('\n\n');
    const fullPrompt = `

        你是专业的分镜修改助手。我需要你对现有项目的所有分镜进行“服装与颜色”的统一改造。

        ⚠️ **重要说明：**
        - 仅修改“服装/衣着/服饰/颜色”等相关描述；分镜“内容/人物关系/环境/时间/镜头/动作”等保持不变
        - 允许重写服装短语（而非逐字替换），但必须保留原有整体结构与标签
        - 输出必须使用中文

        **修改要求：**
        ${modificationPrompt.value}

        **严格执行原则：**
        1. **分镜内容绝对不变**：原有的分镜内容描述必须保持100%不变
        2. **精确替换**：只在图片提示词和视频提示词中进行指定的词语替换
        3. **保持原有结构**：必须保持图片提示词的完整结构，包括[主体]、表情、动作、[环境]、[时间]、[天气]、[视角]、[景别]等所有部分
        4. **一致性替换**：在所有分镜中统一执行相同的替换
        5. **保留所有其他内容**：除了指定替换的词语外，其他所有描述都必须保持原样
        6. **🚨 角色名可以按指令修改**：如果修改指令明确要求修改角色（如"Raju改为小女孩"），则可以修改角色名称和描述，但必须同步更新所有相关内容
        7. **🚨 性别代词必须同步**：如果修改涉及角色性别变化（如男孩→女孩），必须在所有图片提示词和视频提示词中同步更新性别代词（他→她、his→her等），确保性别一致性
        8. **🚨 保持完整结构**：如果原图片提示词包含表情、动作、环境等描述，修改后也必须保持这些部分完整，不能删除

        **待修改的分镜列表（共${scenes.value.length}个）：**

        ${scenesText}

        **输出格式：**
        请严格按照以下格式输出，务必完成所有${scenes.value.length}个分镜的修改：

        分镜1：
        图片提示词：[完整的修改后图片提示词，保持原有完整结构，只替换指定词语]
        视频提示词：[修改后的视频提示词]

        分镜2：
        图片提示词：[完整的修改后图片提示词，保持原有完整结构，只替换指定词语]
        视频提示词：[修改后的视频提示词]

        ...继续直到分镜${scenes.value.length}

        **⚠️ 关键要求（必须遵守）：**
        1. **必须输出所有${scenes.value.length}个分镜** - 不要中途停止
        2. **不要输出分镜内容** - 只输出图片提示词和视频提示词
        3. **精确替换** - 只替换指定的词语,不要重写或删除其他部分
        4. **保持完整结构** - 图片提示词必须保持原有的完整格式和所有描述部分
        5. **保持简洁** - 不要添加任何解释、注释或额外内容
        6. **使用中文** - 所有输出使用中文

        ⚠️ **角色与服装改造同步要求：**
        1) 角色名可以按修改指令要求修改（原有角色清单：Bob、Officer、Alex、Rainbow、Blue、Yellow、Help）
        2) 如果修改涉及角色性别变化，必须在所有地方同步更新性别代词（他/她、他的/她的等）
        3) 同一分镜中不同角色的服装颜色必须彼此不同（如：红/蓝/绿/紫/白/黑/金/银等鲜明颜色）
        4) 图片提示词和视频提示词必须保持一致，涉及服装、颜色、性别的修改必须同步更新

        ⚠️ **特别注意：如果原图片提示词是这样的格式：**
        'Scene 1: [主体]角色：Priya（描述）表情：悲伤。动作：描述动作。[环境]描述环境...'

        **修改后必须保持完整格式：**
        'Scene 1: [主体]角色：Priya（修改后的服装与颜色描述）表情：悲伤。动作：描述动作。[环境]描述环境...'

        绝对不能只输出：'[主体]角色：Priya（修改后描述）' 这样会丢失重要信息！
        输出规则：必须完整输出所有24个分镜的修改结果。格式：
        分镜N：
        图片提示词：[完整的修改后图片提示词，保持原有完整结构，只替换指定词语]
        视频提示词：[修改后的视频提示词]

        ⚠️ 重要：必须保持图片提示词的完整结构，包括Scene N、[主体]、表情、动作、[环境]等所有部分，绝对不能删除！
        不要添加解释、注释或停止输出。直接从分镜1输出到分镜24。

        立即开始修改，从分镜1到分镜${scenes.value.length}
        `;
    const result = await PromptAPI.apicoreGenerateTxt(fullPrompt, modificationModel.value);
    let cleanedResult = result.replace(/<think>.*?<\/think>/g, '');
    parseModificationResponse(cleanedResult);
    showModificationDialog.value = false;
    ElMessage.success('所有分镜修改成功！');
  } catch (error) {
    console.error('智能修改所有分镜失败:', error);
    ElMessage.error('智能修改所有分镜失败');
  } finally {
    isModifying.value = false;
  }
};
const parseModificationResponse = (response) => {
  const sceneRegex = /分镜(\d+)：([\s\S]*?)(?=分镜\d+：|$)/g;
  let match;
  while ((match = sceneRegex.exec(response)) !== null) {
    const sceneNumber = parseInt(match[1], 10);
    const block = match[2];
    const index = sceneNumber - 1;

    if (scenes.value[index]) {
      const imagePromptMatch = block.match(/图片提示词：([\s\S]*?)(?:视频提示词：|$)/);
      const videoPromptMatch = block.match(/视频提示词：([\s\S]*)/);
      
      if (imagePromptMatch && imagePromptMatch[1].trim()) {
        scenes.value[index].image_prompt = imagePromptMatch[1].trim();
      }
      // Check if videoPromptMatch and its capturing group are not null/empty
      if (videoPromptMatch && videoPromptMatch[1] && videoPromptMatch[1].trim()) {
        scenes.value[index].single_frame_video_prompt = videoPromptMatch[1].trim();
      }
    }
  }
};

// --- Scene, Image, and Video Operations ---
const add = () => scenes.value.push(createNewScene());
const remove = (idx) => { scenes.value.splice(idx, 1); updateSelection(); }
const clearAll = () => { scenes.value = [createNewScene()]; peoples.value = []; updateSelection(); ElMessage.success('已清空所有分镜'); }

const storyTheme = ref('')

const loadStory = (key, closeDialog = true, isFromGenerator = false) => {
  const data = JSON.parse(localStorage.getItem(key) || '{}');
  if (data.scenes && Array.isArray(data.scenes)) {
    scenes.value = data.scenes.map(s => createNewScene(s));

    // if (data.peoples && data.peoples.length > 0) {
    //     peoples.value = data.peoples;
    // } else {
        updatePeoplesFromScenes(scenes.value);
    // }

    if (isFromGenerator) {
      storyTheme.value = localStorage.getItem('script_topic') || data.topic || '';
    } else {
      storyTheme.value = data.topic || '';
    }

    currentStoryKey.value = key;
    if (closeDialog) showHistoryDialog.value = false;
    updateSelection();
    ElMessage.success(`已加载分镜: ${data.topic || '无主题'}`);
  } else {
    ElMessage.warning('此历史记录中没有可用的分镜数据。');
  }
};
const previewVideo = (scene) => {
  viewingVideoScene.value = scene;
  showVideoPreviewDialog.value = true;
};
const previewImage = (item, index) => {
  viewingScene.value = { ...item, index };
  previewImageUrl.value = item.url;
  showImagePreview.value = true;
};
const removeImage = (sceneIndex) => {
  scenes.value[sceneIndex].image_url = null;
};
const generateImageForScene = async (sceneIndex) => {
  const scene = scenes.value[sceneIndex];
  if (!scene.image_prompt.trim()) return ElMessage.warning('请先输入提示词');
  imageLoading.value[sceneIndex] = true;
  try {
    let token = provider.value.includes('gemini-imagen') ? settings.value.geminiApiKey : settings.value.yunwuApiKey;
    let referenceImages = enableBaseImage.value ? globalBaseImages.value.filter(img => scene.image_prompt.includes(img.name)).map(img => ({ name: img.name, url: img.url })) : [];
    const finalPrompt = imageStyle.value ? `${scene.image_prompt} ${imageStyle.value}` : scene.image_prompt;
    const model = provider.value;
    let imageUrl = await ImagesAPI.apicoreGenerateOne(finalPrompt, model, token, aspectRatio.value, imageSize.value, referenceImages, image_style.value, image_quality.value);

    if (imageUrl) {
      scenes.value[sceneIndex].generationDetails = { provider: model, size: imageSize.value, style: image_style.value, quality: image_quality.value };
      
      // Immediately save to backend
      const filename = `${storyTheme.value}_scene_${sceneIndex + 1}_${Date.now()}.png`;
      try {
        const saveResponse = await FileAPI.saveImage(storyTheme.value, filename, imageUrl);
        if (saveResponse && saveResponse.web_url) {
           scenes.value[sceneIndex].image_url = `${API_BASE}${saveResponse.web_url}`;
           scenes.value[sceneIndex].saveImgUrl = saveResponse.path;
        } else {
           scenes.value[sceneIndex].image_url = imageUrl;
        }
      } catch (saveError) {
         console.error("Failed to save scene image:", saveError);
         scenes.value[sceneIndex].image_url = imageUrl;
      }

      ElMessage.success(`分镜 ${sceneIndex + 1} 图片生成成功`);
      return true;
    }
  } catch (e) {
    console.error(e);
    ElMessage.error(`分镜 ${sceneIndex + 1} 图片生成失败: ${e.message}`);
    return false;
  } finally {
    imageLoading.value[sceneIndex] = false;
  }
};
const regenerateImageForScene = async (sceneIndex) => {
  scenes.value[sceneIndex].image_url = null;
  return await generateImageForScene(sceneIndex);
};
const generateAllImages = async () => {
  if (selectedScenes.value.size === 0) return ElMessage.warning('请至少选择一个分镜来生成图片。');
  isBatchGenerating.value = true;
  const scenesToGenerate = Array.from(selectedScenes.value);
  
  // Reduced batch size to avoid 429 Rate Limit errors from external providers
  const batchSize = 3; 
  ElMessage.info(`开始为选中的 ${scenesToGenerate.length} 个分镜批量生成图片 (并发数: ${batchSize})...`);
  
  let failedSceneIndexes = [];
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (let i = 0; i < scenesToGenerate.length; i += batchSize) {
    const batchIndexes = scenesToGenerate.slice(i, i + batchSize);
    
    // Process batch
    const promises = batchIndexes.map(async (index) => {
        // Skip if image already exists (prevent duplicate generation cost)
        if (scenes.value[index].image_url) {
            console.log(`Skipping scene ${index + 1} as it already has an image.`);
            return { success: true, index, skipped: true };
        }
        const success = await generateImageForScene(index);
        return { success, index };
    });

    const results = await Promise.all(promises);
    
    results.forEach(res => { 
        if (!res.success) failedSceneIndexes.push(res.index);
    });

    // Add a small delay between batches to respect API rate limits, unless it's the last batch
    if (i + batchSize < scenesToGenerate.length) {
      await sleep(1500); 
    }
  }

  if (failedSceneIndexes.length > 0) {
    ElMessage.error(`${failedSceneIndexes.length} 张图片生成失败。如果是大面积失败，请检查API余额或稍后再试（可能触发了限流）。`);
  } else {
    ElMessage.success('所有选中分镜的图片已生成完毕。');
  }
  isBatchGenerating.value = false;
};
const isBatchVideoGenerating = ref(false);

const generateAllVideos = async () => {
  if (selectedScenes.value.size === 0) return ElMessage.warning('请至少选择一个分镜来生成视频。');
  isBatchVideoGenerating.value = true;
  const scenesToGenerate = Array.from(selectedScenes.value);
  
  // Video generation is heavy. We use a batch size of 1 (serial) to ensure stability and avoid rate limits.
  const batchSize = 1; 
  ElMessage.info(`开始为选中的 ${scenesToGenerate.length} 个分镜批量生成视频 (串行处理)...`);
  
  let failedSceneIndexes = [];
  let skippedCount = 0;
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (let i = 0; i < scenesToGenerate.length; i += batchSize) {
    const batchIndexes = scenesToGenerate.slice(i, i + batchSize);
    
    const promises = batchIndexes.map(async (index) => {
        const scene = scenes.value[index];
        
        // Skip if video already exists or task is running
        if (scene.videoUrl || scene.videoId) {
            console.log(`Skipping scene ${index + 1} (Video exists or processing).`);
            skippedCount++;
            return { success: true, index, skipped: true };
        }
        
        // Skip if no base image (Image-to-Video workflow)
        if (!scene.image_url) {
             console.warn(`Skipping scene ${index + 1} (No image source).`);
             ElMessage.warning(`分镜 ${index+1} 没有图片，跳过视频生成。`);
             failedSceneIndexes.push(index);
             return { success: false, index, skipped: true };
        }

        const success = await generateVideoForScene(index);
        return { success, index };
    });

    const results = await Promise.all(promises);
    
    results.forEach(res => { 
        if (!res.success && !res.skipped) failedSceneIndexes.push(res.index);
    });

    // Add delay between batches (videos need more breathing room than images)
    if (i + batchSize < scenesToGenerate.length) {
      await sleep(3000); 
    }
  }

  if (failedSceneIndexes.length > 0) {
    ElMessage.error(`${failedSceneIndexes.length} 个视频生成任务创建失败。`);
  } else {
    ElMessage.success(`批量任务完成。${skippedCount} 个已跳过。请等待后台处理完成。`);
  }
  isBatchVideoGenerating.value = false;
};

const generateVideoForScene = async (sceneIndex) => {
  const scene = scenes.value[sceneIndex];
  videoGenerationLoading.value[sceneIndex] = true;
  try {
    const prompt = `${scene.single_frame_video_prompt}${scene.subtitle_text}`.trim();
    if (!prompt) {
      videoGenerationLoading.value[sceneIndex] = false;
      ElMessage.warning('请输入单帧视频提示词');
      return false;
    }
    scene.videoProvider = videoProvider.value;
    const providerName = scene.videoProvider.replace('-sora', '');
    const options = { model: 'sora', prompt, seconds: parseInt(videoSeconds.value, 10),
     size: videoSize.value, watermark: videoWatermark.value, is_private: videoIsPrivate.value,
      n_frames: parseInt(videoSeconds.value, 10), remove_watermark: !videoWatermark.value,
      image_url: scene.image_url
    };

    if (providerName === 'yunwu') {
      options.aspect_ratio = videoSize.value;
    } else if (providerName === 'kie') {
      const aspectRatioMap = { '9x16': 'portrait', '16x9': 'landscape', '1x1': 'square', '4x3': 'landscape', '3x4': 'portrait' };
      options.aspect_ratio = aspectRatioMap[videoSize.value] || 'landscape';
    }

    const data = await VideosAPI.generateVideo(providerName, options);

    if (providerName === 'yunwu') {
      scene.videoId = data.id;
      scene.videoStatus = data.status;
      scene.videoProgress = data.progress || 0;
    } else if (providerName === 'kie') {
      if (data.code === 200) {
        scene.videoId = data.data.taskId;
        scene.videoStatus = 'queued';
        scene.videoProgress = 0;
      } else {
        throw new Error(data.message || 'Failed to create Kie video task');
      }
    }
    ElMessage.success(`分镜 ${sceneIndex + 1} 视频生成任务已创建`);
    checkVideoStatus(sceneIndex, true);
    return true;
  } catch (e) {
    console.error(e);
    ElMessage.error(`分镜 ${sceneIndex + 1} 视频生成失败: ${e.message}`);
    videoGenerationLoading.value[sceneIndex] = false;
    return false;
  }
};

const regenerateVideoForScene = async (sceneIndex) => {
  const scene = scenes.value[sceneIndex];
  scene.videoId = null;
  scene.videoStatus = '';
  scene.videoProgress = 0;
  scene.videoUrl = null;
  scene.videoErrorMessage = '';
  await generateVideoForScene(sceneIndex);
};

const checkVideoStatus = async (sceneIndex, isPolling = false) => {
  const scene = scenes.value[sceneIndex];
  if (!scene.videoId) return;
  if (videoPollingTimers.value[sceneIndex]) clearTimeout(videoPollingTimers.value[sceneIndex]);
  videoGenerationLoading.value[sceneIndex] = true;
  try {
    const providerName = scene.videoProvider.replace('-sora', '');
    const statusResponse = await VideosAPI.getVideoStatus(providerName, scene.videoId);
    let isDone = false;
    if (providerName === 'yunwu') {
      scene.videoStatus = statusResponse.status;
      scene.videoProgress = statusResponse.progress || 0;
      if (statusResponse.status === 'completed') { scene.videoUrl = statusResponse.video_url; isDone = true; }
      else if (statusResponse.status === 'failed' || statusResponse.status === 'error') { scene.videoErrorMessage = statusResponse.error?.message || '未知错误'; isDone = true; }
    } else if (providerName === 'kie') {
      if (statusResponse.code === 200) {
        const videoData = statusResponse.data;
        scene.videoStatus = videoData.state;
        if (videoData.state === 'success') {
          scene.videoProgress = 100;
          scene.videoUrl = JSON.parse(videoData.resultJson).resultUrls[0];
          isDone = true;
        } else if (videoData.state === 'fail') {
          scene.videoErrorMessage = videoData.failMsg;
          isDone = true;
        }
      } else { throw new Error(statusResponse.message || 'Failed to get Kie video status'); }
    }
    if (isDone) {
      if (scene.videoUrl) {
        ElMessage.success(`分镜 ${sceneIndex + 1} 视频已生成`);
        // Save video to backend
        try {
            const filename = `${storyTheme.value}_scene_${sceneIndex + 1}_video_${Date.now()}.mp4`;
            const response = await FileAPI.saveImage(storyTheme.value, filename, scene.videoUrl);
            if (response && response.web_url) {
              scene.videoUrl = `${API_BASE}${response.web_url}`;
              scene.saveVideoUrl = response.path;
            }
        } catch (saveError) {
            console.error("Failed to save video:", saveError);
        }
      } else {
        ElMessage.error(`分镜 ${sceneIndex + 1} 视频生成失败: ${scene.videoErrorMessage}`);
      }
    } else if (isPolling) {
      videoPollingTimers.value[sceneIndex] = setTimeout(() => checkVideoStatus(sceneIndex, true), 10000);
    }
  } catch (e) {
    console.error(e);
    scene.videoErrorMessage = e.message;
    ElMessage.error(`分镜 ${sceneIndex + 1} 视频状态更新失败: ${e.message}`);
  } finally {
    if (['completed', 'success', 'failed', 'error', 'fail'].includes(scene.videoStatus)) {
      videoGenerationLoading.value[sceneIndex] = false;
    }
  }
};

const getStoryIndex = () => JSON.parse(localStorage.getItem('story_index') || '[]');
const saveStoryIndex = (index) => localStorage.setItem('story_index', JSON.stringify(index));

const generateStoryKey = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `story_${date}_${random}`;
};


const loadHistory = () => {
  const index = getStoryIndex();
  savedStories.value = index.map(key => {
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    return { key, topic: data.topic, createdAt: data.createdAt };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};
const exportToCSV = () => {
  const header = ['image_prompt', 'single_frame_video_prompt', 'dual_frame_video_prompt', 'subtitle_text'];
  const data = scenes.value.map(scene => [
    scene.image_prompt,
    scene.single_frame_video_prompt,
    scene.dual_frame_video_prompt,
    scene.subtitle_text
  ]);
  const worksheet = XLSX.utils.aoa_to_sheet([header, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Storyboard');
  XLSX.writeFile(workbook, `${storyTheme.value}.csv`);
};

let socket = null;

onMounted(() => {
  // Assuming the backend runs on port 8000, which is uvicorn's default
  // socket = new WebSocket("ws://localhost:8000/ws");

  // socket.onopen = () => {
  //   console.log("WebSocket connection established.");
  //   ElMessage.success("成功连接到后台消息服务。");
  // };

  // socket.onmessage = (event) => {
  //   console.log("Received message from server:", event.data);
  //   // You can handle messages from the plugin here, for example:
  //   // const data = JSON.parse(event.data);
  //   // if (data.type === 'confirmation_from_plugin') {
  //   //   ElMessage.info('插件已确认收到数据。');
  //   // }
  // };

  // socket.onclose = () => {
  //   console.log("WebSocket connection closed.");
  //   ElMessage.warning("与后台消息服务的连接已断开。");
  // };

  // socket.onerror = (error) => {
  //   console.error("WebSocket error:", error);
  //   ElMessage.error("连接后台消息服务时出错，请确保后端正在运行。");
  // };
});

onUnmounted(() => {
  // if (socket) {
  //   socket.close();
  // }
});

const sendToExtension = () => {
  // if (socket && socket.readyState === WebSocket.OPEN) {
  //   const data = {
  //       type: 'storyboard_update',
  //       payload: scenes.value
  //   };
  //   socket.send(JSON.stringify(data));
  //   ElMessage.success('分镜数据已通过消息服务发送。');
  // } else {
  //   ElMessage.error('消息服务未连接。请刷新页面或检查后台服务。');
  // }
  window.postMessage({
      type: 'JIMENG_UPLOADER_DATA',
      payload: JSON.stringify({scenes: scenes.value, peoples: peoples.value})
  })
};

watch(scenes, (newScenes) => {
  updatePeoplesFromScenes(newScenes);
  debouncedSave(); // Auto-save on changes
}, { deep: true });

watch(storyTheme, () => {
  debouncedSave();
});

// Helper to debounce function calls
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// Function to save the current state of the storyboard
const saveCurrentStory = async () => {
  if (!currentStoryKey.value) return;

  try {
    // Create deep copies to modify before saving
    const scenesToSave = JSON.parse(JSON.stringify(scenes.value));
    const peoplesToSave = JSON.parse(JSON.stringify(peoples.value));

    // --- Upload Logic ---
    // REMOVED per requirement: "Uploaded ones should not be saved again".
    // Generated images are now saved immediately upon generation.
    // User-uploaded images (local files) are kept as Base64 in memory/localStorage 
    // (or you can enable saving them if needed, but for now we skip auto-upload).
    /*
    for (const person of peoplesToSave) {
        if (person.url && person.url.startsWith('data:image')) {
            // ...
        }
    }
    */
    // --- End Upload Logic ---

    const storyData = JSON.parse(localStorage.getItem(currentStoryKey.value) || '{}');
    const dataToSave = {
      ...storyData,
      topic: storyTheme.value,
      scenes: scenesToSave, // Save the modified copy
      peoples: peoplesToSave, // Save the modified copy
      createdAt: storyData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(currentStoryKey.value, JSON.stringify(dataToSave));
    
  } catch (e) {
    console.error("Failed to save story:", e);
  }
};

const debouncedSave = debounce(saveCurrentStory, 1500); // Debounce save by 1.5 seconds

onMounted(() => {
  loadHistory();
  const incomingStoryKey = localStorage.getItem('current_story_key');
  // We clear this key immediately. It's a one-time signal from the generator.
  // If the user refreshes, this key will be null, and we'll fall through to loading the latest.
  localStorage.removeItem('current_story_key');
  localStorage.removeItem('from_prompt_generator'); // also clear this legacy one

  if (incomingStoryKey) {
    loadStory(incomingStoryKey, false, true); // Pass true for isFromGenerator
  } else if (savedStories.value.length > 0) {
    const latestStoryKey = savedStories.value[0].key;
    loadStory(latestStoryKey, false, false); // Pass false
    ElMessage.success('已自动加载最新的脚本');
  } else {
    // Fresh session
    scenes.value = [createNewScene()];
    currentStoryKey.value = null;
    ElMessage.info('这是一个新的分镜，您可以从历史记录中加载脚本。');
  }
});

watch(showModificationDialog, (newVal) => {
  if (!newVal) {
    modifyingSceneIndex.value = null;
  }
});
</script>

<style scoped>
.actions-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.scene-grid {
  /* display: grid;
  grid-template-columns: repeat(auto-fill, minmax(600px, 1fr)); */
  /* gap: 16px; */
}

.scene-card .card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scene-card .card-header span {
  font-weight: bold;
}

.scene-card .card-actions {
  margin-left: auto;
}

.scene-content {
  display: flex;
  gap: 16px;
}

.prompt-fields {
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.media-previews {
  flex: 1;
  display: flex;
  gap: 8px;
}

.image-preview-wrapper,
.video-preview-wrapper {
  width: 100%;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.preview-image {
  width: 100%;
  height: auto;
  aspect-ratio: 9/16;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
}

.preview-video {
  width: 100%;
}

.preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 120px;
  color: #909399;
  font-size: 14px;
}

.image-actions {
  display: flex;
  justify-content: space-around;
  width: 100%;
}

.video-status-overlay {
  font-size: 12px;
  padding: 8px;
  text-align: center;
}

.view-video-link {
  font-size: 12px;
}

.character-card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.character-desc {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  height: 40px;
  overflow: auto;
}
.character-image {
  width: 100%;
  height: 150px;
  border-radius: 4px;
  background-color: #f5f7fa;
}
.character-uploader {
  width: 100%;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
}
.scene-uploader {
  width: 100%;
  height: 120px; /* Adjusted height to fit better with existing layout */
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
}
.character-actions {
  width: 100%;
  display: flex;
  justify-content: space-between;
}
</style>
