import { login, logout, getInfo } from '@/api/adminUser'
import { getToken, setToken, removeToken } from '@/utils/auth'
import router, { resetRouter } from '@/router'
import defaultSettings from '@/settings.js'

const state = {
  token: getToken(),
  hasGetUserInfo: false,
  info: {},
  roles: [],
  permissions: []
}

const mutations = {
  SET_TOKEN: (state, token) => {
    state.token = token
  },
  SET_USER: (state, info) => {
    state.info = info
  },
  SET_ROLES: (state, roles) => {
    state.roles = roles
  },
  SET_USERNAME: (state, username) => {
    state.info.username = username
  },
  SET_PERMISSIONS: (state, permissions) => {
    state.permissions = permissions
  },
  SET_HAS_GET_USERINFO: (state, flag) => {
    state.hasGetUserInfo = flag
  }
}

const actions = {
  // user login
  login({ commit }, userInfo) {
    const { username, password } = userInfo
    return new Promise((resolve, reject) => {
      login({ username: username.trim(), password: password }).then(response => {
        const { data } = response
        commit('SET_TOKEN', data.token)
        setToken(data.token)
        resolve()
      }).catch(error => {
        reject(error)
      })
    })
  },

  // get user info
  getInfo({ commit }) {
    return new Promise((resolve, reject) => {
      getInfo().then(response => {
        const { user, permissionInfo } = response.data
        if (!user.avatar) { // 设置默认头像
          user.avatar = defaultSettings.avatar
        }
        commit('SET_HAS_GET_USERINFO', true)
        commit('SET_USER', user)
        commit('SET_ROLES', permissionInfo.roles)
        commit('SET_PERMISSIONS', permissionInfo.stringPermissions)
        resolve()
      }).catch(error => {
        reject(error)
      })
    })
  },

  // user logout
  logout({ commit, dispatch }) {
    return new Promise((resolve, reject) => {
      logout().then(() => {
        commit('SET_TOKEN', '')
        commit('SET_HAS_GET_USERINFO', false)
        commit('SET_USER', {})
        commit('SET_ROLES', [])
        commit('SET_PERMISSIONS', [])
        removeToken()
        resetRouter()

        // reset visited views and cached views
        // to fixed https://github.com/PanJiaChen/vue-element-admin/issues/2485
        dispatch('tagsView/delAllViews', null, { root: true })

        resolve()
      }).catch(error => {
        reject(error)
      })
    })
  },

  // remove token
  resetToken({ commit }) {
    return new Promise(resolve => {
      commit('SET_TOKEN', '')
      commit('SET_ROLES', [])
      removeToken()
      resolve()
    })
  },

  // update username
  updateUsername({ commit }, username) {
    commit('SET_USERNAME', username)
  },

  // 动态修改权限
  async changeRoles({ dispatch }) {
    await dispatch('getInfo')

    resetRouter()
    const accessRoutes = await dispatch('permission/generateRoutes', null, { root: true })
    router.addRoutes(accessRoutes)

    // 重置访问的视图并且缓存的视图
    dispatch('tagsView/delAllViews', null, { root: true })
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}