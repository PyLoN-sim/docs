import type { DefaultTheme } from 'vitepress'

export const ja: DefaultTheme.Config = {
  siteTitle: 'PyLoN Docs',
  langMenuLabel: '言語を切り替える',
  socialLinks: [{ icon: 'github', link: 'https://github.com/PyLoN-sim/PyLoN', ariaLabel: 'PyLoN本体のGitHubリポジトリ' }],
  editLink: { pattern: 'https://github.com/PyLoN-sim/docs/edit/main/:path', text: 'GitHubで編集' },
  nav: [
    { text: '導入ガイド', link: '/guide/getting-started' },
    { text: 'デモ', link: '/demos/' },
    { text: 'APIリファレンス', link: '/api/topics' },
    { text: '設定・運用', link: '/reference/bridge-options' },
    { text: '本体への貢献', link: '/contributing/' }
  ],
  sidebar: [
    {
      text: '導入・アプリケーション開発',
      items: [
        { text: 'Getting Started', link: '/guide/getting-started' },
        { text: 'Dockerの構成・運用', link: '/guide/docker' },
        { text: 'Space ROSで動かす', link: '/guide/space-ros' },
        { text: '最小受信確認用機体', link: '/guide/minimal-receiver' },
        { text: 'システム概要', link: '/guide/overview' },
        { text: 'ROS2アプリケーションを作る', link: '/guide/application-development' },
      ]
    },
    {
      text: 'デモ',
      items: [
        { text: 'デモ一覧・共通準備', link: '/demos/' },
        { text: '衛星分離・逆噴射着陸', link: '/demos/reusable-launch' },
        { text: '軌道上のデブリ周回・撮影', link: '/demos/debris-orbit' },
        { text: '2D LiDARとSLAM', link: '/demos/lidar-slam' },
        { text: '月面Nav2', link: '/demos/mun-nav2' }
      ]
    },
    {
      text: 'APIリファレンス',
      items: [
        { text: 'Topic一覧', link: '/api/topics' },
        { text: 'メッセージ・サービス型', link: '/api/interfaces/' },
        { text: '機体制御とGround Truth', link: '/api/vehicle-control' },
        { text: 'Active vesselモデル', link: '/api/vessel-model' },
        { text: '配置ファイルから機体を組み立てる', link: '/api/craft-builder' }
      ]
    },
    {
      text: 'パーツ別API',
      items: [
        { text: '2D / 3D LiDAR', link: '/parts/lidar' },
        { text: 'RGBカメラ', link: '/parts/camera' },
        { text: 'スタートラッカー', link: '/parts/star-tracker' },
        { text: 'サーボ / リニアモーター', link: '/parts/motors' },
        { text: 'KSP標準ホイール', link: '/parts/wheels' },
        { text: 'エンジン / RCS', link: '/parts/propulsion' },
        { text: 'デカプラー / フェアリング', link: '/parts/separation' },
        { text: 'ドッキングポート', link: '/parts/docking' }
      ]
    },
    {
      text: '設定・運用',
      items: [
        { text: 'Bridge起動オプション', link: '/reference/bridge-options' },
        { text: 'パーツ設定', link: '/reference/part-config' },
        { text: 'トラブルシュート', link: '/reference/troubleshooting' }
      ]
    },
    {
      text: 'PyLoN本体への貢献',
      items: [
        { text: '開発・変更の手順', link: '/contributing/' },
        { text: 'アーキテクチャ', link: '/contributing/architecture' },
        { text: '設計と検証の観点', link: '/contributing/design' },
        { text: 'ソース案内', link: '/contributing/source-map' }
      ]
    }
  ],
  outline: { level: [2, 3], label: 'このページ' },
  lastUpdated: { text: '最終更新' },
  docFooter: { prev: '前へ', next: '次へ' },
  returnToTopLabel: 'ページ上部へ',
  sidebarMenuLabel: 'メニュー',
  darkModeSwitchLabel: 'テーマ',
  lightModeSwitchTitle: 'ライトテーマへ',
  darkModeSwitchTitle: 'ダークテーマへ',
  footer: {
    message: 'PyLoNを使ったROS2アプリケーション開発のためのガイドとAPIリファレンス',
    copyright: 'PyLoN'
  }
}
