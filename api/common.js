import { getRequest } from '@/utils/request'

export function getDictData(dictType) { return getRequest('/system/dict/data/type/' + dictType) }
// 获取用户下拉列表
export function getUserSelectList() { return getRequest('/wms/shipmentOrder/userSelectList') }
