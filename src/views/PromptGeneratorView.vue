<template>
  <div style="padding:16px;">
    
    <el-page-header content="分镜提示词生成器" @back="router.back()">
      <template #extra>
        <div style="display: flex; align-items: center; gap: 16px;">
          <el-button @click="showHistoryDialog = true">历史记录</el-button>
          <el-button @click="exportScript" :disabled="generatedScenes.length === 0">导出文案</el-button>
          <el-button @click="useInStoryboard" type="primary" :disabled="generatedScenes.length === 0">前往分镜视频</el-button>
        </div>
      </template>
    </el-page-header>

    <el-steps :active="activeStep" finish-status="success" simple style="margin-top: 20px;">
      <el-step title="第1步：生成故事" />
      <el-step title="第2步：生成分镜" />
      <el-step title="第3步：完成" />
    </el-steps>
<!-- <span>claude-sonnet-4-5-20250929-thinking模型价格计算:提示 9345 tokens / 1M tokens * $3 + 补全 2360 tokens / 1M tokens * $15 * 分组倍率 1 = $0.063435

</span> -->
    <!-- Step 1: Story Generation -->
    <el-card style="margin-top:12px;">
      <template #header>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span>第1步：生成或完善故事</span>
          <el-button text @click="clearForm">新建会话</el-button>
        </div>
      </template>
      <el-form :model="form" label-width="100px" style="max-width: 800px; margin:auto;">
        <el-form-item label="故事主题">
          <el-input v-model="form.topic" placeholder="请输入故事主题，可不填" />
        </el-form-item>
        <el-form-item label="模型选择" v-if="form.generate_story_type !== '3'">
          <el-select v-model="form.model" placeholder="选择语言模型" style="width: 100%;">
            <el-option-group label="OpenAI">
              <el-option label="GPT-5 (2025-08-07)" value="gpt-5-2025-08-07"></el-option>
              <el-option label="GPT-5.1" value="gpt-5.1"></el-option>

              
              <el-option label="GPT-4" value="gpt-4"></el-option>
            </el-option-group>
            <el-option-group label="Claude">
              <el-option label="Claude Sonnet 4.5 (Thinking)" value="claude-sonnet-4-5-20250929-thinking"></el-option>
              <el-option label="Claude Sonnet 4.0" value="claude-sonnet-4-20250514"></el-option>
              <el-option label="Claude Opus 4.1" value="claude-opus-4-1-20250805"></el-option>
            </el-option-group>
            <!-- gemini-3-pro-preview-thinking -->
          </el-select>
        </el-form-item>
       
        <el-form-item label="故事来源">
          <el-radio-group v-model="form.generate_story_type" @change="activeStep = 0">
            <el-radio label="2">AI分析故事</el-radio>
            <el-radio label="3">从YouTube链接生成</el-radio>
            <el-radio label="4">文生视频提示词</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.generate_story_type === '3'" label="链接" required>
          <el-input v-model="form.youtube_link" placeholder="请输入YouTube视频链接" />
        </el-form-item>
       
        <el-form-item v-if="form.generate_story_type === '2'" label="原始故事" required>
          <el-input v-model="form.original_story_text" type="textarea" :rows="8" placeholder="输入您的故事或脚本进行分析..." />
        </el-form-item>
        <el-form-item v-if="form.generate_story_type === '4'" label="视频类型">
          <el-select v-model="form.ttv_story_type" placeholder="选择故事类型">
            <el-option v-for="story in storysBase" :key="story.title" :label="story.title" :value="story.title" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.generate_story_type === '4'" label="视频设置">
          <el-select v-model="videoProvider" placeholder="视频提供方" style="width:160px; margin-right: 8px;">
            <el-option label="Yunwu" value="yunwu" />
            <el-option label="Kie" value="kie" />
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
        <el-form-item label="分镜数" v-if="form.generate_story_type === '2'">
          <el-input-number v-model="form.story_length" :min="1" :max="100" :step="1" />
        </el-form-item>
        <el-form-item label="其他要求">
          <el-input v-model="form.additional_requirements" placeholder="可选：例如故事的特定背景、人物性格等" />
        </el-form-item>
      </el-form>
      <div style="display:flex; gap:12px; justify-content: center; margin-top: 20px;">
        <el-button type="primary" size="large" :loading="loading" @click="generateStory">
          {{ form.generate_story_type === '2' ? 'AI分析故事' : (form.generate_story_type === '3' ? '生成故事' : '生成提示词') }}
        </el-button>
        <el-button v-if="form.generate_story_type === '4' && form.generated_story_text" type="success" size="large" :loading="videoLoading" @click="generateVideo">
          生成视频
        </el-button>
      </div>
      <div v-if="form.generate_story_type === '4' && videoId" style="margin-top: 20px; text-align: center;">
        <p>视频ID: {{ videoId }}</p>
        <el-tooltip :content="videoErrorMessage" placement="top" v-if="videoErrorMessage">
          <p style="color: red;">状态: {{ videoStatus }}</p>
        </el-tooltip>
        <p v-else>状态: {{ videoStatus }}</p>
        <el-progress :percentage="videoProgress" v-if="videoStatus !== 'completed' && videoStatus !== 'success' && videoStatus !== 'failed' && videoStatus !== 'error' && videoStatus !== 'fail'" style="width: 300px; margin: 10px auto;" />
        <a :href="generatedVideoUrl" target="_blank" v-if="generatedVideoUrl">查看视频</a>
        <el-button size="small" @click="checkVideoStatus()" :loading="videoLoading" v-if="!generatedVideoUrl && videoStatus !== 'failed' && videoStatus !== 'error' && videoStatus !== 'fail'">刷新状态</el-button>
        <el-button size="small" @click="generateVideo" :loading="videoLoading" v-if="videoStatus === 'failed' || videoStatus === 'error' || videoStatus === 'fail'">重新生成</el-button>
      </div>
    </el-card>

    <!-- Video Result Dialog -->
    <el-dialog v-model="showVideoResultDialog" title="视频生成完成" width="60%">
      <div v-if="generatedVideoUrl">
        <video :src="generatedVideoUrl" controls style="width: 100%;"></video>
      </div>
      <el-form :model="videoForm" label-width="100px" style="margin-top: 20px;">
        <el-form-item label="视频标题" required>
          <el-input v-model="videoForm.title" />
        </el-form-item>
        <el-form-item label="视频描述">
          <el-input v-model="videoForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="视频缩略图">
          <el-upload
            action="#"
            list-type="picture-card"
            :auto-upload="false"
            :on-change="handleThumbnailChange"
            :limit="1"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showVideoResultDialog = false">关闭</el-button>
        <el-button type="primary" @click="saveVideoDetails">保存</el-button>
      </template>
    </el-dialog>


    <!-- Step 2: Storyboard Generation -->
    <el-card style="margin-top:12px;">
       <template #header>
        <span>第2步：生成分镜提示词</span>
      </template>
      <el-form :model="form" label-width="120px" style="max-width: 800px; margin:auto;">
        <el-form-item label="故事文本">
          <el-input v-model="form.generated_story_text" type="textarea" :rows="14" placeholder="
          请先在第1步生成故事，或在此处直接粘贴故事文本。 如果格式是:
          分镜1
          图片提示词： xxx 孙悟空（看手机）
          单帧视频提示词：xxx
          首尾帧视频提示词：xxx
          分镜2
          图片提示词： xxx 猪八戒（看电视）
          单帧视频提示词：3232
          首尾帧视频提示词：xxx.. 请不要打开下面非分镜结构文本，因为这是可直接分析的分镜结构。 
          如果是这样的格式：
          一. 故事内容
          这是一个关于通过努力和奇遇实现梦想的励志爱情故事，发生在xxx。
          二. 图片提示词
          [主体]角色：Sakura（亚洲女性，体型肥胖）和Naruto（亚洲男性）。
          表情：开心
          动作：Sakura双手贴在xxx
          [环境]水族馆内部，背景xxx。
          [时间]白天
          [天气]晴
          [视角]平视
          [景别]中景
          三. 单帧视频提示词
          [Sakura嘟起嘴唇亲吻玻璃，
          视频画面连贯，流畅，符合现实运动规则，不要出现其他角色。
          四. 字幕
          我...
          终于要见到他了！
          五. 首尾帧视频提示词
          图片 [shot1] → 图片 [shot2]
          [前3秒：Sakuraxxx，Naruto在xxx] + [后2秒：Sakuraxxx，场景切换到街道]。[浪漫转为活力]。[无缝转场，动态模糊]
          图片 [shot2] → 图片 [shot3]
          [前3秒：Sakura在xxx] + [后2秒：Sakura跑xxx，MermaidShopOwner举起xxx]。[充满希望到遭遇挫折]。[跟随镜头]
          ，（GAS可以根据提示词生成的结构）请打开开关。" />
        </el-form-item>
        <el-form-item>
          <el-switch v-model="isUnstructuredText" active-text="非分镜结构文本" />
        </el-form-item>
        <!-- <el-form-item label="生成语言">
          <el-radio-group v-model="form.language">
            <el-radio label="chinese">中文</el-radio>
            <el-radio label="english">English</el-radio>
          </el-radio-group>
        </el-form-item> -->
        <!-- <el-form-item label="视频风格">
          <el-select v-model="form.style" placeholder="选择视频风格" style="width:160px;">
            <el-option v-for="style in styleOptions" :key="style.value" :label="style.label" :value="style.value" />
          </el-select>
        </el-form-item> -->
      </el-form>
      <div style="display:flex; gap:12px; justify-content: center; margin-top: 20px;">
        <el-button type="primary" size="large" :loading="loading" @click="generateStoryboardPrompts" :disabled="!form.generated_story_text.trim()">生成分镜提示词</el-button>
      </div>
    </el-card>

    <!-- History Dialog -->
    <el-dialog v-model="showHistoryDialog" title="历史记录" width="70%">
      <el-table :data="savedStories" style="width: 100%" max-height="60vh">
        <el-table-column prop="topic" label="故事主题" min-width="200" />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center">
          <template #default="{ row }">
            <el-button size="small" @click="loadStory(row.key)">加载</el-button>
            <el-button size="small" type="danger" @click="deleteStory(row.key)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, onMounted,watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PromptAPI, FileAPI, VideosAPI, BookwormAPI } from '../services/api';
import { Plus } from '@element-plus/icons-vue';
import { useSettings } from '../composables/useSettings';

const router = useRouter()
const { settings } = useSettings();

// State
const activeStep = ref(0)
const form = ref(getInitialFormState())
const loading = ref(false)
const generatedScenes = ref([])
const showHistoryDialog = ref(false)
const savedStories = ref([])
const currentStoryKey = ref(null)
const isUnstructuredText = ref(false)

// Video Generation State
const videoLoading = ref(false);
const showVideoResultDialog = ref(false);
const generatedVideoUrl = ref('');
const videoForm = ref({
  title: '',
  description: '',
  thumbnail: null,
});
const videoProvider = ref('yunwu');
const videoSize = ref('9x16');
const videoSeconds = ref('10');
const videoIsPrivate = ref(true);
const videoWatermark = ref(false);
const videoId = ref(null);
const videoStatus = ref('');
const videoProgress = ref(0);
const videoErrorMessage = ref('');
const videoPollingTimer = ref(null);
const videoRetryCount = ref(0);

const styleOptions = [
{ label: '无风格', value: '' },
  { label: '3D卡通', value: 'Cartoon Games 3D' },
  { label: '索尼影片', value: 'Sony Pictures Animation' },
  { label: '动漫', value: 'anime style' },
  { label: '像素艺术', value: 'pixel art style' },
  { label: '低多边形', value: 'low poly style' },
  { label: '写实', value: 'photorealistic' },
  { label: 'Roblox像素风', value: 'Roblox pixel' },
]

const storysBase = [{
  title: '狗英雄救人',
  hero:'狗',
  content: `1. 故事结构与叙事弧 开端 (Exposition): 背景引入: 视频片段都始于一个平静的日常场景（院子、走廊、客厅、厨房等等），通常采用固定的监控摄像头视角,画面比例 ${videoSize.value}。 角色与情境: 一个弱势角色（通常是独处的女性或弱势人群）正在进行无害的日常活动（坐着休息、玩耍等等），他们对即将到来的危险毫不知情。一只狗（通常是德国牧羊犬、金毛寻回犬等）安静地陪伴在旁。 引子/悬念: 监控摄像头的视角本身就暗示着“将有不寻常的事件被记录下来”，营造了潜在的紧张感。
   发展 (Rising Action): 关键事件: 一个突发的、致命的威胁出现。这可能是从天而降的重物（保险箱，客厅危险物品，厨房危险物品等等），或是突然闯入的危险动物（野牛、鹰、野猪）等等。 冲突引入与升级: 狗比人类先一步感知到危险。它的行为模式从平静瞬间切换为极度的警觉和果断，冲突从“潜在的危险”升级为“迫在眉睫的威胁 vs. 狗的紧急反应”。 高潮 (Climax): 转折点/矛盾爆发: 在威胁触及人类的前一刹那，狗采取了决定性的物理行动——猛力将人扑倒、推开或拖离危险区域，如果是儿童，是符合常理的保护行为。这是“拯救”的瞬间，是整个叙事中张力最强的时刻。 
   最紧张时刻: 画面同时呈现了“成功的规避”与“危险的降临”（例如，人刚被扑倒，危险物品就砸在原来的位置上（或者危险动物冲到刚才人物的位置），危险源头和人物位置要能对上，人物位置的变化才使得没有受到伤害），形成了强烈的视觉冲击和“千钧一发”的紧张感。 结局 (Falling Action & Resolution): 高潮后: 人类从震惊中反应过来，意识到自己刚刚躲过一劫。危险源已被消除或被狗阻挡。 问题解决: 直接的生命威胁被成功解除。 角色状态变化: 人类从“无知”变为“震惊和感激”，狗则从“守护者”的角色中放松下来，通常会得到主人的安抚和感谢。 结局类型: 视频片段都是一个完整的、封闭式的英雄事件。 
   余韵: 强化了“狗是人类忠诚守护者”的核心信息，留给观众感动和震撼。 整体结构类型: 这是一个主题式片段 (Thematic Compilation)。遵循着一个极其紧凑的微型三幕式结构（铺垫 -> 冲突与拯救 -> 解脱），并且是严格的线性叙事。 2. 核心主题与情感基调 核心主题: 动物的英雄主义、忠诚、守护本能、人与动物之间深厚的情感纽带、日常生活中潜藏的危险。 情感基调: 整体上是紧张、悬疑、惊险，并最终导向感动、温暖、励志和震撼。 情感变化: 从平淡的日常感，迅速拉升至极度的紧张和恐惧，最后在高潮的拯救中释放，转化为强烈的感动和安心。
    3. 角色塑造 主要角色: 狗 (英雄/守护者): 核心动机是保护主人/弱小。性格特点是警觉、勇敢、果断、无私、忠诚。 人类 (被守护者): 通常是脆弱、无助、对危险毫无察觉的符号化角色。 威胁 (冲突源): 可能是无意识的物理危险（重力、意外），也可能是有意识的侵略者（野生动物），代表着“突发的厄运”。 人物关系: 明确的守护者与被守护者的关系。 角色弧光: 所有角色都是原型/静态角色 (Archetypes/Static Characters)，其存在是为了高效地完成“英雄拯救”的叙事模式，没有个人成长。 
    4. 冲突与张力 主要冲突: 核心是外部冲突——“守护者（狗） vs. 致命威胁”，其本质是一场与时间的赛跑，目标是保护脆弱的第三方（人类）。 冲突升级: 张力来源于“信息差”——观众和狗知道危险，但画面中的人类不知道。当威胁越来越近，而人类毫无反应时，张力达到顶点。 关键反转: 每个片段的“反转”在于，狗最初看似“突兀”或“攻击性”的行为（如猛扑主人），其真实意图在下一秒被揭示为救命之举。 
    5. 节奏与时间线 整体节奏: 极快。视频由一系列高潮时刻剪辑而成，几乎没有冗余的铺垫。 节奏变化: 每个片段内部遵循“慢 -> 极快 -> 慢”的节奏模式（平静的日常 -> 瞬间的爆发式动作 -> 劫后余生的平静）。 时间线处理: 所有片段均为顺叙。视频中出现的未来日期（如2025年）是一个关键特征，暗示这些是AI生成的概念性或虚构性内容。 
    6. 画面风格与视觉元素 整体视觉风格: 典型的**“监控录像/家庭摄像头” (CCTV/Found Footage) 风格**。这种风格旨在营造一种未经修饰的、客观的“真实感”。 关键场景特点: 色调/光影: 通常是自然光，色彩偏向写实，有时会带有监控设备的低饱和度或轻微的噪点。 构图: 多为固定的广角镜头，视角单一，缺乏电影运镜，以此来模仿真实监控的记录方式。 象征性视觉符号: 监控画面叠加层 (REC, CAM, Timestamp): 强化了“事件是真实被记录下来”的错觉，是风格的核心元素。 狗: 忠诚与守护的终极象征。 婴儿: 纯洁、无助与未来的象征，使其被拯救的故事更具情感冲击力。 
    7. 开头与结尾的技巧 开头吸引力: 视频直接以一个高能的拯救片段开场，没有前言，迅速将观众带入紧张刺激的氛围中，并确立了整个视频的主题。 结尾处理: 作为集锦视频，它没有统一的叙事结尾。通常在最后一个感人的片段结束后淡出，将累积的情感（感动、震撼）留给观众，引发对动物伙伴的珍视和思考。 `
}]
const script_topic = ref('')

// --- Helper Functions ---
function getInitialFormState() {
  return {
    topic: '',
    style: 'photorealistic',
    ttv_story_type: '',
    language: 'english',
    story_type: '科幻',
    story_length: 15,
    generate_story_type: '2',
    youtube_link: '',
    original_story_text: '',
    generated_story_text: '',
    additional_requirements: '',
    provider: 'apicore',
    model: 'gpt-5-2025-08-07',
  }
}

const generateStoryKey = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `story_${date}_${random}`;
};

