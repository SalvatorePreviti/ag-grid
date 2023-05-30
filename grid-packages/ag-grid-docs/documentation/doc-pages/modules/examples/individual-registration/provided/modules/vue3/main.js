import { createApp } from 'vue';
import { AgGridVue } from '@ag-grid-community/vue3';

import '@ag-grid-community/styles/ag-grid.css';
import '@ag-grid-community/styles/ag-theme-alpine.css';

import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ClipboardModule } from '@ag-grid-enterprise/clipboard';
import { SetFilterModule } from '@ag-grid-enterprise/set-filter';
import { MenuModule } from '@ag-grid-enterprise/menu';
import { ExcelExportModule } from '@ag-grid-enterprise/excel-export';
import { GridChartsModule } from '@ag-grid-enterprise/charts';

import { ModuleRegistry } from '@ag-grid-community/core';

// Register shared Modules globally
ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    MenuModule,
    GridChartsModule,
]);


let rowIdSequence = 100;
const createRowBlock = () => ['Red', 'Green', 'Blue'].map((color) =>
({
    id: rowIdSequence++,
    color: color,
    value1: Math.floor(Math.random() * 100),
})
);

const VueExample = {
    template: /* html */
        `<div class="example-wrapper ag-theme-alpine">

            <div class="inner-col">
                <div style="height: 100%;" class="inner-col">
                    <ag-grid-vue
                        style="height: 100%;"
                        :defaultColDef="defaultColDef"
                        :rowData="leftRowData"
                        :columnDefs="columns"
                        :modules="leftModules"
                        >
                    </ag-grid-vue>
                </div>
            </div>

            <div class="inner-col">
                <div style="height: 100%;" class="inner-col">
                    <ag-grid-vue
                        style="height: 100%;"
                        :defaultColDef="defaultColDef"
                        :rowData="rightRowData"
                        :columnDefs="columns"
                        :modules="rightModules"
                        >
                    </ag-grid-vue>
                </div>
            </div>
        </div>
    `,
    components: {
        'ag-grid-vue': AgGridVue
    },
    data: function () {
        return {
            leftRowData: [],
            rightRowData: [],
            leftModules: [SetFilterModule, ClipboardModule],
            rightModules: [ExcelExportModule],
            defaultColDef: {
                flex: 1,
                minWidth: 100,
                sortable: true,
                filter: true,
                floatingFilter: true,
                resizable: true
            },
            columns: [
                { field: "id" },
                { field: "color" },
                { field: "value1" }
            ]
        };
    },
    beforeMount() {
        this.leftRowData = createRowBlock();
        this.rightRowData = createRowBlock();
    },
};

createApp(VueExample).mount('#app');
