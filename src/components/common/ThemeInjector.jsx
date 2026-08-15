import { useEffect } from 'react';
import { useSettings } from '../../store/useSettings';

/**
 * Mapping from settings key → CSS variable name(s) the value should override.
 * Multiple CSS vars = use the theme value for all of them (they were different
 * fixed tones before; now they all follow the theme setting).
 */
const THEME_VAR_MAP = {
  themePrimaryColor:      ['--primary', '--charcoal', '--on-primary-fixed', '--charcoal-light', '--gold', '--gold-hover'],
  themeSecondaryColor:    ['--secondary', '--muted', '--text-muted', '--outline', '--gold-dark', '--gray-dark'],
  themeAccentColor:       ['--on-surface-variant', '--muted-light', '--surface-tint', '--on-primary-fixed-variant', '--on-secondary-fixed-variant', '--on-tertiary-fixed-variant'],
  themeSurfaceColor:      ['--surface', '--surface-bright', '--surface-container-lowest', '--surface-container-low', '--surface-grey', '--off-white', '--cream', '--gold-light'],
  themeTextColor:         ['--text-main', '--on-surface', '--on-background', '--charcoal'],
  themeBorderColor:       ['--border', '--outline-variant', '--surface-variant', '--surface-container', '--surface-container-high', '--surface-container-highest', '--secondary-container', '--secondary-fixed-dim'],
  themeSuccessColor:      ['--success'],
  themeDangerColor:       ['--danger', '--error'],
  themeWarningColor:      ['--warning'],
  themeInfoColor:         ['--info'],
  themeFontDisplay:       ['--font-display', '--font-label'],
  themeFontBody:          ['--font-body'],
  themeFontHeadline:      ['--font-headline'],
  themeContainerMaxWidth: ['--container-max', '--max-width'],
  themeSectionGap:        ['--stack-lg'],
  themeBorderRadius:      ['--radius-sm', '--radius-md'],
  themeCardBorderRadius:  ['--radius-lg', '--radius-xl'],
};

/**
 * ThemeInjector
 *
 * Reads saved theme_* settings from the global settings context and
 * injects :root CSS custom properties so the storefront renders with
 * the admin-chosen theme (colors, fonts, layout, radius).
 *
 * Renders nothing — it is a pure side-effect component.
 */
export default function ThemeInjector() {
  const { settings } = useSettings();
  useEffect(() => {
    const styleId = 'theme-injector-vars';

    // Build CSS variable declarations from non-empty theme settings
    const declarations = [];
    for (const [settingKey, cssVars] of Object.entries(THEME_VAR_MAP)) {
      const value = settings[settingKey];
      if (!value) continue; // skip unset settings — let tokens.css defaults apply
      for (const cssVar of cssVars) {
        declarations.push(`  ${cssVar}: ${value};`);
      }
    }

    // If no theme settings are saved, clean up and bail
    if (declarations.length === 0) {
      document.getElementById(styleId)?.remove();
      return;
    }

    const css = `/* ThemeInjector — admin-chosen theme */\n:root {\n${declarations.join('\n')}\n}\n`;

    // Reuse / create a single <style> element
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
    return () => {
      styleEl.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- settings fields are enumerated below
  }, [
    settings.themePrimaryColor,
    settings.themeSecondaryColor,
    settings.themeAccentColor,
    settings.themeSurfaceColor,
    settings.themeTextColor,
    settings.themeBorderColor,
    settings.themeSuccessColor,
    settings.themeDangerColor,
    settings.themeWarningColor,
    settings.themeInfoColor,
    settings.themeFontDisplay,
    settings.themeFontBody,
    settings.themeFontHeadline,
    settings.themeContainerMaxWidth,
    settings.themeSectionGap,
    settings.themeBorderRadius,
    settings.themeCardBorderRadius,
  ]);

  return null; // This component does not render anything
}
