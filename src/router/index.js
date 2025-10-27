import { createRouter, createWebHistory } from 'vue-router'
import PreviewView from '../views/PreviewView.vue'
import ComposeView from '../views/ComposeView.vue'
import StoryboardView from '../views/StoryboardView.vue'
import PromptGeneratorView from '../views/PromptGeneratorView.vue'

const routes = [
  { path: '/', redirect: '/prompt-generator' },
  { path: '/preview', component: PreviewView },
  { path: '/compose', component: ComposeView },
  { path: '/storyboard', component: StoryboardView },
  { path: '/prompt-generator', component: PromptGeneratorView }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
