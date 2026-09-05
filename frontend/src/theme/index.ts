import { theme } from 'antd';
import type { ThemeConfig } from 'antd';

const { defaultAlgorithm, darkAlgorithm } = theme;

/** Ant Design token overrides cho light mode */
const lightTokens: ThemeConfig['token'] = {
  colorPrimary: '#1677ff',
  borderRadius: 8,
  fontFamily: '\'Be Vietnam Pro\', -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif',
};

/** Ant Design token overrides cho dark mode */
const darkTokens: ThemeConfig['token'] = {
  ...lightTokens,
  colorBgBase: '#141414',
};

export function getThemeConfig(isDark: boolean): ThemeConfig {
  return {
    algorithm: isDark ? darkAlgorithm : defaultAlgorithm,
    token: isDark ? darkTokens : lightTokens,
    components: {
      Layout: {
        siderBg: isDark ? '#1f1f1f' : '#001529',
        triggerBg: isDark ? '#2a2a2a' : '#002140',
      },
      Menu: {
        darkItemBg: isDark ? '#1f1f1f' : '#001529',
      },
    },
  };
}
