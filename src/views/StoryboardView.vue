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
          <el-select v-model="videoSize" placeholder="视频尺寸" style="width:160px; margin-right: 8px;">
            <el-option label="9:16" value="9x16" />
            <el-option label="16:9" value="16x9" />
            <el-option label="1:1" value="1x1" />
            <el-option label="4:3" value="4x3" />
            <el-option label="3:4" value="3x4" />
          </el-select>
          <el-input-number v-model="videoSeconds" :min="1" :max="60" style="width: 120px; margin-right: 8px;"/>
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

const videoSize = ref('9x16')
const videoSeconds = ref(10)
const videoIsPrivate = ref(true)
const videoWatermark = ref(false)
const videoGenerationLoading = ref({})
const videoPollingTimers = ref({}) // New ref to store polling timers

const generateVideoForScene = async (sceneIndex) => {
  const scene = scenes.value[sceneIndex];
  
  videoGenerationLoading.value[sceneIndex] = true;
  try {
    const imageUrl = (scene.images && scene.images.length > 0) ? scene.images[0] : null;
    const prompt = `${scene.image_prompt} ${scene.video_promt}`.trim();

    if (!prompt) {
      ElMessage.warning('请至少输入图片或视频提示词');
      return;
    }

    const data = await VideosAPI.generateVideo(
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
    ElMessage.success(`分镜 ${sceneIndex + 1} 视频生成任务已创建`);

    // Start polling for video status
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

  // Clear existing timer if any
  if (videoPollingTimers.value[sceneIndex]) {
    clearTimeout(videoPollingTimers.value[sceneIndex]);
    delete videoPollingTimers.value[sceneIndex];
  }

  videoGenerationLoading.value[sceneIndex] = true;
  try {
    const data = await VideosAPI.getVideoStatus(scene.videoId, token.value);
    scene.videoStatus = data.status;
    scene.videoProgress = data.progress;

    if (data.video_url) {
      scene.videoUrl = data.video_url;
      ElMessage.success(`分镜 ${sceneIndex + 1} 视频已生成`);

      // Save video URL to backend
      try {
        const filename = `${storyTheme.value}_scene_${sceneIndex + 1}_video.mp4`; // Assuming mp4
        await FileAPI.saveImage(storyTheme.value, filename, data.video_url); // Using saveImage for now
        ElMessage.info(`视频 ${filename} 已保存到服务器。`);
      } catch (saveError) {
        console.error('保存视频文件失败:', saveError);
        ElMessage.error('视频生成成功，但保存到服务器失败。');
      }

    } else if (data.status === 'failed' || data.status === 'error') {
      ElMessage.error(`分镜 ${sceneIndex + 1} 视频生成失败: ${data.status}`);
    } else {
      ElMessage.info(`分镜 ${sceneIndex + 1} 视频状态: ${data.status}, 进度: ${data.progress}%`);
      // Continue polling if not completed and no video_url
      videoPollingTimers.value[sceneIndex] = setTimeout(() => {
        checkVideoStatus(sceneIndex, true);
      }, 10000); // Poll every 10 seconds
    }
  } catch (e) {
    console.error(e);
    ElMessage.error(`分镜 ${sceneIndex + 1} 视频状态更新失败: ${e.message}`);
  } finally {
    if (!isPolling || scene.videoUrl || scene.videoStatus === 'failed' || scene.videoStatus === 'error') {
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
