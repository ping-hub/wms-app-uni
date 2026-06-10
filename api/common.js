import { getRequest } from '@/utils/request'

export function getDictData(dictType) { return getRequest('/system/dict/data/type/' + dictType) }
