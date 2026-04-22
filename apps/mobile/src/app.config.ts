export default defineAppConfig({
  pages: [
    // 数组首项即冷启动首页；未登录会在 hydrate 后由各页面自行 reLaunch 到 login。
    'pages/index/index',
    'pages/me/index',
    'pages/login/index',
    'pages/moments/publish/index',
    'pages/me/change-password/index',
    'pages/me/edit-profile/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fdf2f8',
    navigationBarTitleText: 'momoya',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    color: '#d1a7b8',
    selectedColor: '#ec4899',
    backgroundColor: '#fff1f5',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/index/index', text: '日常' },
      { pagePath: 'pages/me/index', text: '我的' },
    ],
  },
})
