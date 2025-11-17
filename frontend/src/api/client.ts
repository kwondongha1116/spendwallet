import axios from 'axios'

// 백엔드 베이스 URL: .env 에서 VITE_API_BASE_URL 로 관리
// 예: VITE_API_BASE_URL=http://localhost:8000
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
})