// --- LocalStorage Management ---
const getStoryIndex = () => JSON.parse(localStorage.getItem('story_index') || '[]');
const saveStoryIndex = (index) => localStorage.setItem('story_index', JSON.stringify(index));

const loadHistory = () => {
  const index = getStoryIndex();
  savedStories.value = index.map(key => {
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    return { key, ...data };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const loadStory = (key) => {
  const data = JSON.parse(localStorage.getItem(key) || '{}');
  if (!data.form) {
    ElMessage.error('加载失败，历史记录数据格式不正确。');
    return;
  }
  form.value = data.form;
  generatedScenes.value = data.scenes || [];
  form.value.generated_story_text = data.generated_story_text;
  currentStoryKey.value = key;
  activeStep.value = data.scenes?.length ? 2 : (data.generated_story_text ? 1 : 0);
  showHistoryDialog.value = false;
  ElMessage.success(`已加载: ${data.topic}`);
};

const deleteStory = async (key) => {
  try {
    await ElMessageBox.confirm('确定要删除这条历史记录吗？', '确认删除', { type: 'warning' });
    localStorage.removeItem(key);
    let index = getStoryIndex();
    index = index.filter(item => item !== key);
    saveStoryIndex(index);
    loadHistory(); // Refresh history list
    ElMessage.success('已删除');
  } catch {
    // User canceled
  }
};

// --- Main Actions ---
const generateStory = async () => {
  const sourceType = form.value.generate_story_type;
 
  if (sourceType === '2' && !form.value.original_story_text.trim()) {
    ElMessage.warning('请输入原始故事文本');
    return;
  }
  if (sourceType === '3' && !form.value.youtube_link.trim()) {
    ElMessage.warning('请输入YouTube链接');
    return;
  }
  if (sourceType === '4' && !form.value.ttv_story_type.trim()) {
    ElMessage.warning('请选择视频类型');
    return;
  }

  loading.value = true;
  form.value.generated_story_text = '';
  generatedScenes.value = [];
  activeStep.value = 0;

  // Reset video state
  videoId.value = null;
  videoStatus.value = '';
  videoProgress.value = 0;
  videoErrorMessage.value = '';
  generatedVideoUrl.value = '';
  videoRetryCount.value = 0;
  if (videoPollingTimer.value) {
    clearTimeout(videoPollingTimer.value);
    videoPollingTimer.value = null;
  }

  try {
    if (sourceType === '3') {
      const payload = {
        model: 'gemini-2.5-pro-thinking',
        stream: false,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `
                  基于YouTube视频的分镜分析
                  原始链接: ${form.value.youtube_link}
                  分析提示: 你是一位顶级的AI绘画提示词专家，并且精通电影语言。请分析我提供的视频，并严格遵循以下指示：
                  一，故事内容：帮我提炼一个文字版的脚本，中文，描述整个故事，要描述地足够清晰，要保持角色、服装和场景的视觉一致性，每个角色后面都要有（人物特征+服装描述） ，需要强调故事发生地和人种。
                  二，图片提示词：自动识别视频中的每一个主要分镜（场景切换），并为每个分镜的第一帧画面生成一个符合我特定要求的、用于AI绘画的中文提示词（如果同一个场景超过2秒的，请每2秒截取一帧）。请描述每张图片的文生图提示词，中文，要保持角色、服装和场景的视觉一致性，每个角色名称固定，后面都要有（人物特征+服装描述），每张图片提示词都要这么描述，不可省略。
                  每一个角色都要有名字，不可以用父亲之类的称呼来命名。这类称呼可以放在（）内的人物描述。
                  以下是参考例子：
                  名字（人物特征+服装描述）例子1：Rumi（20岁左右的印度女人，面容清秀，身材姣好，长发披肩，穿着褪色的、打补丁的浅蓝色棉布库尔蒂衫和简单的灰色萨尔瓦裤）
                  名字（人物特征+服装描述）例子2：lily（印度女警，30岁左右，身穿卡其色印度警察制服，头戴警帽，黑色短发，眼神温柔）
                  三、单帧视频提示词:自动识别视频中的每一个主要分-镜（场景切换），按分镜详细情节描述提供视频提示词。
                  单分镜视频提示词：这个模板的核心理念是“场景激活三要素”：主体动态化、环境氛围化、镜头电影化。通常生成的视频都是五秒的，每一个分镜都要强调前三秒的动态和后两秒的动态。
                  通用结构:[核心画面描述]，[主体动作/表情的细微变化]。[环境元素的动态效果]。[镜头运动方式]。[风格与画质]
                  同时，每个分镜的动作至少要2-3段，每个角色都要有表情的变化。例如：
                  ”穿女仆装的B突然吃惊的狠狠指着镜头，穿白色裙子的A好奇的看向镜头，B马上凶狠坏笑着退到A的背后，拿出一块手掌大的白布，从A的身后一把将白布捂到A的嘴上，A被捂上之后表情震惊，然后闭眼晕了过去“这里面就包含了B指镜头、B退到A背后、B拿出一块白面捂到A嘴上，总共三段动作。
                  每一个分镜的提示词结尾都要加上：视频画面连贯，流畅，符合现实运动规则，不要出现其他角色。
                  四、首尾帧视频提示词:自动识别视频中的每一个主要分镜（场景切换），按分镜详细情节描述提供视频提示词。
                  首尾帧视频提示词：此模板旨在将两张静态图片（首尾帧）转化为一段富有叙事感和动态美的视频。它通过时间轴控制和明确的指令，精确引导AI完成复杂的角色互动和镜头转换。
                  通用结构:
                  图片 [shot1] → 图片 [shot2]
                  [前3秒：起始画面与动态描述] + [后2秒：核心互动与过渡描述]。[整体情感与氛围描述]。[技术性指令]
                  五、字幕：自动识别视频中的每一个主要分-镜（场景切换），按分镜详细情节描述提供角色对白。
                  六、整体的格式是先按大类分：一.故事内容、二.图片提示词、三.单帧视频提示词、四.字幕、五.首尾帧视频提示词。
                  小类就按序号排序，不要有其它符号和文字，直接是序号+提示词内容。同一个分镜内容不要隔行，不同分镜之间可以隔一行。
                  注意：
                  1.单帧视频提示词和首尾帧视频提示词不需要像图片提示词那样的（人物特征+服装描述）。
                  2.所有分镜内容都是有动作的，严禁一个分镜里同一个角色有两个动作，例如，角色A在切土豆，再将土豆放锅里煮。这里就有两个动作，一个是切土豆，一个是放锅里煮。类似这种情况，需要拆分成两个分镜。另外我强调一下，就是像角色A在切土豆这个分镜，图片提示词是在切土豆前这个画面的描述，视频提示词才是切土豆这个行为。
                  3.所有提示词要有序号排列。

                  不可逾越的铁律 (Unyielding Iron Laws)
                  第一组：核心战略 (Core Strategy) - [最高优先级]
                  1. 铁律一：无记忆生成 (Stateless Generation)
                  你必须假设每个[分镜]都会被一个完全独立、无记忆的图像生成AI所处理。因此，每一个[分镜]都必须是100%完整和自包含的。
                  2. 铁律二：严格数量控制 (Strict Quantity Control)
                  你必须分析出原视频的总镜头切换数量。你最终输出的分镜总数，必须严格控制在该数量的 +/-5% 范围之内。

                  第二组：内容与执行 (Content & Execution)
                  3. 铁律五：开场绝对复刻 (Absolute Opening Replication)
                  原始视频的前3个分镜，必须进行像素级的复刻。
                  4. 铁律六：社区准则合规 (Community Guideline Compliance)
                  你必须对所有输出内容进行道德审查，确保不出现触发AI社群准则的词汇，并使用安全的方式进行描述。
                  5. 铁律九：动作与站位客观化 (Objective Action & Blocking)
                  所有动作描述必须是客观、可执行的，并明确指出角色的相对位置。
                  6. 铁律十：指令明确 (Definitive Commands)
                  你的描述必须是果断且确定的，避免使用任何不确定性的词汇。

                  第三组：格式与模板 (Format & Template)
                  7. 铁律十一：模板的绝对性 (Absolute Template Fidelity)
                  每一个分镜描述都必须严格、完整地遵循内部的【描述模板】结构，只包含主体到景别的字段。
                  8. 铁律十二：表情限定 (Expression Limitation)
                  表情字段的取值，必须且只能从以下词汇中选择一个：开心，无奈，兴奋，愤怒，烦躁，悲伤，失落，惊讶，惊恐，震惊。
                  9. 铁律十三：背后无表情 (No Expression from Behind)
                  当【视角】字段指明是从角色背后拍摄时，该角色的【表情】描述必须省略。
                  10. 铁律十四：视角与景别规则 (View & Shot Rules)
                  视角的取值，必须且只能从平视, 仰视, 俯视, 鸟瞰视角中选择一个。
                  景别的取值，必须且只能从远景, 全景, 中景, 近景, 特写中选择一个。

                  绝对输出格式（严格遵循，不要包含任何额外对话或解释）
                  图片提示词
                  1. [主体]角色：角色A
                  表情：开心
                  动作：角色A坐在桌前，双手放在桌上。
                  [环境]一个现代风格的厨房，背景是橱柜和灶台。
                  [时间]白天
                  [天气]下雨
                  [视角]平视
                  [景别]中景

                  2. [主体]角色：角色B
                  表情：愤怒
                  动作：角色B站在角色A的后面，举起一只手。
                  [环境]一个现代风格的厨房，角色A坐在前景的桌子旁。
                  [时间]白天
                  [天气]晴
                  [视角]平视
                  [景别]全景
              `
              },
              {
                type: 'image_url',
                image_url: {
                  url: form.value.youtube_link,
                },
              },
            ],
          },
        ],
      };
      form.value.generated_story_text = await BookwormAPI.analyze(payload);
      ElMessage.success('YouTube视频分析完成！');
      activeStep.value = 1;
    } else {
      let textContent = '';
      if (sourceType === '2') {
        const imageDescriptionsResult = await PromptAPI.apicoreGenerateTxt(`🔥 Story to Structured Prompts Conversion 🔥

          Please convert the following story into ${form.value.story_length} numbered image prompts in this exact format:

          图片1: [brief scene description]
          图片2: [brief scene description]
          图片3: [brief scene description]
          ...

          Story to convert:
          ${form.value.original_story_text}

          Requirements:
          - Generate exactly ${form.value.story_length} prompts
          - Use format: 图片X: [description]
          - Keep each description concise but descriptive
          - Maintain story flow and narrative structure
          - Focus on key visual moments

          Convert story to structured image prompts format`, form.value.model);

        const finalStoryboardResult = await PromptAPI.apicoreGenerateTxt(`你是一个专业的图片提示词转换师。请将图片描述转换成专业的分镜头序列。

          **【核心任务】图片提示词模式：**
          - 🎨 专注于将图片描述转换为结构化分镜
          - 📐 保持原有的视觉描述完整性
          - 🔄 优化图片提示词的专业表达
          - 🎬 为每个图片生成配套的视频提示词

          **【处理原则】：**
          1. **一对一转换**：每个图片描述对应一个分镜
          2. **视觉增强**：优化图片提示词的专业性和细节
          3. **动态补充**：为静态图片生成合适的视频提示词
          4. **格式规范**：确保输出符合分镜标准格式

          现在请转换以下图片描述：

          🚨🚨🚨 绝对强制格式要求 - 必须严格遵循 🚨🚨🚨

          你必须按照以下精确格式输出，违反格式将导致解析失败：

          分镜1
          图片提示词：[详细的图片生成提示词]
          单帧视频提示词：[基于单张图片的动态视频提示词]
          首尾帧视频提示词：[从当前图片到下一个图片的动态过渡过程]
          字幕：[中文对白或旁白]

          分镜2
          图片提示词：[详细的图片生成提示词]
          单帧视频提示词：[基于单张图片的动态视频提示词]
          首尾帧视频提示词：[从当前图片到下一个图片的动态过渡过程]
          字幕：[中文对白或旁白]

          重要格式规则：
          1. 分镜标题必须是"分镜1"、"分镜2"、"分镜3"等格式
          2. 每个分镜必须包含4个部分：图片提示词、单帧视频提示词、首尾帧视频提示词、字幕
          3. 各部分标签必须完全一致
          4. 不能有额外的标记符号如**、##等
          5. 每个分镜之间用空行分隔

          现在请分析以下内容并严格按照上述格式输出：

          **【关键】智能识别与数量匹配规则：**
          1. **图片提示词列表识别**：
            - 如果输入内容包含"图片1"、"图片2"、"图片3"等编号格式
            - 或者包含多个独立的图片描述段落
            - 请统计输入中的图片数量，然后生成相同数量的分镜
            - 例如：输入有19个图片提示词 → 必须输出19个分镜（分镜1到分镜19）

          2. **故事内容识别**：
            - 如果输入的是连续的故事叙述
            - 请根据故事复杂程度生成合适数量的分镜（通常10-25个）

          3. **严格数量对应**：
            - 图片提示词列表：输入几个图片就输出几个分镜，一一对应
            - 故事内容：根据情节复杂度灵活生成10-25个分镜
            - **绝对不能遗漏任何输入的图片提示词**

          **输出格式要求：**
          - 必须严格按照"分镜1"、"分镜2"、"分镜3"...的格式输出分镜标题
          - 每个分镜都必须包含完整的四个部分：图片提示词、单帧视频提示词、首尾帧视频提示词、字幕

          **重要指导原则：**
          - 请尽可能详细地拆解内容，每个重要场景、动作、对话都应该有独立的分镜
          - 对于复杂的场景，请拆解成多个分镜（例如：人物表情变化、镜头切换、动作序列等）
          - **根据内容类型智能决定分镜数量：故事内容10-25个，图片提示词列表按数量对应**
          - 不要省略任何重要的内容节点
          - 确保每个关键情节都有对应的分镜，但也不要为了凑数量而过度拆分
          - 额外要求: ${form.value.additional_requirements || '无'}

          你的任务是根据我提供的**内容**，将每一个场景（或一个场景内的多个关键瞬间）拆解成独立的图片，并为每张图片生成详细的、用于图像生成模型的提示词。

          **视频提示词生成规则（重要）：**

          请使用以下专业的单图片激活视频提示词模板：

          **核心理念：场景激活三要素**
          - **主体动态化**：让人物或主要物体动起来，注重微小而真实的动作
          - **环境氛围化**：让背景活起来，增加画面真实感和沉浸感  
          - **镜头电影化**：给静态画面增加导演视角，引导观众注意力

          **通用结构：**
          [核心画面描述] + [主体动态化指令] + [环境氛围化指令] + [镜头电影化指令] + [风格与细节指令]

          **实用格式：**
          [核心画面描述]，[主体动作/表情的细微变化]。[环境元素的动态效果]。[镜头运动方式]。[风格与画质]。视频画面连贯，流畅，符合现实运动规则，不要出现其他角色。

          **各部分详解：**
          1. **核心画面描述**：精准描述场景、人物、穿着、构图
          2. **主体动态化**：微小真实的动作（如：她的眼神中流露出绝望、轻轻眨眼、嘴角微微抽动、一滴眼泪滑落、胸口轻微起伏等）
          3. **环境氛围化**：背景元素动态化（如：暴雨持续落下、路灯光影轻轻晃动、阳光透过窗户、尘埃在光柱中飘动等）
          4. **镜头电影化**：缓慢微妙的镜头运动（如：镜头极其缓慢地向前推进、向后拉远、从左向右平移、固定机位等）
          5. **风格细节**：专业术语定义画面质感（如：电影感、8K画质、温暖色调、柔和光线、情绪化等）

          **时间分段要求：**
          - 可以在提示词中加入时间分段描述，例如：前3秒人物缓缓低头，后2秒镜头缓慢推进
          - 时间分段要自然流畅，符合现实运动规律
          - 每个时间段内的动作要连贯，避免突兀的跳跃

          **视频提示词要求：**
          - 【强制要求】必须使用中文，严禁任何英文单词，必须是完整的中文句子
          - 简洁明了
          - 必须严格按照上述单图片激活模板生成
          - 包含五个核心要素：核心画面描述 + 主体动态化 + 环境氛围化 + 镜头电影化 + 风格细节
          - 注重微小而真实的动作，避免大幅度位移
          - 让背景环境也具有动态效果
          - 使用缓慢微妙的镜头运动
          - 适合AI视频生成工具使用
          - 结尾必须包含：视频画面连贯，流畅，符合现实运动规则，不要出现其他角色

          对于每个分镜，请按照以下格式输出：

          **分镜1**
          分镜内容：用中文描述这个分镜的场景和动作
          图片提示词：[镜头类型]，[光线条件]，[时间]，在[场景描述]，背景是[背景细节描述]。

          [主要角色描述1]（[人物特征]，[服装描述]）[动作描述]，[表情描述]。
          [主要角色描述2]（[人物特征]，[服装描述]）[动作描述]，[表情描述]。
          ...（如有更多主要角色，继续添加）。

          [光照]：自然光照，柔和且均匀，微妙且真实的光影。
          [色彩]：色彩明亮，自然清新，空气通透，白平衡准确，无黄色偏色，整体通透干净，明暗层次分明，色彩真实还原，质感柔和细腻。
          [画质]：画面高度细腻，细节极其丰富，达到照片级真实感。追求极致的清晰度和纹理表现，所有物体的材质质感都应逼真呈现。光影过渡自然平滑，色彩还原准确，无噪点，无失真，无数字感。8K分辨率视觉效果。

          **重要说明：**
          - 请将上述模板中的所有 [占位符] 替换为具体内容，不要保留方括号
          - 镜头类型：例如：全身镜头，中景镜头，特写镜头
          - 光线条件：例如：在明亮的日光下，在柔和自然光线，天空朦胧
          - 时间：例如：白天，夜晚，黄昏，清晨
          - 场景描述：例如：一个繁华的印度城市街道，一间破旧的印度乡村房屋内部
          - 背景细节描述：例如：背景是带有"SAVCINO"和"GRIANET"标志的奢侈品店橱窗
          - 主要角色描述：包含角色名称、人物特征、服装描述、动作描述、表情描述
          - 特定物品或道具描述：例如：手中的一叠美元钞票，一叠叠整齐的新衣服
          单帧视频提示词：必须使用中文生成基于单张图片的动态视频提示词，包含五个核心要素：核心画面描述+主体动态化+环境氛围化+镜头电影化+风格细节
          首尾帧视频提示词：必须使用中文生成基于首尾帧转换的视频提示词，描述从当前图片到下一个图片的动态过渡过程
          字幕：中文对白或旁白

          **分镜2**
          分镜内容：用中文描述这个分镜的场景和动作
          图片提示词：[镜头类型]，[光线条件]，[时间]，在[场景描述]，背景是[背景细节描述]。

          [主要角色描述1]（[人物特征]，[服装描述]）[动作描述]，[表情描述]。
          [主要角色描述2]（[人物特征]，[服装描述]）[动作描述]，[表情描述]。
          ...（如有更多主要角色，继续添加）。

          [光照]：自然光照，柔和且均匀，微妙且真实的光影。
          [色彩]：色彩明亮，自然清新，空气通透，白平衡准确，无黄色偏色，整体通透干净，明暗层次分明，色彩真实还原，质感柔和细腻。
          [画质]：画面高度细腻，细节极其丰富，达到照片级真实感。追求极致的清晰度和纹理表现，所有物体的材质质感都应逼真呈现。光影过渡自然平滑，色彩还原准确，无噪点，无失真，无数字感。8K分辨率视觉效果。
          单帧视频提示词：必须使用中文生成基于单张图片的动态视频提示词，包含五个核心要素：核心画面描述+主体动态化+环境氛围化+镜头电影化+风格细节
          首尾帧视频提示词：必须使用中文生成基于首尾帧转换的视频提示词，描述从当前图片到下一个图片的动态过渡过程
          字幕：中文对白或旁白

          重要要求：
          - 保持角色外观、服装、场景的一致性，每个分镜的角色不要有同上，同前等描述，要完整的角色描述
          - 每个角色必须包含详细的外观和服装描述
          - 图片提示词要遵循上述专业格式，包含镜头类型、光线氛围、人物状态、场景细节等
          - 模板特点：结构化描述，专业摄影风格，高质量要求，自然色彩，细节丰富
          - 单帧视频提示词：基于单张图片创建动态视频内容，描述画面中的微小动作和情感表达
          - 首尾帧视频提示词：描述从当前分镜到下一分镜的完整转换过程，包含动作、场景、情绪的变化
          - 【重要】两种视频提示词都必须用中文，严禁使用英文单词，必须是完整的中文句子，描述微小而真实的动作，注重细节变化
          - 请尽量生成更多分镜，不要过度简化或合并场景
          - 继续编号直到故事完整结束（分镜3、分镜4...分镜N）

          **【最终提醒】数量匹配检查 - 输出前必须执行的验证：**
          - 🔍 步骤1：统计输入中所有"图片N"的编号，记录最大编号
          - 🔍 步骤2：确认要输出的分镜数量 = 输入图片的最大编号
          - 🔍 步骤3：逐一检查输出的分镜编号是否连续完整
          - 例如：输入有图片1到图片22 → 输出必须有分镜1到分镜22（共22个）
          - 例如：输入有图片1到图片19 → 输出必须有分镜1到分镜19（共19个）
          - ⚠️ **最重要**：如果输入有22个图片提示词，输出必须有22个分镜，绝对不能是18个或其他数量
          - 🚫 **严格禁止**：合并图片1和图片2为一个分镜
          - 🚫 **严格禁止**：跳过任何图片编号（如跳过图片5、图片12等）
          - 🚫 **严格禁止**：输出数量不足（如输入22个只输出18个）
          - ✅ **必须保证**：有多少个"图片N"就有多少个"分镜N" 
          - ✅ **必须保证**：编号连续完整，从分镜1到分镜N，不能跳号
          - 直接开始分析，不要询问或说明

          **【最后一步：输出前自我验证】**
          在输出前，请执行以下验证步骤：
          1. 数一下你生成了多少个分镜（从分镜1开始数）
          2. 如果数量不足，请立即补充剩余的分镜
          3. 确认每个分镜都有完整的四个部分：图片提示词、单帧视频提示词、首尾帧视频提示词、字幕
          4. 最后在心中默念："我生成了X个分镜，符合输入的X个图片要求"
          🔥🔥🔥 Process the following ${form.value.story_length} image prompts and generate detailed shots! 🔥🔥🔥
          现在请分析以下内容：
          ${imageDescriptionsResult.replace(/<think>.*?<\/think>/g, '')}

          🔥 验证：请确保输出了图片1到图片${form.value.story_length}，总计${form.value.story_length}个分镜！
        `, form.value.model);
        textContent = finalStoryboardResult.replace(/<think>.*?<\/think>/g, '');;

      } else if (sourceType === '4') {
        const selectedStory = storysBase.find(story => story.title === form.value.ttv_story_type);
        if (!selectedStory) {
          ElMessage.error('未找到选定的视频类型故事。');
          loading.value = false;
          return;
        }
       const prompt = `
        # 角色
        你是一位顶级的Sora文生视频提示词专家，精通如何创造出高质量、可直接用于Sora模型的视频生成提示词。

        # 任务
        根据提供的故事要求、类型、视频时长和额外要求，为Sora模型创作一个详细的文生视频提示词。

        # 故事信息
        - 故事类型: ${selectedStory.title}
        - 视频时长: ${videoSeconds.value} 秒
        - 故事参考要求: ${selectedStory.content}
        - 合理发挥你的想象发散场景和动作，符合创作高质量爆款视频的逻辑

        # 要求
        - 提示词必须高度描述性，包含场景、人物、动作、情感、光线、构图、风格等所有视觉元素，使用简洁高效高质量的语言描述。
        - 确保提示词能够引导Sora生成一个连贯、富有电影感的视频。
        - 语言: ${form.value.language}
        - 额外要求: ${form.value.additional_requirements || '无'}
        - 如果是婴儿版本将安全合理地展现守护行为而不涉及真实危险
        - 如果涉及到人物说话，都用英语
        # 输出
        请直接输出Sora文生视频提示词，不要包含任何解释性文字或Markdown代码块。
      `;
      const result = await PromptAPI.apicoreGenerateTxt(prompt, form.value.model);
        if (result) {
          textContent = result;
        } else {
          console.error("Unexpected response structure:", result);
          ElMessage.error('生成故事失败：无法解析模型返回的数据。');
          return;
        }
      }

      if (textContent) {
        form.value.generated_story_text = textContent.trim();
        ElMessage.success('故事已生成！现在可以生成分镜了。');
        activeStep.value = 1;
      } else if (sourceType !== '2') {
         ElMessage.error('生成故事失败：模型未返回有效内容。');
         return;
      }
    }


    // Auto-save the new story
    currentStoryKey.value = generateStoryKey();
    const topic = (form.value.topic || '').trim() || `未命名故事 ${new Date().toLocaleString()}`;
    form.value.topic = topic; // Ensure topic is set in the form for later use

    const data = {
      topic: topic,
      generated_story_text: form.value.generated_story_text,
      scenes: [],
      createdAt: new Date().toISOString(),
      form: { ...form.value } // form already has the updated topic
    };
    localStorage.setItem(currentStoryKey.value, JSON.stringify(data));
    const index = getStoryIndex();
    index.unshift(currentStoryKey.value);
    saveStoryIndex(index);
    loadHistory();

  } catch (error) {
    console.error('生成故事失败:', error);
    ElMessage.error('生成故事失败，请检查网络连接和API配置');
  } finally {
    loading.value = false;
  }
};

