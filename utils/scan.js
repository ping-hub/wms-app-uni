/**
 * 扫码解析公共工具
 * 从入库单 edit.vue 中提取，供各业务模块复用
 */

/**
 * 解析扫码内容，支持 JSON / key=value / 纯文本格式
 * @param {string} content 扫码原始内容
 * @returns {{ rawContent: string, parsed: object|null, extraFields: object, status: string, statusClass: string, canAdd: boolean }}
 */
export function parseScanContent(content) {
  const result = {
    rawContent: content,
    parsed: null,
    extraFields: {},
    status: '',
    statusClass: '',
    canAdd: false
  }

  if (!content) {
    result.status = '扫码内容为空'
    result.statusClass = 'tag-danger'
    return result
  }

  // 尝试解析 JSON
  try {
    const json = JSON.parse(content)
    if (typeof json === 'object' && json !== null) {
      result.parsed = {
        instanceCode: json.instanceCode || json.instance_code || json.code || '',
        itemName: json.itemName || json.item_name || json.name || '',
        skuName: json.skuName || json.sku_name || json.sku || json.spec || '',
        itemCode: json.itemCode || json.item_code || '',
        unit: json.unit || '',
        qualityGrade: json.qualityGrade || json.quality_grade || json.grade || '',
        boxCode: json.boxCode || json.box_code || ''
      }
      const knownKeys = ['instanceCode', 'instance_code', 'code', 'itemName', 'item_name', 'name',
        'skuName', 'sku_name', 'sku', 'spec', 'itemCode', 'item_code', 'unit',
        'qualityGrade', 'quality_grade', 'grade', 'boxCode', 'box_code']
      Object.keys(json).forEach(key => {
        if (!knownKeys.includes(key) && typeof json[key] !== 'object') {
          result.extraFields[key] = json[key]
        }
      })
      if (result.parsed.instanceCode) {
        result.status = '已识别实例编码'
        result.statusClass = 'tag-success'
        result.canAdd = true
      } else {
        result.status = '未找到实例编码字段'
        result.statusClass = 'tag-warning'
      }
      return result
    }
  } catch (e) {
    // 不是 JSON
  }

  // 尝试解析 key=value 格式
  if (content.includes('=')) {
    const separators = [';', ',', '|', '&', '\n']
    let pairs = [content]
    for (const sep of separators) {
      if (content.includes(sep)) {
        pairs = content.split(sep)
        break
      }
    }
    const obj = {}
    pairs.forEach(pair => {
      const eqIndex = pair.indexOf('=')
      if (eqIndex > 0) {
        const key = pair.substring(0, eqIndex).trim()
        const value = pair.substring(eqIndex + 1).trim()
        if (key && value) obj[key] = value
      }
    })
    if (Object.keys(obj).length > 0) {
      result.parsed = {
        instanceCode: obj.instanceCode || obj.instance_code || obj.code || obj.id || '',
        itemName: obj.itemName || obj.item_name || obj.name || '',
        skuName: obj.skuName || obj.sku_name || obj.sku || obj.spec || '',
        itemCode: obj.itemCode || obj.item_code || '',
        unit: obj.unit || '',
        qualityGrade: obj.qualityGrade || obj.quality_grade || obj.grade || '',
        boxCode: obj.boxCode || obj.box_code || ''
      }
      if (result.parsed.instanceCode) {
        result.status = '已识别实例编码（键值对格式）'
        result.statusClass = 'tag-success'
        result.canAdd = true
      }
      return result
    }
  }

  // 纯文本 - 当作实例编码
  result.parsed = { instanceCode: content }
  result.status = '将作为实例编码处理'
  result.statusClass = 'tag-info'
  result.canAdd = true
  return result
}

/**
 * 调用 uni.scanCode 并提取扫码内容（兼容多格式返回）
 * @returns {Promise<string>} 扫码内容文本
 */
export function doScanCode() {
  return new Promise((resolve, reject) => {
    uni.scanCode({
      scanType: ['qrCode', 'barCode'],
      autoDecodeCharSet: true,
      success: (res) => {
        let content = ''
        if (typeof res === 'string') {
          content = res
        } else if (res?.result) {
          content = res.result
        } else if (Array.isArray(res)) {
          const data = res[1] || res[0]
          content = data?.result || ''
          if (!content && typeof data === 'string') content = data
        }
        if (content) {
          try {
            const decoded = decodeURIComponent(content)
            if (decoded !== content) content = decoded
          } catch (e) {}
        }
        if (content) {
          resolve(content)
        } else {
          reject(new Error('扫码结果为空'))
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

/**
 * 格式化时间
 */
export function formatTime(time) {
  if (!time) return ''
  const d = new Date(time)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return mm + '-' + dd + ' ' + hh + ':' + mi
}
