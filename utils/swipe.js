import { ref } from 'vue'

/**
 * 列表卡片左滑删除手势
 * 用法：卡片容器绑定 onTouchStart/onTouchMove/onTouchEnd，
 * 通过 openId 控制 translateX 位移，滑开时点击卡片仅收起不触发跳转
 * @param {number} threshold 触发左滑/右滑的水平位移阈值(px)
 */
export function useSwipe(threshold = 40) {
  const openId = ref(null)
  let startX = 0
  let startY = 0
  let moved = false

  const onTouchStart = (e) => {
    const t = e.touches[0]
    startX = t.clientX
    startY = t.clientY
    moved = false
  }

  const onTouchMove = (e, item) => {
    const t = e.touches[0]
    const dx = t.clientX - startX
    const dy = t.clientY - startY
    // 纵向滚动优先，不干扰列表上下滑动
    if (Math.abs(dy) > Math.abs(dx)) return
    if (dx < -threshold) {
      openId.value = item.id
      moved = true
    } else if (dx > threshold) {
      openId.value = null
      moved = true
    }
  }

  const onTouchEnd = (item) => {
    // 未滑动且点击的是已展开项：收起
    if (!moved && openId.value === item.id) {
      openId.value = null
    }
  }

  return { openId, onTouchStart, onTouchMove, onTouchEnd }
}
