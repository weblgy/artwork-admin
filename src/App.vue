<script setup lang="ts">
import { ref, onMounted, computed } from 'vue' // 👈 加个 computed
import { Plus, Delete } from '@element-plus/icons-vue' // 加个删除图标备用
import type { UploadProps } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus' // 引入弹窗组件
import axios from 'axios' // 👈 记得引入 axios
import { Edit } from '@element-plus/icons-vue' // 👈 记得引入 Edit 图标

const API_BASE = 'http://localhost:8080/api/artwork'
const editDialogVisible = ref(false)
const editForm = ref({ id: 0, title: '' })
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
// --- 计算属性：提取所有图片链接，供灯箱预览使用 ---
const allImageUrls = computed(() => {
  return artworkList.value.map(item => item.imageUrl)
})

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

// --- 打开编辑弹窗 ---
const openEdit = (item: any) => {
  // 把当前要改的画稿信息复制给 editForm
  editForm.value = { id: item.id, title: item.title }
  editDialogVisible.value = true
}

// --- 保存修改 ---
const handleUpdate = async () => {
  try {
    // 发送请求给后端
    await axios.post(API_BASE + '/update', editForm.value)

    ElMessage.success('标题修改成功')
    editDialogVisible.value = false // 关掉弹窗

    // 刷新列表，或者更聪明点：直接修改本地数组，不用刷新
    const target = artworkList.value.find(item => item.id === editForm.value.id)
    if (target) {
      target.title = editForm.value.title
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('修改失败')
  }
}
</script>

<template>
  <div class="container">
    <div class="card upload-card">
      <h1>🎨 画稿管理后台</h1>
      <p class="subtitle">Vue 3 + TypeScript + Spring Boot</p>

      <div class="upload-row">
        <el-input v-model="title" placeholder="给画稿起个名字..." class="input-title" />
        <el-upload class="mini-uploader" :action="API_BASE + '/upload'" :show-file-list="false"
          :on-success="handleSuccess" :on-error="handleError" :before-upload="beforeUpload" :data="{ title: title }"
          name="file">
          <el-button type="primary">点击上传新画稿</el-button>
        </el-upload>
      </div>
    </div>

    <div class="gallery-section">
      <h2>📋 我的画集 ({{ artworkList.length }})</h2>

      <div class="waterfall-container">
        <div v-for="(item, index) in artworkList" :key="item.id" class="artwork-card">

          <div class="image-wrapper">
            <el-image :src="item.imageUrl" :preview-src-list="allImageUrls" :initial-index="index" fit="cover"
              loading="lazy" class="custom-image" :preview-teleported="true">
              <template #placeholder>
                <div class="image-slot">Loading...</div>
              </template>
            </el-image>
          </div>

          <div class="info">
            <div class="title-box">
              <h3>{{ item.title }}</h3>
              <!-- <span class="id-tag">#{{ item.id }}</span> -->
            </div>

            <div class="btn-group">
              <el-button type="primary" circle plain size="small" :icon="Edit" @click.stop="openEdit(item)" />
              <el-button type="danger" circle plain size="small" :icon="Delete" :loading="deleteLoadingId === item.id"
                @click.stop="handleDelete(item.id)" />
            </div>
          </div>
        </div>
      </div>

      <el-empty v-if="artworkList.length === 0" description="还没有上传画稿哦" />
    </div>
    <el-dialog v-model="editDialogVisible" title="✏️ 修改标题" width="30%">
      <el-input v-model="editForm.title" placeholder="请输入新的画稿名称" />
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleUpdate">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.container {
  /* 1. 必须给一个宽度（或者是 max-width） */
  max-width: 1200px;

  /* 2. 只有设置了宽度，auto 才能算出左右该留多少空 */
  margin: 0 auto;

  padding: 40px 20px;
}

/* 上传卡片样式优化 */
.upload-card {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  text-align: center;
  margin-bottom: 40px;

  /* 确保它填满容器宽度 */
  width: 100%;
  box-sizing: border-box;
  /* 这是一个好习惯，防止padding撑大盒子 */
}

.upload-row {
  display: flex;
  justify-content: center;
  gap: 15px;
  max-width: 600px;
  margin: 20px auto 0;
}

.input-title {
  width: 300px;
}

/* 画廊网格布局 (CSS Grid) */
.gallery-section h2 {
  font-size: 20px;
  margin-bottom: 20px;
  color: #333;
  border-left: 4px solid #409EFF;
  padding-left: 10px;
}

/* --- 瀑布流核心布局 --- */
.waterfall-container {
  /* 分为 4 列 */
  column-count: 4;
  /* 列之间的间距 */
  column-gap: 20px;
}

/* 移动端适配：屏幕小的时候变 2 列或 1 列 */
@media (max-width: 1200px) {
  .waterfall-container {
    column-count: 3;
  }
}

@media (max-width: 768px) {
  .waterfall-container {
    column-count: 2;
  }
}

@media (max-width: 480px) {
  .waterfall-container {
    column-count: 1;
  }
}

/* 卡片样式 */
.artwork-card {
  /* 避免卡片被折断到下一列 (关键属性!) */
  break-inside: avoid;
  background: white;
  border-radius: 12px;
  margin-bottom: 20px;
  /* 卡片上下间距 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.artwork-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
}

/* 图片容器 */
.image-wrapper {
  width: 100%;
  /* 移除固定高度，让图片撑开容器 */
  line-height: 0;
  background-color: #f8f8f8;
}

/* 修正 Element Image 组件的样式 */
.custom-image {
  width: 100%;
  height: auto;
  /* 高度自适应 */
  display: block;
}

/* 加载占位符 */
.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 200px;
  background: #f5f7fa;
  color: #909399;
}

/* ... 之前的 .info 保持不变 ... */
.info {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between; /* 此时：左边是标题，右边是按钮组 */
  align-items: flex-start;
}

/* 👇 新增这个 */
.btn-group {
  display: flex;
  gap: 8px; /* 两个按钮之间的距离，你可以随意调整这个数字 */
}

/* 还可以去掉 Element Plus 按钮默认的左边距，防止干扰 */
.btn-group .el-button + .el-button {
  margin-left: 0;
}
</style>