const parseexStoryboardScript = (scriptText) => {
    // 1. 使用正则表达式将文本分割成不同部分 (使其对分隔符更具容错性)
    const sections = {
        story: scriptText.match(/一[.\、]\s*故事内容\s*([\s\S]*?)(?=\s*二[.\、]|$)/)?.[1]?.trim() || '',
        imagePrompts: scriptText.match(/二[.\、]\s*图片提示词\s*([\s\S]*?)(?=\s*三[.\、]|$)/)?.[1]?.trim() || '',
        videoPrompts: scriptText.match(/三[.\、]\s*单帧视频提示词\s*([\s\S]*?)(?=\s*四[.\、]|$)/)?.[1]?.trim() || '',
        subtitles: scriptText.match(/四[.\、]\s*字幕\s*([\s\S]*?)(?=\s*五[.\、]|$)/)?.[1]?.trim() || '',
        frameVideoPrompts: scriptText.match(/五[.\、]\s*首尾帧视频提示词\s*([\s\S]*?)$/)?.[1]?.trim() || ''
    };

    // 2. 将每个部分的内容分割成单独的条目数组
    const imagePromptItems = sections.imagePrompts.split(/(?=\[主体\])/g).map(p => p.trim()).filter(Boolean);
    
    const videoPromptDelimiter = '视频画面连贯，流畅，符合现实运动规则，不要出现其他角色。';
    const videoPromptItems = sections.videoPrompts.split(videoPromptDelimiter).map(p => {
        return p.trim() ? (p.trim() + ' ' + videoPromptDelimiter).trim() : '';
    }).filter(Boolean);

    const subtitleItems = sections.subtitles.split('\n').map(p => p.trim()).filter(Boolean);
    
    const frameVideoPromptItems = sections.frameVideoPrompts.split(/(?=图片 \[\w+\] → 图片 \[\w+\])/g).map(p => p.trim()).filter(Boolean);

    // 3. 将分割后的条目重组成标准的分镜对象数组
    const scenes = [];
    const sceneCount = imagePromptItems.length;

    if (sceneCount === 0) {
        console.warn("未能解析到任何图片提示词，无法生成分镜。");
        return { story: sections.story, scenes: [] };
    }

    // 首先创建所有分镜
    for (let i = 0; i < sceneCount; i++) {
        const scene = {
            image_prompt: imagePromptItems[i] || '',
            single_frame_video_prompt: videoPromptItems[i] || '',
            subtitle_text: subtitleItems[i] || '',
            dual_frame_video_prompt: '', // 初始化为空
            image_url: null,
            videoUrl: null,
            videoId: null,
            videoStatus: '',
            videoProgress: 0,
            videoProvider: '',
            videoErrorMessage: '',
            selected: false,
            generationDetails: {},
        };
        scenes.push(scene);
    }

    // 智能地分配 dual_frame_video_prompts
    const shotRegex = /图片\s*\[shot(\d+)\]\s*→\s*图片\s*\[shot(\d+)\]/;
    frameVideoPromptItems.forEach(prompt => {
        const match = prompt.match(shotRegex);
        if (match) {
            const fromIndex = parseInt(match[1], 10) - 1;
            if (fromIndex >= 0 && fromIndex < scenes.length) {
                scenes[fromIndex].dual_frame_video_prompt = prompt;
            }
        }
    });

    return { story: sections.story, scenes };
}

