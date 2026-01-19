import type { RenderContext } from '../types/RenderContext';
import type { Settings } from '../types/Settings';
import type {
    CustomKeybind,
    Widget,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';
import { getContextConfig } from '../utils/model-context';

type DisplayMode = 'text' | 'progress' | 'progress-short';

export class ContextPercentageUsableWidget implements Widget {
    getDefaultColor(): string { return 'green'; }
    getDescription(): string { return 'Shows percentage of usable context window used or remaining (80% of max before auto-compact)'; }
    getDisplayName(): string { return 'Context % (usable)'; }
    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        const isInverse = item.metadata?.inverse === 'true';
        const displayMode = (item.metadata?.display ?? 'text') as DisplayMode;
        const modifiers: string[] = [];

        if (isInverse) {
            modifiers.push('remaining');
        }
        if (displayMode === 'progress') {
            modifiers.push('progress bar');
        } else if (displayMode === 'progress-short') {
            modifiers.push('short bar');
        }

        return {
            displayText: this.getDisplayName(),
            modifierText: modifiers.length > 0 ? `(${modifiers.join(', ')})` : undefined
        };
    }

    handleEditorAction(action: string, item: WidgetItem): WidgetItem | null {
        if (action === 'toggle-inverse') {
            const currentState = item.metadata?.inverse === 'true';
            return {
                ...item,
                metadata: {
                    ...item.metadata,
                    inverse: (!currentState).toString()
                }
            };
        }
        if (action === 'toggle-progress') {
            const currentMode = (item.metadata?.display ?? 'text') as DisplayMode;
            let nextMode: DisplayMode;

            if (currentMode === 'text') {
                nextMode = 'progress';
            } else if (currentMode === 'progress') {
                nextMode = 'progress-short';
            } else {
                nextMode = 'text';
            }

            return {
                ...item,
                metadata: {
                    ...item.metadata,
                    display: nextMode
                }
            };
        }
        return null;
    }

    private renderProgressBar(percentage: number, barWidth: number): string {
        const progress = percentage / 100;
        const filledWidth = Math.floor(progress * barWidth);
        const emptyWidth = barWidth - filledWidth;
        return '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        const isInverse = item.metadata?.inverse === 'true';
        const displayMode = (item.metadata?.display ?? 'text') as DisplayMode;

        if (context.isPreview) {
            const previewPercentage = isInverse ? 88.4 : 11.6;
            const previewValue = `${previewPercentage.toFixed(1)}%`;

            if (displayMode === 'progress') {
                const bar = this.renderProgressBar(previewPercentage, 32);
                return item.rawValue ? `[${bar}] ${previewValue}` : `Ctx(u) [${bar}] ${previewValue}`;
            } else if (displayMode === 'progress-short') {
                const bar = this.renderProgressBar(previewPercentage, 16);
                return item.rawValue ? `[${bar}] ${previewValue}` : `Ctx(u) [${bar}] ${previewValue}`;
            }
            return item.rawValue ? previewValue : `Ctx(u): ${previewValue}`;
        } else if (context.tokenMetrics) {
            const modelId = context.data?.model?.id;
            const contextConfig = getContextConfig(modelId);
            const usedPercentage = Math.min(100, (context.tokenMetrics.contextLength / contextConfig.usableTokens) * 100);
            const displayPercentage = isInverse ? (100 - usedPercentage) : usedPercentage;
            const percentageValue = `${displayPercentage.toFixed(1)}%`;

            if (displayMode === 'progress') {
                const bar = this.renderProgressBar(displayPercentage, 32);
                return item.rawValue ? `[${bar}] ${percentageValue}` : `Ctx(u) [${bar}] ${percentageValue}`;
            } else if (displayMode === 'progress-short') {
                const bar = this.renderProgressBar(displayPercentage, 16);
                return item.rawValue ? `[${bar}] ${percentageValue}` : `Ctx(u) [${bar}] ${percentageValue}`;
            }
            return item.rawValue ? percentageValue : `Ctx(u): ${percentageValue}`;
        }
        return null;
    }

    getCustomKeybinds(): CustomKeybind[] {
        return [
            { key: 'l', label: '(l)eft/remaining', action: 'toggle-inverse' },
            { key: 'p', label: '(p)rogress toggle', action: 'toggle-progress' }
        ];
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}