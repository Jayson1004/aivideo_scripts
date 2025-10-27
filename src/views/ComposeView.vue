<template>
  <div style="padding:16px;width: 100vw;">
    <el-page-header content="合成视频" />
    <el-card style="margin-top:12px;">
      <el-form label-width="120px" style="max-width:640px;">
        <el-form-item label="音频文本">
          <el-input v-model="text" type="textarea" :rows="6" placeholder="输入旁白文本" />
        </el-form-item>
        <el-form-item label="声音模型">
          <el-select v-model="selectedVoice" placeholder="选择声音模型" style="width:300px;" @change="onVoiceChange">
            <el-option-group label="中文声音">
              <el-option 
                v-for="voice in chineseVoices" 
                :key="voice.value" 
                :label="voice.label" 
                :value="voice.value" 
              />
            </el-option-group>
            <el-option-group label="英文声音">
              <el-option 
                v-for="voice in englishVoices" 
                :key="voice.value" 
                :label="voice.label" 
                :value="voice.value" 
              />
            </el-option-group>
            <el-option-group label="其他语言">
              <el-option 
                v-for="voice in otherVoices" 
                :key="voice.value" 
                :label="voice.label" 
                :value="voice.value" 
              />
            </el-option-group>
          </el-select>
          <el-button @click="loadVoices" size="small" style="margin-left:8px;">刷新声音列表</el-button>
        </el-form-item>
        <el-form-item label="语速调整">
          <div style="display:flex; align-items:center; gap:12px; width:80%;">
            <el-slider v-model="speechRate" :min="-100" :max="100" :step="5" style="flex:1;" />
            <span style="width:60px; text-align:right;">{{ speechRate >= 0 ? '+' : '' }}{{ speechRate }}%</span>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="genAudio" :loading="loading">生成音频</el-button>
          <el-button style="margin-left:8px;" @click="openAudioDialog" :loading="loading">已生成音频</el-button>
          <span v-if="audioPath" style="margin-left:12px;">已生成：{{ audioPath }}</span>
        </el-form-item>
        <el-divider />
        <el-form-item label="分辨率">
          <div style="display:flex; gap:8px; align-items:center;">
            <el-select v-model="resolutionPreset" placeholder="选择预设" style="width:180px;">
              <el-option label="不指定（沿用图片）" value="none" />
              <el-option label="1080p (1920x1080)" value="1080p" />
              <el-option label="720p (1280x720)" value="720p" />
              <el-option label="竖屏 (1080x1920)" value="vertical" />
              <el-option label="正方形 (1080x1080)" value="square" />
              <el-option label="自定义" value="custom" />
            </el-select>
            <template v-if="resolutionPreset==='custom'">
              <el-input v-model.number="customWidth" placeholder="宽" style="width:120px;" />
              <span>x</span>
              <el-input v-model.number="customHeight" placeholder="高" style="width:120px;" />
            </template>
          </div>
        </el-form-item>
        <el-form-item label="帧率 (fps)">
          <el-input-number v-model="fps" :min="10" :max="60" :step="1" />
        </el-form-item>
        <el-form-item label="转场时长(s)">
          <el-input-number v-model="transitionDuration" :min="0" :max="2" :step="0.1" />
        </el-form-item>
        <el-form-item label="启用字幕">
          <el-switch v-model="enableSubtitles" />
        </el-form-item>
        <el-form-item label="Whisper模型">
          <el-select v-model="whisperModel" placeholder="选择模型" style="width:180px;">
            <el-option label="tiny" value="tiny" />
            <el-option label="base" value="base" />
            <el-option label="small" value="small" />
            <el-option label="medium" value="medium" />
            <el-option label="large" value="large" />
          </el-select>
        </el-form-item>
        <el-form-item label="背景音乐路径">
          <div style="display:flex; gap:8px; width:100%; align-items:center;">
            <el-input v-model="backgroundMusicPath" placeholder="/video_assets/xxx.mp3 或相对路径" />
            
          </div>
        </el-form-item>
        <el-form-item label="背景音乐音量">
          <div style="display:flex; align-items:center; gap:8px; width:100%;">
            <el-slider v-model="backgroundVolume" :min="0" :max="1" :step="0.05" style="flex:1;" />
            <span style="width:40px; text-align:right;">{{ backgroundVolume.toFixed(2) }}</span>
          </div>
        </el-form-item>
        <el-divider />
        <el-form-item label="字幕样式-大小">
          <el-input-number v-model="subtitleStyle.font_size" :min="10" :max="50" />
        </el-form-item>
        <el-form-item label="字幕样式-字体色">
          <el-color-picker v-model="subtitleStyle.font_color" />
        </el-form-item>
        <el-form-item label="字幕样式-边框色">
          <el-color-picker v-model="subtitleStyle.border_color" />
        </el-form-item>
        <el-form-item label="字幕样式-边框宽">
          <el-input-number v-model="subtitleStyle.border_width" :min="0" :max="10" />
        </el-form-item>
        <el-form-item label="字幕位置">
          <el-select v-model="subtitleStyle.position" placeholder="位置" style="width:180px;">
            <el-option label="bottom" value="bottom" />
            <el-option label="top" value="top" />
            <el-option label="center" value="center" />
          </el-select>
        </el-form-item>
        <!-- effect_preset -->
        <el-form-item label="特效预设">
          <el-select v-model="effectPreset" placeholder="选择特效预设" style="width:180px;">
            <el-option label="none" value="none" />
            <el-option label="meteors" value="meteors" />
            <el-option label="sparkles" value="sparkles" />
            <el-option label="bubbles" value="bubbles" />
            <el-option label="snow" value="snow" />
            <el-option label="petals" value="petals" />
            <el-option label="energy" value="energy" />
          </el-select>
        </el-form-item>
        <!-- custom_effects -->
        <el-form-item label="自定义特效">
          <el-input v-model="customEffects" placeholder="输入自定义特效" />
        </el-form-item>
        <el-form-item label="生成文件名">
          <el-input v-model="output" placeholder="输入文件名" />
        </el-form-item>
        <el-form-item>
          <el-button type="success" @click="compose" :disabled="!audioPath || images.length===0" :loading="loading">合成视频</el-button>
          <el-button style="margin-left:8px;" @click="openVideoDialog" :loading="loading">已生成视频</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    <el-dialog v-model="showVideoDialog" title="已生成视频" width="800px">
      <div v-if="videos.length===0" style="color:#888;">暂无视频</div>
      <el-table v-else :data="videos" size="small" style="width:100%">
        <el-table-column prop="filename" label="文件名" width="260" />
        <el-table-column prop="size_mb" label="大小(MB)" width="120" />
        <el-table-column prop="modified_time" label="时间" />
        <el-table-column label="预览" width="120">
          <template #default="{ row }">
            <el-button size="small" @click="previewVideo(row)">预览</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="showVideoDialog=false">关闭</el-button>
      </template>
    </el-dialog>
  <!-- 预览视频 -->
  <el-dialog v-model="showPreviewVideoDialog" title="预览视频" width="800px">
    <video :src="previewVideoUrl" controls style="width:100%; height:100%;"></video>
    <template #footer>
      <el-button @click="showPreviewVideoDialog=false">关闭</el-button>
    </template>
  </el-dialog>


    <el-dialog v-model="showAudioDialog" title="选择背景音乐" width="700px">
      <div v-if="audios.length===0" style="color:#888;">暂无音频</div>
      <el-table v-else :data="audios" size="small" style="width:100%">
        <el-table-column prop="filename" label="文件名" />
        <el-table-column prop="size_kb" label="大小(KB)" width="120" />
        <el-table-column prop="modified_time" label="时间" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button size="small" @click="selectAudio(row)">选择</el-button>
            <el-button size="small" @click="previewAudio(row)" type="primary" plain>预览</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="showAudioDialog=false">关闭</el-button>
      </template>
    </el-dialog>
    <!-- 预览音频 -->
    <el-dialog v-model="showPreviewAudioDialog" title="预览音频" width="800px">
      <audio :src="previewAudioUrl" controls style="width:100%; height:50px;"></audio>
      <template #footer>
        <el-button @click="showPreviewAudioDialog=false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'