const parseStoryboardScript = (scriptText) => {
  if (!scriptText) return [];

  const scenes = [];
  const sceneBlocks = scriptText.split(/分镜\d+/).filter(b => b.trim());

  for (const block of sceneBlocks) {
    const imageMatch = block.match(/图片提示词：([\s\S]*?)单帧视频提示词：/);
    const singleFrameMatch = block.match(/单帧视频提示词：([\s\S]*?)首尾帧视频提示词：/);
    const dualFrameMatch = block.match(/首尾帧视频提示词：([\s\S]*?)字幕：/);
    const subtitleMatch = block.match(/字幕：([\s\S]*)/);

    scenes.push({
      image_prompt: imageMatch ? imageMatch[1].trim() : '',
      single_frame_video_prompt: singleFrameMatch ? singleFrameMatch[1].trim() : '',
      dual_frame_video_prompt: dualFrameMatch ? dualFrameMatch[1].trim() : '',
      subtitle_text: subtitleMatch ? subtitleMatch[1].trim() : '',
      image_url: null,
      videoUrl: null,
      videoId: null,
      videoStatus: '',
      videoProgress: 0,
      videoProvider: '',
      videoErrorMessage: '',
      selected: false,
      generationDetails: {},
    });
  }
  return scenes;
};

const parseUnstructuredText = (text) => {
  if (!text || !text.trim()) return [];
  // Split by one or more empty lines
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  
  return paragraphs.map(p => ({
    image_prompt: p,
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
  }));
};

