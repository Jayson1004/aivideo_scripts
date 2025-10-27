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
          <el-input v-model="token" placeholder="API_KEY" style="width:400px" />
        </el-form-item>
        <el-form-item label="模型选择">
          <el-select v-model="form.model" placeholder="选择语言模型" style="width: 100%;">
            <el-option-group label="OpenAI">
              <el-option label="GPT-5 (2025-08-07)" value="gpt-5-2025-08-07"></el-option>
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
        <el-form-item label="故事长度">
          <el-input-number v-model="form.story_length" :min="100" :max="10000" :step="100" />
          <span style="margin-left:8px; color:#666;">字</span>
        </el-form-item>
        <el-form-item label="其他要求">
          <el-input v-model="form.additional_requirements" placeholder="可选：例如故事的特定背景、人物性格等" />
        </el-form-item>
      </el-form>
      <div style="display:flex; gap:12px; justify-content: center; margin-top: 20px;">
        <el-button type="primary" size="large" :loading="loading" @click="generateStory">
          {{ form.generate_story_type === '1' ? '生成故事' : (form.generate_story_type === '2' ? '改写故事' : '生成故事') }}
        </el-button>
      </div>
    </el-card>

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
// import { PromptAPI } from '../services/api'
const PromptAPI = {
  apicoreGenerateTxt: async (prompt, token, model) => {
    if (!token) throw new Error('API token is required');

    let url = '';
    let payload = {};
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (model.includes('gpt')) {
      url = '/v1/responses';
      payload = {
        "model": model,
        "input": [{"role": "user", "content": [{"type": "input_text", "text": prompt}]}],
        "tools": [],
        "text": {"format": {"type": "text"}, "verbosity": "medium"},
        "reasoning": {"effort": "medium", "summary": 'auto'},
        "stream": false,
        "store": false
      };
    } else if (model.includes('claude')) {
      url = `/v1/messages`;
      payload = {
        model: model,
        system: "你是一个智能AI助手。",
        messages: [{ role: "user", content: prompt }],
        stream: false,
        max_tokens: 8000,
        thinking: { type: "enabled", budget_tokens: 5200 }
      };
    } else {
        throw new Error(`Unsupported model: ${model}`);
    }
    let result = ''
    const response = await axios.post(url, payload, { headers });
    if(model.includes('claude')){
      if (response.data?.content[0]) {
        result = response.data?.content[0].text;
      }
    } else if(model.includes('gpt')) {
      const output = response.data.output
      output.map(el=>{
        if(el.type == "message" && el.content[0].type == "output_text") {
          result = el.content[0].text
        }
      })
    }
    return result;
  }
};
const router = useRouter()