const text = ref('')
const output = ref('')
const audioPath = ref('')
const loading = ref(false)
const images = ref([])

// 声音选择相关
const selectedVoice = ref('')
const speechRate = ref(0)
const chineseVoices = ref([])
const englishVoices = ref([])
const otherVoices = ref([])
const defaultVoice = ref('')

// 视频参数
const resolutionPreset = ref('1080p')
const customWidth = ref(1920)
const customHeight = ref(1080)
const fps = ref(24)
const transitionDuration = ref(0.5)
const enableSubtitles = ref(true)
const whisperModel = ref('base')
const backgroundMusicPath = ref('/video_assets/background_music.mp3')
const backgroundVolume = ref(0.3)
const subtitleStyle = ref({
  font_size: 18,
  font_color: 'ffffff',
  border_color: '000000',
  border_width: 2,
  position: 'bottom'
})

// 列表弹窗
const showVideoDialog = ref(false)
const showAudioDialog = ref(false)
const videos = ref([])
const audios = ref([])
const showPreviewVideoDialog = ref(false)
const previewVideoUrl = ref('')

onMounted(()=>{
  images.value = JSON.parse(sessionStorage.getItem('images')||'[]')
  // loadVoices()
})

// 声音选择相关方法
// const loadVoices = async () => {
//   try {
//     const voicesData = await AudioAPI.getVoices()
//     if (voicesData.voices) {
//       chineseVoices.value = voicesData.voices.filter(v => v.category === 'chinese')
//       englishVoices.value = voicesData.voices.filter(v => v.category === 'english')
//       otherVoices.value = voicesData.voices.filter(v => v.category === 'other')
//       defaultVoice.value = voicesData.default_voice
      