const generateStoryboardPrompts = async () => {
  if (!form.value.generated_story_text.trim()) {
    ElMessage.warning('故事文本不能为空，请先生成或粘贴故事。');
    return;
  }
  loading.value = true;
  try {
    let parsedScenes;
    if (isUnstructuredText.value) {
      const semiStructuredResult = parseexStoryboardScript(form.value.generated_story_text);
        parsedScenes = semiStructuredResult.scenes;
    } else {
      // Try the highly structured "分镜X" format first
      parsedScenes = parseStoryboardScript(form.value.generated_story_text);
      // If that fails, try the semi-structured "一. 二." format
      if (parsedScenes.length === 0) {
        const semiStructuredResult = parseexStoryboardScript(form.value.generated_story_text);
        parsedScenes = semiStructuredResult.scenes;
        if (parsedScenes.length > 0) {
          ElMessage.info('检测到“一. 二.”格式的文案，已成功解析。');
        }
      }
    }

    if (parsedScenes.length > 0) {
      generatedScenes.value = parsedScenes;
      
      if (!currentStoryKey.value) {
        currentStoryKey.value = generateStoryKey();
        const index = getStoryIndex();
        index.unshift(currentStoryKey.value);
        saveStoryIndex(index);
        loadHistory();
      }

      // Always update the record, whether it's new or existing
      const topic = (form.value.topic || '').trim() || `未命名故事 ${new Date().toLocaleString()}`;
      form.value.topic = topic; // Update form state

      const existingData = JSON.parse(localStorage.getItem(currentStoryKey.value) || '{}');
      const newData = {
          ...existingData,
          topic: topic,
          generated_story_text: form.value.generated_story_text, // ensure story text is also updated
          scenes: parsedScenes,
          form: { ...form.value },
          createdAt: existingData.createdAt || new Date().toISOString(),
      };
      localStorage.setItem(currentStoryKey.value, JSON.stringify(newData));
      
      script_topic.value = topic;

      ElMessage.success(`成功解析 ${parsedScenes.length} 个分镜，准备跳转...`);
      activeStep.value = 2;
      useInStoryboard();
    } else {
      ElMessage.error('解析分镜失败：无法从故事文本中找到有效的分镜。请检查格式，或尝试打开“非分镜结构文本”开关。');
    }
  } catch(e) {
    console.error('解析或保存分镜时出错:', e);
    ElMessage.error('处理分镜时出错。');
  } finally {
    loading.value = false;
  }
};


