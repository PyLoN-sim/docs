import { defineConfig } from 'vitepress'
import { ja } from './locales/ja'
import { en } from './locales/en'

const ogImage = 'https://raw.githubusercontent.com/PyLoN-sim/PyLoN/main/Assets/OGP.png'

export default defineConfig({
  srcExclude: ['README.md'],
  lang: 'ja-JP',
  title: 'PyLoN Docs',
  description: 'PyLoN KSP mod と ROS2 bridge の起動・Topic・パーツ設定リファレンス',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'theme-color', content: '#003dff' }],
    ['meta', { property: 'og:title', content: 'PyLoN Docs' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:image', content: ogImage }],
    ['meta', { property: 'og:image:type', content: 'image/png' }],
    ['meta', { property: 'og:image:width', content: '2400' }],
    ['meta', { property: 'og:image:height', content: '1260' }],
    ['meta', { property: 'og:image:alt', content: 'PyLoN' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: ogImage }],
    ['meta', { name: 'twitter:image:alt', content: 'PyLoN' }]
  ],
  markdown: {
    lineNumbers: true
  },
  locales: {
    root: {
      label: '日本語',
      lang: 'ja-JP',
      description: 'PyLoN KSP mod と ROS2 bridge の起動・Topic・パーツ設定リファレンス',
      head: [['meta', { property: 'og:description', content: 'KSP 1.x と ROS2 をつなぐセンサー・ロボティクスAPIドキュメント' }]],
      themeConfig: ja
    },
    en: {
      label: 'English',
      lang: 'en-US',
      description: 'Setup guides, topics, and part configuration for the PyLoN KSP mod and ROS2 bridge',
      head: [['meta', { property: 'og:description', content: 'Sensor and robotics API documentation connecting KSP 1.x with ROS2' }]],
      themeConfig: en
    }
  },
  themeConfig: {
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: '検索', buttonAriaLabel: 'ドキュメントを検索' },
              modal: {
                displayDetails: '詳細を表示',
                noResultsText: '該当する結果がありません',
                resetButtonTitle: '検索をリセット',
                backButtonTitle: '検索を閉じる',
                footer: { selectText: '選択', navigateText: '移動', closeText: '閉じる' }
              }
            }
          }
        }
      }
    }
  }
})
