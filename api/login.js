import { getRequest, postRequest } from '@/utils/request'

export function login(data) {
  return postRequest('/login', data)
}

export function getInfo() {
  return getRequest('/getInfo')
}

export function logout() {
  return postRequest('/logout')
}

export function getCaptchaImage() {
  return getRequest('/captchaImage')
}
