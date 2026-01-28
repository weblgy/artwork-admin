<script setup lang="ts">
import { ref, onMounted } from 'vue' // 👈 记得引入 onMounted
import { Plus, Delete } from '@element-plus/icons-vue' // 加个删除图标备用
import type { UploadProps } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus' // 引入弹窗组件
import axios from 'axios' // 👈 记得引入 axios


const API_BASE = 'http://localhost:8080/api/artwork'

// --- TS 接口定义 (Type Definition) ---
interface Artwork {
  id: number;
  title: string;
  imageUrl: string;
  width?: number;
  height?: number;
}

// --- 状态定义 ---
const title = ref<string>('')
const imageUrl = ref<string>('')
const artworkList = ref<Artwork[]>([]) // 👈 存放画稿列表

// --- 方法：获取列表 ---
const fetchList = async () => {
  try {
    const res = await axios.get(API_BASE + '/list')
    // TS 自动推导 res.data 是 any，但在运行时它就是数组
    artworkList.value = res.data
  } catch (err) {
    console.error('获取列表失败', err)
  }
}

// --- 生命周期：页面加载时触发 ---
onMounted(() => {
  fetchList()
})

// --- 上传逻辑 (保持不变，只加了一行刷新列表) ---
const handleSuccess: UploadProps['onSuccess'] = (response, uploadFile) => {
  const resStr = response as string
  if (resStr && resStr.includes('http')) {
    imageUrl.value = resStr.split(': ')[1]
    title.value = '' // 清空输入框
    alert('上传成功！')
    fetchList() // 👈 关键：上传成功后自动刷新列表
  } else {
    alert(response)
  }
}

// ... 之前的 handleError 和 beforeUpload 保持不变 ...
const handleError: UploadProps['onError'] = (error) => {
  console.error(error)
  alert('上传失败')
}

const beforeUpload: UploadProps['beforeUpload'] = (rawFile) => {
  if (rawFile.size / 1024 / 1024 > 50) {
    alert('图片太大')
    return false
  }
  return true
}

// --- 新增：删除逻辑 ---
const handleDelete = (id: number) => {
  ElMessageBox.confirm(
    '确定要删除这张画稿吗？文件无法恢复。',
    '警告',
    { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    try {
      // 调用后端接口
      await axios.delete(`${API_BASE}/delete/${id}`)
      ElMessage.success('删除成功')
      // 刷新列表
      fetchList()
    } catch (error) {
      console.error(error)
      ElMessage.error('删除失败')
    }
  }).catch(() => {
    // 用户点击取消，不做任何事
  })
}
</script>

<template>
  <div class="container">
    <div class="card upload-card">
      <h1>🎨 画稿管理后台</h1>
      <p class="subtitle">Vue 3 + TypeScript + Spring Boot</p>

      <div class="upload-row">
        <el-input 
          v-model="title" 
          placeholder="给画稿起个名字..." 
          class="input-title"
        />
        <el-upload
          class="mini-uploader"
          :action="API_BASE + '/upload'"
          :show-file-list="false"
          :on-success="handleSuccess"
          :on-error="handleError"
          :before-upload="beforeUpload"
          :data="{ title: title }" 
          name="file" 
        >
          <el-button type="primary">点击上传新画稿</el-button>
        </el-upload>
      </div>
    </div>

    <div class="gallery-section">
      <h2>📋 我的画集 ({{ artworkList.length }})</h2>
      
      <div class="grid-layout">
        <div v-for="item in artworkList" :key="item.id" class="artwork-item">
          <div class="image-wrapper">
            <img :src="item.imageUrl" loading="lazy" />
          </div>
         <div class="info">
            <div class="title-box">
               <h3>{{ item.title }}</h3>
               <span class="id-tag">#{{ item.id }}</span>
            </div>
            
            <el-button 
              type="danger" 
              circle 
              size="small"
              :icon="Delete" 
              @click.stop="handleDelete(item.id)" 
            />
          </div>
        </div>
      </div>
      
      <el-empty v-if="artworkList.length === 0" description="还没有上传画稿哦" />
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: 'Helvetica Neue', sans-serif;
}

/* 上传卡片样式优化 */
.upload-card {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  text-align: center;
  margin-bottom: 50px;
}
.upload-row {
  display: flex;
  justify-content: center;
  gap: 15px;
  max-width: 600px;
  margin: 20px auto 0;
}
.input-title { width: 300px; }

/* 画廊网格布局 (CSS Grid) */
.gallery-section h2 {
  font-size: 20px;
  margin-bottom: 20px;
  color: #333;
  border-left: 4px solid #409EFF;
  padding-left: 10px;
}

.grid-layout {
  display: grid;
  /* 自动适应宽度，最小250px，最大1fr */
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 25px;
}

.artwork-item {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.03);
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
}

.artwork-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.1);
}

.image-wrapper {
  height: 200px;
  overflow: hidden;
  background: #f8f8f8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover; /* 裁剪填充 */
}

/* 修改 info 样式，让标题和按钮分列两边 */
.info {
  padding: 15px;
  display: flex;
  justify-content: space-between; /* 左右撑开 */
  align-items: center;
}

.title-box {
  text-align: left;
}
.info h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
  font-weight: 500;
}

.id-tag {
  font-size: 12px;
  color: #999;
  background: #f0f2f5;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>