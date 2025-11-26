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
        <el-form-item label="提供方">
          <el-select v-model="provider" placeholder="提供方" style="width:300px">
            <!-- $0.048000 -->
            <el-option label="yunwu(gpt-image-1-all)($0.08)(质量好)" value="gpt-image-1-all" />
            <el-option label="yunwu(dall-e-3)($0.048,不能垫图,限时特惠，质量不太好)" value="dall-e-3" />
            <el-option label="yunwu(gpt-4o-image-vip)($0.12)(质量好)" value="gpt-4o-image-vip" />
            <!-- sora-image -->
            <!-- $0.09 -->
            <el-option label="yunwu(gemini-2.5-flash-image-preview)($0.09)(质量好)" value="gemini-2.5-flash-image" />

            
            <el-option label="yunwu(gemini-3-pro-image-preview)($0.318)(质量好)" value="gemini-3-pro-image-preview" />
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

      <div class="actions-bar">
        <el-checkbox 
          v-model="isAllSelected" 
          :indeterminate="isIndeterminate"
          @change="handleSelectAllChange"
        >
          全选 ({{ selectedScenes.size }}/{{ scenes.length }})
        </el-checkbox>
        <el-button @click="invertSelection" text>反选</el-button>
        <el-divider direction="vertical" />
        <el-button @click="add">新增分镜</el-button>
        <input type="file" ref="fileInput" @change="handleFileSelected" style="display: none" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
        <el-button @click="handleImportClick">从Excel导入</el-button>
        <el-button @click="clearAll">清空所有</el-button>
        <el-button type="primary" :loading="isBatchGenerating" @click="generateAllImages">批量生成选中图片</el-button>
        <el-button type="success" @click="openGlobalModificationDialog">智能修改所有分镜</el-button>
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
              <el-input v-model="scene.image_prompt" type="textarea" :rows="4" placeholder="图片提示词..." />
              <el-input v-model="scene.single_frame_video_prompt" type="textarea" :rows="4" placeholder="单帧视频提示词..." />
              <el-input v-model="scene.dual_frame_video_prompt" type="textarea" :rows="1" placeholder="首尾帧视频提示词..." />
              <el-input v-model="scene.subtitle_text" type="textarea" :rows="1" placeholder="字幕..." />
            </div>
            <div class="media-previews">
              <div class="image-preview-wrapper">
                <img v-if="scene.image_url" :src="scene.image_url" class="preview-image" @click="previewImage(scene, index)" />
                <div v-else class="preview-placeholder">暂无图片</div>
                <div class="image-actions">
                  <el-button size="small" @click="generateImageForScene(index)" :loading="imageLoading[index]">生成图片</el-button>
                  <el-button size="small" type="danger" plain @click="removeImage(index)" :disabled="!scene.image_url">删除图片</el-button>
                </div>
              </div>
               <div class="video-preview-wrapper">
                <div v-if="scene.videoId" class="video-status-overlay">
                  <p>ID: {{ scene.videoId.slice(0, 8) }}...</p>
                   <el-tooltip :content="scene.videoErrorMessage" placement="top" v-if="scene.videoErrorMessage">
                      <p style="color: red;">状态: {{ scene.videoStatus }}</p>
                    </el-tooltip>
                  <p v-else>状态: {{ scene.videoStatus }}</p>
                  <el-progress :percentage="scene.videoProgress" v-if="['pending', 'processing'].includes(scene.videoStatus)" :stroke-width="5" />
                  <a :href="scene.videoUrl" target="_blank" v-if="scene.videoUrl" class="view-video-link">查看视频</a>
                   <el-button size="small" @click="checkVideoStatus(index)" :loading="videoGenerationLoading[index]" v-if="!scene.videoUrl && !['failed', 'error', 'fail', 'completed', 'success'].includes(scene.videoStatus)">刷新</el-button>
                   <el-button size="small" @click="regenerateVideoForScene(index)" :loading="videoGenerationLoading[index]" v-if="['failed', 'error', 'fail'].includes(scene.videoStatus)">重试</el-button>
                </div>
                <video v-if="scene.video_url" :src="scene.video_url" controls class="preview-video"></video>
                <div v-else-if="!scene.videoId" class="preview-placeholder">
                  <el-button size="small" @click="generateVideoForScene(index)" :loading="videoGenerationLoading[index]">生成视频</el-button>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </div>
      <div style="margin-top:12px; display:flex; gap:8px;">
        <el-button @click="add">新增分镜</el-button>
        <input type="file" ref="fileInput" @change="handleFileSelected" style="display: none" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
        <el-button @click="handleImportClick">从Excel导入</el-button>
        <el-button @click="clearAll">清空所有</el-button>
        <el-button type="primary" :loading="isBatchGenerating" @click="generateAllImages">批量生成所有图片</el-button>
        <el-button type="success" @click="showModificationDialog = true">智能修改分镜</el-button>
        
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

    <!-- Modification Dialog -->
    <el-dialog v-model="showModificationDialog" title="智能修改分镜" width="50%">
      <el-input
        v-model="modificationPrompt"
        :rows="5"
        type="textarea"
        placeholder="请输入修改要求..."
      />
      <template #footer>
        <el-button @click="showModificationDialog = false">取消</el-button>
        <el-button type="primary" @click="handleModificationConfirm" :loading="isModifying">
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ImagesAPI, FileAPI, VideosAPI, PromptAPI } from '../services/api'
import { Delete, Plus, ZoomIn, Edit } from '@element-plus/icons-vue'
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
  video_url: null,
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
      if (json.length < 2) return ElMessage.warning('文件为空或只有标题行');
      if (scenes.value.length === 1 && !scenes.value[0].image_prompt && !scenes.value[0].single_frame_video_prompt) scenes.value = [];
      
      let importedCount = 0;
      for (let i = 1; i < json.length; i++) {
        const row = json[i];
        if (!row[0]?.trim() && !row[1]?.trim()) continue;
        scenes.value.push(createNewScene({
          image_prompt: row[0] || '',
          single_frame_video_prompt: row[1] || '',
          dual_frame_video_prompt: row[2] || '',
          subtitle_text: row[3] || '',
        }));
        importedCount++;
      }
      if (importedCount > 0) ElMessage.success(`成功导入 ${importedCount} 条分镜。`);
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
const imageSize = ref('1024x1792')
const aspectRatio = ref('9:16')
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
const globalBaseImages = ref([]) 
const enableBaseImage = ref(true) 
const characterImageLoading = ref({}) 
const currentStoryKey = ref(null)
const peoples = ref([])
const videoProvider = ref('yunwu-sora')
const videoSize = ref('9x16')
const videoSeconds = ref('10')
const videoIsPrivate = ref(true)
const videoWatermark = ref(false)
const videoGenerationLoading = ref({})
const videoPollingTimers = ref({}) 
const imageLoading = ref({})
const showModificationDialog = ref(false)
const modificationPrompt = ref('')
const isModifying = ref(false)
const modifyingSceneIndex = ref(null) 

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
      视频提示词：${single_frame_video_prompt}

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
    const result = await PromptAPI.apicoreGenerateTxt(fullPrompt, 'gpt-5-2025-08-07');
    const lines = result.split('\n').filter(line => line.trim());
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
        const fullPrompt = `你是专业的分镜修改助手...${scenesText}...`;
        const result = await PromptAPI.apicoreGenerateTxt(fullPrompt, 'gemini-3-pro-preview');
        parseModificationResponse(result);
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
  const sceneBlocks = response.split(/分镜\d+：/).filter(s => s.trim());
  sceneBlocks.forEach((block, index) => {
    if (scenes.value[index]) {
      const imagePromptMatch = block.match(/图片提示词：([\s\S]*?)视频提示词：/);
      const videoPromptMatch = block.match(/视频提示词：([\s\S]*)/);
      if (imagePromptMatch) scenes.value[index].image_prompt = imagePromptMatch[1].trim();
      if (videoPromptMatch) scenes.value[index].single_frame_video_prompt = videoPromptMatch[1].trim();
    }
  });
};

