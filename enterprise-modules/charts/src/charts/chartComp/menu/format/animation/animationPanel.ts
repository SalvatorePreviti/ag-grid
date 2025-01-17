import {
    AgGroupComponentParams,
    Autowired,
    Component,
    PostConstruct
} from "@ag-grid-community/core";
import { ChartTranslationService } from "../../../services/chartTranslationService";
import { FormatPanelOptions } from "../formatPanel";
import { ChartMenuUtils } from "../../chartMenuUtils";

export class AnimationPanel extends Component {

    public static TEMPLATE = /* html */
        `<div>
            <ag-group-component ref="animationGroup">
                <ag-input-number-field ref="animationHeightInput"></ag-input>
            </ag-group-component>
        </div>`;

    @Autowired('chartTranslationService') private readonly chartTranslationService: ChartTranslationService;

    private readonly chartMenuUtils: ChartMenuUtils;
    private readonly isExpandedOnInit: boolean;

    constructor({ chartOptionsService, isExpandedOnInit = false }: FormatPanelOptions) {
        super();

        this.chartMenuUtils = chartOptionsService.getChartOptionMenuUtils();
        this.isExpandedOnInit = isExpandedOnInit;
    }

    @PostConstruct
    private init() {
        const animationGroupParams = this.chartMenuUtils.addEnableParams<AgGroupComponentParams>(
            'animation.enabled',
            {
                cssIdentifier: 'charts-format-top-level',
                direction: 'vertical',
                title: this.chartTranslationService.translate("animation"),
                suppressEnabledCheckbox: false,
                suppressToggleExpandOnEnableChange: true,
                expanded: this.isExpandedOnInit
            }
        );
        const animationHeightInputParams = this.chartMenuUtils.getDefaultNumberInputParams("animation.duration", "durationMillis", {
            min: 0,
        });
        this.setTemplate(AnimationPanel.TEMPLATE, {
            animationGroup: animationGroupParams,
            animationHeightInput: animationHeightInputParams
        });
    }
}

