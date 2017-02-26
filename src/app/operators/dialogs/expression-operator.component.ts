import {
    Component, OnInit, ChangeDetectionStrategy,
} from '@angular/core';

import {
  LetterNumberConverter,
} from './operator.component';

import {LayerService} from '../../../layers/layer.service';
import {RandomColorService} from '../../../services/random-color.service';
import {MappingQueryService} from '../../../queries/mapping-query.service';
import {ProjectService} from '../../../project/project.service';
import {LayoutService, Browser} from '../../layout.service';

import {RasterLayer} from '../../../layers/layer.model';
import {RasterSymbology} from '../../../symbology/symbology.model';

import {Operator} from '../operator.model';
import {ResultTypes} from '../result-type.model';

import {DataType, DataTypes} from '../datatype.model';
import {Unit} from '../unit.model';
import {ExpressionType} from '../types/expression-type.model';
import {FormBuilder, Validators, FormGroup} from '@angular/forms';

/**
 * This component allows creating the expression operator.
 */
@Component({
    selector: 'wave-operator-expression',
    template: `
    <form [ngFormModel]="configForm">
        <wave-multi-layer-selection [layers]="layers" [min]="1" [max]="5"
                                    [types]="[ResultTypes.RASTER]"
                                    (selectedLayers)="onSelectLayers($event)">
        </wave-multi-layer-selection>
        <md-card>
            <md-card-header>
                    <md-card-title>Configuration</md-card-title>
                    <md-card-subtitle>Specify the operator</md-card-subtitle>
            </md-card-header>
            <md-card-content>
                <p>Use A to reference the existing pixel of the first raster,
                B for the second one, etc.</p>
                <input mdInput placeholder="Expression" ngControl="expression">
                <table>
                    <tr>
                        <td>
                            <label>Output Data Type</label>
                            <select
                                ngControl="dataType"
                                [size]="layoutService.getBrowser() === Browser.FIREFOX ? 2 : 1"
                            >
                                <option
                                    *ngFor="let dataType of outputDataTypes"
                                    [ngValue]="dataType[0]"
                                >{{dataType[0]}} {{dataType[1]}}</option>
                            </select>
                        </td>
                        <td>
                            <input mdInput type="number" placeholder="Minimum Value" ngControl="minValue"
                            >
                        </td>
                        <td>
                            <input mdInput type="number" placeholder="Maximum Value" ngControl="maxValue"
                            >
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label>Output Unit</label>
                            <select
                                ngControl="unit"
                                [size]="layoutService.getBrowser() === Browser.FIREFOX ? 2 : 1"
                            >
                                <option
                                    *ngFor="let unit of outputUnits"
                                    [ngValue]="unit"
                                >{{unit}}</option>
                            </select>
                        </td>
                        <td>
                            <wave-reprojetion-selection
                                [layers]="layers"
                                ngControl="projection">
                            </wave-reprojetion-selection>
                        </td>
                    </tr>
                </table>
            </md-card-content>
        </md-card>
        <wave-operator-output-name ngControl="name"></wave-operator-output-name>
    </form>
    `,
    styles: [`
    label {
        display: block;
        font-size: 12px;
        color: rgba(0, 0, 0, 0.38);
    }
    table tr td:nth-child(2) {
        padding: 0 5px;
    }
    `],
    changeDetection: ChangeDetectionStrategy.Default,
})
export class ExpressionOperatorComponent
                                         implements OnInit {
    Browser = Browser; // tslint:disable-line:variable-name

    private configForm: FormGroup;
    private selectedLayers: Array<RasterLayer<RasterSymbology>>;

    private outputDataTypes: Array<[DataType, string]> = DataTypes.ALL_NUMERICS.map(
            (datatype: DataType) => [datatype, '']
        ) as Array<[DataType, string]>;

    private outputUnits: Array<Unit>;

    constructor(
        layerService: LayerService,
        private randomColorService: RandomColorService,
        private mappingQueryService: MappingQueryService,
        private projectService: ProjectService,
        private layoutService: LayoutService,
        private formBuilder: FormBuilder
    ) {
        // super(layerService);
        //
        // const firstRasterLayer = this.layerService.getLayers().filter(
        //     layer => layer.operator.resultType === ResultTypes.RASTER
        // )[0];

        this.configForm = formBuilder.group({
            'expression': ['1 * A', Validators.compose([
                Validators.required,
                Validators.pattern('.*A.*'),
            ])],
            'dataType': [-1, Validators.required],
            'minValue': [0, Validators.compose([
                Validators.required,
            ])],
            'maxValue': [0, Validators.compose([
                Validators.required,
            ])],
            'unit': [-1, Validators.required],
            projection: [
                /*firstRasterLayer ? firstRasterLayer.operator.projection : */undefined,
                Validators.required,
            ],
            'name': ['Expression', Validators.required],
        });

        this.configForm.controls['dataType'].valueChanges.subscribe(() => {
            const dataType: DataType = this.configForm.controls['dataType'].value;
            const minValueControl = this.configForm.controls['minValue'];
            const maxValueControl  = this.configForm.controls['maxValue'];
            minValueControl.setValue(dataType.getMin());
            maxValueControl.setValue(dataType.getMax() - 1);
        });
    }

    ngOnInit() {
        // super.ngOnInit();
        // this.dialog.setTitle('Calculate Expression on Raster');
    }

    onSelectLayers(layers: Array<RasterLayer<RasterSymbology>>) {
        this.calculateDataTypeList(layers);
        this.calculateUnitList(layers);

        this.selectedLayers = layers;
    }

    add() {
        const name: string = this.configForm.controls['name'].value;
        const dataType: DataType = this.configForm.controls['dataType'].value;
        const expression: string = this.configForm.controls['expression'].value;
        const rasterLayers = this.selectedLayers;
        const projection = this.configForm.controls['projection'].value;
        const minValue = this.configForm.controls['minValue'].value;
        const maxValue = this.configForm.controls['maxValue'].value;

        const selectedUnit: Unit = this.configForm.controls['unit'].value;
        const unit = new Unit({
            measurement: selectedUnit.measurement,
            unit: selectedUnit.unit,
            interpolation: selectedUnit.interpolation,
            classes: selectedUnit.classes,
            min: minValue,
            max: maxValue,
        });

        const operator = new Operator({
            operatorType: new ExpressionType({
                expression: expression,
                datatype: dataType,
                unit: unit,
            }),
            resultType: ResultTypes.RASTER,
            projection: projection,
            attributes: ['value'],
            dataTypes: new Map<string, DataType>()
                        .set('value', dataType),
            units: new Map<string, Unit>()
                        .set('value', unit),
            rasterSources: rasterLayers.map(
                layer => layer.operator.getProjectedOperator(projection)
            ),
        });

        // this.layerService.addLayer(new RasterLayer({
        //     name: name,
        //     operator: operator,
        //     symbology: new RasterSymbology({ unit: unit }),
        //     provenance: this.mappingQueryService.getProvenanceStream(operator),
        // }));

        // this.dialog.close();
    }

    private calculateUnitList(layers: Array<RasterLayer<RasterSymbology>>) {
        this.outputUnits = [];
        for (const layer of layers) {
            const unit = layer.operator.getUnit('value');
            if (this.outputUnits.indexOf(unit) === -1) {
                this.outputUnits.push(unit);
            }
        }

        if (this.outputUnits.indexOf(Unit.defaultUnit) === -1) {
            this.outputUnits.push(Unit.defaultUnit);
        }

        const dataTypeControl = this.configForm.controls['unit'];
        if (dataTypeControl.value === -1) {
            const dataType = this.outputUnits[0];
            dataTypeControl.setValue(dataType);
        }
    }

    private calculateDataTypeList(layers: Array<RasterLayer<RasterSymbology>>) {
        let firstItemWithRefs: DataType = undefined;
        for (let i = 0; i < this.outputDataTypes.length; i++) {
            const dataType = this.outputDataTypes[i][0];
            const refs: Array<string> = [];
            for (let l = 0; l < layers.length; l++) {
                if (dataType === layers[l].operator.getDataType('value')) {
                    refs.push(LetterNumberConverter.toLetters(l + 1));
                }
                if (refs.length > 0) {
                    this.outputDataTypes[i][1] =
                        `(like ${refs.length > 1 ? 'layers' : 'layer'} ${refs.join(',')})`;
                    if (firstItemWithRefs === undefined) {
                        firstItemWithRefs = dataType;
                    }
                } else {
                    this.outputDataTypes[i][1] = '';
                }
            }
        }

        const dataTypeControl = this.configForm.controls['dataType'];
        if (dataTypeControl.value === -1) {
            dataTypeControl.setValue(firstItemWithRefs);
            const minValueControl = this.configForm.controls['minValue'];
            const maxValueControl = this.configForm.controls['maxValue'];
            minValueControl.setValue(firstItemWithRefs.getMin());
            maxValueControl.setValue(firstItemWithRefs.getMax() - 1);
        }
    }

}
