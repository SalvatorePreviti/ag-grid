import {
    _,
    AgGroupComponent,
    AgGroupComponentParams,
    AgSlider,
    AgToggleButton,
    Autowired,
    Component,
    PostConstruct,
    RefSelector
} from "@ag-grid-community/core";
import { MarkersPanel } from "./markersPanel";
import { ChartTranslator } from "../../../chartTranslator";
import { ChartOptionsService } from "../../chartOptionsService";
import { initFontPanelParams } from "../widgetInitialiser";
import { FontPanel, FontPanelParams } from "../fontPanel";

export class LineSeriesPanel extends Component {

    public static TEMPLATE = /* html */
        `<div>
            <ag-group-component ref="seriesGroup">
                <ag-toggle-button ref="seriesTooltipsToggle"></ag-toggle-button>
                <ag-slider ref="seriesLineWidthSlider"></ag-slider>
                <ag-slider ref="seriesLineDashSlider"></ag-slider>
            </ag-group-component>
        </div>`;

    @RefSelector('seriesGroup') private seriesGroup: AgGroupComponent;
    @RefSelector('seriesTooltipsToggle') private seriesTooltipsToggle: AgToggleButton;
    @RefSelector('seriesLineWidthSlider') private seriesLineWidthSlider: AgSlider;
    @RefSelector('seriesLineDashSlider') private seriesLineDashSlider: AgSlider;

    @Autowired('chartTranslator') private chartTranslator: ChartTranslator;

    private activePanels: Component[] = [];

    constructor(private readonly chartOptionsService: ChartOptionsService) {
        super();
    }

    @PostConstruct
    private init() {
        const groupParams: AgGroupComponentParams = {
            cssIdentifier: 'charts-format-top-level',
            direction: 'vertical'
        };
        this.setTemplate(LineSeriesPanel.TEMPLATE, {seriesGroup: groupParams});

        this.initSeriesGroup();
        this.initSeriesTooltips();
        this.initSeriesLineWidth();
        this.initSeriesLineDash();
        this.initMarkersPanel();
        this.initLabelPanel();
    }

    private initSeriesGroup() {
        this.seriesGroup
            .setTitle(this.chartTranslator.translate("series"))
            .toggleGroupExpand(false)
            .hideEnabledCheckbox(true);
    }

    private initSeriesTooltips() {
        this.seriesTooltipsToggle
            .setLabel(this.chartTranslator.translate("tooltips"))
            .setLabelAlignment("left")
            .setLabelWidth("flex")
            .setInputWidth(45)
            .setValue(this.chartOptionsService.getSeriesOption("tooltip.enabled") || false)
            .onValueChange(newValue => this.chartOptionsService.setSeriesOption("tooltip.enabled", newValue));
    }

    private initSeriesLineWidth() {
        this.seriesLineWidthSlider
            .setLabel(this.chartTranslator.translate('lineWidth'))
            .setMaxValue(10)
            .setTextFieldWidth(45)
            .setValue(this.chartOptionsService.getSeriesOption("stroke.width"))
            .onValueChange(newValue => this.chartOptionsService.setSeriesOption("stroke.width", newValue));
    }

    private initSeriesLineDash() {
        this.seriesLineDashSlider
            .setLabel(this.chartTranslator.translate('lineDash'))
            .setMaxValue(30)
            .setTextFieldWidth(45)
            .setValue(this.chartOptionsService.getSeriesOption("lineDash"))
            .onValueChange(newValue => this.chartOptionsService.setSeriesOption("lineDash", [newValue]));
    }

    private initMarkersPanel() {
        const markersPanelComp = this.createBean(new MarkersPanel(this.chartOptionsService));
        this.seriesGroup.addItem(markersPanelComp);
        this.activePanels.push(markersPanelComp);
    }

    private initLabelPanel() {
        const params: FontPanelParams = initFontPanelParams(this.chartTranslator, this.chartOptionsService);
        const labelPanelComp = this.createBean(new FontPanel(params));
        this.activePanels.push(labelPanelComp);
        this.seriesGroup.addItem(labelPanelComp);
    }

    private destroyActivePanels(): void {
        this.activePanels.forEach(panel => {
            _.removeFromParent(panel.getGui());
            this.destroyBean(panel);
        });
    }

    protected destroy(): void {
        this.destroyActivePanels();
        super.destroy();
    }
}