// State
const activeStep = ref(0)
const form = ref(getInitialFormState())
const loading = ref(false)
const generatedScenes = ref([])
const showResultDialog = ref(true)
const showTxtToScene = ref(false)
const editableJsonString = ref('')
const showHistoryDialog = ref(false)
const savedStories = ref([])
const currentStoryKey = ref(null)
const token = ref('')
const styleOptions = [
{ label: '无风格', value: '' },
  { label: '3D卡通', value: 'Cartoon Games 3D' },
  { label: '索尼影片', value: 'Sony Pictures Animation' },
  { label: '动漫', value: 'anime style' },
  { label: '像素艺术', value: 'pixel art style' },
  { label: '低多边形', value: 'low poly style' },
  { label: '写实', value: 'photorealistic' },
]
watch(token, (t) => {
    localStorage.setItem('apicore_token', t)
  
})
// --- Helper Functions ---
function getInitialFormState() {
  return {
    topic: '',
    style: 'photorealistic',
    language: 'chinese',
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

  loading.value = true;
  form.value.generated_story_text = '';
  generatedScenes.value = [];
  activeStep.value = 0;

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
    const topic = form.value.topic.trim() || form.value.generated_story_text.split(/[.!?。！？]/)[0] || '无主题故事';
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

      你的身份是一个具备双重能力的专家。在任务开始时，你是一个分镜导演，负责从无到有地创造一个完整的分镜脚本。在我（用户）确认初稿完成后，你的角色将无缝切换为连续性剪辑师，负责对脚本进行精准的、上下文感知的修正与补充。
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
          除了用户在[核心改编思路]中明确指定的结局或情感转折外，原视故事的核心行为链和事件发生顺序必须被完整保留。
      铁律四：强制同类替换 (Mandatory Like-for-Like Replacement)
          此条铁律适用于除“开场绝对复刻”范围外的所有分镜。 你的核心任务是替换画面中的“名词”。替换必须是严格的“同类项”，且必须是具体的实体对实体。

      第二组：内容与执行 (Content & Execution)
      铁律五：开场绝对复刻 (Absolute Opening Replication)
          必须进行像素级的复刻。整体风格 (Overall Style): 分析或根据指令生成风格描述，必须包含明确的地域或文化风格（如：宝莱坞歌舞片风格、泰国温情广告风格），以及画面的风格（如超现实风格、真实电影风格、日漫风格、美漫风格、像素风格等等
      铁律六：社区准则合规 (Community Guideline Compliance)
          你必须对所有输出内容进行道德审查，确保不出现触发AI社群准则的词汇，并使用安全的方式进行描述。
      铁律七：智能角色命名与格式化协议 (Intelligent Character Naming & Formatting Protocol)

          a. 首次识别与命名: 当一个主要角色首次出现时，你必须为其创建一个简短且有代表性的名称（例如：Rumi, Kenji, Ela）。
          b. 创建特征描述: 紧接着，你必须根据该角色在首次出现时的显著视觉特征（如职业、核心服装、关键配饰、肤色、年龄、体型、性别、五官特征、发色 / 发型等），创建一个括号内的详细描述。例如：
              角色代号 1: [例如：精瘦老年男性]
              描述: [描述角色的视觉特征，必须包含明确的种族/地域特征（如：典型的泰国北部老人面容，皮肤黝黑...）]
              角色代号 2: [例如：都市白领女性]
              描述: [描述角色的视觉特征，必须包含明确的种族/地域特征（如：东亚面孔，黑色长发，常见于中国上海的年轻职业女性...）]
              [根据需要定义更多角色...]。

          c. 固化身份标识: 将两者结合，形成该角色唯一的、不可更改的完整身份标识，格式为 名称 (特征描述)。

          d. 绝对一致性: 一旦一个角色的“完整身份标识”被创建，在后续所有出现该角色的分镜的开头角色字段中，都必须一字不差地、完整地复用这个标识, 外貌描述需要符合画面剧情。

          e. 路人处理: 任何无法识别或不重要的背景角色（路人），一律使用“一个路人”、“几个穿制服的警察”等泛指称呼。

          f. 为了保证“物品一致性”,，应写出：
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

    基于各个分镜的角色和动作，再提供一个生成视频的提示词video_promt，不需要对主体、环境、时间、天气、视角、景别进行分类，只需要用一句话描述镜头内容，必须包含运镜（比如镜头推进、镜头环绕、镜头跟随、手持镜头等，需要符合画面剧情）、人物和动作，不要有多余的氛围描述

    
      # 绝对输出格式
      必须严格返回一个JSON数组，不要包含任何Markdown标记或解释性文字。

      [
          {
              "scene_index": 1,
              "image_prompt": "<详细的图像描述，包含场景、人物、动作、氛围，需要符合画面剧情>",
              "narration": "<这一幕的旁白文本>",
              "video_promt": "<视频提示词，包括运镜（比如镜头推进、镜头环绕、镜头跟随、手持镜头等，需要符合画面剧情）、人物和动作>",
              "duration_estimate": 5.5
          },
          ...
      ]
      生成的所有主要角色，带有人物特征描述的，放到上面json数组的第一个，即scene_index为0,里面的image_prompt是一个放所有角色描述的数组。
      例如：
      [
          {
              "scene_index": 0,
              "image_prompt": [
                "角色1名字:精瘦老年男性，典型的泰国北部老人面容，皮肤黝黑...",
                "角色2名字:都市白领女性, 东亚面孔，黑色长发，常见于中国上海的年轻职业女性...",
                "角色3名字:..."
              ],
              "narration": "",
              "video_promt": "",
              "duration_estimate": 0
          },
          ...
      ]

      不改编。`)
const generateStoryboardPrompts = async () => {
  if (!form.value.generated_story_text.trim()) {
    ElMessage.warning('故事文本不能为空，请先生成或粘贴故事。');
    return;
  }

  loading.value = true;
  activeStep.value = 1;

  try {
    const prompt = `你的身份是分镜导演。你的任务是分析原故事文本 ${form.value.generated_story_text}， 用语言: ${form.value.language} 一份完整、连贯、格式正确的分镜脚本。
   ${txt_to_img_prompt.value}`;
    const result = await PromptAPI.apicoreGenerateTxt(prompt, form.value.token, form.value.model);
    
    const scenes = parseMarkdownJson(result);

    if (scenes && Array.isArray(scenes)) {
      editableJsonString.value = JSON.stringify(scenes, null, 2);
      generatedScenes.value = scenes;
      showResultDialog.value = true;
      ElMessage.success(`成功生成 ${scenes.length} 个分镜，请在弹窗中编辑确认。`);
      activeStep.value = 2;

      // Update the story in localStorage with the new scenes
      if (currentStoryKey.value) {
        const existingData = JSON.parse(localStorage.getItem(currentStoryKey.value) || '{}');
        existingData.scenes = scenes;
        existingData.form = { ...form.value };
        localStorage.setItem(currentStoryKey.value, JSON.stringify(existingData));
        loadHistory();
      }

    } else {
      ElMessage.error('生成分镜失败：无法解析返回的数据。');
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
    const scenes = JSON.parse(editableJsonString.value);
    if (scenes && Array.isArray(scenes)) {
      generatedScenes.value = scenes;
      showResultDialog.value = false;
      activeStep.value = 2;
      ElMessage.success('分镜已保存!');

      if (currentStoryKey.value) {
        const existingData = JSON.parse(localStorage.getItem(currentStoryKey.value) || '{}');
        existingData.scenes = scenes;
        localStorage.setItem(currentStoryKey.value, JSON.stringify(existingData));
        loadHistory();
      }
      return true;
    } else {
      ElMessage.error('保存失败：格式不是一个有效的场景数组。');
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

const saveAndUseInStoryboard = () => {
  if (savePromptsFromDialog()) {
    useInStoryboard();
  }
};

const useInStoryboard = () => {
  if (generatedScenes.value.length === 0) {
    ElMessage.warning('没有可用的分镜。');
    return;
  }
  const storyboardScenes = generatedScenes.value.map(scene => ({
    prompt: scene.image_prompt,
    narration: scene.narration,
    video_promt: scene.video_promt
  }));
  localStorage.setItem('storyboard_scenes', JSON.stringify(storyboardScenes));
  localStorage.setItem('story_theme', form.value.topic || 'untitled_story');
  localStorage.setItem('current_story_key', currentStoryKey.value); // Pass the key
  router.push('/storyboard');
};

// --- JSON Parsing ---
function sanitizeJsonText(text) {
  if (typeof text !== 'string') return text;
  let s = text.replace(/\r\n?/g, '\n').replace(/^\ufeff/, '');
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
  token.value = localStorage.getItem('apicore_token') || ''
  loadHistory();
});

</script>

<style scoped>
.el-card {
  overflow: visible;
}
</style>