const clearForm = () => {
  form.value = getInitialFormState();
  generatedScenes.value = [];
  activeStep.value = 0;
  currentStoryKey.value = null;

  // Reset video state
  videoId.value = null;
  videoStatus.value = '';
  videoProgress.value = 0;
  videoErrorMessage.value = '';
  generatedVideoUrl.value = '';
  videoRetryCount.value = 0;
  if (videoPollingTimer.value) {
    clearTimeout(videoPollingTimer.value);
    videoPollingTimer.value = null;
  }
};

// --- Export and Navigation ---
const exportScript = () => {
  if (generatedScenes.value.length === 0) {
    ElMessage.warning('没有可导出的分镜文案。');
    return;
  }
  let scriptContent = `故事主题: ${form.value.topic}\n\n`;
  scriptContent += `故事原文:\n${form.value.generated_story_text}\n\n`;
  scriptContent += `================================\n分镜文案\n================================\n\n`;

  generatedScenes.value.forEach((scene, index) => {
    scriptContent += `【分镜 ${index + 1}】\n`;
    scriptContent += `图片提示词: ${scene.image_prompt}\n`;
    scriptContent += `单帧视频提示词: ${scene.single_frame_video_prompt}\n`;
    scriptContent += `首尾帧视频提示词: ${scene.dual_frame_video_prompt}\n`;
    scriptContent += `字幕: ${scene.subtitle_text}\n\n`;
  });

  const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${form.value.topic || 'story_script'}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
};

