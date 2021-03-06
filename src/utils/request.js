import axios from 'axios'
import { MessageBox, Message } from 'element-ui'
import store from '@/store'
import { getToken } from '@/utils/auth'
import { fileDownload } from '@/utils'

// create an axios instance
const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API, // url = base url + request url
  // withCredentials: true, // send cookies when cross-domain requests
  timeout: 8000 // request timeout
})

// request interceptor
service.interceptors.request.use(
  config => {
    if (store.getters.token) {
      // 让每个请求携带token
      config.headers['Authorization'] = getToken()
    }
    return config
  },
  error => {
    // do something with request error
    console.log('request error', error) // for debug
    return Promise.reject(error)
  }
)

// response interceptor
service.interceptors.response.use(
  response => {
    let res = response.data

    if (typeof res === 'string') {
      // https://www.cnblogs.com/lishuaiqi/p/14170152.html
      // eslint-disable-next-line no-eval
      res = eval('(' + res + ')')
    }

    if (Object.prototype.toString.call(res).includes('Blob')) { // 文件下载
      if (res.type && res.type === 'application/json') {
        const reader = new FileReader()
        reader.onload = e => {
          res = JSON.parse(e.target.result)
          Message({
            message: res.message || 'Error',
            type: 'error',
            duration: 5 * 1000
          })
        }
        reader.readAsText(res, 'UTF-8')

        return Promise.reject(new Error('文件下载错误'))
      } else {
        // 如果是下载
        fileDownload(response)
        return res
      }
    } else {
      if (res.code !== 20000) {
        Message({
          message: res.message || 'Error',
          type: 'error',
          duration: 5 * 1000
        })

        if (res.code === 40000 && !store.getters.isRefresh) {
          // to re-login
          MessageBox.confirm('登录已过期，你可以停留在当前页面，或者重新登录', '确认登录', {
            confirmButtonText: '重新登录',
            cancelButtonText: '返回',
            type: 'warning'
          }).then(() => {
            store.dispatch('user/resetToken').then(() => {
              location.reload()
            })
          })
        }

        // 如果浏览器开启异常自动断点处理，并且抛出reject()后没有catch()或then()，将自动进入断点
        // https://stackoverflow.com/questions/12833514/paused-in-debugger-in-chrome
        return Promise.reject(new Error(res.message || 'Error'))
      } else {
        return res
      }
    }
  },
  error => {
    // 请求相应错误
    console.log('response error', error) // for debug
    Message({
      message: error.message,
      type: 'error',
      duration: 5 * 1000
    })
    return Promise.reject(error)
  }
)

export default service
