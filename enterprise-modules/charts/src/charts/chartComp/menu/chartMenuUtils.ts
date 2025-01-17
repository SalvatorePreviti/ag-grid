import { AgFieldParams, AgCheckboxParams, AgInputNumberFieldParams, AgSelectParams, AgSliderParams, Autowired, BeanStub } from "@ag-grid-community/core";
import { AgColorPickerParams } from "../../../widgets/agColorPicker";
import { ChartOptionsService } from "../services/chartOptionsService";
import { ChartTranslationKey, ChartTranslationService } from "../services/chartTranslationService";
import { FontPanelParams } from "./format/fontPanel";

interface ChartOptionsProxy {
    getValue<T = string>(expression: string, calculated?: boolean): T;
    setValue<T = string>(expression: string, value: T): void;
}

export class ChartMenuUtils extends BeanStub {
    @Autowired('chartTranslationService') private readonly chartTranslationService: ChartTranslationService;

    constructor(
        private readonly chartOptionsProxy: ChartOptionsProxy,
        private readonly chartOptionsService: ChartOptionsService
    ) {
        super();
    }

    public getDefaultColorPickerParams(
        expression: string,
        labelKey?: ChartTranslationKey
    ): AgColorPickerParams {
        return this.addValueParams(
            expression,
            {
                label: this.chartTranslationService.translate(labelKey ?? 'color'),
                labelWidth: 'flex',
                inputWidth: 'flex',
            }
        );
    }

    public getDefaultNumberInputParams(
        expression: string,
        labelKey: ChartTranslationKey,
        options?: {
            precision?: number,
            step?: number,
            min?: number,
            max?: number,
        }
    ): AgInputNumberFieldParams {
        return this.addValueParams<AgInputNumberFieldParams>(
            expression,
            {
                label: this.chartTranslationService.translate(labelKey),
                labelWidth: 'flex',
                inputWidth: 'flex',
                precision: options?.precision,
                step: options?.step,
                min: options?.min,
                max: options?.max,
            },
            {
                parseInputValue: value => {
                    const numberValue = Number(value);
                    return isNaN(numberValue) ? undefined : numberValue;
                },
                formatInputValue: value => {
                    return value == null ? '' : `${value}`;
                },
            }
        );
    }

    public getDefaultSliderParams(
        expression: string,
        labelKey: ChartTranslationKey,
        defaultMaxValue: number,
        isArray?: boolean
    ): AgSliderParams {
        let value = this.chartOptionsProxy.getValue<number>(expression) ?? 0;
        if (isArray && Array.isArray(value)) {
            value = value[0];
        }
        const params = this.getDefaultSliderParamsWithoutValueParams(value, labelKey, defaultMaxValue);
        params.onValueChange = value => this.chartOptionsProxy.setValue(expression, isArray ? [value] : value);
        return params;
    }

    public getDefaultSliderParamsWithoutValueParams(
        value: number,
        labelKey: ChartTranslationKey,
        defaultMaxValue: number
    ): AgSliderParams {
        return {
            label: this.chartTranslationService.translate(labelKey),
            minValue: 0,
            maxValue: Math.max(value, defaultMaxValue),
            textFieldWidth: 45,
            value: `${value}`
        };
    }

    public getDefaultCheckboxParams(
        expression: string,
        labelKey: ChartTranslationKey,
        options?: {
            readOnly?: boolean,
            passive?: boolean,
        },
    ): AgCheckboxParams {
        const value = this.chartOptionsProxy.getValue<boolean>(expression);
        const params: AgCheckboxParams = {
            label: this.chartTranslationService.translate(labelKey),
            value,
            readOnly: options?.readOnly,
            passive: options?.passive,
        };
        params.onValueChange = (value) => {
            this.chartOptionsProxy.setValue(expression, typeof value === 'boolean' ? value : undefined);
        };
        return params;
    }

    public getDefaultLegendParams(expression: string): AgSelectParams {
        return this.addValueParams(
            expression,
            {
                label: this.chartTranslationService.translate('position'),
                labelWidth: "flex",
                inputWidth: 'flex',
                options: ['top', 'right', 'bottom', 'left'].map((position: ChartTranslationKey) => ({
                    value: position,
                    text: this.chartTranslationService.translate(position)
                })),
            }
        );
    }

    public getDefaultFontPanelParams(
        expression: string,
        labelKey: ChartTranslationKey
    ): FontPanelParams {
        const keyMapper = (key: string) => `${expression}.${key}`;
        return this.addEnableParams<FontPanelParams>(
            keyMapper('enabled'),
            {
                name: this.chartTranslationService.translate(labelKey),
                suppressEnabledCheckbox: false,
                chartMenuUtils: this,
                keyMapper
            } as any
        );
    }

    public addValueParams<P extends AgFieldParams>(expression: string, params: P, options?: {
        parseInputValue: (value: any) => any;
        formatInputValue: (value: any) => any;
    }): P {
        const optionsValue = this.chartOptionsProxy.getValue(expression);
        params.value = options?.formatInputValue ? options.formatInputValue(optionsValue) : optionsValue;
        params.onValueChange = value => {
            const optionsValue = options?.parseInputValue ? options.parseInputValue(value) : value;
            this.chartOptionsProxy.setValue(expression, optionsValue);
        };
        return params;
    }

    public addEnableParams<P extends {
        enabled?: boolean;
        onEnableChange?: (value: boolean) => void;
    }>(expression: string, params: P): P {
        params.enabled =  this.chartOptionsProxy.getValue(expression) ?? false;
        params.onEnableChange = value => this.chartOptionsProxy.setValue(expression, value);
        return params;
    }

    public getValue<T = string>(expression: string, calculated?: boolean): T {
        return this.chartOptionsProxy.getValue(expression, calculated);
    }

    public setValue<T = string>(expression: string, value: T): void {
        this.chartOptionsProxy.setValue(expression, value);
    }

    public getChartOptionsService(): ChartOptionsService {
        return this.chartOptionsService;
    }
}