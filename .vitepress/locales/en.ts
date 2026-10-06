import type { DefaultTheme } from 'vitepress'

export const en: DefaultTheme.Config = {
  siteTitle: 'PyLoN Docs',
  langMenuLabel: 'Change language',
  socialLinks: [{ icon: 'github', link: 'https://github.com/PyLoN-sim/PyLoN', ariaLabel: 'PyLoN core GitHub repository' }],
  editLink: { pattern: 'https://github.com/PyLoN-sim/docs/edit/main/:path', text: 'Edit on GitHub' },
  nav: [
    { text: 'Guide', link: '/en/guide/getting-started' },
    { text: 'Demos', link: '/en/demos/' },
    { text: 'API Reference', link: '/en/api/topics' },
    { text: 'Configuration', link: '/en/reference/bridge-options' },
    { text: 'Contributing', link: '/en/contributing/' }
  ],
  sidebar: [
    {
      text: 'Setup and Application Development',
      items: [
        { text: 'Getting Started', link: '/en/guide/getting-started' },
        { text: 'Docker Setup and Operation', link: '/en/guide/docker' },
        { text: 'Running with Space ROS', link: '/en/guide/space-ros' },
        { text: 'Minimal Receiver Vessel', link: '/en/guide/minimal-receiver' },
        { text: 'System Overview', link: '/en/guide/overview' },
        { text: 'Building ROS2 Applications', link: '/en/guide/application-development' },
      ]
    },
    {
      text: 'Demos',
      items: [
        { text: 'Demo Index and Preparation', link: '/en/demos/' },
        { text: 'Satellite Separation and Landing', link: '/en/demos/reusable-launch' },
        { text: 'Debris Orbit and Imaging', link: '/en/demos/debris-orbit' },
        { text: '2D LiDAR and SLAM', link: '/en/demos/lidar-slam' },
        { text: 'Mun Nav2', link: '/en/demos/mun-nav2' }
      ]
    },
    {
      text: 'API Reference',
      items: [
        { text: 'Topic Reference', link: '/en/api/topics' },
        { text: 'Message and Service Types', link: '/en/api/interfaces/' },
        { text: 'Vehicle Control and Ground Truth', link: '/en/api/vehicle-control' },
        { text: 'Active Vessel Model', link: '/en/api/vessel-model' },
        { text: 'Building Vessels from Layout Files', link: '/en/api/craft-builder' }
      ]
    },
    {
      text: 'Part APIs',
      items: [
        { text: '2D / 3D LiDAR', link: '/en/parts/lidar' },
        { text: 'RGB Camera', link: '/en/parts/camera' },
        { text: 'Star Tracker', link: '/en/parts/star-tracker' },
        { text: 'Servos and Linear Motors', link: '/en/parts/motors' },
        { text: 'Stock KSP Wheels', link: '/en/parts/wheels' },
        { text: 'Engines and RCS', link: '/en/parts/propulsion' },
        { text: 'Decouplers and Fairings', link: '/en/parts/separation' },
        { text: 'Docking Ports', link: '/en/parts/docking' }
      ]
    },
    {
      text: 'Configuration',
      items: [
        { text: 'Bridge Options', link: '/en/reference/bridge-options' },
        { text: 'Part Configuration', link: '/en/reference/part-config' },
        { text: 'Troubleshooting', link: '/en/reference/troubleshooting' }
      ]
    },
    {
      text: 'Contributing to PyLoN Core',
      items: [
        { text: 'Development Workflow', link: '/en/contributing/' },
        { text: 'Architecture', link: '/en/contributing/architecture' },
        { text: 'Design and Validation', link: '/en/contributing/design' },
        { text: 'Source Map', link: '/en/contributing/source-map' }
      ]
    }
  ],
  outline: { level: [2, 3], label: 'On this page' },
  lastUpdated: { text: 'Last updated' },
  docFooter: { prev: 'Previous page', next: 'Next page' },
  returnToTopLabel: 'Return to top',
  sidebarMenuLabel: 'Menu',
  darkModeSwitchLabel: 'Appearance',
  lightModeSwitchTitle: 'Switch to light theme',
  darkModeSwitchTitle: 'Switch to dark theme',
  footer: {
    message: 'Guides and API references for building ROS2 applications with PyLoN',
    copyright: 'PyLoN'
  }
}
