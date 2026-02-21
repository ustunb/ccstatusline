import type { RenderContext } from '../types/RenderContext';
import type { Settings } from '../types/Settings';
import type {
    Widget,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';
import { formatTokens } from '../utils/renderer';

interface SimpleWidgetConfig {
    name: string;
    description: string;
    label: string;
    previewValue: string;
    defaultColor: string;
    getValue: (ctx: RenderContext) => number | null;
}

export function createSimpleWidget(config: SimpleWidgetConfig): Widget {
    return {
        getDefaultColor(): string { return config.defaultColor; },
        getDescription(): string { return config.description; },
        getDisplayName(): string { return config.name; },
        getEditorDisplay(_item: WidgetItem): WidgetEditorDisplay {
            return { displayText: config.name };
        },

        render(item: WidgetItem, context: RenderContext, _settings: Settings): string | null {
            if (context.isPreview) {
                return item.rawValue ? config.previewValue : `${config.label}${config.previewValue}`;
            }

            const value = config.getValue(context);
            if (value === null) {
                return null;
            }

            const formatted = formatTokens(value);
            return item.rawValue ? formatted : `${config.label}${formatted}`;
        },

        supportsRawValue(): boolean { return true; },
        supportsColors(_item: WidgetItem): boolean { return true; }
    };
}