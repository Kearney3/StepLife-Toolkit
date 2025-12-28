import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
// 导入地图提供商测试工具（开发模式下在控制台可用）
import './utils/testMapProviders'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

const root = createRoot(rootElement)
root.render(
  <StrictMode>
    <App />
  </StrictMode>
)
