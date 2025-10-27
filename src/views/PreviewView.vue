<template>
  <div style="padding:16px;">
    <el-page-header content="预览与重生" />
    <div style="margin:12px 0; display:flex; gap:8px; align-items:center;">
      <el-select v-model="provider" size="small" style="width:220px" placeholder="选择提供方">
        <el-option label="Gemini (Imagen)" value="gemini" />
        <el-option label="API Core (gemini-2.5-flash-image)" value="apicore" />
      </el-select>
      <el-input v-if="provider==='apicore'" v-model="token" size="small" style="width:280px" placeholder="填入 API Token" />
      <el-button type="primary" @click="doGenerate" :loading="loading">批量生成图片</el-button>
      <el-button type="success" @click="goCompose" :disabled="images.length===0">去合成 ({{ images.length }})</el-button>
    </div>
    <el-row :gutter="12">
      <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="(item,idx) in images" :key="idx">
        <el-card :body-style="{padding:'8px'}" style="margin-bottom:12px;">
          <img :src="item" style="width:100%; height:200px; object-fit:cover;" />
          <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
            <el-button size="small" @click="regenerate(idx)">重生</el-button>
            <el-button size="small" type="success" @click="toggleSelect(idx)" :plain="!selected[idx]">{{ selected[idx] ? '已选' : '选用' }}</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ImagesAPI } from '../services/api'

const router = useRouter()
const loading = ref(false)
const images = ref([])
const selected = ref({})
const provider = ref('gemini')
const token = ref(localStorage.getItem('apicore_token')||'')

const doGenerate = async ()=>{
  loading.value = true
  try{
    const arr = JSON.parse(sessionStorage.getItem('prompts')||'[]')
    if(provider.value === 'apicore'){
      localStorage.setItem('apicore_token', token.value)
      const urls = await ImagesAPI.apicoreGenerateBatch(arr, token.value)
      images.value = urls.filter(Boolean)
    } else {
      const { urls } = await ImagesAPI.generate(arr, '16:9', '1K', provider.value, token.value)
      // urls.forEach(url=>{
      //   if(url.indexOf('http') === -1){
      //     url = `${import.meta.env.VITE_API_BASE}${url}`
      //   }
      // })
      images.value = urls
    }
    sessionStorage.setItem('images', JSON.stringify(images.value))
  }catch(e){ console.error(e) }
  loading.value = false
}

const regenerate = async (idx)=>{
  try{
    const arr = JSON.parse(sessionStorage.getItem('prompts')||'[]')
    const prompt = arr[idx] || arr[0]
    const url = await ImagesAPI.apicoreGenerateOne(prompt, token.value)
    if(url){ images.value[idx] = url; sessionStorage.setItem('images', JSON.stringify(images.value)) }
  }catch(e){ console.error(e) }
}

const toggleSelect = (idx)=>{ selected.value[idx] = !selected.value[idx]; selected.value = { ...selected.value }; }

const goCompose = ()=>{
  const chosen = images.value.filter((_,i)=> selected.value[i])
  const useList = chosen.length ? chosen : images.value
  sessionStorage.setItem('images', JSON.stringify(useList))
  router.push('/compose')
}
</script>
