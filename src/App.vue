<script setup lang="ts">
import { ref, onMounted, computed } from 'vue' // 👈 加个 computed
import type { UploadProps } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus' // 引入弹窗组件
import axios from 'axios' // 👈 记得引入 axios
import { Delete, Edit, Search, UploadFilled } from '@element-plus/icons-vue'

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
const searchText = ref('') // 记录搜索框里的字
const editDialogVisible = ref(false)
const editForm = ref({ id: 0, title: '', category: '' })
const activeCategory = ref('全部') // 首页选中的 Tab
const categories = ref<string[]>([]) // 存放从后端查回来的分类列表
const uploadForm = ref({ title: '', category: '' }) // 上传表单数据
const dialogVisible = ref(false) // 控制弹窗显示/隐藏





// --- 方法：获取列表 ---

// 1. 获取所有分类 (新增)
const fetchCategories = async () => {
  try {
    const res = await axios.get(API_BASE + '/categories')
    categories.value = res.data
  } catch (error) {
    console.error('获取分类失败', error)
  }
}
// 2. 获取列表 (修改：加入 category 参数)
const fetchList = async () => {
  try {
    const res = await axios.get(API_BASE + '/list', {
      params: {
        title: searchText.value,     // 搜索词
        category: activeCategory.value // 当前选中的分类
      }
    })
    artworkList.value = res.data
  } catch (error) {
    console.error('加载失败', error)
    ElMessage.error('加载失败')
  }
}
// 3. 监听 Tab 切换
const handleTabChange = () => {
  fetchList() // 切换分类后重新查数据
}

// 4. 上传成功回调 (修改：上传完刷新分类列表)
const handleUploadSuccess = (response: any) => {
  ElMessage.success('上传成功！')
  dialogVisible.value = false
  uploadForm.value.title = ''
  // uploadForm.value.category = '' // 这里保留分类，方便用户连续上传同一类图片

  fetchList()       // 刷新图片列表
  fetchCategories() // 👈 关键：刷新分类列表 (因为可能刚刚创建了新分类)
}

// 上传失败的回调
const handleUploadError = (error: any) => {
  console.error(error)
  ElMessage.error('上传失败，请检查网络或后端')
}

// 解决用户输入后忘记按回车的问题
const handleCategoryBlur = (e: any) => {
  // 如果用户输入了内容，但没按回车，e.target.value 会有值
  if (e.target.value) {
    uploadForm.value.category = e.target.value
  }
}

// 监听搜索事件 (回车或点击图标时触发)
const handleSearch = () => {
  fetchList() // 重新请求数据
}

// --- 计算属性：提取所有图片链接，供灯箱预览使用 ---
const allImageUrls = computed(() => {
  return artworkList.value.map(item => item.imageUrl)
})

// --- 生命周期 ---
onMounted(() => {
  fetchCategories() // 页面加载时先查分类
  fetchList()       // 再查图片
})

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
  editForm.value = {
    id: item.id,
    title: item.title,
    category: item.category // 👈 新增：把当前的分类也复制进来
  }
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
    fetchCategories()
  } catch (error) {
    console.error(error)
    ElMessage.error('修改失败')
  }
}
</script>

