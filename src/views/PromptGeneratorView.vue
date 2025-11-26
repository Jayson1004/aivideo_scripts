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
        <el-form-item label="模型选择">
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
            <el-radio label="1">根据主题生成</el-radio>
            <el-radio label="2">改写现有故事</el-radio>
            <el-radio label="3">从YouTube链接生成</el-radio>
            <el-radio label="4">文生视频提示词</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.generate_story_type === '3'" label="YouTube链接" required>
          <el-input v-model="form.youtube_link" placeholder="请输入YouTube视频链接" />
        </el-form-item>
        <el-form-item v-if="form.generate_story_type === '1'" label="故事主题" required>
          <el-input v-model="form.topic" placeholder="例如：一个机器人学习如何去爱的故事" />
        </el-form-item>
        <el-form-item v-if="form.generate_story_type === '1'" label="故事类型">
          <el-select v-model="form.story_type" placeholder="选择故事类型">
            <el-option label="科幻" value="科幻" />
            <el-option label="奇幻" value="奇幻" />
            <el-option label="爱情" value="爱情" />
            <el-option label="喜剧" value="喜剧" />
            <el-option label="惊悚" value="惊悚" />
            <el-option label="历史" value="历史" />
            <el-option label="励志" value="励志" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.generate_story_type === '2'" label="原始故事" required>
          <el-input v-model="form.original_story_text" type="textarea" :rows="8" placeholder="请在此处粘贴您想要改写的故事文本" />
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
        <el-form-item label="故事长度" v-if="form.generate_story_type === '1' || form.generate_story_type === '2'">
          <el-input-number v-model="form.story_length" :min="100" :max="10000" :step="100" />
          <span style="margin-left:8px; color:#666;">字</span>
        </el-form-item>
        <el-form-item label="其他要求">
          <el-input v-model="form.additional_requirements" placeholder="可选：例如故事的特定背景、人物性格等" />
        </el-form-item>
      </el-form>
      <div style="display:flex; gap:12px; justify-content: center; margin-top: 20px;">
        <el-button type="primary" size="large" :loading="loading" @click="generateStory">
          {{ form.generate_story_type === '1' ? '生成故事' : (form.generate_story_type === '2' ? '改写故事' : (form.generate_story_type === '3' ? '生成故事' : '生成提示词')) }}
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

        <el-form-item label="生成分镜提示词">
          <el-button @click="showTxtToScene = true">编辑提示词</el-button>
        </el-form-item>
        <el-form-item label="故事文本">
          <el-input v-model="form.generated_story_text" type="textarea" :rows="10" placeholder="请先在第1步生成故事，或在此处直接粘贴故事文本" />
        </el-form-item>
        <el-form-item label="生成语言">
          <el-radio-group v-model="form.language">
            <el-radio label="chinese">中文</el-radio>
            <el-radio label="english">English</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="视频风格">
          <!-- <el-input v-model="form.style" placeholder="例如：cinematic, anime, documentary, 3D cartoon" /> -->
          <el-select v-model="form.style" placeholder="选择视频风格" style="width:160px;">
            <el-option v-for="style in styleOptions" :key="style.value" :label="style.label" :value="style.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <div style="display:flex; gap:12px; justify-content: center; margin-top: 20px;">
        <el-button type="primary" size="large" :loading="loading" @click="generateStoryboardPrompts" :disabled="!form.generated_story_text.trim()">生成并编辑分镜提示词</el-button>
      </div>
    </el-card>
    <!-- 编辑生成分镜提示词 -->
      <el-dialog v-model="showTxtToScene" title="编辑生成分镜提示词" width="80%" top="5vh">
        
        <p style="margin-bottom: 10px; color: #666;">您可以在下方文本框中直接编辑提示词。</p>
        <el-input 
          v-model="txt_to_img_prompt" 
          type="textarea" 
          :rows="20"
        />
        <template #footer>
          <el-button @click="showTxtToScene = false">取消</el-button>
          <el-button type="success" @click="showTxtToScene = false">保存并用于生成分镜提示词</el-button>
        </template>
      </el-dialog>

    <!-- Result Dialog -->
    <el-dialog v-model="showResultDialog" title="编辑分镜提示词" width="80%" top="5vh">
      <el-input v-model="script_topic" placeholder="脚本主题,例如：复刻k-pop故事视频" />
      <p style="margin-bottom: 10px; color: #666;">您可以在下方文本框中直接编辑生成的JSON格式的分镜提示词。</p>
      <el-input 
        v-model="editableJsonString" 
        type="textarea" 
        :rows="20"
      />
      <template #footer>
        <el-button @click="showResultDialog = false">取消</el-button>
        <el-button type="primary" @click="savePromptsFromDialog">保存</el-button>
        <el-button type="success" @click="saveAndUseInStoryboard">保存并用于分镜视频</el-button>
      </template>
    </el-dialog>

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
const showResultDialog = ref(false)
const showTxtToScene = ref(false)
const editableJsonString = ref('')
const showHistoryDialog = ref(false)
const savedStories = ref([])
const currentStoryKey = ref(null)

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
    story_length: 800,
    generate_story_type: '1',
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
  if (sourceType === '1' && !form.value.topic.trim()) {
    ElMessage.warning('请输入故事主题');
    return;
  }
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
        model: 'gemini-2.5-pro-preview-05-06',
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
        max_tokens: 4000,
      };
      form.value.generated_story_text = await BookwormAPI.analyze(payload);
      ElMessage.success('YouTube视频分析完成！');
      activeStep.value = 1;
    } else {
      let prompt = '';
      if (sourceType === '1') {
        prompt = `
        # 角色
        你是一位资深的视频故事创作专家，精通视觉叙事和情感节奏。

        # 任务
        根据用户提供的主题和要求，创作一个原创、引人入胜且高度适合视频化的故事文本。

        # 要求
        - 主题: ${form.value.topic}
        - 故事类型: ${form.value.story_type}
        - 故事长度: 约 ${form.value.story_length} 字
        - 语言: ${form.value.language}
        - 额外要求: ${form.value.additional_requirements || '无'}
        - 核心要点: 故事必须有清晰的开端、发展和结局，包含情感转折，并易于视觉化呈现。

        # 输出
        请直接输出完整的故事文本，不要包含标题、标签或任何解释性文字。
      `;
      } else if (sourceType === '2') {
        prompt = `
        # 角色
        你是一位专业的内容编辑和剧本医生。

        # 任务
        根据用户提供的原始故事文本，进行改写和优化，使其更适合视频呈现。

        # 要求
        - 原始文本: "${form.value.original_story_text}"
        - 改写目标: 保持核心情节和人物不变，但优化叙事节奏、增强画面感、精炼语言。确保逻辑清晰、流畅。
        - 故事长度: 调整至约 ${form.value.story_length} 字
        - 语言: ${form.value.language}
        - 额外要求: ${form.value.additional_requirements || '无'}

        # 输出
        请直接输出改写后的完整故事文本，不要包含任何解释性文字。
      `;
      } else if (sourceType === '4') {
        const selectedStory = storysBase.find(story => story.title === form.value.ttv_story_type);
        if (!selectedStory) {
          ElMessage.error('未找到选定的视频类型故事。');
          loading.value = false;
          return;
        }
       prompt = `
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
      }
      const result = await PromptAPI.apicoreGenerateTxt(prompt, form.value.model);
      let textContent = '';
      if (form.value.model.includes('gpt')) {
        if (result) {
          textContent = result;
        } else {
          // Fallback for unexpected GPT response structure
          console.error("Unexpected GPT response structure:", result);
          ElMessage.error('生成故事失败：无法解析GPT模型返回的数据。');
          return;
        }
      } else { // For Claude models
        if (result) {
          textContent = result;
        } else {
          console.error("Unexpected Claude response structure:", result);
          ElMessage.error('生成故事失败：无法解析Claude模型返回的数据。');
          return;
        }
      }
      form.value.generated_story_text = textContent.trim();
      ElMessage.success('故事已生成！现在可以生成分镜了。');
      activeStep.value = 1;
    }


    // Auto-save the new story
    currentStoryKey.value = generateStoryKey();
    const topic = form.value.topic.trim() || form.value.generated_story_text.split(/[.!?。！？]/)[0] || currentStoryKey.value;
    const data = {
      topic: topic,
      generated_story_text: form.value.generated_story_text,
      scenes: [],
      createdAt: new Date().toISOString(),
      form: { ...form.value, topic: topic } // Save the derived topic back to the form state
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
const txt_to_img_prompt = ref(``)
const generateStoryboardPrompts = async () => {
  if (!form.value.generated_story_text.trim()) {
    ElMessage.warning('故事文本不能为空，请先生成或粘贴故事。');
    return;
  }

  loading.value = true;
  activeStep.value = 1;

  try {
    const prompt = `你的身份是分镜导演。你的任务是分析原故事文本 ${form.value.generated_story_text}， 用语言: ${form.value.language}生成 一份${form.value.style}风格完整、连贯、格式正确的分镜脚本`
const result = await PromptAPI.apicoreGenerateTxt(prompt, form.value.model);
    
    const storyboardData = parseMarkdownJson(result);

    if (storyboardData && storyboardData.scenes && Array.isArray(storyboardData.scenes)) {
      editableJsonString.value = JSON.stringify(storyboardData, null, 2);
      generatedScenes.value = storyboardData.scenes;
      showResultDialog.value = true;
      ElMessage.success(`成功生成 ${storyboardData.scenes.length} 个分镜，请在弹窗中编辑确认。`);
      activeStep.value = 2;

      if (!currentStoryKey.value) {
        currentStoryKey.value = generateStoryKey();
        const topic = form.value.topic.trim() || form.value.generated_story_text.split(/[.!?。！？]/)[0] || currentStoryKey.value;
        const data = {
          topic: topic,
          generated_story_text: form.value.generated_story_text,
          characters: storyboardData.characters || [],
          scenes: storyboardData.scenes,
          createdAt: new Date().toISOString(),
          form: { ...form.value, topic: topic }
        };
        localStorage.setItem(currentStoryKey.value, JSON.stringify(data));
        const index = getStoryIndex();
        index.unshift(currentStoryKey.value);
        saveStoryIndex(index);
        loadHistory();
      } else {
        // Update the existing story in localStorage with the new scenes
        const existingData = JSON.parse(localStorage.getItem(currentStoryKey.value) || '{}');
        existingData.characters = storyboardData.characters || [];
        existingData.scenes = storyboardData.scenes;
        existingData.form = { ...form.value };
        localStorage.setItem(currentStoryKey.value, JSON.stringify(existingData));
        loadHistory();
      }

    } else {
      ElMessage.error('生成分镜失败：无法解析返回的数据，或数据格式不正确。');
    }
  } catch (error) {
    console.error('生成分镜提示词失败:', error);
    ElMessage.error('生成分镜提示词失败，请检查网络连接和API配置');
  } finally {
    loading.value = false;
  }
};

const savePromptsFromDialog = () => {
  try {
    const storyboardData = JSON.parse(editableJsonString.value);
    if (storyboardData && storyboardData.scenes && Array.isArray(storyboardData.scenes)) {
      generatedScenes.value = storyboardData.scenes;
      showResultDialog.value = false;
      activeStep.value = 2;
      ElMessage.success('分镜已保存!');

      // If there's no current story key, create one.
      if (!currentStoryKey.value) {
        currentStoryKey.value = generateStoryKey();
        const topic = form.value.topic.trim() || form.value.generated_story_text.split(/[.!?。！？]/)[0] || currentStoryKey.value;
        const data = {
          topic: topic,
          generated_story_text: form.value.generated_story_text,
          characters: storyboardData.characters || [],
          scenes: storyboardData.scenes,
          createdAt: new Date().toISOString(),
          form: { ...form.value, topic: topic }
        };
        localStorage.setItem(currentStoryKey.value, JSON.stringify(data));
        const index = getStoryIndex();
        index.unshift(currentStoryKey.value);
        saveStoryIndex(index);
        loadHistory();
      } else {
        // Update existing story
        const existingData = JSON.parse(localStorage.getItem(currentStoryKey.value) || '{}');
        existingData.characters = storyboardData.characters || [];
        existingData.scenes = storyboardData.scenes;
        localStorage.setItem(currentStoryKey.value, JSON.stringify(existingData));
        loadHistory();
      }
      return true;
    } else {
      ElMessage.error('保存失败：格式不是一个有效的场景对象（需要包含scenes数组）。');
      return false;
    }
  } catch (error) {
    ElMessage.error('保存失败：JSON格式无效，请检查语法。');
    return false;
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
    scriptContent += `旁白: ${scene.narration}\n`;
    scriptContent += `画面: ${scene.image_prompt}\n\n`;
    scriptContent += `镜头提示词: ${scene.video_promt}\n\n`;
    
  });

  const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${form.value.topic || 'story_script'}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
};

const saveAndUseInStoryboard = async () => {
  if (savePromptsFromDialog()) {
    try {
      if (!script_topic.value.trim()) {
        ElMessage.warning('保存失败，请输入脚本主题。');
        return;
      }
      await FileAPI.saveText(script_topic.value, 'prompts.txt', editableJsonString.value);
      ElMessage.success('分镜提示词已保存到服务器。');
      useInStoryboard();
    } catch (error) {
      console.error('保存提示词文件失败:', error);
      ElMessage.error('保存提示词文件到服务器失败。');
    }
  }
};

const useInStoryboard = () => {
  if (!script_topic.value.trim()) {
    ElMessage.warning('请输入脚本主题');
    return;
  }
  if (generatedScenes.value.length === 0 && !currentStoryKey.value) {
    ElMessage.warning('没有可用的分镜，请先生成或加载一个故事。');
    return;
  }
  // Pass the key and a flag to indicate navigation from the generator.
  // StoryboardView will be responsible for loading the scenes from the story record.
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

// --- JSON Parsing ---
function sanitizeJsonText(text) {
  if (typeof text !== 'string') return text;
  // Remove thinking process blocks from models that include it in the response.
  let s = text.replace(/<think>[\s\S]*?<\/think>/, '');
  s = s.replace(/\r\n?/g, '\n').replace(/^\ufeff/, '');
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  let out = '';
  let inQuote = false;
  let quoteChar = '';
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      out += ch;
      escaped = true;
      continue;
    }
    if (inQuote) {
      if (ch === quoteChar) {
        inQuote = false;
        quoteChar = '';
        out += ch;
      } else {
        out += (ch === '\n' ? ' ' : ch);
      }
    } else {
      if (ch === '"' || ch === "'") {
        inQuote = true;
        quoteChar = ch;
      }
      out += ch;
    }
  }
  s = out;
  s = s.replace(/,\s*([\}\]])/g, '$1');
  return s.trim();
}


const parseMarkdownJson = (md) => {
  if (md && typeof md === 'object') return md;
  if (typeof md !== 'string') return null;
  let text = md.replace(/\r\n?/g, '\n').replace(/^\ufeff/, '').trim();
  if (!text) return null;

  // Regex to find JSON code blocks
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/i;
  const match = text.match(fenceRegex);

  const tryParse = (str) => {
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  };

  if (match && match[1]) {
    const jsonString = match[1].trim();
    const parsed = tryParse(jsonString);
    if (parsed) return parsed;

    // If direct parsing fails, try to sanitize it
    const sanitized = sanitizeJsonText(jsonString);
    const fixed = tryParse(sanitized);
    if (fixed) return fixed;
  }

  // If no code block found, or parsing failed, try to find JSON directly in the string
  const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (jsonMatch && jsonMatch[0]) {
      const jsonString = jsonMatch[0].trim();
      const parsed = tryParse(jsonString);
      if (parsed) return parsed;

      const sanitized = sanitizeJsonText(jsonString);
      const fixed = tryParse(sanitized);
      if (fixed) return fixed;
  }

  return null;
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
