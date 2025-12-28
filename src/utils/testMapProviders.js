// 地图提供商测试工具
import { mapProviders } from '../config/mapProviders'

/**
 * 测试单个地图提供商的瓦片服务是否可用
 * @param {Object} provider 地图提供商配置
 * @param {number} timeout 超时时间（毫秒）
 * @returns {Promise<{success: boolean, error?: string, responseTime?: number}>}
 */
export async function testMapProvider(provider, timeout = 5000) {
  // 使用北京的一个测试瓦片坐标（z=10, x=456, y=197）
  const testZ = 10
  const testX = 456
  const testY = 197
  
  // 替换URL中的占位符
  let testUrl = provider.url
    .replace('{z}', testZ)
    .replace('{x}', testX)
    .replace('{y}', testY)
  
  // 如果有子域名，使用第一个
  if (provider.subdomains && provider.subdomains.length > 0) {
    testUrl = testUrl.replace('{s}', provider.subdomains[0])
  } else {
    testUrl = testUrl.replace('{s}', '')
  }
  
  // 处理特殊格式（如百度地图）
  testUrl = testUrl.replace(/\{r\}/g, '')
  
  const startTime = Date.now()
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(testUrl, {
      method: 'HEAD', // 使用HEAD请求，只获取响应头，不下载完整图片
      mode: 'no-cors', // 某些服务可能不允许CORS，使用no-cors
      signal: controller.signal,
      cache: 'no-cache'
    })
    
    clearTimeout(timeoutId)
    const responseTime = Date.now() - startTime
    
    // 对于no-cors模式，无法读取响应状态，但如果没有抛出错误，通常表示请求成功
    return {
      success: true,
      responseTime,
      url: testUrl
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    // 尝试使用图片加载方式测试（适用于CORS限制的情况）
    return new Promise((resolve) => {
      const img = new Image()
      const imgTimeout = setTimeout(() => {
        resolve({
          success: false,
          error: 'Timeout',
          responseTime: timeout,
          url: testUrl
        })
      }, timeout)
      
      img.onload = () => {
        clearTimeout(imgTimeout)
        resolve({
          success: true,
          responseTime: Date.now() - startTime,
          url: testUrl
        })
      }
      
      img.onerror = () => {
        clearTimeout(imgTimeout)
        resolve({
          success: false,
          error: 'Failed to load image',
          responseTime: Date.now() - startTime,
          url: testUrl
        })
      }
      
      // 添加时间戳避免缓存
      img.src = testUrl + (testUrl.includes('?') ? '&' : '?') + '_t=' + Date.now()
    })
  }
}

/**
 * 测试所有地图提供商
 * @param {Function} onProgress 进度回调函数 (provider, result) => void
 * @returns {Promise<Array>} 测试结果数组
 */
export async function testAllMapProviders(onProgress) {
  const results = []
  
  for (const provider of mapProviders) {
    if (onProgress) {
      onProgress(provider, null) // 开始测试
    }
    
    const result = await testMapProvider(provider)
    const testResult = {
      provider: {
        id: provider.id,
        name: provider.name,
        coordinateSystem: provider.coordinateSystem
      },
      ...result
    }
    
    results.push(testResult)
    
    if (onProgress) {
      onProgress(provider, testResult) // 测试完成
    }
    
    // 添加延迟，避免请求过快
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  return results
}

/**
 * 在控制台输出测试结果
 */
export async function testAndLog() {
  console.log('🗺️ 开始测试地图提供商服务...\n')
  
  const results = await testAllMapProviders((provider, result) => {
    if (result) {
      const status = result.success ? '✅' : '❌'
      const time = result.responseTime ? `${result.responseTime}ms` : 'N/A'
      console.log(`${status} ${provider.name} (${time})`)
    } else {
      console.log(`⏳ 正在测试 ${provider.name}...`)
    }
  })
  
  console.log('\n📊 测试结果汇总:')
  console.log('='.repeat(50))
  
  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length
  
  console.log(`✅ 可用: ${successCount}/${results.length}`)
  console.log(`❌ 不可用: ${failCount}/${results.length}`)
  console.log('\n详细结果:')
  console.table(results.map(r => ({
    地图: r.provider.name,
    状态: r.success ? '✅ 可用' : '❌ 不可用',
    响应时间: r.responseTime ? `${r.responseTime}ms` : 'N/A',
    错误: r.error || '-',
    坐标系: r.provider.coordinateSystem
  })))
  
  return results
}

// 如果在浏览器环境中，将函数挂载到window对象，方便在控制台调用
if (typeof window !== 'undefined') {
  window.testMapProviders = testAndLog
  window.testMapProvider = testMapProvider
  console.log('💡 提示: 在控制台输入 testMapProviders() 来测试所有地图提供商')
}

