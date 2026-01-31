<script setup lang="ts">
import { ref, onMounted, computed } from 'vue' // 👈 加个 computed
import type { UploadProps } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus' // 引入弹窗组件
import axios from 'axios' // 👈 记得引入 axios
import { Delete, Edit, Search, UploadFilled, Lock } from '@element-plus/icons-vue'
// 2. 👇 补上这个缺失的变量定义
const deleteLoadingId = ref<number | null>(null)

// const API_BASE = 'http://localhost:8080/api/artwork'
// const API_BASE = 'http://47.111.7.146:8080/api/artwork'
const API_BASE = '/api/artwork'



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
const loading = ref(true) // 默认是 true，正在加载

// --- 🔐 权限控制相关 ---
const isAdmin = ref(false) // 默认为 false (游客)
const loginDialogVisible = ref(false) // 登录弹窗开关
const loginPassword = ref('') // 输入的密码


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
// 修改 fetchList 方法，控制 loading 的开关
const fetchList = async () => {
  loading.value = true // 👇 开始请求前，开启 loading
  try {
    const res = await axios.get(API_BASE + '/list', {
      params: {
        title: searchText.value,
        category: activeCategory.value
      }
    })
    artworkList.value = res.data
  } catch (error) {
    ElMessage.error('加载失败')
  } finally {
    // 👇 稍微延迟一点点关闭(300ms)，为了让骨架屏展示得更平滑，防止闪烁
    setTimeout(() => {
      loading.value = false
    }, 300)
  }
}
// 3. 监听 Tab 切换
const handleTabChange = () => {
  fetchList() // 切换分类后重新查数据
}

// // 4. 上传成功回调 (修改：上传完刷新分类列表)
// const handleUploadSuccess = (response: any) => {
//   ElMessage.success('上传成功！')
//   dialogVisible.value = false
//   uploadForm.value.title = ''
//   // uploadForm.value.category = '' // 这里保留分类，方便用户连续上传同一类图片

//   fetchList()       // 刷新图片列表
//   fetchCategories() // 👈 关键：刷新分类列表 (因为可能刚刚创建了新分类)
// }

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

  //👇 新增：检查本地存储里有没有令牌
  const token = localStorage.getItem('artwork_admin_token')
  if (token === 'secret_token_123456') {
    isAdmin.value = true
  }
})

// 处理登录
const handleLogin = () => {
  if (loginPassword.value === 'admin888') { // 👈 这里设置你的密码！
    ElMessage.success('欢迎回来，管理员！')
    isAdmin.value = true
    loginDialogVisible.value = false
    // 存个“令牌”到浏览器，下次刷新不用重新登录
    localStorage.setItem('artwork_admin_token', 'secret_token_123456')
    loginPassword.value = '' // 清空密码框
  } else {
    ElMessage.error('密码错误，禁止访问')
  }
}