//       // 设置默认选择的声音
//       if (!selectedVoice.value && defaultVoice.value) {
//         selectedVoice.value = defaultVoice.value
//       }
//     }
//   } catch (error) {
//     console.error('加载声音列表失败:', error)
//   }
// }

const onVoiceChange = (voice) => {
  console.log('选择的声音:', voice)
}

const genAudio = async ()=>{
  loading.value = true
  // 支持中文，英文，数字，标点符号, 中文标点符号
  // text.value = text.value.replace(/[^a-zA-Z0-9\s,.?!\u4e00-\u9fa5，。？！]/g, ' ')
  // // 清理多余换行和空格
  // text.value = text.value.replace(/\n+/g, '\n').replace(/\s+/g, ' ').trim()

  try{ 
    // const { url } = await AudioAPI.generate(text.value, output.value, selectedVoice.value || null, speechRate.value)
    // audioPath.value = url 
  }catch(e){ console.error(e) }
  loading.value = false
}
const effectPreset = ref('none')
const customEffects = ref('')
const compose = async ()=>{
  loading.value = true
  try{
    // 解析分辨率
    let resolution = null
    if(resolutionPreset.value === '1080p') resolution = [1920,1080]
    else if(resolutionPreset.value === '720p') resolution = [1280,720]
    else if(resolutionPreset.value === 'square') resolution = [1080,1080]
    else if(resolutionPreset.value === 'vertical') resolution = [1080,1920]
    else if(resolutionPreset.value === 'custom' && customWidth.value>0 && customHeight.value>0) resolution = [customWidth.value, customHeight.value]
 
    const options = {
      fps: fps.value,
      transition_duration: transitionDuration.value,
      enable_subtitles: enableSubtitles.value,
      whisper_model: whisperModel.value,
      background_music_path: backgroundMusicPath.value || null,
      background_volume: backgroundVolume.value,
      output_filename: (output.value||'').trim() || null,
      subtitle_style: subtitleStyle.value,
      effect_preset: effectPreset.value,
      custom_effects: customEffects.value ? JSON.parse(customEffects.value) : null,
    }
    if(resolution) options.resolution = resolution

    // const { url } = await VideoAPI.compose(images.value, audioPath.value, options)
    // // 直接在页面预览
    // previewVideoUrl.value = url
  showPreviewVideoDialog.value = true
  }catch(e){ console.error(e) }
  loading.value = false
}

const openVideoDialog = async ()=>{
  try{
    // videos.value = await VideoAPI.list()
    // showVideoDialog.value = true
  }catch(e){ console.error(e) }
}

const previewVideo = (row)=>{
  const base = import.meta.env.VITE_API_BASE || ''
  const url = `${base}/videos/${row.filename}`
  previewVideoUrl.value = url
  showPreviewVideoDialog.value = true

}

const openAudioDialog = async ()=>{
  try{
    // audios.value = await AudioAPI.list()
    // showAudioDialog.value = true
  }catch(e){ console.error(e) }
}
const selectAudio = (row)=>{
  audioPath.value = row.url
  showAudioDialog.value = false
}

const showPreviewAudioDialog = ref(false)
const previewAudioUrl = ref('')
const previewAudio = (row)=>{
  const base = import.meta.env.VITE_API_BASE || ''
  const url = `${base}${row.url}`
  previewAudioUrl.value = url
  showPreviewAudioDialog.value = true

}

 
</script>