const useInStoryboard = () => {
  script_topic.value = (form.value.topic || '').trim() || (form.value.generated_story_text || '').split(/[.!?。！？]/)[0];
  if (!script_topic.value.trim()) {
    ElMessage.warning('请输入脚本主题');
    return;
  }
  if (generatedScenes.value.length === 0 && !currentStoryKey.value) {
    ElMessage.warning('没有可用的分镜，请先生成或加载一个故事。');
    return;
  }
  localStorage.setItem('script_topic', script_topic.value || 'untitled_story');
  localStorage.setItem('current_story_key', currentStoryKey.value);
  localStorage.setItem('from_prompt_generator', 'true');
  router.push('/storyboard');
};

// --- Video Generation Functions ---
const generateVideo = async () => {
  if (!form.value.generated_story_text.trim()) {
    ElMessage.warning('请先生成文生视频提示词');
    return;
  }

  videoLoading.value = true;
  videoRetryCount.value = 0;
  generatedVideoUrl.value = '';
  videoId.value = null;

  try {
    const prompt = form.value.generated_story_text;
    const provider = videoProvider.value;
    let options = { prompt };
    let data;

    if (provider === 'yunwu') {
      options = {
        ...options,
        seconds: parseInt(videoSeconds.value, 10),
        size: videoSize.value,
        watermark: videoWatermark.value,
        is_private: videoIsPrivate.value,
      };
      data = await VideosAPI.generateVideo('yunwu', options);
      videoId.value = data.id;
      videoStatus.value = data.status;
      videoProgress.value = data.progress || 0;

    } else if (provider === 'kie') {
      const aspectRatioMap = {
        '9x16': 'portrait',
        '16x9': 'landscape',
        '1x1': 'square',
        '4x3': 'landscape',
        '3x4': 'portrait',
      };
      options = {
        ...options,
        n_frames: parseInt(videoSeconds.value, 10), // Assuming seconds can map to frames
        aspect_ratio: aspectRatioMap[videoSize.value] || 'landscape',
        remove_watermark: !videoWatermark.value,
      };
      data = await VideosAPI.generateVideo('kie', options);
      if (data.code === 200) {
        videoId.value = data.data.taskId;
        videoStatus.value = 'queued';
        videoProgress.value = 0;
      } else {
        throw new Error(data.message || 'Failed to create video task');
      }
    }

    ElMessage.success('视频生成任务已创建，正在后台处理...');
    checkVideoStatus(true);

  } catch (e) {
    console.error(e);
    ElMessage.error(`视频生成失败: ${e.message}`);
    videoLoading.value = false;
  }
};

