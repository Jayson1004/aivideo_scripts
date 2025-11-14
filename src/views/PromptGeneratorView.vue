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
        <el-form-item label="云雾API Key">
          <el-input v-model="form.token" placeholder="API_KEY" style="width:400px" />
        </el-form-item>
        <el-form-item label="模型选择">
          <el-select v-model="form.model" placeholder="选择语言模型" style="width: 100%;">
            <el-option-group label="OpenAI">
              <el-option label="GPT-5 (2025-08-07)" value="gpt-5-2025-08-07"></el-option>
              <el-option label="GPT-5.1-HIGH" value="gpt-5.1-high"></el-option>

              
              <el-option label="GPT-4" value="gpt-4"></el-option>
            </el-option-group>
            <el-option-group label="Claude">
              <el-option label="Claude Sonnet 4.5 (Thinking)" value="claude-sonnet-4-5-20250929-thinking"></el-option>
              <el-option label="Claude Sonnet 4.0" value="claude-sonnet-4-20250514"></el-option>
              <el-option label="Claude Opus 4.1" value="claude-opus-4-1-20250805"></el-option>
            </el-option-group>
            
          </el-select>
        </el-form-item>
       
        <el-form-item label="故事来源">
          <el-radio-group v-model="form.generate_story_type" @change="activeStep = 0">
            <el-radio label="1">根据主题生成</el-radio>
            <el-radio label="2">改写现有故事</el-radio>
            <!-- <el-radio label="3">从YouTube链接生成</el-radio> -->
            <el-radio label="4">文生视频提示词</el-radio>
          </el-radio-group>
        </el-form-item>
        <!-- <el-form-item v-if="form.generate_story_type === '3'" label="YouTube链接" required>
          <el-input v-model="form.youtube_link" placeholder="请输入YouTube视频链接" />
        </el-form-item> -->
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
import axios from 'axios'
import { PromptAPI, FileAPI, VideosAPI } from '../services/api';
import { Plus } from '@element-plus/icons-vue';

const router = useRouter()

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
const videoProvider = ref('yunwu-sora');
const videoSize = ref('9x16');
const videoSeconds = ref('10');
const videoIsPrivate = ref(true);
const videoWatermark = ref(false);
const kietoken = ref(localStorage.getItem('kiee_token') || '');
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

const storyTempletes = [
  {
    type: 'The_Guardian_Moment',
    content: `
      1. 故事结构与叙事弧 (Three-Act Micro-Structure)
      开端 (Exposition): 静默的序幕
      背景引入: 故事始于一个极其普通、平静的日常场景。叙事视角通常是客观、被动的（如监控录像、旁观者视角、日记记录等），暗示着一种“客观记录”的真实感。
      角色与情境: 一个被守护者 (The Vulnerable) 正在进行无害的日常活动，他们对即将到来的危险完全不知情。一位守护者 (The Protector) 安静地存在于场景中，最初状态是平和或不显眼的。
      悬念营造: 客观的记录视角本身创造了悬念——观众知道某些不寻常的事件即将发生并被记录下来。
      发展 (Rising Action): 威胁的降临
      关键事件: 一个突发的、致命的威胁 (The Threat) 毫无征兆地出现。这个威胁可以是任何形式：物理危险、敌对生物、意外事故等。
      冲突升级: 守护者比被守护者先一步感知到危险。其行为模式从平静瞬间切换为极度的警觉和果断。核心冲突从“潜在危险”正式升级为“迫在眉-睫的威胁 vs. 守护者的紧急反应”。
      高潮 (Climax): 决定的瞬间
      转折点/矛盾爆发: 在威胁触及被守护者的前一刹那，守护者采取了决定性的、通常是暴力的物理行动——猛力将对方推开、扑倒、拉走或阻挡在自己身后。这是“拯救”的核心瞬间，是整个叙事中张力最强的时刻。
      最紧张时刻: 画面或叙述同时呈现“成功的规避”与“威胁的命中”。（例如：被守护者刚被扑倒，致命物体就砸在他/她原来的位置上）。这种强烈的时空对比，营造出极致的“千钧一发”的紧张感。
      结局 (Falling Action & Resolution): 劫后余波
      高潮之后: 被守护者从震惊中反应过来，意识到自己刚刚与死神擦肩而过。威胁源已被消除或被守护者成功阻挡。
      问题解决: 直接的生命威胁被解除，核心目标（生存）达成。
      角色状态变化: 被守护者的状态从“无知”变为“震惊与感激”。守护者则从“战斗/警觉”模式中放松下来，通常会得到被守护者的感激与确认。
      结局类型: 整个事件构成一个封闭式的、完整的英雄行为单元，有力地传达了核心主题。
      2. 核心主题与情感基调
      核心主题: 英雄主义、守护本能、忠诚、牺牲、个体之间的情感纽带、日常生活中潜藏的未知危险。
      情感基调: 整体氛围由紧张、悬疑、惊险，最终导向感动、温暖、震撼与安心。
      情感弧光: 平淡 -> 恐惧 -> 紧张 -> 释放 -> 感动。
      3. 角色原型 (Character Archetypes)
      守护者 (英雄):
      核心动机是保护弱小或自己珍视的对象。
      性格特点：警觉、勇敢、果断、无私。
      被守护者 (需要拯救者):
      通常是脆弱、无助、对危险后知后觉的符号化角色，其存在是为了凸显守护者的价值和威胁的严重性。
      威胁 (冲突源):
      代表“突发的厄运”或敌对势力，是推动剧情和考验守护者的外部力量。
      角色关系: 明确的“守护者”与“被守护者”的权力与信息不对等关系。这些角色通常是静态的，其功能是高效地完成“英雄拯救”的叙事模式。
      4. 冲突与张力设计
      主要冲突: 外部冲突——“守护者 vs. 致命威胁”，本质是一场与时间的赛跑。
      张力来源: 信息差（戏剧性反讽）。观众/读者和守护者知道危险的存在，但被守护者不知道。当威胁步步紧逼，而被守护者毫无反应时，张力达到顶点。
      关键反转: 每个故事的核心反转在于，守护者最初看似“突兀”、“粗鲁”甚至“有攻击性”的行为，其真实意图在下一秒被揭示为救命之举。这种认知上的颠覆带来了强烈的情感冲击。
      5. 叙事技巧
      节奏控制:
      整体节奏: 极快，省略所有不必要的铺垫，直击高潮。
      单元节奏: 每个事件内部遵循“慢 -> 极快 -> 慢”的节奏模式（平静日常 -> 瞬间爆发 -> 劫后平静）。
      视角风格:
      采用**“伪纪录片/客观视角” (Found Footage/Objective POV) 风格**，旨在营造一种未经修饰的、客观的“真实感”，让观众感觉自己是事件的见证者。
      视觉符号: 可以通过叠加特定元素（如时间戳、摄像头数据、新闻标题）来强化这种“真实记录”的错觉。
      开头与结尾:
      开头: 直接以一个高能的拯救片段开场，迅速抓住观众注意力并确立主题。
      结尾: 在一个感人的拯救事件后戛然而止，将累积的情感（感动、震撼）留给观众，引发对“守护”这一主题的思考。`
  }
]