// 处理退出
const handleLogout = () => {
  ElMessageBox.confirm('确定要退出管理员模式吗？', '提示').then(() => {
    isAdmin.value = false
    localStorage.removeItem('artwork_admin_token') // 销毁令牌
    ElMessage.success('已切换为游客模式')
    // 如果正在批量管理，强制退出
    isBatchMode.value = false
    selectedIds.value = []
  })
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

// --- 批量操作相关的变量 ---
const isBatchMode = ref(false) // 是否开启批量模式
const selectedIds = ref<number[]>([]) // 记录选中的 ID

// 开启/关闭批量模式
const toggleBatchMode = () => {
  isBatchMode.value = !isBatchMode.value
  selectedIds.value = [] // 退出或进入时清空选择
}

// 选中/取消选中某张图
const toggleSelection = (id: number) => {
  const index = selectedIds.value.indexOf(id)
  if (index === -1) {
    selectedIds.value.push(id) // 没选中就加进去
  } else {
    selectedIds.value.splice(index, 1) // 选中了就踢出来
  }
}

// 全选/反选
const toggleSelectAll = () => {
  if (selectedIds.value.length === artworkList.value.length) {
    selectedIds.value = [] // 全不选
  } else {
    selectedIds.value = artworkList.value.map(item => item.id) // 全选
  }
}

// --- 批量删除逻辑 ---
const handleBatchDelete = () => {
  if (selectedIds.value.length === 0) return ElMessage.warning('请先选择图片')

  ElMessageBox.confirm(
    `确定要删除选中的 ${selectedIds.value.length} 张画稿吗？`,
    '⚠️ 批量删除警告',
    { type: 'warning' }
  ).then(async () => {
    try {
      await axios.delete(API_BASE + '/delete/batch', { data: selectedIds.value })
      ElMessage.success('批量删除成功')
      isBatchMode.value = false // 退出批量模式
      fetchList() // 刷新列表
      fetchCategories() // 刷新分类
    } catch (e) {
      ElMessage.error('删除失败')
    }
  })
}

// --- 批量移动分类逻辑 ---
const handleBatchMove = async () => {
  if (selectedIds.value.length === 0) return ElMessage.warning('请先选择图片')

  // 弹窗让用户输入新分类
  ElMessageBox.prompt('请输入或选择要移动到的分类', '📦 批量移动', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then(async ({ value }) => {
    if (!value) return ElMessage.warning('分类不能为空')

    try {
      await axios.post(API_BASE + '/update/batch/category', {
        ids: selectedIds.value,
        category: value
      })
      ElMessage.success('移动成功')
      isBatchMode.value = false
      fetchList()
      fetchCategories()
    } catch (e) {
      ElMessage.error('移动失败')
    }
  })
}
// --- 变量区域 ---
let uploadTimer: any = null // 用来做防抖的计时器

// --- 方法区域 ---

// 当文件超出限制时
const handleExceed = () => {
  ElMessage.warning('一次最多只能上传 50 张图片！')
}

// 改造后的上传成功回调 (防抖版)
const handleUploadSuccess = (response: any) => {
  // 1. 这里的代码每上传成功一张图就会执行一次
  // 我们不要在这里直接弹窗或刷新，太吵了

  // 2. 清除之前的计时器
  if (uploadTimer) clearTimeout(uploadTimer)

  // 3. 重新开始计时 (1秒后执行)
  uploadTimer = setTimeout(() => {
    // === 只有当 1 秒内没有新图片传完时，才执行下面这些 ===
    ElMessage.success('所有图片上传完成！')
    dialogVisible.value = false
    uploadForm.value.title = ''
    // uploadForm.value.category = '' // 看你需求是否重置

    fetchList()       // 刷新列表
    fetchCategories() // 刷新分类
  }, 1000)
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
        <template v-if="isAdmin">
          <el-button class="batch-btn" :type="isBatchMode ? 'danger' : 'default'" @click="toggleBatchMode">
            {{ isBatchMode ? '❌ 退出管理' : '✅ 批量管理' }}
          </el-button>
          <el-button type="primary" size="large" @click="dialogVisible = true" class="upload-btn">
            ☁️ 上传新画稿
          </el-button>
        </template>
        <el-button 
          :type="isAdmin ? 'info' : 'primary'" 
          plain 
          @click="isAdmin ? handleLogout() : (loginDialogVisible = true)"
        >
          {{ isAdmin ? '🔒 退出' : '🔑 登录' }}
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
      <el-skeleton :loading="loading" animated :count="4">
        <template #template>
          <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div style="width: 23%; margin-bottom: 20px" v-for="i in 4" :key="i">
              <el-skeleton-item variant="image" style="width: 100%; height: 240px; border-radius: 12px" />
              <div style="padding: 14px;">
                <el-skeleton-item variant="h3" style="width: 50%" />
                <div style="display: flex; justify-content: space-between; margin-top: 10px">
                  <el-skeleton-item variant="text" style="width: 30%" />
                  <el-skeleton-item variant="circle" style="width: 30px; height: 30px" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #default>
          <div class="waterfall-container">
            <div v-for="(item, index) in artworkList" :key="item.id" class="artwork-card">
              <div class="image-wrapper" @click="isAdmin && isBatchMode && toggleSelection(item.id)">
                <el-image :src="item.imageUrl + '?x-oss-process=image/resize,w_500'" :preview-src-list="allImageUrls"
                  :initial-index="index" fit="cover" loading="lazy" class="custom-image" :preview-teleported="true">
                  <template #placeholder>
                    <div class="image-slot">Loading...</div>
                  </template>
                </el-image>
                <div v-if="isBatchMode" class="batch-overlay" :class="{ selected: selectedIds.includes(item.id) }">
                  <div class="checkbox-circle">
                    <span v-if="selectedIds.includes(item.id)">✔</span>
                  </div>
                </div>
              </div>

              <div class="info">
                <div class="title-box">
                  <h3>{{ item.title }}</h3>
                  <!-- <span class="id-tag">#{{ item.id }}</span> -->
                </div>

                <div class="btn-group" v-if="!isBatchMode && isAdmin">
                  <el-button type="primary" circle plain size="small" :icon="Edit" @click.stop="openEdit(item)" />
                  <el-button type="danger" circle plain size="small" :icon="Delete"
                    :loading="deleteLoadingId === item.id" @click.stop="handleDelete(item.id)" />
                </div>
              </div>
            </div>
          </div>
        </template>

      </el-skeleton>



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
          <el-upload class="upload-demo" drag multiple :limit="50" :action="API_BASE + '/upload'"
            :data="{ title: uploadForm.title, category: uploadForm.category }" :show-file-list="true"
            :on-success="handleUploadSuccess" :on-error="handleUploadError" :on-exceed="handleExceed">
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
    <el-dialog v-model="loginDialogVisible" title="🛡️ 管理员认证" width="300px" center>
      <div style="text-align: center; margin-bottom: 20px; color: #666;">
        请输入管理密码以解锁编辑权限
      </div>

      <el-input v-model="loginPassword" type="password" placeholder="请输入密码" show-password @keyup.enter="handleLogin">
        <template #prefix>
          <el-icon>
            <Lock />
          </el-icon>
        </template>
      </el-input>

      <template #footer>
        <el-button type="primary" style="width: 100%" @click="handleLogin">
          解锁权限
        </el-button>
      </template>
    </el-dialog>
    <transition name="el-fade-in-linear">
      <div v-if="isBatchMode" class="batch-bar">
        <div class="batch-info">
          已选择 <b>{{ selectedIds.length }}</b> 张
          <el-button link type="primary" @click="toggleSelectAll">全选/反选</el-button>
        </div>
        <div class="batch-actions">
          <el-button type="warning" @click="handleBatchMove">📦 移动分类</el-button>
          <el-button type="danger" @click="handleBatchDelete">🗑️ 批量删除</el-button>
        </div>
      </div>
    </transition>
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

/* 强制固定按钮宽度，防止切换文字时抖动 */
.batch-btn {
  width: 120px;
  /* 👈 核心：根据实际情况调整，宽一点没关系 */
  text-align: center;
  /* 让文字在按钮里居中 */
  flex-shrink: 0;
  /* 防止被搜索框挤扁 */
}

/* (可选) 如果你的顶部栏用了 flex 居中，防止整个行抖动 */
.header-actions {
  /* 确保对齐方式稳固 */
  align-items: center;
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
/* 修改原本的 .image-wrapper */
.image-wrapper {
  position: relative;
  width: 100%;
  line-height: 0;
  background-color: #f8f8f8;
  overflow: hidden;
  /* 👈 关键：防止图片放大后溢出圆角 */
  cursor: pointer;
  /* 鼠标变手型 */
}

/* 这是一个深层选择器，用来选中 el-image 内部真正的 img 标签 */
:deep(.el-image__inner) {
  transition: transform 0.5s ease;
  /* 👈 加上过渡动画 */
}

/* 鼠标悬停在卡片上时，图片放大 1.05 倍 */
.artwork-card:hover :deep(.el-image__inner) {
  transform: scale(1.05);
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

/* 底部悬浮栏 */
.batch-bar {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 15px 30px;
  border-radius: 50px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 30px;
  z-index: 2000;
  border: 1px solid #ebeef5;
}

.batch-info b {
  color: #409EFF;
  font-size: 18px;
  margin: 0 5px;
}

/* 批量模式下的遮罩层 */
.batch-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0);
  /* 默认完全透明 */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
  cursor: pointer;
  transition: all 0.2s;

  /* 👇 核心修复：加上 box-sizing 和 透明边框 */
  box-sizing: border-box;
  border: 4px solid transparent;
  /* 先占位，防止抖动 */
}

/* 选中状态 */
.batch-overlay.selected {
  background: rgba(64, 158, 255, 0.2);
  border: 4px solid #409EFF;
  /* 选中时变成蓝色，因为有box-sizing，不会撑大盒子 */
}

/* 鼠标悬停时稍微给点提示 (可选) */
.image-wrapper:hover .batch-overlay {
  background: rgba(255, 255, 255, 0.1);
}

/* 复选圈圈 */
.checkbox-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: white;
  border: 2px solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  transition: all 0.2s;
}

.batch-overlay.selected .checkbox-circle {
  background: #409EFF;
  border-color: #409EFF;
}
.batch-bar {
    width: 90% !important;       /* 宽度变小 */
    padding: 10px 15px !important; /* 内边距减小 */
    bottom: 20px !important;     /* 离底部稍微近一点 */
    gap: 10px !important;        /* 按钮间距挤一点 */
    flex-direction: column;      /* 如果按钮太多，竖着排(可选) */
  }
  
  .batch-info {
    font-size: 14px;
  }
</style>
<style>
@media screen and (max-width: 768px) {
  /* 强制覆盖 Element Plus 的弹窗宽度 */
  .el-dialog {
    width: 90% !important;
    max-width: 90% !important;
  }
}
</style>