// --- Scene, Image, and Video Operations ---
const add = () => scenes.value.push(createNewScene());
const remove = (idx) => { scenes.value.splice(idx, 1); updateSelection(); }
const clearAll = () => { scenes.value = [createNewScene()]; peoples.value = []; updateSelection(); ElMessage.success('已清空所有分镜'); }
const storyTheme = ref('')

const loadStory = (key, closeDialog = true) => {
  const data = JSON.parse(localStorage.getItem(key) || '{}');
  if (data.scenes && Array.isArray(data.scenes)) {
    peoples.value = (data.characters || []).map(c => ({ name: c.name || '', description: c.description || '' }));
    scenes.value = data.scenes.map(s => createNewScene(s));
    storyTheme.value = localStorage.getItem('script_topic') || data.topic || 'storyboard';
    currentStoryKey.value = key;
    if (closeDialog) showHistoryDialog.value = false;
    updateSelection();
    ElMessage.success(`已加载分镜: ${data.topic}`);
  } else {
    ElMessage.warning('此历史记录中没有可用的分镜数据。');
  }
};
const previewImage = (scene, index) => {
  viewingScene.value = { ...scene, index };
  previewImageUrl.value = scene.image_url;
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
      scenes.value[sceneIndex].image_url = imageUrl;
      scenes.value[sceneIndex].generationDetails = { prompt: finalPrompt, provider: model, size: imageSize.value, style: image_style.value, quality: image_quality.value };
      ElMessage.success(`分镜 ${sceneIndex + 1} 图片生成成功`);
      await FileAPI.saveImage(storyTheme.value, `${storyTheme.value}_scene_${sceneIndex + 1}_${Date.now()}.png`, imageUrl);
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
  ElMessage.info(`开始为选中的 ${scenesToGenerate.length} 个分镜批量生成图片...`);
  const batchSize = 6;
  let failedSceneIndexes = [];
  for (let i = 0; i < scenesToGenerate.length; i += batchSize) {
    const batchIndexes = scenesToGenerate.slice(i, i + batchSize);
    const promises = batchIndexes.map(index => generateImageForScene(index).then(success => ({ success, index })));
    const results = await Promise.all(promises);
    results.forEach(res => { if (!res.success) failedSceneIndexes.push(res.index) });
  }
  if (failedSceneIndexes.length > 0) ElMessage.error(`${failedSceneIndexes.length} 张图片生成失败。`);
  else ElMessage.success('所有选中分镜的图片已生成完毕。');
  isBatchGenerating.value = false;
};
const generateVideoForScene = async (sceneIndex) => {
  const scene = scenes.value[sceneIndex];
  videoGenerationLoading.value[sceneIndex] = true;
  try {
    const prompt = `${scene.image_prompt} ${scene.single_frame_video_prompt}`.trim();
    if (!prompt) {
      videoGenerationLoading.value[sceneIndex] = false;
      return ElMessage.warning('请至少输入图片或视频提示词');
    }
    scene.videoProvider = videoProvider.value;
    const providerName = scene.videoProvider.replace('-sora', '');
    const options = { prompt, seconds: parseInt(videoSeconds.value, 10), size: videoSize.value, watermark: videoWatermark.value, is_private: videoIsPrivate.value, n_frames: parseInt(videoSeconds.value, 10), remove_watermark: !videoWatermark.value };
    
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
  } catch (e) {
    console.error(e);
    ElMessage.error(`分镜 ${sceneIndex + 1} 视频生成失败: ${e.message}`);
    videoGenerationLoading.value[sceneIndex] = false;
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
        await FileAPI.saveImage(storyTheme.value, `${storyTheme.value}_scene_${sceneIndex + 1}_video.mp4`, scene.videoUrl);
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

const loadHistory = () => {
  const index = getStoryIndex();
  savedStories.value = index.map(key => {
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    return { key, topic: data.topic, createdAt: data.createdAt };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

onMounted(() => {
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
        if (savedState.currentStoryKey === incomingStoryKey) {
          scenes.value = savedState.scenes;
          if (savedState.peoples && Array.isArray(savedState.peoples)) peoples.value = savedState.peoples;
          currentStoryKey.value = savedState.currentStoryKey;
          ElMessage.success('已恢复您对该故事的编辑');
          stateLoaded = true;
        }
      } catch (e) { console.error("解析 storyboard_state 失败", e); }
    }
    if (!stateLoaded && incomingStoryKey) {
      ElMessage.info('加载新故事分镜...');
      loadStory(incomingStoryKey, false);
      currentStoryKey.value = incomingStoryKey;
    }
  } else {
    const savedStateJSON = localStorage.getItem('storyboard_state');
    if (savedStateJSON) {
      try {
        const savedState = JSON.parse(savedStateJSON);
        if (savedState.scenes && Array.isArray(savedState.scenes)) {
          scenes.value = savedState.scenes;
          if (savedState.peoples && Array.isArray(savedState.peoples)) peoples.value = savedState.peoples;
          currentStoryKey.value = savedState.currentStoryKey;
          ElMessage.success('已恢复上次的编辑状态');
        }
      } catch (e) { console.error("解析 storyboard_state 失败", e); localStorage.removeItem('storyboard_state'); }
    }
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
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(600px, 1fr));
  gap: 16px;
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
.image-preview-wrapper, .video-preview-wrapper {
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
</style>