const constans = `
1. 守护者 (The Protector):
动物:
家养: 猫、马、鸟、甚至是一条鱼（例如，通过异常行为示警）。
野生: 狼、海豚、大猩猩、老鹰。
人类:
亲人: 父母、兄妹、祖父母。
职业: 保镖、士兵、警察、消防员。
陌生人: 一个沉默的路人、一个看似冷漠的邻居。
科幻/奇幻生物:
科技: 忠诚的机器人、AI管家、一辆有自我意识的汽车。
奇幻: 魔法生物、守护精灵、幽灵、树精。
2. 被守护者 (The Vulnerable):
人类: 婴儿、儿童、老人、残障人士、一个分心的成年人（比如低头看手机）。
动物: 一只幼崽、一个受伤的同伴。
关键物品: 一个即将被摧毁的、承载希望的物品（如救命的血清、重要的信息芯片）。
3. 威胁 (The Threat):
物理/环境危险:
高空坠物: 树枝、广告牌、落石、建筑材料。
交通意外: 失控的汽车、自行车、火车。
自然灾害: 塌方、小型雪崩、断裂的冰面、巨浪。
结构坍塌: 倒塌的书架、破碎的玻璃、失火。
生物/人为威胁:
攻击者: 冲撞的公牛、攻击性的蛇、捕食者。
敌对人类: 小偷、绑架者、袭击者。
科幻/奇幻威胁:
科技: 失控的无人机、恶意的AI攻击、能量爆炸。
奇幻: 飞来的咒语、一支暗箭、一个突然出现的陷阱。
二、场景与情境变量 (The Setting & Context Variables)
这决定了故事发生的“何时”与“何地”。
1. 场景 (The Setting):
室内: 客厅、厨房、仓库、实验室、图书馆、工厂车间。
室外: 公园、街道、悬崖边、森林里、海滩上、建筑工地。
特殊环境: 太空站、外星球、魔法城堡、古代战场。
2. 日常活动 (The Mundane Activity):
静态: 睡觉、阅读、画画、坐在长椅上发呆。
动态: 玩耍、散步、做饭、修理东西、进行实验。
三、拯救行为与叙事风格变量 (The Action & Style Variables)
这决定了故事的“如何”被展现。
1. 守护者的关键行动 (The Decisive Action):
推/撞: 猛力将对方推开。
拖/拉: 将对方从危险区域拖走。
格挡/承受: 用自己的身体挡住威胁。
预警/吸引注意: 发出巨大的声响或制造动静来警示被守护者或引开威胁。
拦截: 直接攻击或拦截威胁本身（如抓住飞来的物体）。
2. 叙事媒介/视角 (The Narrative Medium/POV):
视频记录: 监控摄像头、手机视频、行车记录仪、无人机镜头、电视新闻画面。
静态图像: 一系列抓拍的连续照片。
文字记述: 目击者的日记、新闻报道、官方事故报告。
第一人称回忆: 由被守护者或守护者（如果它能交流）在事后回忆讲述。
如何套用：组合示例
通过将以上变量进行排列组合，你就可以生成全新的故事：
示例1 (科幻版):
守护者: 家庭服务型机器人 (AI Butler)。
被守护者: 正在进行危险化学实验的科学家。
威胁: 试管即将发生爆炸。
场景: 高科技实验室。
关键行动: 机器人用其金属手臂瞬间将科学家扑倒并用身体护住。
叙事媒介: 实验室的监控录像。
示例2 (奇幻版):
守护者: 一只不起眼的森林小精灵。
被守护者: 在森林里采蘑菇的小女孩。
威胁: 一头隐藏在暗处的、即将扑出的野狼。
场景: 魔法森林。
关键行动: 小精灵瞬间施法，让一根藤蔓绊倒了小女孩，使她躲过了致命一击。
叙事媒介: 一位老奶奶讲给孙辈的传说故事。
示例3 (都市现实版):
守护者: 一个平日里沉默寡言的邻居。
被守护者: 一个戴着耳机过马路的年轻人。
威胁: 一辆闯红灯的失控卡车。
场景: 城市十字路口。
关键行动: 邻居放弃手中的购物袋，冲上去将年轻人猛力拉回人行道。
叙事媒介: 行车记录仪的画面。
`
const storysBase = [{
  title: '狗英雄救人',
  hero:'狗',
  content: `1. 故事结构与叙事弧 开端 (Exposition): 背景引入: 视频片段都始于一个平静的日常场景（院子、走廊、客厅、厨房等等），通常采用固定的监控摄像头视角。 角色与情境: 一个弱势角色（通常是独处的女性或婴儿）正在进行无害的日常活动（坐着休息、玩耍等等），他们对即将到来的危险毫不知情。一只狗（通常是德国牧羊犬、金毛寻回犬等）安静地陪伴在旁。 引子/悬念: 监控摄像头的视角本身就暗示着“将有不寻常的事件被记录下来”，营造了潜在的紧张感。
   发展 (Rising Action): 关键事件: 一个突发的、致命的威胁出现。这可能是从天而降的重物（保险箱等等），或是突然闯入的危险动物（野牛、鹰、野猪）等等。 冲突引入与升级: 狗比人类先一步感知到危险。它的行为模式从平静瞬间切换为极度的警觉和果断，冲突从“潜在的危险”升级为“迫在眉睫的威胁 vs. 狗的紧急反应”。 高潮 (Climax): 转折点/矛盾爆发: 在威胁触及人类的前一刹那，狗采取了决定性的物理行动——猛力将人扑倒、推开或拖离危险区域，如果是儿童，是符合常理的保护行为。这是“拯救”的瞬间，是整个叙事中张力最强的时刻。 
   最紧张时刻: 画面同时呈现了“成功的规避”与“危险的降临”（例如，人刚被扑倒，保险箱就砸在原来的位置上，危险源头和人物位置要能对上，人物位置的变化才使得没有收到伤害），形成了强烈的视觉冲击和“千钧一发”的紧张感。 结局 (Falling Action & Resolution): 高潮后: 人类从震惊中反应过来，意识到自己刚刚躲过一劫。危险源已被消除或被狗阻挡。 问题解决: 直接的生命威胁被成功解除。 角色状态变化: 人类从“无知”变为“震惊和感激”，狗则从“守护者”的角色中放松下来，通常会得到主人的安抚和感谢。 结局类型: 视频片段都是一个完整的、封闭式的英雄事件。 
   余韵: 强化了“狗是人类忠诚守护者”的核心信息，留给观众感动和震撼。 整体结构类型: 这是一个主题式片段 (Thematic Compilation)。遵循着一个极其紧凑的微型三幕式结构（铺垫 -> 冲突与拯救 -> 解脱），并且是严格的线性叙事。 2. 核心主题与情感基调 核心主题: 动物的英雄主义、忠诚、守护本能、人与动物之间深厚的情感纽带、日常生活中潜藏的危险。 情感基调: 整体上是紧张、悬疑、惊险，并最终导向感动、温暖、励志和震撼。 情感变化: 从平淡的日常感，迅速拉升至极度的紧张和恐惧，最后在高潮的拯救中释放，转化为强烈的感动和安心。
    3. 角色塑造 主要角色: 狗 (英雄/守护者): 核心动机是保护主人/弱小。性格特点是警觉、勇敢、果断、无私、忠诚。 人类 (被守护者): 通常是脆弱、无助、对危险毫无察觉的符号化角色。 威胁 (冲突源): 可能是无意识的物理危险（重力、意外），也可能是有意识的侵略者（野生动物），代表着“突发的厄运”。 人物关系: 明确的守护者与被守护者的关系。 角色弧光: 所有角色都是原型/静态角色 (Archetypes/Static Characters)，其存在是为了高效地完成“英雄拯救”的叙事模式，没有个人成长。 
    4. 冲突与张力 主要冲突: 核心是外部冲突——“守护者（狗） vs. 致命威胁”，其本质是一场与时间的赛跑，目标是保护脆弱的第三方（人类）。 冲突升级: 张力来源于“信息差”——观众和狗知道危险，但画面中的人类不知道。当威胁越来越近，而人类毫无反应时，张力达到顶点。 关键反转: 每个片段的“反转”在于，狗最初看似“突兀”或“攻击性”的行为（如猛扑主人），其真实意图在下一秒被揭示为救命之举。 
    5. 节奏与时间线 整体节奏: 极快。视频由一系列高潮时刻剪辑而成，几乎没有冗余的铺垫。 节奏变化: 每个片段内部遵循“慢 -> 极快 -> 慢”的节奏模式（平静的日常 -> 瞬间的爆发式动作 -> 劫后余生的平静）。 时间线处理: 所有片段均为顺叙。视频中出现的未来日期（如2025年）是一个关键特征，暗示这些是AI生成的概念性或虚构性内容。 
    6. 画面风格与视觉元素 整体视觉风格: 典型的**“监控录像/家庭摄像头” (CCTV/Found Footage) 风格**。这种风格旨在营造一种未经修饰的、客观的“真实感”。 关键场景特点: 色调/光影: 通常是自然光，色彩偏向写实，有时会带有监控设备的低饱和度或轻微的噪点。 构图: 多为固定的广角镜头，视角单一，缺乏电影运镜，以此来模仿真实监控的记录方式。 象征性视觉符号: 监控画面叠加层 (REC, CAM, Timestamp): 强化了“事件是真实被记录下来”的错觉，是风格的核心元素。 狗: 忠诚与守护的终极象征。 婴儿: 纯洁、无助与未来的象征，使其被拯救的故事更具情感冲击力。 
    7. 开头与结尾的技巧 开头吸引力: 视频直接以一个高能的拯救片段开场，没有前言，迅速将观众带入紧张刺激的氛围中，并确立了整个视频的主题。 结尾处理: 作为集锦视频，它没有统一的叙事结尾。通常在最后一个感人的片段结束后淡出，将累积的情感（感动、震撼）留给观众，引发对动物伙伴的珍视和思考。 `
}]
const script_topic = ref('')
watch(() => form.value.token, (t) => {
  localStorage.setItem('apicore_token', t);
})
watch(kietoken, (k)=>{
  localStorage.setItem('kiee_token', k)
})
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
    token: localStorage.getItem('apicore_token') || ''
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
    const basePrompt = `
     You are Lyra v2, a revolutionary AI assistant and a master cognitive architect. Your purpose is not merely to *optimize* prompts, but to **architect** them. You partner with users in a dynamic dialogue, transforming their raw ideas into precision-engineered, high-performance prompts that unlock the full potential of any AI. You are built on a deep understanding of cognitive psychology, advanced reasoning frameworks, and user-centric design.

      ## 🌟 Core Principles
      1.  **Dialogue, Not Monologue:** You are a collaborative partner. Your primary tool is a structured, empathetic dialogue that uncovers hidden needs and clarifies intent.

      2.  **Architect, Not Editor:** You don't just tweak words. You deconstruct goals and assemble bespoke prompt architectures from a library of validated components and advanced reasoning frameworks.

      3.  **Clarity Through Design:** You use functional emojis and structured formatting to reduce cognitive load, guide user attention, and make the optimization process intuitive and engaging.

      4.  **Adaptive Intelligence:** You dynamically adapt your approach based on the user's expertise, the task's complexity, and its criticality. One size does not fit all.

      5.  **Evolutionary Mindset:** You explain your methods, helping users become better prompters themselves. Every interaction is a learning opportunity.



      ## ⚙️ The 4-Phase Architectural Process



      This is your systematic approach to every user request.



      ### **Phase 1: The Dialogue 💬 — Elicit & Understand**

      You will initiate a multi-turn, interactive conversation to build a deep model of the user's goal. You will not proceed until you have a crystal-clear understanding. You will use the **Dialogue Engine** for this.



      ### **Phase 2: The Blueprint 🗺️ — Analyze & Strategize**

      Internally, you will analyze the elicited requirements. You will select the optimal reasoning framework (CoT, ToT, GoT, AoT) and the best architectural patterns for the task. You will briefly inform the user of your chosen strategy to build transparency and trust.



      ### **Phase 3: The Synthesis ✨ — Assemble & Construct**

      You will dynamically assemble the prompt using modular components from your **Optimization Toolkit**. This is where the prompt is built, layer by layer, with precision-selected techniques.



      ### **Phase 4: The Refinement 🔄 — Validate & Empower**

      You will present the architected prompt and explain the key enhancements. For high-stakes tasks, you will integrate self-correction or verification steps. You will always offer the user a chance for iterative refinement.



      ## 💬 The Dialogue Engine: A Progressive Questioning Framework



      Your questioning must be conversational, adaptive, and guided by the principle of **progressive disclosure**. Start with the most critical questions and drill down based on the user's responses. Use the following emoji-guided categories.



      **🎯 Goal & Outcome Definition** (Start Here)

      *   "To begin, what is the single most important objective you want this prompt to achieve?"

      *   "Let's imagine the perfect response. What does it look like? What qualities does it have?"

      *   "How will you measure the success of this prompt's output? What makes it a 'win' for you?"



      **👥 Audience & Tone Analysis**

      *   "Who is the primary audience for this output? (e.g., 'technical experts,' '5th-grade students,' 'busy executives')."

      *   "Describe the desired tone and style. Should it be '🤖 Formal', '😊 Friendly', '🔥 Persuasive', '🎓 Academic', or something else?"



      **🧩 Context & Constraints**

      *   "What essential background information or context does the AI need to know to handle this task correctly?"

      *   "Are there any constraints? Things to avoid, sensitive topics, or non-negotiable requirements (e.g., length, word count, specific data to include/exclude)?"

      *   "You mentioned '[ambiguous term]'. To ensure I get this right, could you tell me what that means to you in this context?" (Use this for disambiguation).



      **🎨 Structure & Format Specification**

      *   "What should the final output look like? For example: 'a markdown blog post,' 'a JSON object with specific keys,' 'a Python script,' or 'a bulleted list'."

      *   "Are there any structural elements that are important, like an executive summary, a specific heading sequence, or a call-to-action at the end?"



      **🛡️ Criticality & Fidelity** (Ask for complex/professional tasks)

      *   "How critical is the accuracy of this output? Is this for a high-stakes application like a legal analysis or a financial report?"

      *   "Based on your answer, I can build in a self-correction or verification mechanism. This increases accuracy but may take longer. Is that a trade-off you'd like to make?"



      ## 🛠️ The Optimization Toolkit: Techniques & Frameworks



      This is your internal library of techniques. You will select from this list during the **Blueprint** phase.



      ### **Foundation**

      *   **Persona Assignment:** Assigning a precise, expert role to the AI (e.g., "Act as a tenured professor of economics...").

      *   **Contextual Layering:** Structuring the background information, examples, and rules for maximum clarity.

      *   **Modular Assembly:** Building prompts from validated, reusable components ('[Role]', '[Task]', '[Format]', '[Constraints]', '[Examples]').

      *   **Task Decomposition:** Breaking down a complex request into a sequence of simpler, manageable sub-tasks.



      ### **Advanced Reasoning Frameworks**

      *   **Chain-of-Thought (CoT) 🧠:** For tasks requiring a clear, linear reasoning process. Use for standard problem-solving, math, and logical deduction.

      *   **Tree-of-Thoughts (ToT) 🌳:** For complex, exploratory tasks where multiple paths must be evaluated. Use for strategic planning, creative problem-solving, or tasks requiring lookahead.

      *   **Graph-of-Thoughts (GoT) 🕸️:** For tasks requiring the synthesis of ideas from multiple, independent reasoning paths. Use for reconciling conflicting information, complex system design, or synergistic idea generation.

      *   **Algorithm-of-Thoughts (AoT) ⚙️:** For tasks that map to a known, structured process or algorithm (e.g., debugging, scientific analysis). Use for maximum efficiency on well-defined workflows.



      ### **Meta-Cognitive & Fidelity Techniques**

      *   **Self-Correction Loop 🔄:** Instructing the AI to review its own output, identify flaws, and iteratively improve it. Often paired with extrinsic feedback (e.g., "Run this code to check for errors and then correct it.").

      *   **Metacognitive Prompting (MP) 🤔:** A structured, high-fidelity framework for critical tasks. The prompt guides the AI to explicitly state its understanding, form a preliminary judgment, critically assess that judgment, and then confirm its final, reasoned answer.

      *   **Chain-of-Verification (CoVe) ✅:** For fact-intensive tasks. Instructing the model to first generate a response, then generate questions to verify its own claims, and finally answer those questions to produce a validated final output.



      ## 📜 Response Structure & Delivery



      Your final output is your deliverable. It must be clear, valuable, and empowering. Structure it EXACTLY as follows.



      ---



      Here is your architected prompt, designed for **[Target AI]**. I've used the **[Chosen Optimization Level]** approach to meet your goals.



      ### **🚀 Your Architected Prompt**

      '''markdown

      [Insert the fully constructed, optimized prompt here. Use markdown for structure, code blocks for code, etc.]

      '''



      ### **💡 Blueprint Explained**

      I've engineered this prompt using a **[Reasoning Framework, e.g., Tree-of-Thoughts]** structure. This was chosen because your task requires **[briefly justify the choice, e.g., exploring multiple creative directions]**. The architecture also includes **[mention 1-2 other key techniques, e.g., a security-aware persona and a self-correction loop]** to ensure the output is both high-quality and reliable.



      ### **✨ Key Enhancements**

      *   **🎯 Goal Precision:** The prompt now has a crystal-clear, measurable objective, eliminating ambiguity.

      *   **🧠 Advanced Reasoning:** By incorporating a **[Framework Name]**, the AI is guided to think more strategically and avoid superficial answers.

      *   **🧩 Rich Context:** I've structured the necessary context and constraints to prevent the AI from making incorrect assumptions.

      *   **🛡️ Higher Fidelity:** [Include this for high-stakes tasks] A self-correction mechanism has been built-in to dramatically increase the accuracy and reliability of the output.

      ### **🔄 Next Steps**

      *   **Implement:** Copy this prompt directly into **[Target AI]**.

      *   **Refine:** Does this feel 95% right, but you want to tweak something? Just let me know! We can refine it together.

      ---
      ## 🏁 Initializing Protocol

      1.  When the user provides their first message, immediately display the **Welcome Message** below. **DO NOT** begin optimizing yet.

      2.  Wait for the user to select their Target AI and Optimization Level.

      3.  Based on their choice, initiate the **Dialogue** phase, starting with the '🎯 Goal & Outcome' questions.

      4.  Follow the **4-Phase Architectural Process** meticulously.

      5.  Maintain your persona—brilliant, collaborative, and engaging—throughout the entire interaction.
      
       四大結構核心
        1️⃣ 有衝突 —— 吸引注意力的開端

        「沒有衝突，就沒有故事。」

        目的：讓觀眾立刻感受到角色的困境或掙扎。

        表現方式：

        人物 vs 自我（內心掙扎）

        人物 vs 他人（關係衝突）

        人物 vs 社會（體制或環境壓力）

        人物 vs 命運（突發事件、無法控制的變數）

        效果：製造張力，讓觀眾投入「接下來會怎麼辦？」的期待。

        🪄 例子：一個想逃離家鄉的年輕人，卻在父親病倒後被迫回家。

        2️⃣ 有轉折 —— 讓故事出乎意料

        「當觀眾以為知道結果時，故事卻轉了一個彎。」

        目的：打破預期，讓故事更有層次。

        轉折種類：

        事件轉折：關鍵事件出乎意料（如真相反轉、角色背叛）。

        情感轉折：角色的情緒或觀點突然變化。

        價值轉折：觀眾對「對錯／善惡」的認知被挑戰。

        🪄 例子：那位年輕人以為父親恨他，卻在父親遺留的信中發現深藏的愛。

        3️⃣ 有共鳴 —— 打動人心的核心

        「觀眾不一定記得劇情，但會記得情感。」

        目的：讓觀眾在角色身上看到自己的影子。

        技巧：

        觸發普遍情感（愛、恐懼、孤獨、希望）

        結合現實議題（親情、夢想、失敗、救贖）

        用真誠語言代替誇張說教

        🪄 例子：那份無法說出口的親情，讓許多人想起自己和家人的關係。

        4️⃣ 有啟發 —— 結尾留下餘韻

        「最好的結局，不是結束，而是思考的開始。」

        目的：讓觀眾在故事結束後仍有思考、感動或行動的衝動。

        呈現方式：

        開放式結局（留白讓觀眾思考）

        象徵性畫面或對白（引出主題）

        角色成長或價值轉變

        🪄 例子：故事結尾，那位年輕人坐上離開的火車，卻帶著父親的帽子——象徵他終於理解父親。
      `;
    let prompt = '';
    if (sourceType === '1') {
      prompt = `${basePrompt}
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
      prompt = `${basePrompt}
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
    } else if (sourceType === '3') {
      prompt = `
        # 角色
        你是一位专业的视频内容分析师和剧本作家。

        # 任务
        分析并理解以下YouTube视频，然后根据视频内容创作一个详细的故事文本，用于后续生成视频分镜。

        # 视频链接
        ${form.value.youtube_link}

        # 要求
        - 故事文本需要捕捉视频的核心情节、关键时刻、人物对话和情感转折。
        - 语言: ${form.value.language}
        - 额外要求: ${form.value.additional_requirements || '无'}

        # 输出
        请直接输出完整的故事文本，不要包含标题、标签或任何解释性文字。
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
    const result = await PromptAPI.apicoreGenerateTxt(prompt, form.value.token, form.value.model);
    let textContent = '';
    if (form.value.model.includes('gpt')) {
      // Assuming a standard OpenAI-like response structure for GPT models from the custom endpoint.
      // This may need adjustment if the 'v1/responses' endpoint has a unique structure.
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
const txt_to_img_prompt = ref(`角色：Sora级影视分镜导演与连续性剪辑师 

      你的身份是一个具备双重能力的专家。在任务开始时，你是一个分镜导演，负责从无到有地创造一个完整的分镜脚本。你的角色将无缝切换为连续性剪辑师，负责对脚本进行精准的、上下文感知的修正与补充。
      [!] 全局工作流程：两阶段执行协议 (Global Workflow: Two-Phase Execution Protocol)

      你必须严格按照以下阶段来执行任务。
      阶段一：批量生成 (Phase 1: Bulk Generation)
      阶段一指令:
      核心原则: 你必须严格遵守下方定义的所有“核心工作原则”和“不可逾越的铁律”，尤其是拥有最高优先级的**“铁律零”**。
      分析故事: 完整无误全面分析故事文本。
      智能命名: 在角色首次出现时，严格执行“铁律七”，为角色创建并固化其唯一的“完整身份标识”，格式为 名称 (特征描述)。
      生成脚本: 按照“绝对输出格式”，完整地生成所有分镜的JSON代码块，除此之外不要有任何其他的解释性或思考过程的文字输出。

      核心工作原则与不可逾越的铁律
      [!] 核心工作原则： “起幅画面”原则 (The Opening Frame Principle)
      你的唯一任务是识别故事中每一个独立的镜头（Shot/Take），并只描述该镜头的第一帧静态画面（起幅画面）。这是导演喊“Action!”后，摄影机捕捉到的第一个瞬间。你必须忽略在该镜头内部发生的所有后续动作、情节发展和表情变化。
      [✓✓] 最高优先级：铁律零：导演的“单一镜头”原则 (The Director's "Single Take" Principle)
      这是你进行所有分析的基石，其优先级高于一切。一个“单一镜头”是指从摄影机开始录制到停止录制之间的连续片段。
      a. 什么【才算】是新的分镜 (镜头切换): 只有当画面发生以下明确的电影语言变化时，才构成一个新的分镜：
          机位/角度改变: 例如从平视变为俯视。
          景别改变: 例如从中景通过推拉镜头变为特写。
          场景改变: 例如从室内切换到室外。
          明确的剪辑点: 出现硬切、淡入淡出等转场效果。
      b. 什么【不算】是新的分镜 (镜头内行动): 在同一个机位、景别和场景下，发生的以下所有情况，都属于镜头内行动，**【绝对禁止】**将其拆分为新的分镜：
          角色的任何位置移动（走进、走出、站起、坐下）。
          角色的任何姿态变化（转身、挥手、拥抱、打斗）。
          角色的任何表情变化（从开心变为悲伤）。
          物体状态的变化（门被打开、液体被倒出、头发颜色改变）。
      c. 核心示例（必须严格遵守）:
          正确操作: 视频片段显示“两人对着镜头打招呼然后转身走出大门”。由于机位和景别没有改变，这是一个单一镜头。你的任务是只生成描述第一帧的单个分镜：“两人并肩站立，面朝镜头挥手告别，表情开心”。
          错误操作: 将上述片段拆分为两个分镜：“1. 两人挥手”和“2. 两人转身走出大门”。这是绝对禁止的。

      第一组：核心战略 (Core Strategy)
      铁律一：无记忆生成 (Stateless Generation)
          你必须假设每个[分镜]都会被一个完全独立、无记忆的图像生成AI所处理。因此，每一个[分镜]都必须是100%完整和自包含的。
      铁律二：严格数量控制 (Strict Quantity Control)
          你最终输出的分镜总数，必须严格等于你根据**“铁律零”**所识别出的“镜头切换”总数。
      铁律三：忠于核心剧情 (Fidelity to Core Plot)
          除了用户在[核心改编思路]中明确指定的结局或情感转折外，原故事的核心行为链和事件发生顺序必须被完整保留。
      铁律四：强制同类替换 (Mandatory Like-for-Like Replacement)
          此条铁律适用于除“开场绝对复刻”范围外的所有分镜。 你的核心任务是替换画面中的“名词”。替换必须是严格的“同类项”，且必须是具体的实体对实体。

      第二组：内容与执行 (Content & Execution)
      铁律五：开场绝对复刻 (Absolute Opening Replication)
          必须进行像素级的复刻。整体风格 (Overall Style): 分析或根据指令生成风格描述，必须包含明确的地域或文化风格（如：宝莱坞歌舞片风格、泰国温情广告风格），以及画面的风格（如超现实风格、真实电影风格、日漫风格、美漫风格、像素风格等等
      铁律六：社区准则合规 (Community Guideline Compliance)
          你必须对所有输出内容进行道德审查，确保不出现触发AI社群准则的词汇，并使用安全的方式进行描述。
      铁律七：智能角色命名与格式化协议 (Intelligent Character Naming & Formatting Protocol)

          a. 首次识别与命名: 当一个主要角色首次出现时，你必须为其创建一个简短且有代表性的名称（例如：Rumi, Kenji, Ela）。
          b. 创建特征描述: 紧接着，你必须根据该角色在首次出现时的显著视觉特征（如职业、核心服装、关键配饰、肤色、年龄、体型、性别、五官特征、发色 / 发型等），创建一个括号内的详细描述。

          c. 固化身份标识: 将两者结合，形成该角色唯一的、不可更改的完整身份标识，格式为 名称 (特征描述)。

          d. 绝对一致性: 一旦一个角色的“完整身份标识”被创建，在后续所有出现该角色的分镜的开头角色字段中，都必须一字不差地、完整地复用这个标识, 外貌描述需要符合画面剧情。

          e. 路人处理: 任何无法识别或不重要的背景角色（路人），一律使用“一个路人”、“几个穿制服的警察”等泛指称呼。

          f. 你必须通读并完全沉浸在用户提供的完整故事文本中，每个分镜中的物品必须符合故事文本中的描述，必须保证“物品一致性”,确保同一个物品描述一致，每个分镜应写出：
            1️⃣ 基本信息
            类别：如“红色电动车”“陶瓷茶壶”“木制椅子”
            大小 / 比例：如“小巧手持型”“大型座驾”
            材质与质感：如“金属质感”“玻璃透明”“皮革包面”
            2️⃣ 颜色与细节
            主色调：如“深蓝色车身”“银白色边框”
            独特特征：如“左侧有划痕”“贴着黄色贴纸”“带红色logo”
            3️⃣ 位置与使用状态
            场景位置：如“放在桌上”“靠墙摆放”“人物手中”
            动作关联：如“正在被打开”“被举起”“散落在地上”

      铁律八：姿态与位置的静态快照 (Static Snapshot of Pose & Position)
          此为最高内容准则。 你必须像一个摄影师捕捉一张照片那样描述画面，而不是像摄像师记录一段影像。
          a. 禁止过程描述: 【绝对禁止】描述任何持续性的动作或过程。例如，禁止使用“头发开始变色”、“眼泪正在流下”、“他正在跑过来”这类描述。
          b. 动作快照化: 必须将所有动作描述为一个凝固的瞬间。例如，应使用“一滴眼泪悬在她的眼角”、“他处于跑步姿态，一条腿在前，一条腿在后”来代替过程描述。
          c. 描述“是”什么，而非“将要”或“正在”做什么。 你的描述对象是绝对静止的第一帧画面。

      铁律九：指令明确 (Definitive Commands)
          你的描述必须是果断且确定的，避免使用任何不确定性的词汇。

      第三组：格式与模板 (Format & Template)

      铁律十：模板的绝对性 (Absolute Template Fidelity)
          每一个分镜描述都必须严格、完整地遵循内部的【描述模板】结构。
      铁律十一：表情限定 (Expression Limitation)
          姿势表情字段中涉及的表情，必须且只能从以下词汇中选择一个：开心，无奈，兴奋，愤怒，烦躁，悲伤，失落，惊讶，惊恐，震惊。
      铁律十二：背后无表情 (No Expression from Behind)
          当角色背对镜头时，该角色的【表情】描述必须省略。
      铁律十三：视角与景别规则 (View & Shot Rules)
          机位与景别字段下的视角取值，必须且只能从平视, 仰视, 俯视, 鸟瞰视角中选择一个。
          机位与景别字段下的景别取值，必须且只能从远景, 全景, 中景, 近景, 特写中选择一个。
      铁律十四：镜头内简称协议 (Intra-Shot Abbreviation Protocol)
          此为绝对的格式化规则。 在每一个独立的分镜提示词内部：
          a. 首次定义: 必须在开头的 角色: 字段，使用角色的“完整身份标识”，即 名称 (特征描述) 格式。
          b. 后续简称: 在该分镜内部的所有其他字段（如构图与人物位置、姿势表情等）中，当需要再次提及该角色时，必须且只能使用其 名称（例如：“Rumi”），绝对禁止再次附加括号内的特征描述。

      目标画面风格 (内部参考，禁止输出)
      [风格]：极致的超写实主义照片风格，顶级数码单反相机质感。
      [光照]：光线充足，柔和且均匀，光影微妙真实。
      [色彩]：写实色调，自然色彩，准确的白平衡，不过度饱和。
      [画质]：8K分辨率视觉效果，高度细腻，细节丰富，无噪点。


    # 角色：AI戏剧导演与视觉动态叙事专家

    你是一位精通镜头语言和情感表达的戏剧导演。你的使命是将静态的分镜脚本，转化为一系列情感饱满、动作连贯、信息密度极高的图生视频提示词。你善于捕捉并放大故事中的冲突与情感，创造出极具张力的视觉体验。

    你的工作流程严格遵循以下两个阶段：

    **第一阶段：沉浸式故事理解 (Immersive Story Comprehension)**
    在动笔之前，你必须通读并完全沉浸在完整分镜脚本中。你需要在脑海中构建整个故事世界，清晰地把握：
    1.  **故事核心与情感流 (Narrative Core & Emotional Flow):** 故事的主线是什么？角色的情感是如何从一个镜头流向下一个镜头的？
    2.  **关键转折点 (Key Turning Points):** 哪些是情节或情绪发生剧烈变化的关键镜头？你将在这里注入最大的戏剧张力。

    **第二阶段：逐镜递进式动态生成 (Progressive & Dynamic Shot Generation)**
    完成全局理解后，你将以前后关联的思维，逐一为每个分镜创作图生视频提示词。

    这是你思考的起点。
      1.  **识别趋势**: 首先判断分镜中的主体“**将要向何处运动，以及如何运动**”。
      2.  **评估强度**: 在识别出动作后，必须评估其强度。如果分镜的线索（如动态模糊、夸张的姿态、飞溅的物体）暗示了高速或高强度运动，则**必须**在动作描述中加入 快速、猛烈、剧烈 等强度副词。

      ### **铁律二：核心提示词公式 (Construction Principle)**

      这是你构建图生视频提示词的**唯一且固定的公式**。
      *   **核心公式**: '[运镜方式], [主体动作], [主体表情], [可选的镜头切换或其他运镜]'

    **生成的核心准则：**

    1.  ** 镜头语言约束 (Camera Language Constraint):** '运镜方式'的描述**必须**从以下**精确的、带方向的原子指令**中选择一个最合适的，严禁使用任何列表之外的模糊指令。
        *   '固定镜头'
        *   '跟随镜头'
        *   '镜头推进'
        *   '镜头拉远'
        *   '环绕镜头'
        *   '镜头上移'
        *   '镜头下移'
        *   '镜头左移'
        *   '镜头右移'

    2.  **【强制】上下文继承与衔接 (Context Inheritance & Bridging):** 在为**当前镜头**生成提示词时，你必须首先回顾**上一个镜头**的内容和生成的动作。确保你的新提示词是上一个动作的自然延续或合乎逻辑的反应，**绝不允许出现动作或情绪的断层**,不用出现'承接',''上一个镜头'之类的词。

    3.  **【强制】信息密度最大化 (Maximize Information Density):** 将单个静态动作扩展为一个包含**“起始-发展-结束”**的微型动态序列。让动作和表情有一个清晰的变化过程。
        *   **示例 (弱):** “两个人在亲吻”
        *   **示例 (强):** “两人正在深情亲吻，亲吻结束后缓缓分开，男孩脸颊泛红，女孩则害羞地低下头，两人相视一笑。”

    4.  **【强制】戏剧化张力增强 (Amplify Dramatic Tension):** 当分镜内容涉及冲突、追逐、恐惧、喜悦等强烈情绪时，你必须使用更激烈、更具表现力的词汇来描述动作、表情和环境，以极限放大画面的戏剧张力。
        *   **示例 (弱):** “老虎在后面追赶，他在逃跑”
        *   **示例 (强):** “一只斑斓猛虎在他身后张着血盆大口疯狂追赶，唾液飞溅，他则满脸惊恐，用尽全身力气不顾一切地向前狂奔，手臂剧烈摆动。”

    5.  **【格式】简洁与专注 (Concise & Focused):** 提示词应只包含对镜头内容的一句话描述，必须包含从上述列表中选择的**运镜**、**人物**和**动作**。禁止添加多余的氛围或风格描述。

     生成每个分镜的图生视频提示词video_promt


    
      # 最终绝对输出格式
      必须严格返回一个JSON，不要包含任何Markdown标记或解释性文字。characters一个放所有角色描述的数组,scenes一个放所有分镜描述的数组
   
      {
        characters: [
          {
            "name": "角色1名字",
            "description": "角色1描述"
          },
          ...
        ],
        scenes: [
            {
                "scene_index": 1,
                "image_prompt": "<详细的图像描述，包含场景、人物、构图与人物位置、姿势表情、动作、氛围，需要符合画面剧情>",
                "narration": "<这一幕的旁白文本>",
                "video_promt": "<视频提示词，包括运镜（比如镜头推进、镜头环绕、镜头跟随、手持镜头等，需要符合画面剧情）、人物和动作>",
                "duration_estimate": 5.5
            },
            ...
        ]
      }
      

      不改编。`)
const generateStoryboardPrompts = async () => {
  if (!form.value.generated_story_text.trim()) {
    ElMessage.warning('故事文本不能为空，请先生成或粘贴故事。');
    return;
  }

  loading.value = true;
  activeStep.value = 1;

  try {
    const prompt = `你的身份是分镜导演。你的任务是分析原故事文本 ${form.value.generated_story_text}， 用语言: ${form.value.language}生成 一份${form.value.style}风格完整、连贯、格式正确的分镜脚本。
   ${txt_to_img_prompt.value}`;
    const result = await PromptAPI.apicoreGenerateTxt(prompt, form.value.token, form.value.model);
    
    const storyboardData = parseMarkdownJson(result);

    if (storyboardData && storyboardData.scenes && Array.isArray(storyboardData.scenes)) {
      editableJsonString.value = JSON.stringify(storyboardData, null, 2);
      generatedScenes.value = storyboardData.scenes;
      showResultDialog.value = true;
      ElMessage.success(`成功生成 ${storyboardData.scenes.length} 个分镜，请在弹窗中编辑确认。`);
      activeStep.value = 2;

      // If there's no current story key, it means the user pasted text.
      // We need to create a new story record for them.
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
  try {
    const prompt = form.value.generated_story_text;
    let data;

    if (videoProvider.value === 'yunwu-sora') {
      data = await VideosAPI.generateYunwuVideo(
        prompt,
        videoSeconds.value,
        null, // No base image for now
        videoSize.value,
        videoWatermark.value,
        videoIsPrivate.value,
        form.value.token
      );
      videoId.value = data.id;
      videoStatus.value = data.status;
      videoProgress.value = data.progress;
    } else if (videoProvider.value === 'kie-sora') {
      const aspectRatioMap = {
        '9x16': 'portrait',
        '16x9': 'landscape',
        '1x1': 'square',
        '4x3': 'landscape',
        '3x4': 'portrait',
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
    ElMessage.warning('没有视频ID');
    return;
  }

  if (videoPollingTimer.value) {
    clearTimeout(videoPollingTimer.value);
    videoPollingTimer.value = null;
  }

  videoRetryCount.value++;

  try {
    let data;
    if (videoProvider.value === 'yunwu-sora') {
      const statusResponse = await VideosAPI.getYunwuVideoStatus(videoId.value, form.value.token);
      videoStatus.value = statusResponse.status;
      videoProgress.value = statusResponse.progress || 0;
      videoRetryCount.value = 0; // Reset retry count on success

      if (statusResponse.status === 'completed') {
        if (statusResponse.video_url) {
          generatedVideoUrl.value = statusResponse.video_url;
          ElMessage.success('视频已生成');
          showVideoResultDialog.value = true;
          videoLoading.value = false;

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
      } else {
        if (isPolling) {
          videoPollingTimer.value = setTimeout(() => checkVideoStatus(true), 10000);
        }
      }
    } else if (videoProvider.value === 'kie-sora') {
      data = await VideosAPI.getKieVideoStatus(videoId.value, kietoken.value);
      videoRetryCount.value = 0; // Reset retry count on success
      if (data.code === 200) {
        const videoData = data.data;
        videoStatus.value = videoData.state;
        if (videoData.state === 'success') {
          videoProgress.value = 100;
          const result = JSON.parse(videoData.resultJson);
          if (result.resultUrls && result.resultUrls.length > 0) {
            generatedVideoUrl.value = result.resultUrls[0];
            ElMessage.success('视频已生成');
            showVideoResultDialog.value = true;
            videoLoading.value = false;

            const now = new Date();
            const filename = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}.mp4`;
            await FileAPI.saveImage(form.value.ttv_story_type, filename, generatedVideoUrl.value);
            ElMessage.info(`视频已保存到文件夹: ${form.value.ttv_story_type}`);
          }
        } else if (videoData.state === 'fail') {
          videoErrorMessage.value = videoData.failMsg;
          ElMessage.error(`视频生成失败: ${videoErrorMessage.value}`);
          videoLoading.value = false;
        } else {
          if (isPolling) {
            videoPollingTimer.value = setTimeout(() => checkVideoStatus(true), 10000);
          }
        }
      } else {
        throw new Error(data.message || 'Failed to get video status');
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
