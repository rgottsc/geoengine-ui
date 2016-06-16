import {Component, ChangeDetectionStrategy} from '@angular/core';
import {CORE_DIRECTIVES} from '@angular/common';

import {MATERIAL_DIRECTIVES} from 'ng2-material';
import {MD_PROGRESS_CIRCLE_DIRECTIVES} from '@angular2-material/progress-circle';

import {Dragula, DragulaService} from 'ng2-dragula/ng2-dragula';

import {SymbologyType, Symbology} from '../symbology/symbology.model';
import {Layer} from '../layers/layer.model';

import {LayerService} from '../layers/layer.service';
import {
    LegendaryRasterComponent, LegendaryPointComponent, LegendaryVectorComponent,
    LegendaryMappingColorizerRasterComponent, LegendaryClusteredPointComponent,
} from '../symbology/legendary.component';

@Component({
    selector: 'wave-layer-list',
    template: `
    <md-content flex>
    <md-list [dragula]='layer-bag'>
        <md-list-item md-ink
            *ngFor='let layer of layerService.getLayersStream() | async; let index = index'
            (click)='layerService.setSelectedLayer(layer)'
            [class.md-active]='layer === (layerService.getSelectedLayerStream() | async)'
            (contextmenu)='replaceContextMenu($event, layer)'
            [title]="layer.name"
        >
            <div layout='column'>
                <div layout='row'>
                    <button md-button class='md-icon-button'
                            style='margin-left: -16px;'
                            aria-label='Settings'
                            (click)='layer.expanded=!layer.expanded'>
                        <i *ngIf='!layer.expanded' md-icon>expand_more</i>
                        <i *ngIf='layer.expanded' md-icon>expand_less</i>
                    </button>

                    <div #layerName class='md-list-item-text' style='padding-top: 10px'>
                        {{layer.name}}
                    </div>

                    <button md-button class='md-icon-button'
                            style='margin-right: -16px;'
                            aria-label='More'
                            *ngIf='layer === (layerService.getSelectedLayerStream() | async)'
                            (click)='replaceContextMenu($event, layer)'
                            disabled="true"
                    >
                        <i md-icon>more_vert</i>
                    </button>
                    <md-progress-circle
                        mode="indeterminate"
                        *ngIf="layer?.data?.loading$ | async"
                    ></md-progress-circle>
                </div>
                <div *ngIf='layer.expanded' [ngSwitch]='layer.symbology.symbologyType'>

                    <wave-legendary-points
                        *ngSwitchCase='_enumSymbologyType.SIMPLE_POINT'
                        [symbology]='layer.symbology'>
                    </wave-legendary-points>

                    <wave-legendary-clustered-points
                        *ngSwitchCase='_enumSymbologyType.CLUSTERED_POINT'
                        [symbology]='layer.symbology'>
                    </wave-legendary-clustered-points>

                    <wave-legendary-vector
                        *ngSwitchCase='_enumSymbologyType.SIMPLE_VECTOR'
                        [symbology]='layer.symbology'>
                    </wave-legendary-vector>

                    <wave-legendary-raster
                        *ngSwitchCase='_enumSymbologyType.RASTER'
                        [symbology]='layer.symbology'>
                    </wave-legendary-raster>

                    <wave-legendary-mapping-colorizer-raster
                        *ngSwitchCase='_enumSymbologyType.MAPPING_COLORIZER_RASTER'
                        [symbology]='layer.symbology'>
                    </wave-legendary-mapping-colorizer-raster>

                    <wave-legendary *ngSwitchDefault [symbology]='layer.symbology'></wave-legendary>
                </div>
            </div>
            <md-divider
                [class.md-active]='layer === (layerService.getSelectedLayerStream() | async)'>
            </md-divider>
        </md-list-item>
    </md-list>
    </md-content>
    `,
    styles: [`
    :host {
        display: block;
    }
    .md-active {
        background: #f5f5f5;
    }
    md-divider.md-active {
        border-top-color: #3f51b5;
    }
    md-list-item {
        cursor: pointer;
    }
    .md-list-item-text {
        width: 110px;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
    }
    md-list {
        height: 100%;
    }
    md-content {
        overflow-x: hidden;
    }
    button[disabled] {
        background-color: transparent;
    }
    md-progress-circle {
        position: absolute;
        height: 36px !important;
        width: 36px !important;
        left: calc(50% - 36px/2);
        top: 6px;
    }
    `],
    viewProviders: [DragulaService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    directives: [
        CORE_DIRECTIVES, MATERIAL_DIRECTIVES, MD_PROGRESS_CIRCLE_DIRECTIVES, Dragula,
        LegendaryPointComponent, LegendaryRasterComponent, LegendaryVectorComponent,
        LegendaryMappingColorizerRasterComponent, LegendaryClusteredPointComponent,
    ],
})

export class LayerListComponent {
    // for ng-switch
    private _enumSymbologyType = SymbologyType;

    constructor(
        private dragulaService: DragulaService,
        private layerService: LayerService
    ) {
        dragulaService.setOptions('layer-bag', {
            removeOnSpill: false,
            revertOnSpill: true,
        });

        this.handleDragAndDrop();
    }

    handleDragAndDrop() {
        let dragIndex: number;
        let dropIndex: number;

        this.dragulaService.drag.subscribe((value: [string, HTMLElement, HTMLElement]) => {
            const [_, listItem, list] = value;
            dragIndex = this.domIndexOf(listItem, list);
            // console.log('drag', dragIndex);
        });
        this.dragulaService.drop.subscribe((value: [string, HTMLElement, HTMLElement]) => {
            const [_, listItem, list] = value;
            dropIndex = this.domIndexOf(listItem, list);
            // console.log('drop', dropIndex);

            const layers = this.layerService.getLayers();
            layers.splice(dropIndex, 0, layers.splice(dragIndex, 1)[0]);
            this.layerService.setLayers(layers);
        });
    }

    replaceContextMenu(event: MouseEvent, layer: Layer<Symbology>) {
        // event.preventDefault();
        console.info(`A context menu for ${layer.name} will appear in future versions!`);
    }

    private domIndexOf(child: HTMLElement, parent: HTMLElement) {
        return Array.prototype.indexOf.call(parent.children, child);
    }
}