const checkVideoStatus = async (isPolling = false) => {
  if (!videoId.value) {
    return;
  }

  if (videoPollingTimer.value) {
    clearTimeout(videoPollingTimer.value);
    videoPollingTimer.value = null;
  }

  videoRetryCount.value++;

  try {
    const provider = videoProvider.value;
    const statusResponse = await VideosAPI.getVideoStatus(provider, videoId.value);
    videoRetryCount.value = 0; // Reset retry count on success

    if (provider === 'yunwu') {
      videoStatus.value = statusResponse.status;
      videoProgress.value = statusResponse.progress || 0;

      if (statusResponse.status === 'completed') {
        if (statusResponse.video_url) {
          generatedVideoUrl.value = statusResponse.video_url;
          ElMessage.success('视频已生成');
          showVideoResultDialog.value = true;
          videoLoading.value = false;
          // Save file
          const now = new Date();
          const filename = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}.mp4`;
          await FileAPI.saveImage(form.value.ttv_story_type, filename, generatedVideoUrl.value);
          ElMessage.info(`视频已保存到文件夹: ${form.value.ttv_story_type}`);
        } else {
          ElMessage.error('视频生成成功，但未获取到视频URL。');
          videoLoading.value = false;
        }
      } else if (statusResponse.status === 'failed' || statusResponse.status === 'error') {
        videoErrorMessage.value = statusResponse.error?.message || statusResponse.status;
        ElMessage.error(`视频生成失败: ${videoErrorMessage.value}`);
        videoLoading.value = false;
      } else if (isPolling) {
        videoPollingTimer.value = setTimeout(() => checkVideoStatus(true), 10000);
      }
    } else if (provider === 'kie') {
      if (statusResponse.code === 200) {
        const videoData = statusResponse.data;
        videoStatus.value = videoData.state;
        if (videoData.state === 'success') {
          videoProgress.value = 100;
          const result = JSON.parse(videoData.resultJson);
          if (result.resultUrls && result.resultUrls.length > 0) {
            generatedVideoUrl.value = result.resultUrls[0];
            ElMessage.success('视频已生成');
            showVideoResultDialog.value = true;
            videoLoading.value = false;
            // Save file
            const now = new Date();
            const filename = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}.mp4`;
            await FileAPI.saveImage(form.value.ttv_story_type, filename, generatedVideoUrl.value);
            ElMessage.info(`视频已保存到文件夹: ${form.value.ttv_story_type}`);
          }
        } else if (videoData.state === 'fail') {
          videoErrorMessage.value = videoData.failMsg;
          ElMessage.error(`视频生成失败: ${videoErrorMessage.value}`);
          videoLoading.value = false;
        } else if (isPolling) {
          videoPollingTimer.value = setTimeout(() => checkVideoStatus(true), 10000);
        }
      } else {
        throw new Error(statusResponse.message || 'Failed to get video status');
      }
    }
  } catch (e) {
    console.error(e);
    if (videoRetryCount.value < 3) {
      ElMessage.warning(`获取视频状态失败，正在进行第 ${videoRetryCount.value} 次重试...`);
      videoPollingTimer.value = setTimeout(() => checkVideoStatus(true), 5000);
    } else {
      videoErrorMessage.value = e.message;
      ElMessage.error(`视频状态更新失败: ${e.message}`);
      videoLoading.value = false;
    }
  }
};

const handleThumbnailChange = (file) => {
  videoForm.value.thumbnail = file.raw;
};

const saveVideoDetails = () => {
  if (!videoForm.value.title) {
    ElMessage.warning('请输入视频标题');
    return;
  }
  // Here you would typically send the video details to a backend
  console.log('Saving video details:', videoForm.value);
  ElMessage.success('视频详情已保存（模拟）');
  showVideoResultDialog.value = false;
};

// --- Lifecycle ---
onMounted(() => {
  // form.value.token = localStorage.getItem('apicore_token') || ''
  loadHistory();
});

</script>

<style scoped>
.el-card {
  overflow: visible;
}
</style>