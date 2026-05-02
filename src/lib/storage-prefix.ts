const date = new Date()
const year = date.getFullYear()
const month = String(date.getMonth() + 1).padStart(2, '0')

export const STORAGE_PREFIX = `uploads/${year}/${month}`
