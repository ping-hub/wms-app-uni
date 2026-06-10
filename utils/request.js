import { getToken, removeToken } from './auth'
import { BASE_URL } from '@/config'

const SERVER_URL_KEY = 'wms_server_url'

export function getBaseUrl() {
  try {
    const saved = uni.getStorageSync(SERVER_URL_KEY)
    if (saved) return saved
  } catch (e) {}
  return BASE_URL
}

export function setBaseUrl(url) {
  uni.setStorageSync(SERVER_URL_KEY, url)
}

function request(options = {}) {
  return new Promise((resolve, reject) => {
    const baseUrl = getBaseUrl()
    const token = getToken()
    const header = {
      'Content-Type': 'application/json;charset=utf-8',
      ...(options.headers || {})
    }
    if (token) {
      header['Authorization'] = 'Bearer ' + token
    }
    if (options.header) {
      Object.assign(header, options.header)
    }

    uni.request({
      url: baseUrl + options.url,
      method: options.method || 'GET',
      data: options.data,
      header,
      success: (res) => {
        const { statusCode, data } = res
        if (statusCode === 200) {
          if (data.code === 200) {
            resolve(data)
          } else if (data.code === 401) {
            removeToken()
            uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
            setTimeout(() => {
              uni.reLaunch({ url: '/pages/login/index' })
            }, 1000)
            reject(new Error(data.msg || '未授权'))
          } else {
            uni.showToast({ title: data.msg || '请求失败', icon: 'none' })
            reject(new Error(data.msg || '请求失败'))
          }
        } else {
          uni.showToast({ title: `请求错误(${statusCode})`, icon: 'none' })
          reject(new Error(`HTTP ${statusCode}`))
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络连接失败', icon: 'none' })
        reject(err)
      }
    })
  })
}

export function getRequest(url, params = {}) {
  return request({ url, method: 'GET', data: params })
}

export function postRequest(url, data = {}) {
  return request({ url, method: 'POST', data })
}

export function putRequest(url, data = {}) {
  return request({ url, method: 'PUT', data })
}

export function delRequest(url, data = {}) {
  return request({ url, method: 'DELETE', data })
}

export default request