<template>
  <div class="container">
    <div class="upload-card">
      <div class="header-title">
        <h1>🎨 画稿管理后台</h1>
        <p class="subtitle">Vue 3 + TypeScript + Spring Boot</p>
      </div>

      <div class="header-actions">
        <el-input v-model="searchText" placeholder="🔍 搜索画稿标题..." class="search-input" clearable @clear="handleSearch"
          @keyup.enter="handleSearch">
        </el-input>

        <el-button type="primary" size="large" @click="dialogVisible = true" class="upload-btn">
          ☁️ 上传新画稿
        </el-button>
      </div>
    </div>

    <div class="gallery-section">
      <div class="category-tabs-container">
        <el-tabs v-model="activeCategory" @tab-change="handleTabChange">
          <el-tab-pane label="全部" name="全部"></el-tab-pane>
          <el-tab-pane v-for="cat in categories" :key="cat" :label="cat" :name="cat"></el-tab-pane>
        </el-tabs>
      </div>
      <h2>📋 我的画集 ({{ artworkList.length }})</h2>

      <div class="waterfall-container">
        <div v-for="(item, index) in artworkList" :key="item.id" class="artwork-card">

          <div class="image-wrapper">
            <el-image :src="item.imageUrl + '?x-oss-process=image/resize,w_500'" :preview-src-list="allImageUrls"
              :initial-index="index" fit="cover" loading="lazy" class="custom-image" :preview-teleported="true">
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
    <el-dialog v-model="editDialogVisible" title="✏️ 修改信息" width="30%">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="画稿名称">
          <el-input v-model="editForm.title" />
        </el-form-item>

        <el-form-item label="作品分类">
          <el-select v-model="editForm.category" filterable allow-create default-first-option placeholder="请选择或输入新分类"
            style="width: 100%">
            <el-option v-for="item in categories" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleUpdate">保存</el-button>
        </span>
      </template>
    </el-dialog>
    <el-dialog v-model="dialogVisible" title="☁️ 上传新画稿" width="30%" destroy-on-close>
      <el-form :model="uploadForm" label-width="80px">
        <el-form-item label="画稿名称">
          <el-input v-model="uploadForm.title" placeholder="给你的作品起个好听的名字" />
        </el-form-item>
        <el-form-item label="作品分类">
          <el-select v-model="uploadForm.category" placeholder="请选择或直接输入新分类" filterable allow-create
            default-first-option style="width: 100%" @blur="handleCategoryBlur">
            <el-option v-for="item in categories" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="选择图片">
          <el-upload class="upload-demo" drag :action="API_BASE + '/upload'"
            :data="{ title: uploadForm.title, category: uploadForm.category }" :show-file-list="true" :limit="1"
            :on-success="handleUploadSuccess" :on-error="handleUploadError">
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              拖拽图片到这里 或 <em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 jpg/png 文件，大小不超过 10MB
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
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
/* 顶部大卡片 */
.upload-card {
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  text-align: center;
  margin-bottom: 40px;
  /* 让内容垂直排列 */
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 标题样式 */
.header-title h1 {
  margin: 0 0 10px 0;
  font-size: 28px;
  color: #2c3e50;
  letter-spacing: 1px;
}

.subtitle {
  color: #909399;
  margin-bottom: 30px;
  font-size: 14px;
}

/* 核心操作区：Flex 布局让搜索框和按钮并排 */
.header-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  /* 搜索框和按钮之间的间距 */
  width: 100%;
  max-width: 600px;
  /* 限制最大宽度，防止拉得太长 */
}

/* 搜索框美化 */
.search-input {
  flex: 1;
  /* 让搜索框占据剩余空间 */
}

/* 按钮微调 */
.upload-btn {
  padding: 0 25px;
  font-weight: bold;
}

/* 移动端适配：手机上变成竖着排 */
@media (max-width: 600px) {
  .header-actions {
    flex-direction: column;
  }

  .search-input,
  .upload-btn {
    width: 100%;
  }
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
  justify-content: space-between;
  /* 此时：左边是标题，右边是按钮组 */
  align-items: flex-start;
}

/* 👇 新增这个 */
.btn-group {
  display: flex;
  gap: 8px;
  /* 两个按钮之间的距离，你可以随意调整这个数字 */
}

/* 还可以去掉 Element Plus 按钮默认的左边距，防止干扰 */
.btn-group .el-button+.el-button {
  margin-left: 0;
}

/* 分类 Tab 容器 */
.category-tabs-container {
  max-width: 1200px;
  margin: 0 auto 20px;
  /* 居中，底部留空 */
  background: white;
  padding: 10px 20px 0;
  /*稍微给点内边距 */
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

/* 让 Tab 文字稍微大一点 */
:deep(.el-tabs__item) {
  font-size: 15px;
  font-weight: 500;
}
</style>